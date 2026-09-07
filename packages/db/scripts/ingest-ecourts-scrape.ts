/**
 * Ingest advocate names from a public eCourtsIndia.com case-listing scrape
 * (NOT the licensed partner API — see ingest-ecourts.ts for that route).
 *
 *   node scripts/ingest-ecourts-scrape.ts <path-to-out-dir>
 *
 * Input shape (one subfolder per 2-letter state/UT code, produced by an
 * external Playwright scraper against ecourtsindia.com's public pages):
 *   <state>/lawyers.csv          — distinct advocate names seen in case
 *                                  listings, with a mention count.
 *   <state>/lawyer_profiles.csv  — a FUZZY name-search API's best-guess
 *                                  profile matches. Read the coverage note
 *                                  below before trusting any field from this
 *                                  file: 91% of its rows scored under 0.6
 *                                  name-similarity in the source data, i.e.
 *                                  the matched profile is very likely a
 *                                  DIFFERENT person than the name searched.
 *   <state>/cases.csv            — real case rows. Used only to establish
 *                                  which named High Court/Supreme Court an
 *                                  advocate's name appeared before — the one
 *                                  fact in this dataset with genuine, citable
 *                                  evidence per record (a real case ID).
 *
 * Tiering, in order of confidence:
 *   1. Every distinct name -> a `professional` row, kind='advocate',
 *      verification_level 0, no bio/fee/court claims. This is the honest
 *      floor: a name that appears in a real, citable case record, nothing
 *      more asserted.
 *   2. Bar Council link -> only when lawyer_profiles.csv's own match is
 *      confident (exact name after normalisation, or its own
 *      nameSimilarity >= 0.9). The other ~99% of that file is discarded
 *      entirely rather than attached to the wrong person.
 *   3. Court-of-appearance link -> only when a case's courtName resolves,
 *      via the same court-name matcher the BCI pipeline already uses, to an
 *      EXISTING court row (Supreme Court / a High Court or bench). District
 *      and magistrate courts are not in that taxonomy and are deliberately
 *      not invented here.
 *
 * practicingCourts / areasOfPractice from lawyer_profiles.csv are never
 * used: the former is dominated by the literal string "UNKNOWN" and 7,000+
 * unexplained platform-internal codes; the latter is case-type shorthand
 * (BA, WP_C, NDPS...) with no legend, and guessing English labels for it
 * would be fabrication, not enrichment.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  applySchema, db, now, transaction, registerSource, upsertProfessional,
  linkCourt, applyPublishGate, recomputeConfidence, rebuildSearchIndex, slugify,
} from '@lexhall/db';
import { normaliseName, titleCaseName } from '@lexhall/core';
import { resolveCourtsFromOffice } from '../../ingestion/src/pipeline.ts';

const outDir = process.argv[2];
if (!outDir || !existsSync(outDir)) {
  process.stderr.write('Usage: node scripts/ingest-ecourts-scrape.ts <path-to-out-dir>\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State/UT code -> existing location + jurisdiction. LW ("Lucknow") has no
// row of its own — it is the Allahabad HC's Lucknow bench, a city IN Uttar
// Pradesh, so it maps to the UP state row rather than being invented.
// ---------------------------------------------------------------------------
const STATE_NAME: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh',
  AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh', CH: 'Chandigarh',
  DD: 'Dadra and Nagar Haveli and Daman and Diu', DL: 'Delhi', GA: 'Goa',
  GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand',
  JK: 'Jammu and Kashmir', KA: 'Karnataka', KL: 'Kerala', LD: 'Lakshadweep',
  LW: 'Uttar Pradesh', MH: 'Maharashtra', ML: 'Meghalaya', MN: 'Manipur',
  MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha',
  PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim',
  TN: 'Tamil Nadu', TR: 'Tripura', TS: 'Telangana', UK: 'Uttarakhand',
  UP: 'Uttar Pradesh', WB: 'West Bengal',
};

// State Bar Council code (from the fuzzy-match API) -> this DB's already
// seeded professional_body.code. Standard, publicly documented SBC list —
// not a guess.
const BAR_COUNCIL_BODY_CODE: Record<string, string> = {
  BAR_AP: 'IN-SBC01', BAR_ASM: 'IN-SBC02', BAR_BR: 'IN-SBC03', BAR_CH: 'IN-SBC04',
  BAR_DEL: 'IN-SBC05', BAR_GUJ: 'IN-SBC06', BAR_HP: 'IN-SBC07', BAR_JK: 'IN-SBC08',
  BAR_JH: 'IN-SBC09', BAR_KTK: 'IN-SBC10', BAR_KE: 'IN-SBC11', BAR_MP: 'IN-SBC12',
  BAR_MAH: 'IN-SBC13', BAR_MAN: 'IN-SBC14', BAR_MEG: 'IN-SBC15', BAR_OD: 'IN-SBC16',
  BAR_PH: 'IN-SBC17', BAR_RAJ: 'IN-SBC18', BAR_TN: 'IN-SBC19', BAR_TG: 'IN-SBC20',
  BAR_TR: 'IN-SBC21', BAR_UP: 'IN-SBC22', BAR_UK: 'IN-SBC23', BAR_WB: 'IN-SBC24',
};

applySchema();
const h = db();
const ts = now();

const sourceId = registerSource({
  code: 'ecourtsindia-public-scrape',
  name: 'eCourts India — public case-listing scrape',
  publisher: 'ecourtsindia.com (private case-data aggregator; the public site, not the licensed partner API)',
  baseUrl: 'https://ecourtsindia.com',
  authority: 'third_party_scraped',
  coverageNote:
    'Distinct advocate names extracted from a partial scrape (~200 pages per state/UT) of public case '
    + 'listings across all 36 states and union territories, captured 2026-09-01/02. Not the licensed '
    + 'partner API (see the "ecourtsindia-api" source), not an exhaustive census of any bar, and not '
    + 'Bar Council verified. A Bar Council link is applied only where the source\'s own fuzzy name-search '
    + 'reported a confident (near-exact) match; the same file\'s low-confidence rows are discarded rather '
    + 'than attached to the wrong person. A court-of-appearance link is applied only where a real case '
    + 'record names a Supreme Court/High Court this database already tracks.',
  rateLimitMs: 0,
  publishAllowed: true,
});

const countryId = Number((h.prepare(`SELECT id FROM country WHERE iso2='IN'`).get() as { id: number }).id);

function resolveLocation(stateCode: string): { locationId: number | null; jurisdictionId: number | null } {
  const name = STATE_NAME[stateCode];
  if (!name) return { locationId: null, jurisdictionId: null };
  const row = h.prepare(`SELECT id, jurisdiction_id AS jurisdictionId FROM location WHERE level=1 AND name=?`)
    .get(name) as { id: number; jurisdictionId: number | null } | undefined;
  return { locationId: row?.id ?? null, jurisdictionId: row?.jurisdictionId ?? null };
}

const bodyIdByCode = new Map<string, number>();
for (const row of h.prepare(`SELECT id, code FROM professional_body`).all() as Array<{ id: number; code: string }>) {
  bodyIdByCode.set(row.code, row.id);
}

/**
 * Minimal RFC4180 CSV parser (no dependency available in this workspace):
 * quoted fields, doubled "" as an escaped quote, embedded commas/newlines
 * inside quotes, CRLF or LF line endings.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === '"') { inQuotes = true; i += 1; continue; }
    if (c === ',') { row.push(field); field = ''; i += 1; continue; }
    if (c === '\r') { i += 1; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += c; i += 1;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function readCsv(path: string): Array<Record<string, string>> {
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, 'utf-8'));
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i]!;
    if (r.length === 1 && r[0] === '') continue; // trailing blank line
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) obj[header[c]!] = r[c] ?? '';
    out.push(obj);
  }
  return out;
}

const states = readdirSync(outDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((code) => STATE_NAME[code])
  .sort();

process.stdout.write(`states found: ${states.length}\n`);

let baseCreated = 0; let baseUpdated = 0; let baseSkipped = 0;
let bodyLinked = 0; let courtLinked = 0;
const professionalIdByKey = new Map<string, number>(); // `${state}|${normalisedName}` -> id

// ---------------------------------------------------------------------------
// Pass 1 — base directory entries, one per distinct (state, name).
// ---------------------------------------------------------------------------
for (const state of states) {
  const rows = readCsv(join(outDir, state, 'lawyers.csv'));
  const { locationId, jurisdictionId } = resolveLocation(state);

  for (const row of rows) {
    const rawName = (row.name ?? '').trim();
    if (rawName.length < 3) { baseSkipped += 1; continue; }
    const normalised = normaliseName(rawName);
    if (!normalised) { baseSkipped += 1; continue; }

    // A standalone "Senior Advocate" designation attached to the name is the
    // same signal the BCI pipeline already treats as senior_advocate — but
    // "Senior Advocate with X" names X (junior counsel), not the senior
    // advocate, so that composite phrasing is deliberately left alone rather
    // than misattributing the designation to the wrong person.
    const isSeniorAdvocate = /\bSENIOR\s+ADVOCATE\b/i.test(rawName) && !/SENIOR\s+ADVOCATE\s+WITH\b/i.test(rawName);
    const personName = isSeniorAdvocate ? rawName.replace(/\bSENIOR\s+ADVOCATE\b/i, ' ').replace(/\s+/g, ' ').trim() : rawName;
    const displayName = titleCaseName(personName);
    const sourceRef = `case-name:${state}:${normalised}`;
    const sourceUrl = `https://ecourtsindia.com/lawyer/${slugify(rawName) || 'advocate'}?sc=${state}`;
    const mentionCount = Number(row.times_seen) || 1;

    const result = upsertProfessional({
      kind: isSeniorAdvocate ? 'senior_advocate' : 'advocate',
      fullName: rawName,
      displayName,
      countryId,
      jurisdictionId,
      locationId,
      sourceId,
      sourceRef,
      sourceUrl,
      sourceCapturedAt: ts,
    });
    if (result.created) baseCreated += 1; else if (result.changed) baseUpdated += 1;
    h.prepare(`UPDATE professional SET source_mention_count = ? WHERE id = ?`).run(mentionCount, result.id);
    professionalIdByKey.set(`${state}|${normalised}`, result.id);
  }
  process.stdout.write(`  ${state}: ${rows.length} names\n`);
}
process.stdout.write(`base directory: ${baseCreated} created, ${baseUpdated} updated, ${baseSkipped} skipped\n\n`);

// ---------------------------------------------------------------------------
// Pass 2 — Bar Council enrichment, confident matches only.
// ---------------------------------------------------------------------------
function isConfidentMatch(queriedName: string, matchedName: string, similarity: number): boolean {
  if (similarity >= 0.9) return true;
  return normaliseName(queriedName) === normaliseName(matchedName);
}

for (const state of states) {
  const rows = readCsv(join(outDir, state, 'lawyer_profiles.csv'));
  for (const row of rows) {
    const queriedName = (row.queried_name ?? '').trim();
    const matchedName = (row.matchedName ?? '').trim();
    const similarity = Number(row.nameSimilarity) || 0;
    if (!queriedName || !matchedName) continue;
    if (!isConfidentMatch(queriedName, matchedName, similarity)) continue;

    const barCode = (row.stateBarCouncil ?? '').trim();
    const bodyCode = BAR_COUNCIL_BODY_CODE[barCode];
    const bodyId = bodyCode ? bodyIdByCode.get(bodyCode) : undefined;
    if (!bodyId) continue;

    const key = `${state}|${normaliseName(queriedName)}`;
    const professionalId = professionalIdByKey.get(key);
    if (!professionalId) continue;

    transaction(() => {
      h.prepare(`UPDATE professional SET professional_body_id = ?, updated_at = ? WHERE id = ? AND professional_body_id IS NULL`)
        .run(bodyId, now(), professionalId);
      const already = h.prepare(
        `SELECT 1 FROM enrolment WHERE professional_id = ? AND professional_body_id = ? AND enrolment_number IS NULL LIMIT 1`,
      ).get(professionalId, bodyId);
      if (!already) {
        h.prepare(
          `INSERT INTO enrolment (professional_id, professional_body_id, enrolment_number, standing,
             evidence_basis, source_url, last_verified_at, created_at, updated_at)
           VALUES (?,?,NULL,'unknown','source_document',?,?,?,?)`,
        ).run(professionalId, bodyId, `https://ecourtsindia.com/lawyer/${slugify(matchedName)}`, ts, ts, ts);
      }
    });
    bodyLinked += 1;
  }
}
process.stdout.write(`bar council links applied: ${bodyLinked}\n\n`);

// ---------------------------------------------------------------------------
// Pass 3 — court-of-appearance, only where a real case names a court this DB
// already tracks (Supreme Court / a High Court or bench).
// ---------------------------------------------------------------------------
const linkedPairs = new Set<string>(); // `${professionalId}|${courtId}` de-dupe across many case rows
for (const state of states) {
  const rows = readCsv(join(outDir, state, 'cases.csv'));
  for (const row of rows) {
    const courtName = (row.courtName ?? '').trim();
    if (!courtName) continue;
    const hits = resolveCourtsFromOffice(courtName);
    if (hits.length === 0) continue;

    for (const field of ['petitionerAdvocates', 'respondentAdvocates'] as const) {
      const raw = (row[field] ?? '').trim();
      if (!raw) continue;
      for (const name of raw.split(';')) {
        const trimmed = name.trim();
        if (trimmed.length < 3) continue;
        const key = `${state}|${normaliseName(trimmed)}`;
        const professionalId = professionalIdByKey.get(key);
        if (!professionalId) continue;
        for (const hit of hits) {
          const pairKey = `${professionalId}|${hit.courtId}`;
          if (linkedPairs.has(pairKey)) continue;
          linkedPairs.add(pairKey);
          linkCourt(professionalId, hit.courtId, hit.chamberRef, false, false);
          courtLinked += 1;
        }
      }
    }
  }
  process.stdout.write(`  ${state}: cases scanned for court evidence\n`);
}
process.stdout.write(`court-of-appearance links applied: ${courtLinked}\n\n`);

// ---------------------------------------------------------------------------
recomputeConfidence();
const gate = applyPublishGate();
const indexed = rebuildSearchIndex();
process.stdout.write(`publish gate: ${gate.published} published, ${gate.withheld} withheld\n`);
process.stdout.write(`search index: ${indexed} documents\n`);
