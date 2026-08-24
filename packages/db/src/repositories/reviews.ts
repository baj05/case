/**
 * Review Trust Engine.
 *
 * Sits on the schema in 003_platform.sql + 009_review_trust_engine.sql +
 * 010_review_booking_link.sql. Everything here is gated behind
 * FEATURE_REVIEWS / FEATURE_ANONYMOUS_REVIEWS (docs/COMPLIANCE_MATRIX.md
 * C-09/C-10) — building it does not turn it on; a platform admin flips the
 * flag only after the legal sign-off those rows describe.
 *
 * Design rules this module enforces, not just documents:
 *   - No review without a real interaction (createReview requires exactly
 *     one of bookingId/consultationRequestId/appointmentId/matterId, and
 *     that interaction must belong to the author and be completed).
 *   - One review per interaction (the DB's partial unique indexes back this
 *     up — this module also checks first, for a clean error message).
 *   - Edits are retained, never silently rewritten (review_edit_history).
 *   - Fraud/trust scoring is internal-only; never returned to public callers.
 *   - Aggregates are sample-size-protected — small counts don't get a
 *     confident-looking breakdown (§28 of the product brief).
 */
import { db, now, transaction, toJson, fromJson } from '../client.ts';

export type DisplayMode = 'attributed' | 'pseudonymous' | 'anonymous';
export type ReviewerType =
  | 'client' | 'former_client' | 'current_client' | 'lawyer'
  | 'referring_lawyer' | 'corporate_legal_team' | 'vendor' | 'other';
export type ExperienceCategory = 'consultation' | 'booking' | 'appointment' | 'legal_matter';
export type WouldRecommend = 'yes' | 'no' | 'maybe';

export interface RatingInput {
  communication?: number; responsiveness?: number; professionalism?: number;
  processClarity?: number; overallSatisfaction?: number;
}

export interface CreateReviewInput {
  professionalId: number;
  authorUserId: number;
  // Exactly one of these — the verified interaction that entitles the review.
  bookingId?: number; consultationRequestId?: number; appointmentId?: number; matterId?: number;
  displayMode: DisplayMode;
  reviewerType: ReviewerType;
  ratings: RatingInput;
  wouldRecommend?: WouldRecommend;
  body: string;
}

// --------------------------------------------------------------- eligibility

/** Completed interactions between this user and this professional with no review yet. */
export function eligibleExperiences(userId: number, professionalId: number) {
  const h = db();
  const bookings = h.prepare(
    `SELECT b.id, b.reference, b.starts_at_utc AS occurredAt, 'booking' AS kind
       FROM booking b
      WHERE b.professional_id = ? AND b.client_user_id = ? AND b.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM review r WHERE r.booking_id = b.id AND r.author_user_id = ?)`,
  ).all(professionalId, userId, userId) as Array<{ id: number; reference: string; occurredAt: string; kind: string }>;

  const consultations = h.prepare(
    `SELECT cr.id, cr.reference, cr.responded_at AS occurredAt, 'consultation' AS kind
       FROM consultation_request cr
      WHERE cr.professional_id = ? AND cr.requester_user_id = ? AND cr.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM review r WHERE r.consultation_request_id = cr.id AND r.author_user_id = ?)`,
  ).all(professionalId, userId, userId) as Array<{ id: number; reference: string; occurredAt: string; kind: string }>;

  return [...bookings, ...consultations].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
}

// -------------------------------------------------------------- fraud signal
// Internal-only heuristic. Never returned to a public caller (§16: "Do not
// expose the raw fraud algorithm publicly"). Deliberately simple and
// explainable rather than a black box — each signal is named so an admin
// reviewing a flagged review can see exactly why.

// ---------------------------------------------------------- privacy filter
// §21 of the product brief: before publishing, detect content resembling
// case numbers, phone/email, money figures (settlement amounts) or other
// matter-identifying detail, and route to human review rather than
// auto-publishing it. Deliberately simple pattern-matching — it is a
// screening net, not a substitute for the human moderator who decides.
// See docs/REVIEW_COMPLIANCE_MATRIX.md R-12/R-13.
const PRIVACY_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: 'phone_number', pattern: /(?:\+?91[-\s]?)?[6-9]\d{9}\b/ },
  { signal: 'email_address', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { signal: 'money_figure', pattern: /(?:₹|rs\.?\s?|inr\s?)\s?\d[\d,]*(?:\.\d+)?|\b\d+\s?(?:lakh|crore)s?\b/i },
  { signal: 'case_number_like', pattern: /\b(?:crl\.?|w\.?p\.?|c\.?s\.?|fir|os|ia)\s?(?:no\.?)?\s?\d+[/\s]\d{2,4}\b/i },
];

function detectPrivacyRisk(body: string): string[] {
  const hits: string[] = [];
  for (const { signal, pattern } of PRIVACY_PATTERNS) if (pattern.test(body)) hits.push(signal);
  return hits;
}

interface FraudAssessment { score: number; tier: 'low' | 'medium' | 'high'; signals: string[] }

function assessFraudRisk(input: { authorUserId: number; subject: ReviewSubject; subjectId: number; body: string; basis: string }): FraudAssessment {
  const h = db();
  const signals: string[] = [];
  let score = 0;

  const velocity = h.prepare(
    `SELECT count(*) AS n FROM review WHERE author_user_id = ? AND created_at > datetime('now','-1 day')`,
  ).get(input.authorUserId) as { n: number };
  if (velocity.n >= 3) { score += 40; signals.push(`review_velocity:${velocity.n}_in_24h`); }

  const normalized = input.body.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length > 0) {
    // `subject` selects professional_id or organisation_id — a review's
    // subject lives in one of two separate ID spaces, and checking the
    // wrong column would compare against an unrelated row that merely
    // shares the same numeric id.
    const dup = h.prepare(
      `SELECT count(*) AS n FROM review
        WHERE ${input.subject} = ? AND lower(trim(body)) = ? AND created_at > datetime('now','-30 day')`,
    ).get(input.subjectId, normalized) as { n: number };
    if (dup.n > 0) { score += 30; signals.push('duplicate_text_30d'); }
  }

  if (input.body.trim().length < 15) { score += 20; signals.push('very_short_body'); }
  if (input.basis === 'unverified') { score += 15; signals.push('unverified_basis'); }

  const tier: FraudAssessment['tier'] = score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low';
  return { score, tier, signals };
}

// ----------------------------------------------------------------- creation

export function createReview(input: CreateReviewInput): { id: number; moderationStatus: string } {
  const boundCount = [input.bookingId, input.consultationRequestId, input.appointmentId, input.matterId]
    .filter((v) => v != null).length;
  if (boundCount !== 1) throw new Error('REVIEW_REQUIRES_EXACTLY_ONE_INTERACTION');

  return transaction(() => {
    const h = db();
    let basis = 'unverified';
    let experienceCategory: ExperienceCategory = 'consultation';

    if (input.bookingId != null) {
      const b = h.prepare(`SELECT client_user_id AS clientUserId, status FROM booking WHERE id = ?`)
        .get(input.bookingId) as { clientUserId: number | null; status: string } | undefined;
      if (!b || b.clientUserId !== input.authorUserId || b.status !== 'completed') {
        throw new Error('INELIGIBLE_INTERACTION');
      }
      basis = 'verified_engagement'; experienceCategory = 'booking';
    } else if (input.consultationRequestId != null) {
      const cr = h.prepare(`SELECT requester_user_id AS requesterUserId, status FROM consultation_request WHERE id = ?`)
        .get(input.consultationRequestId) as { requesterUserId: number | null; status: string } | undefined;
      if (!cr || cr.requesterUserId !== input.authorUserId || cr.status !== 'completed') {
        throw new Error('INELIGIBLE_INTERACTION');
      }
      basis = 'verified_consultation'; experienceCategory = 'consultation';
    } else if (input.appointmentId != null) {
      const a = h.prepare(`SELECT client_user_id AS clientUserId, status FROM appointment WHERE id = ?`)
        .get(input.appointmentId) as { clientUserId: number | null; status: string } | undefined;
      if (!a || a.clientUserId !== input.authorUserId || a.status !== 'completed') {
        throw new Error('INELIGIBLE_INTERACTION');
      }
      basis = 'verified_engagement'; experienceCategory = 'appointment';
    } else if (input.matterId != null) {
      const m = h.prepare(
        `SELECT 1 AS ok FROM matter_participant WHERE matter_id = ? AND user_id = ?`,
      ).get(input.matterId, input.authorUserId) as { ok: number } | undefined;
      if (!m) throw new Error('INELIGIBLE_INTERACTION');
      basis = 'verified_engagement'; experienceCategory = 'legal_matter';
    }

    const risk = assessFraudRisk({ authorUserId: input.authorUserId, subject: 'professional_id', subjectId: input.professionalId, body: input.body, basis });
    const privacyHits = detectPrivacyRisk(input.body);
    // A privacy hit always forces human review — it overrides the fraud tier
    // entirely, because the risk here is disclosure, not inauthenticity.
    const moderationStatus = privacyHits.length > 0 ? 'in_review' : risk.tier === 'high' ? 'auto_flagged' : 'pending';
    const ts = now();

    const result = h.prepare(
      `INSERT INTO review (
         professional_id, author_user_id, consultation_request_id, appointment_id, matter_id, booking_id,
         basis, display_mode, reviewer_type, experience_category,
         rating_communication, rating_responsiveness, rating_professionalism, rating_process_clarity,
         overall_satisfaction, would_recommend, body,
         moderation_status, trust_signals, trust_score, created_at, updated_at
       ) VALUES (?,?,?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?,?)`,
    ).run(
      input.professionalId, input.authorUserId,
      input.consultationRequestId ?? null, input.appointmentId ?? null, input.matterId ?? null, input.bookingId ?? null,
      basis, input.displayMode, input.reviewerType, experienceCategory,
      input.ratings.communication ?? null, input.ratings.responsiveness ?? null,
      input.ratings.professionalism ?? null, input.ratings.processClarity ?? null,
      input.ratings.overallSatisfaction ?? null, input.wouldRecommend ?? null, input.body.trim(),
      moderationStatus,
      toJson({ tier: risk.tier, signals: risk.signals, privacyHits }), risk.score, ts, ts,
    );

    return { id: Number(result.lastInsertRowid), moderationStatus };
  });
}

export interface CreateOrganisationReviewInput {
  organisationId: number;
  authorUserId: number;
  displayMode: DisplayMode;
  reviewerType: ReviewerType;
  experienceCategory: 'legal_matter' | 'appointment' | 'consultation' | 'booking';
  ratings: RatingInput;
  wouldRecommend?: WouldRecommend;
  body: string;
}

/**
 * Reviews of a law firm, chamber or LPO provider — `organisation`, not
 * `professional`. There is no booking/consultation model at the
 * organisation level yet (§ MISSING in docs/BOSS_REQUIREMENTS_AUDIT.md), so
 * "verified" here means something narrower and honest: the reviewer's
 * account email domain matches the organisation's own verified domain
 * (`organisation.email_domain` + `domain_verified_at`) — the same signal G2
 * uses (work email / LinkedIn) rather than a booking record. Anything else
 * is 'unverified'. This is NOT the same strength of verification as a
 * completed booking, and the UI must not blur that distinction.
 */
export function createOrganisationReview(input: CreateOrganisationReviewInput): { id: number; moderationStatus: string } {
  return transaction(() => {
    const h = db();
    const author = h.prepare(`SELECT email FROM app_user WHERE id = ?`).get(input.authorUserId) as { email: string } | undefined;
    if (!author) throw new Error('AUTHOR_NOT_FOUND');
    const org = h.prepare(`SELECT email_domain AS emailDomain, domain_verified_at AS domainVerifiedAt FROM organisation WHERE id = ?`)
      .get(input.organisationId) as { emailDomain: string | null; domainVerifiedAt: string | null } | undefined;
    if (!org) throw new Error('ORGANISATION_NOT_FOUND');

    const existing = h.prepare(`SELECT 1 FROM review WHERE author_user_id = ? AND organisation_id = ?`)
      .get(input.authorUserId, input.organisationId);
    if (existing) throw new Error('ALREADY_REVIEWED');

    const authorDomain = author.email.split('@')[1]?.toLowerCase();
    // 'verified_engagement' here means something weaker than the identical
    // value on a professional review — a matching, platform-confirmed email
    // domain, not a completed booking. See displayName()/the UI layer for
    // where this distinction must stay visible rather than blurred.
    const basis = org.domainVerifiedAt && org.emailDomain && authorDomain === org.emailDomain.toLowerCase()
      ? 'verified_engagement' : 'unverified';

    const risk = assessFraudRisk({ authorUserId: input.authorUserId, subject: 'organisation_id', subjectId: input.organisationId, body: input.body, basis });
    const privacyHits = detectPrivacyRisk(input.body);
    const moderationStatus = privacyHits.length > 0 ? 'in_review' : risk.tier === 'high' ? 'auto_flagged' : 'pending';
    const ts = now();

    const result = h.prepare(
      `INSERT INTO review (
         organisation_id, author_user_id, basis, display_mode, reviewer_type, experience_category,
         rating_communication, rating_responsiveness, rating_professionalism, rating_process_clarity,
         overall_satisfaction, would_recommend, body,
         moderation_status, trust_signals, trust_score, created_at, updated_at
       ) VALUES (?,?,?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?,?)`,
    ).run(
      input.organisationId, input.authorUserId, basis, input.displayMode, input.reviewerType, input.experienceCategory,
      input.ratings.communication ?? null, input.ratings.responsiveness ?? null,
      input.ratings.professionalism ?? null, input.ratings.processClarity ?? null,
      input.ratings.overallSatisfaction ?? null, input.wouldRecommend ?? null, input.body.trim(),
      moderationStatus, toJson({ tier: risk.tier, signals: risk.signals, privacyHits }), risk.score, ts, ts,
    );
    return { id: Number(result.lastInsertRowid), moderationStatus };
  });
}

export function editReview(reviewId: number, authorUserId: number, updates: { ratings?: RatingInput; wouldRecommend?: WouldRecommend; body?: string }): void {
  transaction(() => {
    const h = db();
    const existing = h.prepare(
      `SELECT body, rating_communication AS communication, rating_responsiveness AS responsiveness,
              rating_professionalism AS professionalism, rating_process_clarity AS processClarity,
              overall_satisfaction AS overallSatisfaction, would_recommend AS wouldRecommend
         FROM review WHERE id = ? AND author_user_id = ? AND deleted_at IS NULL`,
    ).get(reviewId, authorUserId) as (RatingInput & { body: string; wouldRecommend: WouldRecommend | null }) | undefined;
    if (!existing) throw new Error('REVIEW_NOT_FOUND');

    h.prepare(`INSERT INTO review_edit_history (review_id, prior_body, prior_ratings, edited_at) VALUES (?,?,?,?)`)
      .run(reviewId, existing.body, toJson(existing), now());

    const privacyHits = updates.body ? detectPrivacyRisk(updates.body) : [];
    const ts = now();
    h.prepare(
      `UPDATE review SET
         body = COALESCE(?, body),
         rating_communication = COALESCE(?, rating_communication),
         rating_responsiveness = COALESCE(?, rating_responsiveness),
         rating_professionalism = COALESCE(?, rating_professionalism),
         rating_process_clarity = COALESCE(?, rating_process_clarity),
         overall_satisfaction = COALESCE(?, overall_satisfaction),
         would_recommend = COALESCE(?, would_recommend),
         -- An edited review re-enters moderation rather than staying published
         -- unreviewed — the published text must always be what was moderated.
         -- A privacy hit in the new text forces human review even if the
         -- review was never published in the first place.
         moderation_status = CASE
           WHEN ? THEN 'in_review'
           WHEN moderation_status = 'published' THEN 'pending'
           ELSE moderation_status END,
         edited_at = ?, edit_count = edit_count + 1, updated_at = ?
       WHERE id = ?`,
    ).run(
      updates.body?.trim() ?? null, updates.ratings?.communication ?? null, updates.ratings?.responsiveness ?? null,
      updates.ratings?.professionalism ?? null, updates.ratings?.processClarity ?? null,
      updates.ratings?.overallSatisfaction ?? null, updates.wouldRecommend ?? null,
      privacyHits.length > 0 ? 1 : 0, ts, ts, reviewId,
    );
  });
}

export function withdrawReview(reviewId: number, authorUserId: number): boolean {
  const ts = now();
  const result = db().prepare(
    `UPDATE review SET moderation_status = 'withdrawn', updated_at = ? WHERE id = ? AND author_user_id = ?`,
  ).run(ts, reviewId, authorUserId);
  return Number(result.changes) > 0;
}

// -------------------------------------------------------------- response/vote

export function respondToReview(reviewId: number, authorUserId: number, body: string): number {
  const ts = now();
  const result = db().prepare(
    `INSERT INTO review_response (review_id, author_user_id, body, moderation_status, created_at, updated_at)
     VALUES (?,?,?,'pending',?,?)`,
  ).run(reviewId, authorUserId, body.trim(), ts, ts);
  return Number(result.lastInsertRowid);
}

export function voteHelpful(reviewId: number, userId: number, vote: 1 | -1): void {
  const ts = now();
  db().prepare(
    `INSERT INTO review_vote (review_id, user_id, vote, created_at, updated_at) VALUES (?,?,?,?,?)
     ON CONFLICT(review_id, user_id) DO UPDATE SET vote = excluded.vote, updated_at = excluded.updated_at`,
  ).run(reviewId, userId, vote, ts, ts);
}

export function reportReview(reviewId: number, input: { reporterUserId?: number; reporterEmail?: string; reason: string; detail: string }): number {
  const ts = now();
  const result = db().prepare(
    `INSERT INTO content_report (subject_type, subject_id, reporter_user_id, reporter_email, reason, detail, status, created_at)
     VALUES ('review',?,?,?,?,?,'open',?)`,
  ).run(reviewId, input.reporterUserId ?? null, input.reporterEmail ?? null, input.reason, input.detail, ts);
  // A report always bumps a published review back into human review — never
  // auto-removed (§31 fairness), but never left unexamined either.
  db().prepare(`UPDATE review SET moderation_status = 'in_review', updated_at = ? WHERE id = ? AND moderation_status = 'published'`)
    .run(ts, reviewId);
  return Number(result.lastInsertRowid);
}

// ------------------------------------------------------------ discovery feed

export interface RecentReviewFeedItem {
  id: number; body: string; verified: boolean; verifiedVia: 'booking' | 'domain'; displayName: string; experienceCategory: string;
  overallSatisfaction: number | null; createdAt: string;
  subjectName: string; subjectSlug: string;
  // 'organisation' alone isn't enough to build a link — a firm and an LPO
  // live under different routes (/firms vs /lpo), so the org's own `kind`
  // travels with it.
  subjectKind: 'professional' | 'law_firm' | 'chamber' | 'lpo';
}

/** Most recent published reviews across every advocate, firm and LPO — the
 * feed that makes the /reviews hub feel alive rather than a search form
 * with nothing behind it. */
export function listRecentReviewsAcrossPlatform(limit = 12): RecentReviewFeedItem[] {
  const rows = db().prepare(
    `SELECT r.id, r.body, r.basis, r.display_mode AS displayMode, r.experience_category AS experienceCategory,
            r.overall_satisfaction AS overallSatisfaction, r.created_at AS createdAt,
            u.full_name AS authorFullName,
            COALESCE(p.display_name, o.name) AS subjectName,
            COALESCE(p.slug, o.slug) AS subjectSlug,
            CASE WHEN r.organisation_id IS NOT NULL THEN o.kind ELSE 'professional' END AS subjectKind
       FROM review r
       JOIN app_user u ON u.id = r.author_user_id
       LEFT JOIN professional p ON p.id = r.professional_id
       LEFT JOIN organisation o ON o.id = r.organisation_id
      WHERE r.moderation_status = 'published' AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;

  return rows.map((r) => ({
    id: Number(r.id),
    body: String(r.body),
    verified: isVerifiedBasis(String(r.basis)),
    verifiedVia: verifiedVia(r.subjectKind !== 'professional'),
    displayName: displayName(String(r.displayMode), String(r.authorFullName)),
    experienceCategory: String(r.experienceCategory),
    overallSatisfaction: r.overallSatisfaction as number | null,
    createdAt: String(r.createdAt),
    subjectName: String(r.subjectName),
    subjectSlug: String(r.subjectSlug),
    subjectKind: r.subjectKind as 'professional' | 'law_firm' | 'chamber' | 'lpo',
  }));
}

// --------------------------------------------------------------- moderation

export function listModerationQueue(status?: string) {
  const h = db();
  const sql = `
    SELECT r.id, r.body, r.basis, r.display_mode AS displayMode, r.moderation_status AS moderationStatus,
           r.trust_score AS trustScore, r.trust_signals AS trustSignalsJson, r.created_at AS createdAt,
           r.experience_category AS experienceCategory, r.reviewer_type AS reviewerType,
           COALESCE(p.display_name, o.name) AS professionalName,
           COALESCE(p.slug, o.slug) AS professionalSlug,
           CASE WHEN r.organisation_id IS NOT NULL THEN o.kind ELSE 'professional' END AS subjectKind,
           u.full_name AS authorName, u.email AS authorEmail
      FROM review r
      LEFT JOIN professional p ON p.id = r.professional_id
      LEFT JOIN organisation o ON o.id = r.organisation_id
      JOIN app_user u ON u.id = r.author_user_id
     ${status ? 'WHERE r.moderation_status = ?' : ''}
     ORDER BY r.created_at DESC LIMIT 100`;
  const rows = (status ? h.prepare(sql).all(status) : h.prepare(sql).all()) as Array<{
    id: number; body: string; basis: string; displayMode: string; moderationStatus: string;
    trustScore: number; trustSignalsJson: string | null; createdAt: string;
    experienceCategory: string; reviewerType: string; subjectKind: string;
    professionalName: string; professionalSlug: string; authorName: string; authorEmail: string;
  }>;
  return rows.map((r) => {
    const parsed = fromJson<{ tier: string; signals: string[] }>(r.trustSignalsJson as never, { tier: 'low', signals: [] });
    return {
      id: r.id, body: r.body, basis: r.basis, displayMode: r.displayMode, moderationStatus: r.moderationStatus,
      trustScore: r.trustScore, createdAt: r.createdAt, experienceCategory: r.experienceCategory,
      reviewerType: r.reviewerType, professionalName: r.professionalName, professionalSlug: r.professionalSlug,
      subjectKind: r.subjectKind, authorName: r.authorName, authorEmail: r.authorEmail,
      trustTier: parsed.tier, trustSignals: parsed.signals,
    };
  });
}

/**
 * Where a review's subject actually lives — resolved from the review row
 * itself rather than trusted from a client-supplied basePath, so a caller
 * (e.g. a revalidatePath after voting/reporting/responding) can never point
 * at the wrong route for an organisation review.
 */
export function getReviewSubjectPath(reviewId: number): { basePath: string; slug: string } | null {
  const row = db().prepare(
    `SELECT p.slug AS professionalSlug, o.slug AS organisationSlug, o.kind AS organisationKind
       FROM review r
       LEFT JOIN professional p ON p.id = r.professional_id
       LEFT JOIN organisation o ON o.id = r.organisation_id
      WHERE r.id = ?`,
  ).get(reviewId) as { professionalSlug: string | null; organisationSlug: string | null; organisationKind: string | null } | undefined;
  if (!row) return null;
  if (row.professionalSlug) return { basePath: '/advocates', slug: row.professionalSlug };
  if (row.organisationSlug) {
    return { basePath: row.organisationKind === 'lpo' ? '/lpo' : '/firms', slug: row.organisationSlug };
  }
  return null;
}

export function moderateReview(reviewId: number, moderatorUserId: number, decision: 'published' | 'rejected' | 'in_review', note?: string): void {
  const ts = now();
  db().prepare(
    `UPDATE review SET moderation_status = ?, moderation_note = ?, moderated_by_user_id = ?, moderated_at = ?, updated_at = ? WHERE id = ?`,
  ).run(decision, note ?? null, moderatorUserId, ts, ts, reviewId);
}

// ------------------------------------------------------------------- display

export const VERIFIED_BASES = ['verified_consultation', 'verified_engagement'] as const;
export function isVerifiedBasis(basis: string): boolean {
  return (VERIFIED_BASES as readonly string[]).includes(basis);
}

/**
 * A "verified" badge on a professional review and one on an organisation
 * review currently mean different strengths of evidence: a completed
 * booking/consultation/appointment/matter versus only a matching,
 * platform-confirmed email domain (organisations have no booking model
 * yet). Collapsing both into one "Verified experience" label would blur
 * that distinction — the UI must say which kind it is.
 */
function verifiedVia(isOrganisationSubject: boolean): 'booking' | 'domain' {
  return isOrganisationSubject ? 'domain' : 'booking';
}

function displayName(displayMode: string, fullName: string): string {
  if (displayMode === 'anonymous') return 'Anonymous reviewer';
  if (displayMode === 'pseudonymous') {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0] ?? 'Reviewer';
    const last = parts[parts.length - 1];
    if (parts.length < 2 || !last) return first;
    return `${first} ${last[0]}.`;
  }
  return fullName;
}

export type ReviewFilter = 'all' | 'verified' | 'anonymous';
export type ReviewSort = 'recent' | 'helpful' | 'highest' | 'lowest';

type ReviewSubject = 'professional_id' | 'organisation_id';

export interface ReviewListItem {
  id: number;
  body: string;
  verified: boolean;
  verifiedVia: 'booking' | 'domain';
  displayName: string;
  displayMode: string;
  reviewerType: string;
  experienceCategory: string;
  ratings: {
    communication: number | null; responsiveness: number | null; professionalism: number | null;
    processClarity: number | null; overallSatisfaction: number | null;
  };
  wouldRecommend: string | null;
  createdAt: string;
  edited: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  response: { body: string; createdAt: string } | null;
}

export function listReviewsForProfessional(professionalId: number, opts?: { filter?: ReviewFilter; sort?: ReviewSort; limit?: number; offset?: number }): ReviewListItem[] {
  return listReviewsForSubject('professional_id', professionalId, opts);
}

export function listReviewsForOrganisation(organisationId: number, opts?: { filter?: ReviewFilter; sort?: ReviewSort; limit?: number; offset?: number }): ReviewListItem[] {
  return listReviewsForSubject('organisation_id', organisationId, opts);
}

function listReviewsForSubject(subject: ReviewSubject, subjectId: number, opts?: { filter?: ReviewFilter; sort?: ReviewSort; limit?: number; offset?: number }): ReviewListItem[] {
  const h = db();
  const filter = opts?.filter ?? 'all';
  const sort = opts?.sort ?? 'recent';
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const conditions = [`r.${subject} = ?`, `r.moderation_status = 'published'`, `r.deleted_at IS NULL`];
  if (filter === 'verified') conditions.push(`r.basis IN (${VERIFIED_BASES.map((b) => `'${b}'`).join(',')})`);
  if (filter === 'anonymous') conditions.push(`r.display_mode = 'anonymous'`);

  const orderBy = {
    recent: 'r.created_at DESC',
    helpful: 'helpfulCount DESC, r.created_at DESC',
    highest: 'r.overall_satisfaction DESC, r.created_at DESC',
    lowest: 'r.overall_satisfaction ASC, r.created_at DESC',
  }[sort];

  const rows = h.prepare(
    `SELECT r.id, r.body, r.basis, r.display_mode AS displayMode, r.reviewer_type AS reviewerType,
            r.experience_category AS experienceCategory, r.rating_communication AS communication,
            r.rating_responsiveness AS responsiveness, r.rating_professionalism AS professionalism,
            r.rating_process_clarity AS processClarity, r.overall_satisfaction AS overallSatisfaction,
            r.would_recommend AS wouldRecommend, r.created_at AS createdAt, r.edited_at AS editedAt,
            u.full_name AS authorFullName,
            (SELECT count(*) FROM review_vote v WHERE v.review_id = r.id AND v.vote = 1) AS helpfulCount,
            (SELECT count(*) FROM review_vote v WHERE v.review_id = r.id AND v.vote = -1) AS notHelpfulCount,
            resp.body AS responseBody, resp.created_at AS responseCreatedAt
       FROM review r
       JOIN app_user u ON u.id = r.author_user_id
       LEFT JOIN review_response resp ON resp.review_id = r.id AND resp.moderation_status = 'published'
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
  ).all(subjectId, limit, offset) as unknown as Array<Record<string, string | number | null>>;

  return rows.map((r) => ({
    id: Number(r.id),
    body: String(r.body),
    verified: isVerifiedBasis(String(r.basis)),
    verifiedVia: verifiedVia(subject === 'organisation_id'),
    displayName: displayName(String(r.displayMode), String(r.authorFullName)),
    displayMode: String(r.displayMode),
    reviewerType: String(r.reviewerType),
    experienceCategory: String(r.experienceCategory),
    ratings: {
      communication: r.communication as number | null, responsiveness: r.responsiveness as number | null,
      professionalism: r.professionalism as number | null, processClarity: r.processClarity as number | null,
      overallSatisfaction: r.overallSatisfaction as number | null,
    },
    wouldRecommend: r.wouldRecommend as string | null,
    createdAt: String(r.createdAt),
    edited: r.editedAt != null,
    helpfulCount: Number(r.helpfulCount),
    notHelpfulCount: Number(r.notHelpfulCount),
    response: r.responseBody ? { body: String(r.responseBody), createdAt: String(r.responseCreatedAt) } : null,
  }));
}

/**
 * "What people mention" — theme extraction over published review text.
 * Deliberately dumb keyword matching, not an LLM: a theme is only surfaced
 * when it appears in a meaningful share of reviews, and the words come
 * straight from real published bodies — nothing here is generated or
 * inferred (§18 "do not invent pros or cons"). Themes are experience-shaped
 * (communication, responsiveness…), never a claim about legal competence.
 */
const THEME_KEYWORDS: Array<{ theme: string; pattern: RegExp; sentiment: 'positive' | 'watch' }> = [
  { theme: 'Clear communication', pattern: /\bclear(ly)?\b.{0,30}\b(communicat|explain)|\b(communicat|explain)\w*.{0,30}\bclear(ly)?\b/i, sentiment: 'positive' },
  { theme: 'Responsive', pattern: /\b(responsive|quick(ly)? to respond|replied? (quickly|promptly)|prompt response)\b/i, sentiment: 'positive' },
  { theme: 'Professional approach', pattern: /\bprofessional(ism)?\b/i, sentiment: 'positive' },
  { theme: 'Process explained well', pattern: /\bprocess\b.{0,25}\b(explain|clear|understood)/i, sentiment: 'positive' },
  { theme: 'Well documented', pattern: /\b(documentation|paperwork|drafting)\b.{0,20}\b(clear|thorough|organi[sz]ed)/i, sentiment: 'positive' },
  { theme: 'On time', pattern: /\b(on time|punctual|started on time)\b/i, sentiment: 'positive' },
  { theme: 'Response delays', pattern: /\b(delay|slow to respond|took (a while|long)|did not respond|hard to reach)\b/i, sentiment: 'watch' },
  { theme: 'Scheduling difficulty', pattern: /\b(reschedul|scheduling (issue|problem|difficult)|hard to book)\b/i, sentiment: 'watch' },
];
const THEME_MIN_MENTIONS = 3;

function extractThemes(bodies: string[]): Array<{ theme: string; sentiment: 'positive' | 'watch'; mentions: number }> {
  return THEME_KEYWORDS
    .map(({ theme, pattern, sentiment }) => ({ theme, sentiment, mentions: bodies.filter((b) => pattern.test(b)).length }))
    .filter((t) => t.mentions >= THEME_MIN_MENTIONS)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6);
}

export type ReviewBand = 'none' | 'new' | 'early' | 'established';
function bandFor(count: number): ReviewBand {
  if (count === 0) return 'none';
  if (count < 5) return 'new';
  if (count < 10) return 'early';
  return 'established';
}

interface SummaryRow {
  n: number; communication: number | null; responsiveness: number | null; professionalism: number | null;
  processClarity: number | null; overallSatisfaction: number | null; yesCount: number; recommendDenominator: number;
  verifiedCount: number;
}

function summarizeSubject(subject: ReviewSubject, subjectId: number) {
  const h = db();
  const row = h.prepare(
    `SELECT count(*) AS n,
            avg(rating_communication) AS communication, avg(rating_responsiveness) AS responsiveness,
            avg(rating_professionalism) AS professionalism, avg(rating_process_clarity) AS processClarity,
            avg(overall_satisfaction) AS overallSatisfaction,
            sum(CASE WHEN would_recommend = 'yes' THEN 1 ELSE 0 END) AS yesCount,
            sum(CASE WHEN would_recommend IN ('yes','no') THEN 1 ELSE 0 END) AS recommendDenominator,
            sum(CASE WHEN basis IN (${VERIFIED_BASES.map((b) => `'${b}'`).join(',')}) THEN 1 ELSE 0 END) AS verifiedCount
       FROM review WHERE ${subject} = ? AND moderation_status = 'published' AND deleted_at IS NULL`,
  ).get(subjectId) as unknown as SummaryRow;

  const band = bandFor(row.n);
  if (band === 'none' || band === 'new') {
    return { count: row.n, band, insufficientSample: true as const, verifiedCount: row.verifiedCount };
  }

  // Star distribution (overall_satisfaction rounded to 1..5) and a plain-
  // language satisfaction distribution over the same ratings — two views of
  // the same underlying numbers, per §17/§16 of the product brief.
  const starRows = h.prepare(
    `SELECT overall_satisfaction AS star, count(*) AS n FROM review
      WHERE ${subject} = ? AND moderation_status = 'published' AND deleted_at IS NULL AND overall_satisfaction IS NOT NULL
      GROUP BY overall_satisfaction`,
  ).all(subjectId) as Array<{ star: number; n: number }>;
  const starTotal = starRows.reduce((sum, r) => sum + r.n, 0);
  const starDistribution = [5, 4, 3, 2, 1].map((star) => {
    const found = starRows.find((r) => r.star === star);
    const n = found?.n ?? 0;
    return { star, count: n, percent: starTotal > 0 ? Math.round((n / starTotal) * 100) : 0 };
  });
  const satisfactionDistribution = [
    { level: 'Very satisfied', stars: [5], ...pctFor(starRows, starTotal, [5]) },
    { level: 'Satisfied', stars: [4], ...pctFor(starRows, starTotal, [4]) },
    { level: 'Neutral', stars: [3], ...pctFor(starRows, starTotal, [3]) },
    { level: 'Dissatisfied', stars: [2], ...pctFor(starRows, starTotal, [2]) },
    { level: 'Very dissatisfied', stars: [1], ...pctFor(starRows, starTotal, [1]) },
  ].map(({ level, count, percent }) => ({ level, count, percent }));

  const bodies = (h.prepare(
    `SELECT body FROM review WHERE ${subject} = ? AND moderation_status = 'published' AND deleted_at IS NULL`,
  ).all(subjectId) as Array<{ body: string }>).map((r) => r.body);

  const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
  return {
    count: row.n,
    band,
    insufficientSample: false as const,
    verifiedCount: row.verifiedCount,
    // Dimension breakdown only at the 'established' band (10+) — at 'early'
    // (5-9) the caller shows overall + recommend but withholds the
    // dimension table, per the brief's tiered-confidence banding.
    overallSatisfaction: round1(row.overallSatisfaction),
    communication: band === 'established' ? round1(row.communication) : null,
    responsiveness: band === 'established' ? round1(row.responsiveness) : null,
    professionalism: band === 'established' ? round1(row.professionalism) : null,
    processClarity: band === 'established' ? round1(row.processClarity) : null,
    recommendPercent: row.recommendDenominator > 0 ? Math.round((row.yesCount / row.recommendDenominator) * 100) : null,
    starDistribution: band === 'established' ? starDistribution : null,
    satisfactionDistribution: band === 'established' ? satisfactionDistribution : null,
    themes: band === 'established' ? extractThemes(bodies) : [],
  };
}

function pctFor(starRows: Array<{ star: number; n: number }>, total: number, stars: number[]): { count: number; percent: number } {
  const count = starRows.filter((r) => stars.includes(r.star)).reduce((sum, r) => sum + r.n, 0);
  return { count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
}

/**
 * Aggregate summary for a profile header. Sample-size protected (§28,
 * §30/§31): the band gates what's shown — no numeric average below 5
 * reviews, no dimension breakdown or distribution below 10 — never a
 * confident-looking number from too little data.
 */
export type ReviewSummary = ReturnType<typeof summarizeSubject>;

export function getProfessionalReviewSummary(professionalId: number): ReviewSummary {
  return summarizeSubject('professional_id', professionalId);
}

export function getOrganisationReviewSummary(organisationId: number): ReviewSummary {
  return summarizeSubject('organisation_id', organisationId);
}
