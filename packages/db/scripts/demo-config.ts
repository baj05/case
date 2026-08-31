#!/usr/bin/env node
/**
 * Seed DEMO CONFIGURATION so the booking, fee and Advo AI flows are
 * exercisable immediately.
 *
 * WHAT THIS DOES AND DOES NOT DO — this distinction matters:
 *
 *   It does NOT invent advocates. Every professional touched here is a real
 *   record ingested from the Bar Council of India register.
 *
 *   It DOES simulate those advocates having claimed their profile and declared
 *   practice areas, availability and fees — configuration that in reality only
 *   they can supply. Every such row is written with an audit-log entry marking
 *   it as seeded demo configuration, and the DEMO_DATA_SEEDED flag makes the
 *   UI say so plainly.
 *
 * Run `npm run db:demo -- --clear` to remove it and return every profile to
 * its true unclaimed state.
 */
import { parseArgs } from 'node:util';
import { db, now, transaction, isInitialised } from '../src/client.ts';
import {
  setAvailability, declarePracticeAreas, reindexAll,
} from '../src/repositories/shortlist.ts';
import { upsertFee, createBooking, generateSlots } from '../src/repositories/fees.ts';
import { createUser } from '../src/repositories/auth.ts';
import { createCorporateOrganisation, createOrgInvite, acceptInvite } from '../src/repositories/corporate.ts';

const { values } = parseArgs({ options: { clear: { type: 'boolean', default: false }, count: { type: 'string', default: '18' } } });

if (!isInitialised()) {
  process.stderr.write('Database not initialised. Run `npm run ingest` first.\n');
  process.exit(1);
}

const h = db();
const MARK = 'demo-config';

if (values.clear) {
  transaction(() => {
    const ids = (h.prepare(
      `SELECT DISTINCT subject_id AS id FROM audit_log WHERE action = 'demo.configured'`,
    ).all() as Array<{ id: number }>).map((r) => r.id);
    for (const id of ids) {
      h.prepare(`DELETE FROM fee_schedule WHERE professional_id=?`).run(id);
      h.prepare(`DELETE FROM professional_fee_summary WHERE professional_id=?`).run(id);
      h.prepare(`DELETE FROM availability_rule WHERE professional_id=?`).run(id);
      h.prepare(`DELETE FROM professional_practice_area WHERE professional_id=? AND is_self_declared=1`).run(id);
      h.prepare(`DELETE FROM professional_legal_matter WHERE professional_id=? AND is_self_declared=1`).run(id);
      h.prepare(`DELETE FROM verification WHERE professional_id=? AND evidence_note LIKE '%demo configuration%'`).run(id);
      h.prepare(
        `UPDATE professional SET claim_status='unclaimed', claimed_at=NULL, verification_level=0,
           accepts_consultations=0, updated_at=? WHERE id=?`,
      ).run(now(), id);
    }
    h.prepare(`DELETE FROM booking WHERE client_email LIKE '%@demo.invalid'`).run();
    h.prepare(`DELETE FROM audit_log WHERE action='demo.configured'`).run();

    // Demo corporate account: same disclosure convention, a distinct email
    // domain, and a `demo.corporate_configured` audit action so it can be
    // torn down independently of the advocate-side demo configuration above.
    const demoOrg = h.prepare(`SELECT id FROM organisation WHERE slug = 'demo-legal-ops-llp'`).get() as { id: number } | undefined;
    if (demoOrg) {
      h.prepare(`DELETE FROM booking WHERE organisation_id = ?`).run(demoOrg.id);
      h.prepare(`DELETE FROM org_invite WHERE organisation_id = ?`).run(demoOrg.id);
      h.prepare(`DELETE FROM org_member WHERE organisation_id = ?`).run(demoOrg.id);
      h.prepare(`DELETE FROM audit_log WHERE subject_type = 'organisation' AND subject_id = ?`).run(demoOrg.id);
      h.prepare(`DELETE FROM organisation WHERE id = ?`).run(demoOrg.id);
    }
    h.prepare(`DELETE FROM app_user WHERE email LIKE '%@democorp.invalid'`).run();

    h.prepare(`UPDATE feature_flag SET enabled=0, updated_at=? WHERE key='DEMO_DATA_SEEDED'`).run(now());
  });
  const r = reindexAll();
  process.stdout.write(`cleared demo configuration. published ${r.published}, indexed ${r.indexed}, accepting ${r.accepting}\n`);
  process.exit(0);
}

// Pick real ingested records that already have the most substance: a role, an
// office address and ideally a court link. Those make the most convincing
// demonstration without any invention.
const target = Number(values.count) || 18;

/**
 * Re-running must reconfigure the SAME profiles, not enlist another batch.
 * Selecting purely on `claim_status = 'unclaimed'` meant every run claimed a
 * fresh 18 and the demo set grew without bound, so already-configured profiles
 * are taken first and the remainder topped up from unclaimed records.
 */
const CANDIDATE_COLUMNS = `p.id, p.slug, p.display_name AS name, p.kind, p.enrolment_year AS enrolYear,
          (SELECT count(*) FROM professional_court pc WHERE pc.professional_id = p.id) AS courtCount,
          p.professional_body_id AS bodyId`;
type Candidate = { id: number; slug: string; name: string; kind: string; enrolYear: number | null; courtCount: number; bodyId: number | null };

const alreadyConfigured = h.prepare(
  `SELECT ${CANDIDATE_COLUMNS}
     FROM professional p
    WHERE p.is_published = 1 AND p.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM audit_log a
                   WHERE a.action = 'demo.configured' AND a.subject_type = 'professional' AND a.subject_id = p.id)
    ORDER BY p.id LIMIT ?`,
).all(target) as Candidate[];

const topUp = alreadyConfigured.length >= target ? [] : (h.prepare(
  `SELECT ${CANDIDATE_COLUMNS}
     FROM professional p
    WHERE p.is_published = 1 AND p.deleted_at IS NULL AND p.claim_status = 'unclaimed'
      AND NOT EXISTS (SELECT 1 FROM audit_log a
                       WHERE a.action = 'demo.configured' AND a.subject_type = 'professional' AND a.subject_id = p.id)
    ORDER BY (p.public_office IS NOT NULL) DESC, courtCount DESC, p.data_confidence DESC
    LIMIT ?`,
).all(target - alreadyConfigured.length) as Candidate[]);

// Sorted by id so the ordering — and therefore every derived choice below — is
// identical on every run. Ordering by the selection heuristic instead meant a
// re-run handed the same professional a different bundle, and the declarations
// from both runs accumulated on one profile.
const candidates = [...alreadyConfigured, ...topUp].sort((a, b) => a.id - b.id);

if (candidates.length === 0) {
  process.stderr.write('No unclaimed published records found.\n');
  process.exit(1);
}

const areas = h.prepare(`SELECT id, code FROM practice_area WHERE is_active=1`).all() as Array<{ id: number; code: string }>;
const areaId = (code: string) => areas.find((a) => a.code === code)?.id;

/** Practice-area bundles that hang together as a real practice. */
const BUNDLES: Array<{ codes: string[]; label: string }> = [
  { codes: ['LABOUR', 'PF', 'ESI', 'LABOUR_COMPLIANCE'], label: 'labour and industrial' },
  { codes: ['CORPORATE', 'CONTRACT', 'INSOLVENCY'], label: 'corporate and commercial' },
  { codes: ['CRIMINAL'], label: 'criminal' },
  { codes: ['FAMILY'], label: 'family and matrimonial' },
  { codes: ['PROPERTY', 'CIVIL'], label: 'property and civil' },
  { codes: ['TAX', 'BANKING'], label: 'tax and banking' },
  { codes: ['IP', 'TECH'], label: 'intellectual property and technology' },
  { codes: ['CONSTITUTIONAL', 'ADMIN_SERVICE'], label: 'constitutional and service' },
  { codes: ['ARBITRATION', 'MEDIATION'], label: 'dispute resolution' },
  { codes: ['CONSUMER'], label: 'consumer' },
  { codes: ['ELECTRICITY', 'UTILITIES'], label: 'electricity and utilities' },
  { codes: ['REALESTATE', 'MUNICIPAL'], label: 'real estate and local body' },
  { codes: ['MOTOR', 'INSURANCE'], label: 'motor accident and insurance' },
  { codes: ['SUCCESSION', 'RTI'], label: 'succession and information' },
];

/**
 * Fee bands in paise, scaled by seniority. Senior advocates and long-enrolled
 * practitioners price higher — the pattern real fee schedules follow. These are
 * illustrative demo values, clearly flagged as such in the UI.
 */
function feeBand(kind: string, years: number): { consult: number; filing: number; drafting: number; appearance: number } {
  const senior = kind === 'senior_advocate';
  const base = senior ? 1_500_000 : years >= 25 ? 750_000 : years >= 15 ? 400_000 : years >= 8 ? 250_000 : 150_000;
  return {
    consult: base,
    filing: Math.round(base * 0.45),
    drafting: Math.round(base * 0.8),
    appearance: Math.round(base * 1.6),
  };
}

/*
 * Demo corporate account — resolved/created BEFORE the professional loop
 * below, and any existing demo booking deleted here too.
 *
 * The Corporate Suite ships with real code and no demonstrable tenant — a
 * fresh `/corporate/o/[slug]` has no members, no invitations and no
 * bookings, which makes the feature look unfinished even though it works.
 * Unlike the advocate-side configuration below, nothing here simulates
 * data belonging to a REAL entity: the company, its two people and its
 * booking are all fictional, on the same `@democorp.invalid` non-routable
 * domain convention `demo.invalid` already uses for advocate-side demo
 * bookings. Torn down independently by `--clear`, above.
 *
 * The booking must be deleted here, before the loop, not after it: the
 * booking's fee_schedule_id points into candidates[0]'s fee_schedule, and
 * the loop unconditionally deletes and recreates every candidate's
 * fee_schedule rows on every run. A booking created on run 1 and left in
 * place until after run 2's loop made that loop's
 * `DELETE FROM fee_schedule WHERE professional_id=?` fail with a foreign
 * key violation before it ever reached the recreation step, aborting the
 * whole script. Deleting the stale booking first, then recreating it after
 * the loop against that run's freshly-seeded fee_schedule, keeps the FK
 * valid throughout.
 */
let corporateSeeded = false;
const existingDemoOrg = h.prepare(`SELECT id FROM organisation WHERE slug = 'demo-legal-ops-llp'`).get() as { id: number } | undefined;

let corpOrgId: number;
let colleagueId: number;

if (!existingDemoOrg) {
  const owner = createUser({
    email: 'owner@democorp.invalid', fullName: 'Ananya Rao', password: 'demo-password-only',
  });
  const colleague = createUser({
    email: 'colleague@democorp.invalid', fullName: 'Vikram Sen', password: 'demo-password-only',
  });
  const org = createCorporateOrganisation({
    name: 'Demo Legal Ops LLP', ownerUserId: owner.id, billingEmail: 'owner@democorp.invalid',
  });
  const invite = createOrgInvite({
    orgId: org.id, email: 'colleague@democorp.invalid', role: 'admin',
    actorUserId: owner.id, seatLimit: 25,
  });
  acceptInvite({ token: invite.token, userId: colleague.id });
  // A third, still-open invitation — otherwise /corporate/o/[slug]/team has
  // nothing to show in its "open invitations" section either.
  createOrgInvite({
    orgId: org.id, email: 'newhire@democorp.invalid', role: 'member',
    actorUserId: owner.id, seatLimit: 25,
  });
  corpOrgId = org.id;
  colleagueId = colleague.id;
  corporateSeeded = true;
} else {
  corpOrgId = existingDemoOrg.id;
  const row = h.prepare(`SELECT id FROM app_user WHERE email = 'colleague@democorp.invalid'`).get() as { id: number };
  colleagueId = row.id;
}

h.prepare(`DELETE FROM booking_event WHERE booking_id IN (SELECT id FROM booking WHERE organisation_id = ?)`).run(corpOrgId);
h.prepare(`DELETE FROM booking WHERE organisation_id = ?`).run(corpOrgId);

let configured = 0;
const ts = now();
let declaredMatters = 0;

for (const [i, c] of candidates.entries()) {
  // Keyed on the record id, not the loop index, so a bundle never moves.
  const bundle = BUNDLES[c.id % BUNDLES.length]!;
  const years = c.enrolYear ? Math.max(3, new Date().getFullYear() - c.enrolYear) : 8 + (i % 22);
  const band = feeBand(c.kind, years);

  transaction(() => {
    // 1. Simulate the claim having been approved.
    h.prepare(
      `UPDATE professional SET claim_status='claimed', claimed_at=?, accepts_consultations=1,
         verification_level=?, years_experience=COALESCE(years_experience, ?), updated_at=?
       WHERE id=?`,
    ).run(ts, c.id % 4 === 0 ? 3 : c.id % 3 === 0 ? 2 : 1, years, ts, c.id);

    // Replace, never append: re-running must not stack demo rows.
    h.prepare(`DELETE FROM verification WHERE professional_id=? AND evidence_note LIKE '%demo configuration%'`).run(c.id);
    h.prepare(
      `INSERT INTO verification (professional_id, level, method, outcome, evidence_note, created_at)
       VALUES (?,?,?,'granted',?,?)`,
    ).run(c.id, c.id % 4 === 0 ? 3 : 1, c.id % 4 === 0 ? 'bar_enrolment' : 'email',
      'Seeded demo configuration — not a real verification event.', ts);

    // 2. Declared practice areas.
    const ids = bundle.codes.map(areaId).filter((x): x is number => typeof x === 'number');
    declarePracticeAreas(c.id, ids, ids[0]);

    // 2b. Declared legal matters, drawn only from the areas above so the
    //     declaration stays internally consistent. Real professionals pick
    //     these themselves after claiming; here they are simulated and audited.
    h.prepare(`DELETE FROM professional_legal_matter WHERE professional_id=? AND is_self_declared=1`).run(c.id);
    const matterRows = ids.length
      ? (h.prepare(
          `SELECT id FROM legal_matter WHERE practice_area_id IN (${ids.map(() => '?').join(',')})
             AND is_active = 1 ORDER BY id`,
        ).all(...ids) as Array<{ id: number }>)
      : [];
    for (const m of matterRows) {
      h.prepare(
        `INSERT INTO professional_legal_matter (professional_id, legal_matter_id, is_self_declared, created_at)
         VALUES (?,?,1,?) ON CONFLICT DO NOTHING`,
      ).run(c.id, m.id, ts);
    }
    declaredMatters += matterRows.length;

    /*
     * 3. Availability: weekday mornings and afternoons, Kolkata time.
     *
     * `afternoonMode` is used for BOTH the availability rule and the
     * afternoon consultation fee below. Those two used to disagree — every
     * third professional published in_person availability while their only
     * fees were video and phone — and because BookingFlow filters slots to
     * the chosen fee's mode, that made the in-person slots unreachable AND
     * the phone fee yield zero slots. Deriving both from one value is what
     * stops the pair drifting again.
     */
    const afternoonMode = c.id % 3 === 0 ? 'in_person' : 'phone';
    const rules = [1, 2, 3, 4, 5].flatMap((weekday) => ([
      { weekday, startMinute: 10 * 60 + 30, endMinute: 13 * 60, mode: 'video', slotMinutes: 30, timezone: 'Asia/Kolkata' },
      { weekday, startMinute: 16 * 60, endMinute: 18 * 60, mode: afternoonMode, slotMinutes: 30, timezone: 'Asia/Kolkata' },
    ]));
    setAvailability(c.id, rules);

    // 4. Fee schedule, including statutory pass-throughs disclosed separately.
    // Replace rather than append: a re-run must not stack duplicate fee rows.
    h.prepare(`DELETE FROM fee_schedule WHERE professional_id=?`).run(c.id);
    upsertFee({ professionalId: c.id, kind: 'consultation', label: `First consultation (${bundle.label})`, mode: 'video', durationMinutes: 30, amountMinor: band.consult, basis: 'fixed', includes: 'A 30-minute discussion of your position and the options open to you.', excludes: 'Drafting, filing and appearances are charged separately.', taxNote: 'Taxes, if applicable, are charged in addition.', sortOrder: 10 });
    upsertFee({
      professionalId: c.id, kind: 'consultation',
      label: afternoonMode === 'in_person' ? 'In-person consultation' : 'Follow-up consultation',
      mode: afternoonMode,
      durationMinutes: afternoonMode === 'in_person' ? 45 : 20,
      amountMinor: Math.round(band.consult * (afternoonMode === 'in_person' ? 1.2 : 0.6)),
      basis: 'fixed',
      includes: afternoonMode === 'in_person'
        ? 'A 45-minute meeting. You will be asked where to meet when you book.'
        : undefined,
      excludes: afternoonMode === 'in_person'
        ? 'Travel to an address you name is not included and may be declined or charged for.'
        : undefined,
      sortOrder: 20,
    });
    upsertFee({ professionalId: c.id, kind: 'drafting', label: 'Drafting a legal notice or application', amountMinor: band.drafting, basis: 'from', includes: 'One draft and one round of revisions.', sortOrder: 30 });
    upsertFee({ professionalId: c.id, kind: 'filing', label: 'Filing charges', amountMinor: band.filing, basis: 'from', includes: 'Preparation and lodging of the petition.', excludes: 'Court fees and statutory charges are payable in addition and are shown separately.', sortOrder: 40 });
    upsertFee({ professionalId: c.id, kind: 'filing', label: 'Court fee and statutory charges', amountMinor: 500_00, basis: 'from', isStatutoryPassthrough: true, includes: 'Payable to the court, not to the advocate. Varies by relief claimed.', sortOrder: 45 });
    upsertFee({ professionalId: c.id, kind: 'appearance', label: 'Court appearance, per hearing', amountMinor: band.appearance, basis: 'from', sortOrder: 50 });
    if (c.id % 3 === 0) {
      upsertFee({ professionalId: c.id, kind: 'retainer', label: 'Monthly retainer', amountMinor: band.appearance * 4, basis: 'on_request', includes: 'Ongoing advisory across the month.', sortOrder: 60 });
    }

    // 5. Audit marker — this is what `--clear` keys off, and what keeps the
    //    demo honestly distinguishable from real configuration.
    h.prepare(
      `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, after_state, reason, created_at)
       VALUES (NULL,'system','demo.configured','professional',?,?,?,?)`,
    ).run(c.id, JSON.stringify({ practiceAreas: bundle.codes, years, feeBand: band, marker: MARK }),
      'Seeded demo configuration so booking and fee flows are exercisable. Not supplied by the professional.', ts);
  });

  configured += 1;
}

// The demo booking is (re)created here, after the professional loop above
// has finished, so it points at that run's freshly-seeded fee_schedule row
// rather than one already deleted by the loop's own cleanup — see the
// comment above the corporate-account block for why the delete happened
// earlier instead of here.
const bookTarget = candidates[0];
if (bookTarget) {
  const slot = generateSlots(bookTarget.id, new Date(Date.now() + 86_400_000).toISOString(), 14)[0];
  if (slot) {
    createBooking({
      professionalId: bookTarget.id, feeScheduleId: slot.feeScheduleId,
      clientUserId: colleagueId, organisationId: corpOrgId,
      clientName: 'Vikram Sen', clientEmail: 'colleague@democorp.invalid',
      startsAtUtc: slot.startUtc, endsAtUtc: slot.endUtc,
      clientTimezone: 'Asia/Kolkata', mode: slot.mode,
      brief: 'Demo booking seeded so the Corporate Suite dashboard has something to show. Not a real matter.',
      feeDisclosureAck: true,
    });
  }
}

h.prepare(
  `INSERT INTO feature_flag (key, enabled, description, gate_note, updated_at)
   VALUES ('DEMO_DATA_SEEDED',1,?,?,?)
   ON CONFLICT(key) DO UPDATE SET enabled=1, updated_at=excluded.updated_at`,
).run(
  'Demo fee schedules and availability are present on some real profiles',
  'Set by `npm run db:demo`. The advocates are real Bar Council records; their fees and availability are seeded illustrations, not their own figures. Remove with `npm run db:demo -- --clear` before any real use.',
  now(),
);

const r = reindexAll();
process.stdout.write(`\nconfigured ${configured} real profiles with demo fees and availability\n`);
process.stdout.write(`published ${r.published}, indexed ${r.indexed}, accepting bookings ${r.accepting}\n`);
const fees = Number((h.prepare(`SELECT count(*) n FROM fee_schedule`).get() as { n: number }).n);
const slots = Number((h.prepare(`SELECT count(*) n FROM availability_rule`).get() as { n: number }).n);
process.stdout.write(`fee rows ${fees}, availability rules ${slots}\n`);
process.stdout.write(`declared legal matters ${declaredMatters}\n`);
process.stdout.write(corporateSeeded
  ? 'demo corporate account: Demo Legal Ops LLP (/corporate/o/demo-legal-ops-llp), 2 members, 1 open invite\n'
  : 'demo corporate account already present\n');
process.stdout.write(`\nDEMO_DATA_SEEDED flag is on; the UI discloses this. Clear with: npm run db:demo -- --clear\n`);
