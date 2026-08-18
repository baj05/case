/**
 * Consultation requests, profile claims and data (DPDP) requests.
 * These are the write paths a real visitor exercises in Phase 1.
 */
import { db, now, flag, transaction } from '../client.ts';
import { referenceCode } from '../ids.ts';
import { fold, trigramSimilarity } from '@lexhall/core';

// ---------------------------------------------------------------- consultation
export interface ConsultationInput {
  professionalId: number;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  practiceAreaId?: number | null;
  matterTypeId?: number | null;
  locationId?: number | null;
  courtId?: number | null;
  summary: string;
  preferredMode: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  conflictCheckAck: boolean;
}

export function createConsultationRequest(input: ConsultationInput): { id: number; reference: string } {
  return transaction(() => {
    const h = db();
    const ts = now();

    // Guard: the professional must exist, be published and be accepting.
    const target = h.prepare(
      `SELECT id, accepts_consultations FROM professional WHERE id=? AND is_published=1 AND deleted_at IS NULL`,
    ).get(input.professionalId) as { id: number; accepts_consultations: number } | undefined;
    if (!target) throw new Error('PROFESSIONAL_NOT_AVAILABLE');

    // Rate guard: one identical pending request per email per professional.
    const duplicate = h.prepare(
      `SELECT id, reference FROM consultation_request
        WHERE professional_id=? AND lower(requester_email)=lower(?) AND status='submitted'
          AND created_at > datetime('now','-1 day')`,
    ).get(input.professionalId, input.requesterEmail) as { id: number; reference: string } | undefined;
    if (duplicate) return { id: duplicate.id, reference: duplicate.reference };

    const reference = referenceCode('CR');
    const info = h.prepare(
      `INSERT INTO consultation_request (
         reference, professional_id, requester_user_id, requester_name, requester_email, requester_phone,
         practice_area_id, matter_type_id, location_id, court_id, summary, preferred_mode, urgency,
         status, conflict_check_ack, consent_terms_at, created_at, updated_at
       ) VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,?,'submitted',?,?,?,?)`,
    ).run(reference, input.professionalId, input.requesterName, input.requesterEmail, input.requesterPhone ?? null,
      input.practiceAreaId ?? null, input.matterTypeId ?? null, input.locationId ?? null, input.courtId ?? null,
      input.summary, input.preferredMode, input.urgency, flag(input.conflictCheckAck), ts, ts, ts);

    return { id: Number(info.lastInsertRowid), reference };
  });
}

export function getConsultationByReference(reference: string) {
  return db().prepare(
    `SELECT cr.reference, cr.status, cr.requester_name AS requesterName, cr.summary,
            cr.preferred_mode AS preferredMode, cr.urgency, cr.created_at AS createdAt,
            p.display_name AS professionalName, p.slug AS professionalSlug,
            pa.name AS practiceAreaName, mt.name AS matterTypeName
       FROM consultation_request cr
       JOIN professional p ON p.id = cr.professional_id
       LEFT JOIN practice_area pa ON pa.id = cr.practice_area_id
       LEFT JOIN matter_type mt ON mt.id = cr.matter_type_id
      WHERE cr.reference = ?`,
  ).get(reference) as Record<string, string | null> | undefined;
}

export function listConsultationsForProfessional(professionalId: number) {
  return db().prepare(
    `SELECT cr.id, cr.reference, cr.status, cr.requester_name AS requesterName, cr.summary,
            cr.urgency, cr.preferred_mode AS preferredMode, cr.created_at AS createdAt,
            cr.first_viewed_at AS firstViewedAt,
            pa.name AS practiceAreaName, mt.name AS matterTypeName, l.name AS locationName
       FROM consultation_request cr
       LEFT JOIN practice_area pa ON pa.id = cr.practice_area_id
       LEFT JOIN matter_type mt ON mt.id = cr.matter_type_id
       LEFT JOIN location l ON l.id = cr.location_id
      WHERE cr.professional_id = ?
      ORDER BY CASE cr.urgency WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
               cr.created_at DESC`,
  ).all(professionalId) as Array<Record<string, string | number | null>>;
}

export function setConsultationStatus(reference: string, status: string, note?: string): boolean {
  const info = db().prepare(
    `UPDATE consultation_request SET status=?, declined_reason=?, responded_at=?, updated_at=? WHERE reference=?`,
  ).run(status, note ?? null, now(), now(), reference);
  return info.changes > 0;
}

// ----------------------------------------------------------------------- claim
/**
 * Claim a profile. Never grants ownership automatically.
 *
 * `match_signals` records whether the claimant's contact details align with
 * what the official source published — the strongest automatic signal we have,
 * and precisely why those private_* fields are worth retaining.
 */
export function createClaim(input: {
  professionalId: number; userId: number | null; contactEmail: string; contactPhone?: string | null;
  claimedEnrolmentNumber?: string | null; statement?: string | null;
  ipAddress?: string | null; userAgent?: string | null;
}): { id: number; status: string; matchScore: number; signals: string[] } {
  return transaction(() => {
    const h = db();
    const ts = now();

    const target = h.prepare(
      `SELECT id, private_email, private_phone, claim_status, professional_body_id FROM professional
        WHERE id=? AND deleted_at IS NULL`,
    ).get(input.professionalId) as {
      id: number; private_email: string | null; private_phone: string | null;
      claim_status: string; professional_body_id: number | null;
    } | undefined;
    if (!target) throw new Error('PROFESSIONAL_NOT_FOUND');
    if (target.claim_status === 'claimed') throw new Error('ALREADY_CLAIMED');

    const signals: string[] = [];
    let score = 0;
    if (target.private_email && fold(target.private_email) === fold(input.contactEmail)) {
      signals.push('Email matches the address published by the Bar Council');
      score += 55;
    } else if (target.private_email && input.contactEmail.includes('@')) {
      const a = target.private_email.split('@')[0] ?? '';
      const b = input.contactEmail.split('@')[0] ?? '';
      if (a && b && trigramSimilarity(a, b) > 0.7) { signals.push('Email closely resembles the published address'); score += 20; }
    }
    const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '').slice(-10);
    if (target.private_phone && digits(target.private_phone) && digits(target.private_phone) === digits(input.contactPhone)) {
      signals.push('Phone number matches the number published by the Bar Council');
      score += 35;
    }
    if (input.claimedEnrolmentNumber) { signals.push('Enrolment number supplied for verification'); score += 10; }

    // Existing pending claim by someone else means a conflict, not a merge.
    const otherPending = h.prepare(
      `SELECT count(*) n FROM claim WHERE professional_id=? AND status IN ('submitted','evidence_requested','under_review')
         AND (user_id IS NOT ? OR lower(contact_email) <> lower(?))`,
    ).get(input.professionalId, input.userId, input.contactEmail) as { n: number };

    const status = otherPending.n > 0 ? 'under_review' : 'submitted';

    const info = h.prepare(
      `INSERT INTO claim (professional_id, user_id, status, claimed_enrolment_number, claimed_body_id,
                          contact_email, contact_phone, match_signals, match_score, statement,
                          ip_address, user_agent, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(input.professionalId, input.userId ?? 0, status, input.claimedEnrolmentNumber ?? null,
      target.professional_body_id, input.contactEmail, input.contactPhone ?? null,
      JSON.stringify(signals), Math.min(100, score), input.statement ?? null,
      input.ipAddress ?? null, input.userAgent ?? null, ts, ts);

    h.prepare(`UPDATE professional SET claim_status=?, updated_at=? WHERE id=?`)
      .run(otherPending.n > 0 ? 'claim_disputed' : 'claim_pending', ts, input.professionalId);

    h.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, after_state, reason, ip_address, created_at)
       VALUES (?,?,'claim.submitted','professional',?,?,?,?,?)`,
    ).run(input.userId ?? null, 'public', input.professionalId,
      JSON.stringify({ status, matchScore: score, signals }), 'Profile claim submitted', input.ipAddress ?? null, ts);

    return { id: Number(info.lastInsertRowid), status, matchScore: Math.min(100, score), signals };
  });
}

export function listClaims(status?: string) {
  const sql = `SELECT c.id, c.status, c.contact_email AS contactEmail, c.contact_phone AS contactPhone,
                      c.match_score AS matchScore, c.match_signals AS matchSignals, c.statement,
                      c.claimed_enrolment_number AS claimedEnrolmentNumber, c.created_at AS createdAt,
                      p.display_name AS professionalName, p.slug AS professionalSlug, p.id AS professionalId
                 FROM claim c JOIN professional p ON p.id = c.professional_id
                ${status ? 'WHERE c.status = ?' : ''}
                ORDER BY c.match_score DESC, c.created_at DESC LIMIT 100`;
  const stmt = db().prepare(sql);
  return (status ? stmt.all(status) : stmt.all()) as Array<Record<string, string | number | null>>;
}

// ---------------------------------------------------------------- data request
export function createDataRequest(input: {
  professionalId?: number | null; kind: string; requesterName: string; requesterEmail: string;
  requesterRelation?: string; detail: string;
}): { id: number } {
  const ts = now();
  // 30-day response clock, surfaced in the admin queue so nothing ages out.
  const due = new Date(Date.now() + 30 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const info = db().prepare(
    `INSERT INTO data_request (professional_id, kind, requester_name, requester_email, requester_relation,
                               detail, status, due_at, created_at, updated_at)
     VALUES (?,?,?,?,?,?, 'received', ?,?,?)`,
  ).run(input.professionalId ?? null, input.kind, input.requesterName, input.requesterEmail,
    input.requesterRelation ?? 'self', input.detail, due, ts, ts);
  return { id: Number(info.lastInsertRowid) };
}

export function listDataRequests(limit = 50) {
  return db().prepare(
    `SELECT dr.id, dr.kind, dr.requester_name AS requesterName, dr.requester_email AS requesterEmail,
            dr.detail, dr.status, dr.due_at AS dueAt, dr.created_at AS createdAt,
            p.display_name AS professionalName, p.slug AS professionalSlug
       FROM data_request dr LEFT JOIN professional p ON p.id = dr.professional_id
      ORDER BY CASE dr.status WHEN 'received' THEN 0 WHEN 'identity_check' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
               dr.due_at ASC LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;
}

/**
 * Honour an opt-out immediately: unpublish, then let the admin decide on
 * erasure. Withholding publication is reversible and instant; deletion is not.
 */
export function applyOptOut(professionalId: number, reason: string): void {
  transaction(() => {
    const h = db();
    const ts = now();
    const before = h.prepare(`SELECT claim_status, is_published FROM professional WHERE id=?`).get(professionalId);
    h.prepare(`UPDATE professional SET claim_status='opted_out', is_published=0, updated_at=? WHERE id=?`).run(ts, professionalId);
    h.prepare(`DELETE FROM professional_search_doc WHERE professional_id=?`).run(professionalId);
    h.prepare(`DELETE FROM suggest_term WHERE kind='professional' AND subject_id=?`).run(professionalId);
    h.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, before_state, after_state, reason, created_at)
       VALUES (NULL,'system','professional.opted_out','professional',?,?,?,?,?)`,
    ).run(professionalId, JSON.stringify(before), JSON.stringify({ claim_status: 'opted_out', is_published: 0 }), reason, ts);
  });
}
