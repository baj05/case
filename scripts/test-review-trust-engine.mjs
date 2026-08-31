#!/usr/bin/env node
/**
 * Functional test for auth + the review trust engine, against a real,
 * disposable SQLite file (never the live data/lexhall.db) built fresh from
 * the actual migrations. This exercises real invariants end to end rather
 * than mocking the repository layer:
 *
 *   node scripts/test-review-trust-engine.mjs
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'lexhall-review-test-'));
process.env.DATABASE_PATH = join(dir, 'test.db');

const {
  applySchema, db, now,
  createUser, authenticate, createSession, getSessionUser, AuthError,
  createReview, editReview, withdrawReview, respondToReview, voteHelpful,
  reportReview, listModerationQueue, moderateReview, deleteReview, listReportedReviews, isAuthorizedToRespond, listReviewsForProfessional,
  getProfessionalReviewSummary, eligibleExperiences,
  createOrganisationReview, getOrganisationReviewSummary, listReviewsForOrganisation,
  getReviewSubjectPath, getOrganisationBySlug, REVIEWABLE_ORG_KINDS,
} = await import('@lexhall/db');

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    const ok = fn();
    if (ok) { pass += 1; } else { failures.push(name); }
  } catch (error) {
    failures.push(`${name} → threw: ${error.message}`);
  }
}

applySchema({ fresh: true });
const h = db();
const ts = now();

// --- fixtures: a country, a professional, a client user, a completed booking
h.exec(`INSERT INTO country (id, iso2, iso3, name, currency_code, default_timezone, phone_code, created_at, updated_at) VALUES (1,'IN','IND','India','INR','Asia/Kolkata','+91','${ts}','${ts}')`);
h.exec(`INSERT INTO jurisdiction (id, country_id, code, name, kind, legal_system, created_at, updated_at) VALUES (1,1,'IN-MH','Maharashtra','state','common_law','${ts}','${ts}')`);
h.exec(`INSERT INTO source (id, code, name, publisher, base_url, authority, coverage_note, created_at, updated_at) VALUES (1,'test-src','test','test','https://example.com','self_declared','test fixture','${ts}','${ts}')`);
h.exec(
  `INSERT INTO professional (id, kind, slug, full_name, normalised_name, display_name, country_id,
     primary_jurisdiction_id, body_role, claim_status, verification_level, is_published, data_confidence,
     source_id, created_at, updated_at)
   VALUES (1,'advocate','test-advocate','Test Advocate','test advocate','Test Advocate',1,1,'advocate',
     'claimed',1,1,80,1,'${ts}','${ts}')`,
);

// --- auth
const client = createUser({ email: 'client@example.com', fullName: 'Priya Sharma', password: 'correct-horse-1' });
check('createUser returns an id', () => client.id > 0);

check('authenticate rejects wrong password', () => {
  try { authenticate('client@example.com', 'wrong'); return false; } catch (e) { return e instanceof AuthError && e.code === 'INVALID_CREDENTIALS'; }
});
check('authenticate accepts the right password', () => authenticate('client@example.com', 'correct-horse-1').id === client.id);

const session = createSession(client.id, { ipAddress: '127.0.0.1', userAgent: 'test' });
check('session resolves back to the user', () => getSessionUser(session.id)?.id === client.id);

function insertCompletedBooking(id, reference, clientUserId, clientEmail) {
  h.exec(
    `INSERT INTO booking (id, reference, professional_id, client_user_id, client_name, client_email,
       starts_at_utc, ends_at_utc, mode, brief, terms_ack_at, status, created_at, updated_at)
     VALUES (${id},'${reference}',1,${clientUserId},'Test Client','${clientEmail}','${ts}','${ts}','video','test','${ts}','completed','${ts}','${ts}')`,
  );
}

// --- a completed booking this client can review
insertCompletedBooking(1, 'BK-TEST01', client.id, 'client@example.com');

check('eligibleExperiences surfaces the completed booking', () => eligibleExperiences(client.id, 1).some((e) => e.kind === 'booking'));

// --- create a review
const review = createReview({
  professionalId: 1, authorUserId: client.id, bookingId: 1,
  displayMode: 'pseudonymous', reviewerType: 'client',
  ratings: { communication: 5, responsiveness: 4, professionalism: 5, processClarity: 4, overallSatisfaction: 5 },
  wouldRecommend: 'yes', body: 'Clear communication throughout and always responded within a day.',
});
check('createReview succeeds and starts pending', () => review.moderationStatus === 'pending');

check('one-review-per-booking is enforced', () => {
  try {
    createReview({
      professionalId: 1, authorUserId: client.id, bookingId: 1, displayMode: 'attributed',
      reviewerType: 'client', ratings: {}, body: 'trying to review the same booking twice',
    });
    return false;
  } catch { return true; }
});

check('review with no bound interaction is rejected', () => {
  try {
    createReview({ professionalId: 1, authorUserId: client.id, displayMode: 'attributed', reviewerType: 'client', ratings: {}, body: 'no interaction' });
    return false;
  } catch { return true; }
});

// --- SECURITY REGRESSION: a completed booking with professional A cannot be
// used to post a VERIFIED review of professional B. createReview used to
// check only that the CALLER owned the booking and that it was completed —
// never that the booking belonged to the professional named in the review —
// so submitting professionalId=<anyone> with your own bookingId posted a
// 'verified_engagement' review of a professional you never engaged.
h.exec(
  `INSERT INTO professional (id, kind, slug, full_name, normalised_name, display_name, country_id,
     primary_jurisdiction_id, body_role, claim_status, verification_level, is_published, data_confidence,
     source_id, created_at, updated_at)
   VALUES (2,'advocate','other-advocate','Other Advocate','other advocate','Other Advocate',1,1,'advocate',
     'claimed',1,1,80,1,'${ts}','${ts}')`,
);
check('a booking with professional 1 cannot be used to review professional 2', () => {
  try {
    createReview({
      professionalId: 2, authorUserId: client.id, bookingId: 1, displayMode: 'attributed',
      reviewerType: 'client', ratings: {}, body: 'forged verified review of an unrelated advocate',
    });
    return false;
  } catch (e) { return e.message === 'INELIGIBLE_INTERACTION'; }
});
check('...and no such row was written', () => {
  const row = h.prepare(`SELECT count(*) AS n FROM review WHERE professional_id = 2`).get();
  return row.n === 0;
});

// --- privacy filter: a review that leaks a phone number or case-number-like
// string must go straight to human review, overriding the fraud tier.
const privacyUser = createUser({ email: 'privacy@example.com', fullName: 'Privacy Tester', password: 'whatever-123' });
insertCompletedBooking(20, 'BK-TESTPRIV', privacyUser.id, 'privacy@example.com');
const privacyLeak = createReview({
  professionalId: 1, authorUserId: privacyUser.id, bookingId: 20, displayMode: 'attributed',
  reviewerType: 'client', ratings: { overallSatisfaction: 5 },
  body: 'Great advocate, call him on 9876543210 and mention Crl. 4521/2023 for a discount.',
});
check('a review containing a phone number / case-number is routed to human review, not published or auto-flagged', () => privacyLeak.moderationStatus === 'in_review');

// --- fraud scoring: a single short review is medium risk (flagged internally,
// still enters the normal queue); the same account submitting several more
// in one day tips velocity + short-body over the auto-flag threshold.
const spammyUser = createUser({ email: 'spam@example.com', fullName: 'Spam Account', password: 'whatever-123' });
insertCompletedBooking(2, 'BK-TEST02', spammyUser.id, 'spam@example.com');
const spammy = createReview({
  professionalId: 1, authorUserId: spammyUser.id, bookingId: 2, displayMode: 'attributed',
  reviewerType: 'client', ratings: {}, body: 'bad',
});
check('a single short review is pending, not silently published', () => spammy.moderationStatus === 'pending');

for (const [bookingId, ref] of [[3, 'BK-TEST03'], [4, 'BK-TEST04']]) {
  insertCompletedBooking(bookingId, ref, spammyUser.id, 'spam@example.com');
  createReview({ professionalId: 1, authorUserId: spammyUser.id, bookingId, displayMode: 'attributed', reviewerType: 'client', ratings: {}, body: 'bad' });
}
insertCompletedBooking(5, 'BK-TEST05', spammyUser.id, 'spam@example.com');
const velocityFlagged = createReview({
  professionalId: 1, authorUserId: spammyUser.id, bookingId: 5, displayMode: 'attributed', reviewerType: 'client', ratings: {}, body: 'bad',
});
check('review velocity + low-effort body auto-flags the 4th review in a day', () => velocityFlagged.moderationStatus === 'auto_flagged');

// --- moderation: publish the first review, keep the spammy one flagged
const admin = createUser({ email: 'admin@example.com', fullName: 'Admin', password: 'admin-pass-123', platformRole: 'platform_admin' });
moderateReview(review.id, admin.id, 'published', 'looks genuine');
check('moderation queue lists the auto-flagged review', () => listModerationQueue('auto_flagged').some((r) => r.id === velocityFlagged.id));
check('published review does not appear back in the pending queue', () => !listModerationQueue('pending').some((r) => r.id === review.id));

// --- sample-size protection: 1 published review must not produce a confident breakdown
const summaryBefore = getProfessionalReviewSummary(1);
check('sample size protection withholds the breakdown below the threshold', () => summaryBefore.insufficientSample === true && summaryBefore.count === 1);

// --- response, vote, listing, display-mode masking
respondToReview(review.id, admin.id, 'Thank you for the feedback.');
h.exec(`UPDATE review_response SET moderation_status='published' WHERE review_id=${review.id}`);
voteHelpful(review.id, admin.id, 1);

const listed = listReviewsForProfessional(1, { filter: 'all' });
check('published review appears in the public listing', () => listed.some((r) => r.id === review.id));
check('pseudonymous display mode masks the full name', () => {
  const r = listed.find((x) => x.id === review.id);
  return r && r.displayName === 'Priya S.' && r.displayName !== 'Priya Sharma';
});
check('the professional response is attached', () => listed.find((r) => r.id === review.id)?.response?.body.includes('Thank you'));
check('helpful vote is counted', () => listed.find((r) => r.id === review.id)?.helpfulCount === 1);

// --- edit history is retained, not overwritten
editReview(review.id, client.id, { body: 'Updated: clear communication and fair fees too.' });
const historyRows = h.prepare(`SELECT prior_body FROM review_edit_history WHERE review_id = ?`).all(review.id);
check('editing a review preserves the prior text in history', () => historyRows.length === 1 && historyRows[0].prior_body.includes('Clear communication'));
check('an edited, previously-published review returns to pending', () => {
  const row = h.prepare(`SELECT moderation_status AS s FROM review WHERE id = ?`).get(review.id);
  return row.s === 'pending';
});

// --- report and withdraw
moderateReview(review.id, admin.id, 'published');
// reportReview requires a signed-in reporter — an anonymous, unauthenticated
// call used to be enough to instantly unpublish any review by id, with no
// rate limit and nothing to trace it to. See ADR / actions.ts reportReviewAction.
reportReview(review.id, { reporterUserId: admin.id, reason: 'incorrect_information', detail: 'wrong professional' });
check('a report on a published review sends it back to in_review', () => {
  const row = h.prepare(`SELECT moderation_status AS s FROM review WHERE id = ?`).get(review.id);
  return row.s === 'in_review';
});
check('the same reporter cannot report the same review twice', () => {
  try {
    reportReview(review.id, { reporterUserId: admin.id, reason: 'other', detail: 'reporting again' });
    return false;
  } catch (e) { return e.code === 'ALREADY_REPORTED'; }
});
check('reporting a non-existent review is rejected, not silently accepted', () => {
  try {
    reportReview(999999999, { reporterUserId: admin.id, reason: 'other', detail: 'no such review' });
    return false;
  } catch (e) { return e.code === 'REVIEW_NOT_FOUND'; }
});

check('withdraw only works for the author', () => withdrawReview(review.id, admin.id) === false && withdrawReview(review.id, client.id) === true);

// --- banding: 10 independent published reviews should move the professional
// from 'new'/'early' to the 'established' band with a full breakdown.
for (let i = 0; i < 10; i += 1) {
  const u = createUser({ email: `band-${i}@example.com`, fullName: `Band Tester ${i}`, password: 'whatever-123' });
  insertCompletedBooking(100 + i, `BK-BAND${i}`, u.id, `band-${i}@example.com`);
  const r = createReview({
    professionalId: 1, authorUserId: u.id, bookingId: 100 + i, displayMode: 'attributed', reviewerType: 'client',
    ratings: { communication: 4, responsiveness: 5, professionalism: 5, processClarity: 4, overallSatisfaction: i % 3 === 0 ? 3 : 5 },
    wouldRecommend: i % 4 === 0 ? 'no' : 'yes',
    body: `Review number ${i}: communication was clear and the process was explained clearly throughout.`,
  });
  moderateReview(r.id, admin.id, 'published');
}
const established = getProfessionalReviewSummary(1);
check('10 published reviews reach the established band with a dimension breakdown', () => established.band === 'established' && established.communication != null);
check('star distribution sums to 100 percent', () => established.starDistribution.reduce((s, r) => s + r.percent, 0) === 100);
check('satisfaction distribution has five levels', () => established.satisfactionDistribution.length === 5);
check('a repeated theme across enough reviews is surfaced', () => established.themes.some((t) => t.theme === 'Clear communication'));
check('recommend percent excludes "maybe" from the denominator', () => established.recommendPercent != null && established.recommendPercent < 100 && established.recommendPercent > 0);

// --- organisation reviews (law firm / LPO) — verified via matching e-mail domain
h.exec(`INSERT INTO organisation (id, kind, name, slug, country_id, email_domain, domain_verified_at, created_at, updated_at)
  VALUES (1,'law_firm','Test Chambers','test-chambers',1,'clientco.example','${ts}','${ts}','${ts}')`);
const corpUser = createUser({ email: 'legal@clientco.example', fullName: 'Corporate Counsel', password: 'whatever-123' });
const outsiderUser = createUser({ email: 'someone@gmail.example', fullName: 'Outside Reviewer', password: 'whatever-123' });

const verifiedOrgReview = createOrganisationReview({
  organisationId: 1, authorUserId: corpUser.id, displayMode: 'attributed', reviewerType: 'corporate_legal_team',
  experienceCategory: 'legal_matter', ratings: { overallSatisfaction: 5 }, wouldRecommend: 'yes',
  body: 'Handled our cross-border matter with clear communication and strong documentation throughout.',
});
const unverifiedOrgReview = createOrganisationReview({
  organisationId: 1, authorUserId: outsiderUser.id, displayMode: 'anonymous', reviewerType: 'client',
  experienceCategory: 'consultation', ratings: { overallSatisfaction: 4 }, body: 'Good service overall, would use again for routine matters.',
});
check('a reviewer whose email domain matches the org\'s verified domain is basis=verified_engagement', () => {
  const row = h.prepare(`SELECT basis FROM review WHERE id = ?`).get(verifiedOrgReview.id);
  return row.basis === 'verified_engagement';
});
check('a reviewer with no domain match is basis=unverified', () => {
  const row = h.prepare(`SELECT basis FROM review WHERE id = ?`).get(unverifiedOrgReview.id);
  return row.basis === 'unverified';
});
moderateReview(verifiedOrgReview.id, admin.id, 'published');
moderateReview(unverifiedOrgReview.id, admin.id, 'published');
const orgSummary = getOrganisationReviewSummary(1);
check('organisation review summary counts both published reviews', () => orgSummary.count === 2);
const orgReviews = listReviewsForOrganisation(1, { filter: 'all' });
check('organisation review listing returns both reviews with correct verified flags', () => {
  const v = orgReviews.find((r) => r.id === verifiedOrgReview.id);
  const u = orgReviews.find((r) => r.id === unverifiedOrgReview.id);
  return v?.verified === true && u?.verified === false && u?.displayName === 'Anonymous reviewer';
});
check('an organisation review\'s verification is labelled "domain", not conflated with a booking-verified advocate review', () => {
  const orgReview = orgReviews.find((r) => r.id === verifiedOrgReview.id);
  const advocateReviews = listReviewsForProfessional(1, { filter: 'verified' });
  return orgReview?.verifiedVia === 'domain' && advocateReviews.every((r) => r.verifiedVia === 'booking');
});

// --- fix regression tests: one-review-per-author for orgs, correct fraud
// column, and correct subject-path resolution for revalidation/routing.
check('a second review by the same author for the same organisation is rejected', () => {
  try {
    createOrganisationReview({
      organisationId: 1, authorUserId: corpUser.id, displayMode: 'attributed', reviewerType: 'corporate_legal_team',
      experienceCategory: 'legal_matter', ratings: { overallSatisfaction: 5 }, body: 'Trying to review the same firm twice with different text.',
    });
    return false;
  } catch (e) { return e.message === 'ALREADY_REVIEWED'; }
});

h.exec(`INSERT INTO organisation (id, kind, name, slug, country_id, created_at, updated_at)
  VALUES (2,'lpo','Test LPO','test-lpo',1,'${ts}','${ts}')`);
const lpoReviewer = createUser({ email: 'reviewer-lpo@example.com', fullName: 'LPO Reviewer', password: 'whatever-123' });
const lpoReview = createOrganisationReview({
  organisationId: 2, authorUserId: lpoReviewer.id, displayMode: 'attributed', reviewerType: 'client',
  experienceCategory: 'legal_matter', ratings: { overallSatisfaction: 4 }, body: 'Turnaround was within the agreed SLA for this LPO engagement.',
});
check('an organisation review\'s duplicate-text fraud check uses organisation_id, not professional_id', () => {
  // A second, textually-identical review against the SAME org from a
  // different account should trip duplicate_text_30d — proving the check
  // actually queries organisation_id (the bug queried professional_id,
  // where this org's numeric id would never match).
  const otherReviewer = createUser({ email: 'reviewer-lpo-2@example.com', fullName: 'LPO Reviewer 2', password: 'whatever-123' });
  const dup = createOrganisationReview({
    organisationId: 2, authorUserId: otherReviewer.id, displayMode: 'attributed', reviewerType: 'client',
    experienceCategory: 'legal_matter', ratings: { overallSatisfaction: 4 }, body: 'Turnaround was within the agreed SLA for this LPO engagement.',
  });
  const row = h.prepare(`SELECT trust_signals AS s FROM review WHERE id = ?`).get(dup.id);
  return JSON.parse(row.s).signals.includes('duplicate_text_30d');
});
check('getReviewSubjectPath resolves an advocate review to /advocates/<slug>', () => {
  const path = getReviewSubjectPath(review.id);
  return path?.basePath === '/advocates' && path?.slug === 'test-advocate';
});
check('getReviewSubjectPath resolves an LPO organisation review to /lpo/<slug>, not /firms', () => {
  const path = getReviewSubjectPath(lpoReview.id);
  return path?.basePath === '/lpo' && path?.slug === 'test-lpo';
});
check('getReviewSubjectPath resolves a law-firm organisation review to /firms/<slug>', () => {
  const path = getReviewSubjectPath(verifiedOrgReview.id);
  return path?.basePath === '/firms' && path?.slug === 'test-chambers';
});

// --- avatars: anonymous never carries one, a named reviewer's preset
// round-trips, and a value outside the accepted preset/JPEG-data-URL shape
// is silently dropped rather than stored.
const avatarAnonUser = createUser({ email: 'avatar-anon@example.com', fullName: 'Avatar Anon', password: 'whatever-123' });
insertCompletedBooking(200, 'BK-AVATAR-ANON', avatarAnonUser.id, 'avatar-anon@example.com');
const avatarAnonReview = createReview({
  professionalId: 1, authorUserId: avatarAnonUser.id, bookingId: 200, displayMode: 'anonymous',
  reviewerType: 'client', ratings: { overallSatisfaction: 4 }, body: 'Solid experience overall, would consult again.',
  avatarUrl: '/img/avatars/preset-03.svg',
});
check('an anonymous review never stores an avatar, even when one was submitted', () => {
  const row = h.prepare(`SELECT avatar_url AS avatarUrl FROM review WHERE id = ?`).get(avatarAnonReview.id);
  return row.avatarUrl === null;
});

const avatarNamedUser = createUser({ email: 'avatar-named@example.com', fullName: 'Avatar Named', password: 'whatever-123' });
insertCompletedBooking(201, 'BK-AVATAR-NAMED', avatarNamedUser.id, 'avatar-named@example.com');
const avatarNamedReview = createReview({
  professionalId: 1, authorUserId: avatarNamedUser.id, bookingId: 201, displayMode: 'attributed',
  reviewerType: 'client', ratings: { overallSatisfaction: 5 }, body: 'Chose a preset avatar and it should round-trip cleanly.',
  avatarUrl: '/img/avatars/preset-03.svg',
});
check("a named reviewer's chosen preset avatar round-trips into the row and the public listing", () => {
  const row = h.prepare(`SELECT avatar_url AS avatarUrl FROM review WHERE id = ?`).get(avatarNamedReview.id);
  moderateReview(avatarNamedReview.id, admin.id, 'published');
  const publicRow = listReviewsForProfessional(1, { filter: 'all' }).find((r) => r.id === avatarNamedReview.id);
  return row.avatarUrl === '/img/avatars/preset-03.svg' && publicRow?.avatarUrl === '/img/avatars/preset-03.svg';
});

const avatarBadUser = createUser({ email: 'avatar-bad@example.com', fullName: 'Avatar Bad', password: 'whatever-123' });
insertCompletedBooking(202, 'BK-AVATAR-BAD', avatarBadUser.id, 'avatar-bad@example.com');
const avatarBadReview = createReview({
  professionalId: 1, authorUserId: avatarBadUser.id, bookingId: 202, displayMode: 'attributed',
  reviewerType: 'client', ratings: { overallSatisfaction: 5 }, body: 'Submitting a malformed avatar value should not break the review.',
  avatarUrl: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
});
check('a malformed avatar value (SVG data URL, not the accepted JPEG shape) is silently dropped, not stored', () => {
  const row = h.prepare(`SELECT avatar_url AS avatarUrl FROM review WHERE id = ?`).get(avatarBadReview.id);
  return row.avatarUrl === null;
});
const avatarOversizedUser = createUser({ email: 'avatar-oversized@example.com', fullName: 'Avatar Oversized', password: 'whatever-123' });
insertCompletedBooking(203, 'BK-AVATAR-OVERSIZED', avatarOversizedUser.id, 'avatar-oversized@example.com');
const avatarOversizedReview = createReview({
  professionalId: 1, authorUserId: avatarOversizedUser.id, bookingId: 203, displayMode: 'attributed',
  reviewerType: 'client', ratings: { overallSatisfaction: 5 }, body: 'An oversized data URL should also be dropped rather than stored.',
  avatarUrl: `data:image/jpeg;base64,${'A'.repeat(200_001)}`,
});
check('an oversized avatar data URL is silently dropped, not stored', () => {
  const row = h.prepare(`SELECT avatar_url AS avatarUrl FROM review WHERE id = ?`).get(avatarOversizedReview.id);
  return row.avatarUrl === null;
});

// --- admin: reported reviews queue and hard removal. A published review
// that gets reported must surface in listReportedReviews with the reporter's
// reason/detail; deleting it must hide it from every public listing (via
// deleted_at) and close the open report so it doesn't linger in the queue.
const reportedFlowUser = createUser({ email: 'reported-flow@example.com', fullName: 'Reported Flow', password: 'whatever-123' });
insertCompletedBooking(210, 'BK-REPORTED-FLOW', reportedFlowUser.id, 'reported-flow@example.com');
const reportedFlowReview = createReview({
  professionalId: 1, authorUserId: reportedFlowUser.id, bookingId: 210, displayMode: 'attributed',
  reviewerType: 'client', ratings: { overallSatisfaction: 5 }, body: 'This review will be reported and then removed by an admin.',
});
moderateReview(reportedFlowReview.id, admin.id, 'published');
const concernedReporter = createUser({ email: 'concerned@example.com', fullName: 'Concerned Reporter', password: 'whatever-123' });
reportReview(reportedFlowReview.id, { reporterUserId: concernedReporter.id, reason: 'fake_review', detail: 'This does not read like a real client experience.' });

check('a reported review surfaces in the admin reported-reviews queue with its reason and detail', () => {
  const row = listReportedReviews().find((r) => r.reviewId === reportedFlowReview.id);
  return row?.reason === 'fake_review' && row?.detail.includes('does not read like a real');
});

check('deleting a review removes it from the public listing', () => {
  deleteReview(reportedFlowReview.id, admin.id, 'Confirmed not a genuine review.');
  const publicRow = listReviewsForProfessional(1, { filter: 'all' }).find((r) => r.id === reportedFlowReview.id);
  const row = h.prepare(`SELECT deleted_at AS deletedAt, moderation_status AS status FROM review WHERE id = ?`).get(reportedFlowReview.id);
  return publicRow === undefined && row.deletedAt != null && row.status === 'rejected';
});

check('deleting a review also resolves its open report, so it drops out of the reported queue', () => {
  return !listReportedReviews().some((r) => r.reviewId === reportedFlowReview.id);
});

// --- authorization: only the professional who claimed a profile (or a
// member of the reviewed organisation) may post "the professional's"
// response — not just any signed-in user (the bug this check closes).
const claimant = createUser({ email: 'claimant@example.com', fullName: 'Claimant Advocate', password: 'whatever-123' });
h.exec(`UPDATE professional SET claimed_by_user_id = ${claimant.id} WHERE id = 1`);
const randomUser = createUser({ email: 'random-user@example.com', fullName: 'Random User', password: 'whatever-123' });
check('the advocate who claimed the profile is authorized to respond to its reviews', () => isAuthorizedToRespond(review.id, claimant.id) === true);
check('a random signed-in user is not authorized to respond as the professional', () => isAuthorizedToRespond(review.id, randomUser.id) === false);

const orgMemberUser = createUser({ email: 'org-member@example.com', fullName: 'Org Member', password: 'whatever-123' });
h.exec(`INSERT INTO org_member (organisation_id, user_id, role, created_at) VALUES (1, ${orgMemberUser.id}, 'member', '${ts}')`);
check('a member of the reviewed organisation is authorized to respond to its reviews', () => isAuthorizedToRespond(verifiedOrgReview.id, orgMemberUser.id) === true);
check('a non-member is not authorized to respond to an organisation review', () => isAuthorizedToRespond(verifiedOrgReview.id, randomUser.id) === false);

// --- a 'corporate' organisation is a CLIENT COMPANY using the platform, not a
// listed provider. It must never be reviewable. Guarded in the write path
// rather than only at callers, because a Server Action is invocable directly
// and a caller-side check alone is a UI gate, not a boundary.
h.exec(`INSERT INTO organisation (id, kind, name, slug, country_id, created_at, updated_at)
  VALUES (3,'corporate','Acme Client Pvt Ltd','acme-client',1,'${ts}','${ts}')`);
const corpReviewer = createUser({ email: 'corp-reviewer@example.com', fullName: 'Corp Reviewer', password: 'whatever-123' });

check('a corporate organisation cannot be reviewed, even called directly', () => {
  try {
    createOrganisationReview({
      organisationId: 3, authorUserId: corpReviewer.id, displayMode: 'attributed',
      reviewerType: 'client', experienceCategory: 'legal_matter',
      ratings: { overallSatisfaction: 5 }, body: 'Trying to review a private client company.',
    });
    return false;
  } catch (e) { return e.message === 'ORGANISATION_NOT_REVIEWABLE'; }
});

check('resolving a slug restricted to reviewable kinds hides a corporate org', () =>
  getOrganisationBySlug('acme-client', REVIEWABLE_ORG_KINDS) === null);

// Proves the previous assertion passes because of the FILTER, not because the
// row is missing or the slug is wrong.
check('the same corporate slug still resolves when kinds are not restricted', () =>
  getOrganisationBySlug('acme-client')?.kind === 'corporate');

check('restricting kinds does not break resolving a real law firm', () =>
  getOrganisationBySlug('test-chambers', REVIEWABLE_ORG_KINDS)?.kind === 'law_firm');

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  ✗ ${f}`);
rmSync(dir, { recursive: true, force: true });
process.exit(failures.length > 0 ? 1 : 0);
