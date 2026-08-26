/**
 * eCourtsIndia directory — read layer.
 *
 * Everything here is SOURCE-DERIVED and UNVERIFIED. An `ecourts_advocate` row
 * means "this name appeared on the record in these courts", which is not the
 * same claim as CaseADVO's Bar-Council-sourced `professional` rows. The two
 * must stay visibly distinct in the UI: conflating a name scraped off a cause
 * list with a verified enrolled advocate is exactly the trust failure this
 * product exists to avoid.
 */
import { db, fromJson } from '../client.ts';

export interface ECourtsCoverage {
  states: number; districts: number; courts: number; advocates: number;
  appearances: number; retrievedAt: string | null;
}

export function getECourtsCoverage(): ECourtsCoverage {
  const r = db().prepare(
    `SELECT (SELECT count(*) FROM ecourts_state) states,
            (SELECT count(*) FROM ecourts_district) districts,
            (SELECT count(*) FROM ecourts_court) courts,
            (SELECT count(*) FROM ecourts_advocate) advocates,
            (SELECT COALESCE(sum(appearance_count),0) FROM ecourts_advocate) appearances,
            (SELECT max(retrieved_at) FROM ecourts_advocate) retrievedAt`,
  ).get() as unknown as ECourtsCoverage;
  return r;
}

export interface ECourtsCourtRow { code: string; name: string; stateCode: string | null; caseCount: number }

export function listECourtsCourts(limit = 24): ECourtsCourtRow[] {
  return db().prepare(
    `SELECT code, name, state_code AS stateCode, case_count AS caseCount
       FROM ecourts_court ORDER BY case_count DESC, name LIMIT ?`,
  ).all(limit) as unknown as ECourtsCourtRow[];
}

export interface ECourtsAdvocateRow {
  id: number; nameRaw: string; nameNormalised: string;
  identityConfidence: string; appearanceCount: number;
  courtCodes: string[]; stateCodes: string[];
  firstFilingYear: number | null; lastFilingYear: number | null;
  claimed: boolean;
}

/** Ordered by appearance volume, which is a COVERAGE signal — how much of
 * this name's practice the source happens to expose — and explicitly not a
 * ranking of ability. The UI must not present it as one. */
export function listECourtsAdvocates(opts: { limit?: number; offset?: number; q?: string } = {}): ECourtsAdvocateRow[] {
  const { limit = 30, offset = 0, q } = opts;
  const where = q && q.trim() ? `WHERE name_normalised LIKE ?` : '';
  const params: Array<string | number> = [];
  if (where) params.push(`%${q!.trim().toUpperCase()}%`);
  params.push(limit, offset);

  const rows = db().prepare(
    `SELECT id, name_raw AS nameRaw, name_normalised AS nameNormalised,
            identity_confidence AS identityConfidence, appearance_count AS appearanceCount,
            court_codes AS courtCodes, state_codes AS stateCodes,
            first_filing_year AS firstFilingYear, last_filing_year AS lastFilingYear,
            professional_id AS professionalId
       FROM ecourts_advocate ${where}
      ORDER BY appearance_count DESC, name_normalised
      LIMIT ? OFFSET ?`,
  ).all(...params) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    nameRaw: String(r.nameRaw),
    nameNormalised: String(r.nameNormalised),
    identityConfidence: String(r.identityConfidence),
    appearanceCount: Number(r.appearanceCount),
    courtCodes: fromJson<string[]>(r.courtCodes as never, []),
    stateCodes: fromJson<string[]>(r.stateCodes as never, []),
    firstFilingYear: r.firstFilingYear == null ? null : Number(r.firstFilingYear),
    lastFilingYear: r.lastFilingYear == null ? null : Number(r.lastFilingYear),
    claimed: r.professionalId != null,
  }));
}

export function countECourtsAdvocates(q?: string): number {
  if (q && q.trim()) {
    const r = db().prepare(
      `SELECT count(*) n FROM ecourts_advocate WHERE name_normalised LIKE ?`,
    ).get(`%${q.trim().toUpperCase()}%`) as { n: number };
    return r.n;
  }
  return (db().prepare(`SELECT count(*) n FROM ecourts_advocate`).get() as { n: number }).n;
}

export interface ECourtsStateRow { code: string; name: string; districts: number }

export function listECourtsStates(): ECourtsStateRow[] {
  return db().prepare(
    `SELECT s.code, s.name, count(d.id) districts
       FROM ecourts_state s LEFT JOIN ecourts_district d ON d.state_code = s.code
      GROUP BY s.code ORDER BY districts DESC, s.name`,
  ).all() as unknown as ECourtsStateRow[];
}
