/**
 * Fee schedules, slot generation and bookings.
 *
 * Money rules held here:
 *   * integer minor units only, never floats
 *   * the quote is snapshotted onto the booking, so a later fee change cannot
 *     retroactively alter what a client was told
 *   * statutory/court charges are carried separately from the professional's
 *     fee, so a quoted fee is never mistaken for the total
 */
import { db, now, flag, transaction } from '../client.ts';
import { referenceCode } from '../ids.ts';

// ------------------------------------------------------------------ fee model
export interface FeeRow {
  id: number; kind: string; label: string; mode: string | null;
  durationMinutes: number | null; currencyCode: string; amountMinor: number;
  basis: string; amountMaxMinor: number | null; includes: string | null;
  excludes: string | null; isStatutoryPassthrough: number; taxNote: string | null;
  courtName: string | null; practiceAreaName: string | null; sortOrder: number;
}

export function listFees(professionalId: number, kind?: string): FeeRow[] {
  const sql = `
    SELECT f.id, f.kind, f.label, f.mode, f.duration_minutes AS durationMinutes,
           f.currency_code AS currencyCode, f.amount_minor AS amountMinor, f.basis,
           f.amount_max_minor AS amountMaxMinor, f.includes, f.excludes,
           f.is_statutory_passthrough AS isStatutoryPassthrough, f.tax_note AS taxNote,
           c.name AS courtName, pa.name AS practiceAreaName, f.sort_order AS sortOrder
      FROM fee_schedule f
      LEFT JOIN court c ON c.id = f.court_id
      LEFT JOIN practice_area pa ON pa.id = f.practice_area_id
     WHERE f.professional_id = ? AND f.is_active = 1 ${kind ? 'AND f.kind = ?' : ''}
     ORDER BY f.sort_order, f.amount_minor`;
  const stmt = db().prepare(sql);
  return (kind ? stmt.all(professionalId, kind) : stmt.all(professionalId)) as unknown as FeeRow[];
}

export function upsertFee(input: {
  professionalId: number; kind: string; label: string; mode?: string | null;
  durationMinutes?: number | null; currencyCode?: string; amountMinor: number;
  basis?: string; amountMaxMinor?: number | null; includes?: string | null;
  excludes?: string | null; isStatutoryPassthrough?: boolean; taxNote?: string | null;
  courtId?: number | null; practiceAreaId?: number | null; sortOrder?: number;
  declaredByUserId?: number | null;
}): number {
  const ts = now();
  const info = db().prepare(
    `INSERT INTO fee_schedule (professional_id, kind, label, mode, duration_minutes,
       currency_code, amount_minor, basis, amount_max_minor, includes, excludes,
       is_statutory_passthrough, tax_note, court_id, practice_area_id, is_active,
       sort_order, declared_by_user_id, declared_at, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?)`,
  ).run(
    input.professionalId, input.kind, input.label, input.mode ?? null, input.durationMinutes ?? null,
    input.currencyCode ?? 'INR', Math.max(0, Math.round(input.amountMinor)), input.basis ?? 'fixed',
    input.amountMaxMinor ?? null, input.includes ?? null, input.excludes ?? null,
    flag(Boolean(input.isStatutoryPassthrough)), input.taxNote ?? null,
    input.courtId ?? null, input.practiceAreaId ?? null, input.sortOrder ?? 100,
    input.declaredByUserId ?? null, ts, ts, ts,
  );
  rebuildFeeSummary(input.professionalId);
  return Number(info.lastInsertRowid);
}

/** Recompute the denormalised min/max used for price sorting in search. */
export function rebuildFeeSummary(professionalId?: number): void {
  const h = db();
  const ids = professionalId
    ? [professionalId]
    : (h.prepare(`SELECT DISTINCT professional_id AS id FROM fee_schedule`).all() as Array<{ id: number }>).map((r) => r.id);
  for (const id of ids) {
    const agg = h.prepare(
      `SELECT min(amount_minor) AS lo, max(COALESCE(amount_max_minor, amount_minor)) AS hi,
              count(*) AS n, currency_code AS cur
         FROM fee_schedule
        WHERE professional_id = ? AND is_active = 1 AND kind = 'consultation' AND basis <> 'on_request'`,
    ).get(id) as { lo: number | null; hi: number | null; n: number; cur: string | null };
    const total = Number((h.prepare(`SELECT count(*) n FROM fee_schedule WHERE professional_id=? AND is_active=1`).get(id) as { n: number }).n);
    const filing = Number((h.prepare(`SELECT count(*) n FROM fee_schedule WHERE professional_id=? AND is_active=1 AND kind='filing'`).get(id) as { n: number }).n);
    h.prepare(
      `INSERT INTO professional_fee_summary (professional_id, currency_code, min_consult_minor,
         max_consult_minor, has_filing_fees, service_count, updated_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(professional_id) DO UPDATE SET
         currency_code=excluded.currency_code, min_consult_minor=excluded.min_consult_minor,
         max_consult_minor=excluded.max_consult_minor, has_filing_fees=excluded.has_filing_fees,
         service_count=excluded.service_count, updated_at=excluded.updated_at`,
    ).run(id, agg.cur ?? 'INR', agg.lo, agg.hi, flag(filing > 0), total, now());
  }
}

export function feeSummary(professionalId: number) {
  return db().prepare(
    `SELECT currency_code AS currencyCode, min_consult_minor AS minConsultMinor,
            max_consult_minor AS maxConsultMinor, has_filing_fees AS hasFilingFees,
            service_count AS serviceCount
       FROM professional_fee_summary WHERE professional_id = ?`,
  ).get(professionalId) as {
    currencyCode: string; minConsultMinor: number | null; maxConsultMinor: number | null;
    hasFilingFees: number; serviceCount: number;
  } | undefined;
}

// ------------------------------------------------------------------- slots
export interface Slot { startUtc: string; endUtc: string; mode: string; feeScheduleId: number | null; durationMinutes: number }

/**
 * Generate bookable slots for a date range from the advocate's availability
 * rules, minus explicit blocks, minus slots already taken.
 *
 * Timezone handling is explicit: rules are expressed in the advocate's own
 * timezone as minutes-from-midnight, converted to UTC instants here. Nothing
 * downstream guesses.
 */
export function generateSlots(professionalId: number, fromIso: string, days = 14): Slot[] {
  const h = db();
  const rules = h.prepare(
    `SELECT weekday, start_minute AS s, end_minute AS e, mode, slot_minutes AS len, timezone
       FROM availability_rule WHERE professional_id = ? AND is_active = 1`,
  ).all(professionalId) as Array<{ weekday: number; s: number; e: number; mode: string; len: number; timezone: string }>;
  if (rules.length === 0) return [];

  const taken = new Set(
    (h.prepare(
      `SELECT starts_at_utc AS t FROM booking
        WHERE professional_id = ? AND status IN ('pending','confirmed','rescheduled')`,
    ).all(professionalId) as Array<{ t: string }>).map((r) => r.t),
  );
  const blocks = h.prepare(
    `SELECT starts_at_utc AS s, ends_at_utc AS e FROM availability_block WHERE professional_id = ?`,
  ).all(professionalId) as Array<{ s: string; e: string }>;

  // Cheapest active consultation fee per mode, so each slot carries its price.
  const feeByMode = new Map<string, { id: number; minutes: number | null }>();
  for (const f of h.prepare(
    `SELECT id, mode, duration_minutes AS m, amount_minor FROM fee_schedule
      WHERE professional_id = ? AND is_active = 1 AND kind = 'consultation'
      ORDER BY amount_minor`,
  ).all(professionalId) as Array<{ id: number; mode: string | null; m: number | null; amount_minor: number }>) {
    const key = f.mode ?? 'any';
    if (!feeByMode.has(key)) feeByMode.set(key, { id: f.id, minutes: f.m });
  }

  const out: Slot[] = [];
  const start = new Date(fromIso);
  const nowMs = Date.now();

  for (let d = 0; d < days; d += 1) {
    const day = new Date(start.getTime() + d * 86_400_000);
    for (const rule of rules) {
      // The rule's weekday is in the advocate's timezone. For the prototype the
      // seeded timezone is Asia/Kolkata (UTC+5:30); the offset is derived from
      // the zone rather than hardcoded at the call site.
      const offsetMinutes = zoneOffsetMinutes(rule.timezone, day);
      const localWeekday = new Date(day.getTime() + offsetMinutes * 60_000).getUTCDay();
      if (localWeekday !== rule.weekday) continue;

      const dayStartUtcMs = Date.UTC(
        new Date(day.getTime() + offsetMinutes * 60_000).getUTCFullYear(),
        new Date(day.getTime() + offsetMinutes * 60_000).getUTCMonth(),
        new Date(day.getTime() + offsetMinutes * 60_000).getUTCDate(),
      ) - offsetMinutes * 60_000;

      const len = Math.max(15, rule.len);
      for (let m = rule.s; m + len <= rule.e; m += len) {
        const startMs = dayStartUtcMs + m * 60_000;
        if (startMs < nowMs + 3_600_000) continue;          // no same-hour booking
        const endMs = startMs + len * 60_000;
        const startIso = new Date(startMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
        if (taken.has(startIso)) continue;
        if (blocks.some((b) => startMs < Date.parse(b.e) && endMs > Date.parse(b.s))) continue;
        const fee = feeByMode.get(rule.mode) ?? feeByMode.get('any') ?? null;
        out.push({
          startUtc: startIso,
          endUtc: new Date(endMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
          mode: rule.mode,
          feeScheduleId: fee?.id ?? null,
          durationMinutes: len,
        });
      }
    }
  }
  return out.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

/** Offset in minutes for a named zone at a given instant, via Intl. */
function zoneOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = Object.fromEntries(dtf.formatToParts(at).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
    const asUtc = Date.UTC(parts.year!, (parts.month! - 1), parts.day!, parts.hour! % 24, parts.minute!, parts.second!);
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return 330; // Asia/Kolkata fallback
  }
}

// ----------------------------------------------------------------- bookings
export interface CreateBookingInput {
  professionalId: number; feeScheduleId: number | null;
  clientName: string; clientEmail: string; clientPhone?: string | null;
  startsAtUtc: string; endsAtUtc: string; clientTimezone: string; mode: string;
  practiceAreaId?: number | null; matterTypeId?: number | null; courtId?: number | null;
  brief: string; urgency?: 'normal' | 'urgent' | 'emergency';
  feeDisclosureAck: boolean;
  /**
   * Both derived by the CALLER from the session and the URL's org slug —
   * never read from a form field. A booking that took its owner or its
   * organisation from submitted data would let anyone file a booking into
   * any company's account, or claim someone else's booking as theirs.
   */
  clientUserId?: number | null;
  organisationId?: number | null;
}

export class SlotTakenError extends Error {
  constructor() { super('SLOT_TAKEN'); this.name = 'SlotTakenError'; }
}

export function createBooking(input: CreateBookingInput): { id: number; reference: string; totalMinor: number; currencyCode: string } {
  return transaction(() => {
    const h = db();
    const ts = now();

    const target = h.prepare(
      `SELECT id, accepts_consultations FROM professional
        WHERE id = ? AND is_published = 1 AND deleted_at IS NULL`,
    ).get(input.professionalId) as { id: number; accepts_consultations: number } | undefined;
    if (!target) throw new Error('PROFESSIONAL_NOT_AVAILABLE');
    if (target.accepts_consultations !== 1) throw new Error('NOT_ACCEPTING');

    // Re-check contention inside the transaction: the slot list the client saw
    // may be seconds stale.
    const clash = h.prepare(
      `SELECT 1 FROM booking WHERE professional_id = ? AND starts_at_utc = ?
         AND status IN ('pending','confirmed','rescheduled') LIMIT 1`,
    ).get(input.professionalId, input.startsAtUtc);
    if (clash) throw new SlotTakenError();

    // Snapshot the price. A later fee edit must not rewrite this quote.
    let currency = 'INR';
    let fee = 0;
    let statutory = 0;
    if (input.feeScheduleId) {
      const f = h.prepare(
        `SELECT currency_code AS c, amount_minor AS a, is_statutory_passthrough AS p
           FROM fee_schedule WHERE id = ? AND professional_id = ? AND is_active = 1`,
      ).get(input.feeScheduleId, input.professionalId) as { c: string; a: number; p: number } | undefined;
      if (f) { currency = f.c; if (f.p === 1) statutory = f.a; else fee = f.a; }
    }
    const total = fee + statutory;

    const reference = referenceCode('BK');
    const info = h.prepare(
      `INSERT INTO booking (reference, professional_id, client_user_id, organisation_id, fee_schedule_id,
         client_name, client_email, client_phone, starts_at_utc, ends_at_utc, client_timezone,
         mode, practice_area_id, matter_type_id, court_id, brief, urgency,
         currency_code, quoted_fee_minor, statutory_charges_minor, tax_minor, total_minor,
         platform_fee_minor, settlement_mode, payment_status, status,
         fee_disclosure_ack, terms_ack_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,0,'collect_offline','unpaid','pending',?,?,?,?)`,
    ).run(
      reference, input.professionalId, input.clientUserId ?? null, input.organisationId ?? null,
      input.feeScheduleId ?? null,
      input.clientName, input.clientEmail, input.clientPhone ?? null,
      input.startsAtUtc, input.endsAtUtc, input.clientTimezone, input.mode,
      input.practiceAreaId ?? null, input.matterTypeId ?? null, input.courtId ?? null,
      input.brief, input.urgency ?? 'normal',
      currency, fee, statutory, total,
      flag(input.feeDisclosureAck), ts, ts, ts,
    );
    const id = Number(info.lastInsertRowid);
    logBookingEvent(id, 'created', `Booking requested for ${input.startsAtUtc} (${input.mode}). Quote ${currency} ${(total / 100).toFixed(2)}, collected by the advocate directly.`, 'client');
    return { id, reference, totalMinor: total, currencyCode: currency };
  });
}

export function logBookingEvent(bookingId: number, kind: string, detail: string, actor = 'system'): void {
  db().prepare(
    `INSERT INTO booking_event (booking_id, kind, detail, actor, occurred_at) VALUES (?,?,?,?,?)`,
  ).run(bookingId, kind, detail, actor, now());
}

export interface BookingRecord {
  id: number; reference: string; professional_id: number;
  professionalName: string; professionalSlug: string;
  /** Both nullable and often NULL: bookings can be made with no account at
   * all, and every booking made before accounts existed has neither. Any
   * entitlement check has to keep working when they are null. */
  client_user_id: number | null; organisation_id: number | null;
  client_name: string; client_email: string; client_phone: string | null;
  starts_at_utc: string; ends_at_utc: string; client_timezone: string; mode: string;
  brief: string; urgency: string; status: string;
  currency_code: string; quoted_fee_minor: number; statutory_charges_minor: number;
  tax_minor: number; total_minor: number; platform_fee_minor: number;
  settlement_mode: string; payment_status: string;
  decline_reason: string | null; cancel_reason: string | null;
  practiceAreaName: string | null; matterTypeName: string | null; courtName: string | null;
  created_at: string; confirmed_at: string | null; completed_at: string | null;
  events: Array<{ kind: string; detail: string; actor: string; occurredAt: string }>;
}

export function getBooking(reference: string): BookingRecord | null {
  const h = db();
  const b = h.prepare(
    `SELECT b.*, p.display_name AS professionalName, p.slug AS professionalSlug,
            pa.name AS practiceAreaName, mt.name AS matterTypeName, c.name AS courtName
       FROM booking b
       JOIN professional p ON p.id = b.professional_id
       LEFT JOIN practice_area pa ON pa.id = b.practice_area_id
       LEFT JOIN matter_type mt ON mt.id = b.matter_type_id
       LEFT JOIN court c ON c.id = b.court_id
      WHERE b.reference = ?`,
  ).get(reference) as Record<string, string | number | null> | undefined;
  if (!b) return null;
  const events = h.prepare(
    `SELECT kind, detail, actor, occurred_at AS occurredAt FROM booking_event
      WHERE booking_id = ? ORDER BY occurred_at DESC`,
  ).all(Number(b.id)) as Array<{ kind: string; detail: string; actor: string; occurredAt: string }>;
  return { ...(b as unknown as Omit<BookingRecord, 'events'>), events };
}

export function setBookingStatus(reference: string, status: string, reason?: string, actor = 'professional'): boolean {
  return transaction(() => {
    const h = db();
    const b = h.prepare(`SELECT id, status FROM booking WHERE reference = ?`).get(reference) as { id: number; status: string } | undefined;
    if (!b) return false;
    const TERMINAL = ['completed', 'cancelled_by_client', 'cancelled_by_professional', 'declined', 'expired'];
    if (TERMINAL.includes(b.status)) return false;   // no resurrecting a closed booking
    const stamp = now();
    h.prepare(
      `UPDATE booking SET status = ?, decline_reason = CASE WHEN ?='declined' THEN ? ELSE decline_reason END,
         cancel_reason = CASE WHEN ? LIKE 'cancelled%' THEN ? ELSE cancel_reason END,
         confirmed_at = CASE WHEN ?='confirmed' THEN ? ELSE confirmed_at END,
         completed_at = CASE WHEN ?='completed' THEN ? ELSE completed_at END,
         updated_at = ? WHERE id = ?`,
    ).run(status, status, reason ?? null, status, reason ?? null, status, stamp, status, stamp, stamp, b.id);
    logBookingEvent(b.id, status, reason ?? `Status changed to ${status}.`, actor);
    return true;
  });
}

export function listBookingsForProfessional(professionalId: number, limit = 50) {
  return db().prepare(
    `SELECT reference, client_name AS clientName, starts_at_utc AS startsAtUtc,
            ends_at_utc AS endsAtUtc, mode, status, urgency, total_minor AS totalMinor,
            currency_code AS currencyCode, payment_status AS paymentStatus,
            client_timezone AS clientTimezone, brief, created_at AS createdAt
       FROM booking WHERE professional_id = ?
      ORDER BY starts_at_utc LIMIT ?`,
  ).all(professionalId, limit) as Array<Record<string, string | number | null>>;
}

/** Expire pending bookings whose slot has passed. Idempotent; safe to re-run. */
export function expireStaleBookings(): number {
  const info = db().prepare(
    `UPDATE booking SET status='expired', updated_at=?
      WHERE status='pending' AND starts_at_utc < ?`,
  ).run(now(), now());
  return Number(info.changes);
}

/** Money formatting lives with the money, so no page invents its own. */
export function formatMinor(minor: number | null | undefined, currency = 'INR', locale = 'en-IN'): string {
  if (minor === null || minor === undefined) return 'On request';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(0)}`;
  }
}
