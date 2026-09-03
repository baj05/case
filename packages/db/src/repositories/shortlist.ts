/**
 * Advo AI shortlisting and the advocate-configuration loop.
 *
 * The shortlist is the search engine with fee and experience constraints layered
 * on, so it stays explainable and cannot diverge from the main ranking.
 */
import { db, now, flag, transaction } from '../client.ts';
import { referenceCode } from '../ids.ts';
import type { CollectedFacts, ShortlistSort, Turn } from '@lexhall/core';
import { searchProfessionals } from './search.ts';
import { rebuildFeeSummary } from './fees.ts';
import { rebuildSearchIndex, applyPublishGate, recomputeConfidence } from './professionals.ts';

export interface ShortlistEntry {
  id: number; slug: string; displayName: string; bodyRole: string | null; photoUrl: string | null;
  verificationLevel: number; claimStatus: string; locationName: string | null;
  yearsExperience: number | null; enrolmentYear: number | null;
  acceptsConsultations: boolean;
  minConsultMinor: number | null; maxConsultMinor: number | null;
  currencyCode: string; hasFilingFees: boolean; serviceCount: number;
  practiceAreas: string[]; courts: string[];
  score: number;
  /** Why this one is on the list, in plain language. */
  reasons: string[];
  /** Why it might not suit, stated honestly rather than hidden. */
  caveats: string[];
}

export function shortlist(facts: CollectedFacts, sort: ShortlistSort = 'match', limit = 12): ShortlistEntry[] {
  const h = db();

  // Reuse the main search so ranking logic exists in exactly one place.
  const outcome = searchProfessionals({
    practice: facts.practiceAreaId
      ? (h.prepare(`SELECT slug FROM practice_area WHERE id=?`).get(facts.practiceAreaId) as { slug: string } | undefined)?.slug
      : undefined,
    location: facts.locationId
      ? (h.prepare(`SELECT slug FROM location WHERE id=?`).get(facts.locationId) as { slug: string } | undefined)?.slug
      : undefined,
    court: facts.courtId
      ? (h.prepare(`SELECT slug FROM court WHERE id=?`).get(facts.courtId) as { slug: string } | undefined)?.slug
      : undefined,
    perPage: 48,
  });

  const entries: ShortlistEntry[] = [];
  for (const hit of outcome.hits) {
    const p = hit.professional;
    const fees = h.prepare(
      `SELECT currency_code AS cur, min_consult_minor AS lo, max_consult_minor AS hi,
              has_filing_fees AS filing, service_count AS n
         FROM professional_fee_summary WHERE professional_id = ?`,
    ).get(p.id) as { cur: string; lo: number | null; hi: number | null; filing: number; n: number } | undefined;

    const years = p.yearsExperience ?? (p.enrolmentYear ? new Date().getFullYear() - p.enrolmentYear : null);

    const reasons: string[] = [];
    const caveats: string[] = [];

    for (const f of hit.factors) {
      if (f.earned >= f.weight * 0.75 && f.weight >= 10) reasons.push(f.detail);
      if (f.earned <= f.weight * 0.2 && f.weight >= 14) caveats.push(f.detail);
    }
    if (p.claimStatus !== 'claimed') caveats.push('Profile not yet confirmed by the professional');
    if (!fees || fees.n === 0) caveats.push('No fees published — you will need to ask');
    if (!p.acceptsConsultations) caveats.push('Not currently accepting requests');

    // Hard filters from the conversation. Applied AFTER ranking so we can tell
    // the user what was excluded rather than silently dropping it.
    if (facts.budgetMaxMinor !== null && fees?.lo != null && fees.lo > facts.budgetMaxMinor) continue;
    if (facts.minExperienceYears !== null && years !== null && years < facts.minExperienceYears) continue;

    entries.push({
      id: p.id, slug: p.slug, displayName: p.displayName, bodyRole: p.bodyRole, photoUrl: p.photoUrl,
      verificationLevel: p.verificationLevel, claimStatus: p.claimStatus,
      locationName: p.locationName, yearsExperience: years, enrolmentYear: p.enrolmentYear,
      acceptsConsultations: p.acceptsConsultations,
      minConsultMinor: fees?.lo ?? null, maxConsultMinor: fees?.hi ?? null,
      currencyCode: fees?.cur ?? 'INR', hasFilingFees: fees?.filing === 1,
      serviceCount: fees?.n ?? 0,
      practiceAreas: p.practiceAreas.map((a) => a.name),
      courts: p.courts.map((c) => c.shortName ?? c.name),
      score: hit.score, reasons: reasons.slice(0, 3), caveats: caveats.slice(0, 3),
    });
  }

  // Entries without a published fee sort last on fee ordering rather than
  // pretending they are free.
  const feeOf = (e: ShortlistEntry) => (e.minConsultMinor ?? Number.NEGATIVE_INFINITY);
  switch (sort) {
    case 'fee_desc': entries.sort((a, b) => feeOf(b) - feeOf(a) || b.score - a.score); break;
    case 'fee_asc': entries.sort((a, b) => {
      const av = a.minConsultMinor ?? Number.POSITIVE_INFINITY;
      const bv = b.minConsultMinor ?? Number.POSITIVE_INFINITY;
      return av - bv || b.score - a.score;
    }); break;
    case 'experience_desc': entries.sort((a, b) => (b.yearsExperience ?? -1) - (a.yearsExperience ?? -1) || b.score - a.score); break;
    case 'verification_desc': entries.sort((a, b) => b.verificationLevel - a.verificationLevel || b.score - a.score); break;
    default: entries.sort((a, b) => b.score - a.score);
  }
  return entries.slice(0, limit);
}

export function saveIntakeSession(input: {
  facts: CollectedFacts; transcript: Turn[]; resultCount: number; status?: string;
}): string {
  const reference = referenceCode('AI');
  const ts = now();
  db().prepare(
    `INSERT INTO intake_session (reference, session_ref, transcript, practice_area_id,
       matter_type_id, location_id, court_id, urgency, budget_max_minor,
       min_experience_years, status, result_count, created_at, updated_at)
     VALUES (?,NULL,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(reference, JSON.stringify(input.transcript), input.facts.practiceAreaId,
    input.facts.matterTypeId, input.facts.locationId, input.facts.courtId,
    input.facts.urgency, input.facts.budgetMaxMinor, input.facts.minExperienceYears,
    input.status ?? 'routed', input.resultCount, ts, ts);
  return reference;
}

export function listIntakeSessions(limit = 20) {
  return db().prepare(
    `SELECT i.reference, i.urgency, i.budget_max_minor AS budgetMaxMinor,
            i.min_experience_years AS minExperienceYears, i.status,
            i.result_count AS resultCount, i.created_at AS createdAt,
            pa.name AS practiceAreaName, l.name AS locationName
       FROM intake_session i
       LEFT JOIN practice_area pa ON pa.id = i.practice_area_id
       LEFT JOIN location l ON l.id = i.location_id
      ORDER BY i.created_at DESC LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;
}

// --------------------------------------------------- claim approval + config
/**
 * Approve a claim. This is the hinge of the whole product: until a claim is
 * approved nobody can declare practice areas, availability or fees, which is
 * why unclaimed profiles legitimately show none of those things.
 *
 * PROTOTYPE NOTE: reached through the unauthenticated admin surface, which is
 * the top release blocker. In production this requires platform_admin.
 */
export function approveClaim(claimId: number, reviewerNote: string): { professionalId: number; slug: string } {
  return transaction(() => {
    const h = db();
    const ts = now();
    const claim = h.prepare(
      `SELECT c.id, c.professional_id, c.contact_email, c.claimed_enrolment_number, c.match_score,
              p.slug FROM claim c JOIN professional p ON p.id = c.professional_id WHERE c.id = ?`,
    ).get(claimId) as {
      id: number; professional_id: number; contact_email: string;
      claimed_enrolment_number: string | null; match_score: number; slug: string;
    } | undefined;
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    h.prepare(`UPDATE claim SET status='approved', reviewed_at=?, decision_note=?, updated_at=? WHERE id=?`)
      .run(ts, reviewerNote, ts, claimId);
    // Competing claims on the same profile are rejected, not left dangling.
    h.prepare(
      `UPDATE claim SET status='rejected', reviewed_at=?, decision_note=?, updated_at=?
        WHERE professional_id=? AND id<>? AND status IN ('submitted','evidence_requested','under_review')`,
    ).run(ts, 'Another claim on this profile was approved.', ts, claim.professional_id, claimId);

    // Level 1 on approval: we have confirmed a working contact. Bar enrolment
    // verification (level 3) is a separate, evidenced step — approving a claim
    // does not earn it.
    h.prepare(
      `UPDATE professional SET claim_status='claimed', claimed_at=?, verification_level=MAX(verification_level,1),
         accepts_consultations=1, public_email=COALESCE(public_email, ?), updated_at=? WHERE id=?`,
    ).run(ts, claim.contact_email, ts, claim.professional_id);

    h.prepare(
      `INSERT INTO verification (professional_id, level, method, outcome, evidence_note, created_at)
       VALUES (?,1,'email','granted',?,?)`,
    ).run(claim.professional_id, `Claim approved. Automatic match signal ${claim.match_score}/100. ${reviewerNote}`, ts);

    h.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, after_state, reason, created_at)
       VALUES (NULL,'platform_admin','claim.approved','professional',?,?,?,?)`,
    ).run(claim.professional_id, JSON.stringify({ claim_status: 'claimed', verification_level: 1 }), reviewerNote, ts);

    return { professionalId: claim.professional_id, slug: claim.slug };
  });
}

export function rejectClaim(claimId: number, reason: string): boolean {
  return transaction(() => {
    const h = db();
    const ts = now();
    const claim = h.prepare(`SELECT professional_id FROM claim WHERE id=?`).get(claimId) as { professional_id: number } | undefined;
    if (!claim) return false;
    h.prepare(`UPDATE claim SET status='rejected', reviewed_at=?, decision_note=?, updated_at=? WHERE id=?`)
      .run(ts, reason, ts, claimId);
    const others = h.prepare(
      `SELECT count(*) n FROM claim WHERE professional_id=? AND status IN ('submitted','evidence_requested','under_review')`,
    ).get(claim.professional_id) as { n: number };
    if (others.n === 0) {
      h.prepare(`UPDATE professional SET claim_status='unclaimed', updated_at=? WHERE id=? AND claim_status<>'claimed'`)
        .run(ts, claim.professional_id);
    }
    h.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, reason, created_at)
       VALUES (NULL,'platform_admin','claim.rejected','professional',?,?,?)`,
    ).run(claim.professional_id, reason, ts);
    return true;
  });
}

/** Set availability for a claimed profile. Replaces existing rules. */
export function setAvailability(professionalId: number, rules: Array<{
  weekday: number; startMinute: number; endMinute: number; mode: string; slotMinutes: number; timezone?: string;
}>): number {
  return transaction(() => {
    const h = db();
    h.prepare(`DELETE FROM availability_rule WHERE professional_id=?`).run(professionalId);
    for (const r of rules) {
      h.prepare(
        `INSERT INTO availability_rule (professional_id, weekday, start_minute, end_minute,
           mode, slot_minutes, timezone, is_active, created_at)
         VALUES (?,?,?,?,?,?,?,1,?)`,
      ).run(professionalId, r.weekday, r.startMinute, r.endMinute, r.mode, r.slotMinutes, r.timezone ?? 'Asia/Kolkata', now());
    }
    return rules.length;
  });
}

/** Attach practice areas a claimed advocate declares. Self-declared by definition. */
export function declarePracticeAreas(professionalId: number, practiceAreaIds: number[], primaryId?: number): void {
  transaction(() => {
    const h = db();
    h.prepare(`DELETE FROM professional_practice_area WHERE professional_id=? AND is_self_declared=1`).run(professionalId);
    for (const id of practiceAreaIds) {
      h.prepare(
        `INSERT INTO professional_practice_area (professional_id, practice_area_id, is_primary, is_self_declared, created_at)
         VALUES (?,?,?,1,?) ON CONFLICT DO NOTHING`,
      ).run(professionalId, id, flag(id === primaryId), now());
    }
  });
}

/**
 * Enforce the booking invariant: a profile may only advertise that it accepts
 * consultations if it actually has bookable availability. Otherwise the UI
 * offers a "Book" button that leads to an empty slot list — the dead end that
 * spec §139 forbids and the false availability §140 forbids.
 */
export function reconcileAcceptingFlag(): { enabled: number; disabled: number } {
  const h = db();
  const before = Number((h.prepare(`SELECT count(*) n FROM professional WHERE accepts_consultations=1`).get() as { n: number }).n);
  h.prepare(
    `UPDATE professional SET accepts_consultations = CASE
       WHEN claim_status <> 'claimed' THEN 0
       WHEN NOT EXISTS (SELECT 1 FROM availability_rule a
                         WHERE a.professional_id = professional.id AND a.is_active = 1) THEN 0
       ELSE 1 END,
     updated_at = ?`,
  ).run(now());
  const after = Number((h.prepare(`SELECT count(*) n FROM professional WHERE accepts_consultations=1`).get() as { n: number }).n);
  return { enabled: after, disabled: Math.max(0, before - after) };
}

/** Recompute everything derived, after any configuration change. */
export function reindexAll(): { published: number; indexed: number; accepting: number } {
  rebuildFeeSummary();
  const accepting = reconcileAcceptingFlag();
  recomputeConfidence();
  const gate = applyPublishGate();
  const indexed = rebuildSearchIndex();
  return { published: gate.published, indexed, accepting: accepting.enabled };
}
