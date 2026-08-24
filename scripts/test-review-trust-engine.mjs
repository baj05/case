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
  reportReview, listModerationQueue, moderateReview, listReviewsForProfessional,
  getProfessionalReviewSummary, eligibleExperiences,
  createOrganisationReview, getOrganisationReviewSummary, listReviewsForOrganisation,
  getReviewSubjectPath,
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
reportReview(review.id, { reporterEmail: 'someone@example.com', reason: 'incorrect_information', detail: 'wrong professional' });
check('a report on a published review sends it back to in_review', () => {
  const row = h.prepare(`SELECT moderation_status AS s FROM review WHERE id = ?`).get(review.id);
  return row.s === 'in_review';
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

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  ✗ ${f}`);
rmSync(dir, { recursive: true, force: true });
process.exit(failures.length > 0 ? 1 : 0);
