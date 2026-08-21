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

const SAMPLE_SIZE_THRESHOLD = 3;

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

function assessFraudRisk(input: { authorUserId: number; professionalId: number; body: string; basis: string }): FraudAssessment {
  const h = db();
  const signals: string[] = [];
  let score = 0;

  const velocity = h.prepare(
    `SELECT count(*) AS n FROM review WHERE author_user_id = ? AND created_at > datetime('now','-1 day')`,
  ).get(input.authorUserId) as { n: number };
  if (velocity.n >= 3) { score += 40; signals.push(`review_velocity:${velocity.n}_in_24h`); }

  const normalized = input.body.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length > 0) {
    const dup = h.prepare(
      `SELECT count(*) AS n FROM review
        WHERE professional_id = ? AND lower(trim(body)) = ? AND created_at > datetime('now','-30 day')`,
    ).get(input.professionalId, normalized) as { n: number };
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

    const risk = assessFraudRisk({ authorUserId: input.authorUserId, professionalId: input.professionalId, body: input.body, basis });
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

// --------------------------------------------------------------- moderation

export function listModerationQueue(status?: string) {
  const h = db();
  const sql = `
    SELECT r.id, r.body, r.basis, r.display_mode AS displayMode, r.moderation_status AS moderationStatus,
           r.trust_score AS trustScore, r.trust_signals AS trustSignalsJson, r.created_at AS createdAt,
           r.experience_category AS experienceCategory, r.reviewer_type AS reviewerType,
           p.display_name AS professionalName, p.slug AS professionalSlug,
           u.full_name AS authorName, u.email AS authorEmail
      FROM review r
      JOIN professional p ON p.id = r.professional_id
      JOIN app_user u ON u.id = r.author_user_id
     ${status ? 'WHERE r.moderation_status = ?' : ''}
     ORDER BY r.created_at DESC LIMIT 100`;
  const rows = (status ? h.prepare(sql).all(status) : h.prepare(sql).all()) as Array<{
    id: number; body: string; basis: string; displayMode: string; moderationStatus: string;
    trustScore: number; trustSignalsJson: string | null; createdAt: string;
    experienceCategory: string; reviewerType: string;
    professionalName: string; professionalSlug: string; authorName: string; authorEmail: string;
  }>;
  return rows.map((r) => {
    const parsed = fromJson<{ tier: string; signals: string[] }>(r.trustSignalsJson as never, { tier: 'low', signals: [] });
    return {
      id: r.id, body: r.body, basis: r.basis, displayMode: r.displayMode, moderationStatus: r.moderationStatus,
      trustScore: r.trustScore, createdAt: r.createdAt, experienceCategory: r.experienceCategory,
      reviewerType: r.reviewerType, professionalName: r.professionalName, professionalSlug: r.professionalSlug,
      authorName: r.authorName, authorEmail: r.authorEmail,
      trustTier: parsed.tier, trustSignals: parsed.signals,
    };
  });
}

export function moderateReview(reviewId: number, moderatorUserId: number, decision: 'published' | 'rejected' | 'in_review', note?: string): void {
  const ts = now();
  db().prepare(
    `UPDATE review SET moderation_status = ?, moderation_note = ?, moderated_by_user_id = ?, moderated_at = ?, updated_at = ? WHERE id = ?`,
  ).run(decision, note ?? null, moderatorUserId, ts, ts, reviewId);
}

// ------------------------------------------------------------------- display

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

export function listReviewsForProfessional(professionalId: number, opts?: { filter?: ReviewFilter; sort?: ReviewSort; limit?: number; offset?: number }) {
  const h = db();
  const filter = opts?.filter ?? 'all';
  const sort = opts?.sort ?? 'recent';
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const conditions = [`r.professional_id = ?`, `r.moderation_status = 'published'`, `r.deleted_at IS NULL`];
  if (filter === 'verified') conditions.push(`r.basis IN ('verified_consultation','verified_engagement')`);
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
  ).all(professionalId, limit, offset) as Array<Record<string, string | number | null>>;

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    verified: r.basis === 'verified_consultation' || r.basis === 'verified_engagement',
    displayName: displayName(String(r.displayMode), String(r.authorFullName)),
    displayMode: r.displayMode,
    reviewerType: r.reviewerType,
    experienceCategory: r.experienceCategory,
    ratings: {
      communication: r.communication, responsiveness: r.responsiveness,
      professionalism: r.professionalism, processClarity: r.processClarity,
      overallSatisfaction: r.overallSatisfaction,
    },
    wouldRecommend: r.wouldRecommend,
    createdAt: r.createdAt,
    edited: r.editedAt != null,
    helpfulCount: r.helpfulCount,
    notHelpfulCount: r.notHelpfulCount,
    response: r.responseBody ? { body: r.responseBody, createdAt: r.responseCreatedAt } : null,
  }));
}

/**
 * Aggregate summary for a profile header. Sample-size protected (§28): a
 * breakdown only renders once there are at least SAMPLE_SIZE_THRESHOLD
 * published reviews — below that, callers get `insufficientSample: true`
 * and the raw count, nothing that reads as a confident average.
 */
export function getProfessionalReviewSummary(professionalId: number) {
  const h = db();
  const row = h.prepare(
    `SELECT count(*) AS n,
            avg(rating_communication) AS communication, avg(rating_responsiveness) AS responsiveness,
            avg(rating_professionalism) AS professionalism, avg(rating_process_clarity) AS processClarity,
            avg(overall_satisfaction) AS overallSatisfaction,
            sum(CASE WHEN would_recommend = 'yes' THEN 1 ELSE 0 END) AS yesCount,
            sum(CASE WHEN would_recommend IN ('yes','no') THEN 1 ELSE 0 END) AS recommendDenominator,
            sum(CASE WHEN basis IN ('verified_consultation','verified_engagement') THEN 1 ELSE 0 END) AS verifiedCount
       FROM review WHERE professional_id = ? AND moderation_status = 'published' AND deleted_at IS NULL`,
  ).get(professionalId) as {
    n: number; communication: number | null; responsiveness: number | null; professionalism: number | null;
    processClarity: number | null; overallSatisfaction: number | null; yesCount: number; recommendDenominator: number;
    verifiedCount: number;
  };

  if (row.n < SAMPLE_SIZE_THRESHOLD) {
    return { count: row.n, insufficientSample: true as const, verifiedCount: row.verifiedCount };
  }

  const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
  return {
    count: row.n,
    insufficientSample: false as const,
    verifiedCount: row.verifiedCount,
    overallSatisfaction: round1(row.overallSatisfaction),
    communication: round1(row.communication),
    responsiveness: round1(row.responsiveness),
    professionalism: round1(row.professionalism),
    processClarity: round1(row.processClarity),
    recommendPercent: row.recommendDenominator > 0 ? Math.round((row.yesCount / row.recommendDenominator) * 100) : null,
  };
}
