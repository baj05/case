/**
 * Ingest ecourtsindia.com's "Verified Advocates" directory — self-registered
 * profiles (bio, contact info, real case history), a different and richer
 * source than the case-listing scrape in ingest-ecourts-scrape.ts.
 *
 *   node --max-old-space-size=4096 scripts/ingest-verified-advocates.ts <path-to-advocates_out>
 *
 * Case-count honesty: cases are matched to a profile by the source SITE's
 * own name-matching, not a verified unique identity. A handful of profiles
 * with extremely common Indian names ("Ajit Kumar", "Naresh Kumar") show
 * implausible case totals (tens of thousands) that almost certainly merge
 * several real people. Real numbers are still stored and shown — inventing
 * a cap would be its own fabrication — but any total past IMPLAUSIBLE_CASE_COUNT
 * gets an honest caveat in the UI rather than being presented as one
 * person's real caseload.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  applySchema, db, now, transaction, registerSource, upsertProfessional,
  linkCourt, applyPublishGate, recomputeConfidence, rebuildSearchIndex,
} from '@lexhall/db';
import { titleCaseName } from '@lexhall/core';
import { resolveCourtsFromOffice } from '../../ingestion/src/pipeline.ts';

export const IMPLAUSIBLE_CASE_COUNT = 10000;
const MIN_FILING_YEAR = 1950;
const MAX_FILING_YEAR = new Date().getFullYear();

const outDir = process.argv[2];
if (!outDir || !existsSync(outDir)) {
  process.stderr.write('Usage: node scripts/ingest-verified-advocates.ts <path-to-advocates_out>\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Minimal RFC4180 CSV parser returning raw row arrays (not per-row objects) —
// several cases.csv files here run 50-150MB; skipping the object-per-row
// overhead matters at that size.
// ---------------------------------------------------------------------------
function parseCsvRows(text: string): string[][] {
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

function readCsvObjects(path: string): Array<Record<string, string>> {
  if (!existsSync(path)) return [];
  const rows = parseCsvRows(readFileSync(path, 'utf-8'));
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i]!;
    if (r.length === 1 && r[0] === '') continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) obj[header[c]!] = r[c] ?? '';
    out.push(obj);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bar Council code -> {professional_body.code, state location name}. Same
// standard, publicly documented SBC list used for the case-listing scrape —
// reused here because it is the ONLY reliable per-advocate state signal this
// dataset carries (no direct state-code column, unlike the case-listing one).
// ---------------------------------------------------------------------------
const BAR_COUNCIL: Record<string, { bodyCode: string; state: string }> = {
  BAR_AP: { bodyCode: 'IN-SBC01', state: 'Andhra Pradesh' },
  BAR_ASM: { bodyCode: 'IN-SBC02', state: 'Assam' },
  BAR_BR: { bodyCode: 'IN-SBC03', state: 'Bihar' },
  BAR_CH: { bodyCode: 'IN-SBC04', state: 'Chhattisgarh' },
  BAR_DEL: { bodyCode: 'IN-SBC05', state: 'Delhi' },
  BAR_GUJ: { bodyCode: 'IN-SBC06', state: 'Gujarat' },
  BAR_HP: { bodyCode: 'IN-SBC07', state: 'Himachal Pradesh' },
  BAR_JK: { bodyCode: 'IN-SBC08', state: 'Jammu and Kashmir' },
  BAR_JH: { bodyCode: 'IN-SBC09', state: 'Jharkhand' },
  BAR_KTK: { bodyCode: 'IN-SBC10', state: 'Karnataka' },
  BAR_KE: { bodyCode: 'IN-SBC11', state: 'Kerala' },
  BAR_MP: { bodyCode: 'IN-SBC12', state: 'Madhya Pradesh' },
  BAR_MAH: { bodyCode: 'IN-SBC13', state: 'Maharashtra' },
  BAR_MAN: { bodyCode: 'IN-SBC14', state: 'Manipur' },
  BAR_MEG: { bodyCode: 'IN-SBC15', state: 'Meghalaya' },
  BAR_OD: { bodyCode: 'IN-SBC16', state: 'Odisha' },
  BAR_PH: { bodyCode: 'IN-SBC17', state: 'Punjab' }, // shared Bar Council of Punjab & Haryana; state left at Punjab, the more common of the two
  BAR_RAJ: { bodyCode: 'IN-SBC18', state: 'Rajasthan' },
  BAR_TN: { bodyCode: 'IN-SBC19', state: 'Tamil Nadu' },
  BAR_TG: { bodyCode: 'IN-SBC20', state: 'Telangana' },
  BAR_TR: { bodyCode: 'IN-SBC21', state: 'Tripura' },
  BAR_UP: { bodyCode: 'IN-SBC22', state: 'Uttar Pradesh' },
  BAR_UK: { bodyCode: 'IN-SBC23', state: 'Uttarakhand' },
  BAR_WB: { bodyCode: 'IN-SBC24', state: 'West Bengal' },
};

applySchema();
const h = db();
const ts = now();

const sourceId = registerSource({
  code: 'ecourtsindia-verified-directory',
  name: 'eCourts India — Verified Advocates directory',
  publisher: 'ecourtsindia.com (private case-data aggregator; a self-registered profile directory)',
  baseUrl: 'https://ecourtsindia.com',
  authority: 'third_party_scraped',
  coverageNote:
    'Self-registered advocate profiles from ecourtsindia.com\'s "Verified Advocates" section — bio, '
    + 'contact details and case history the advocate (or the platform) chose to publish. "Verified" is '
    + 'this third-party platform\'s own status, not a Bar Council or CaseADVO verification. Case counts '
    + 'and category/year breakdowns are computed from the platform\'s own name-matched case history, '
    + 'which is known to merge multiple real people under one profile for common names — extreme '
    + 'outliers are flagged in the UI rather than presented as one person\'s real caseload.',
  rateLimitMs: 0,
  publishAllowed: true,
});

const countryId = Number((h.prepare(`SELECT id FROM country WHERE iso2='IN'`).get() as { id: number }).id);

const bodyIdByCode = new Map<string, number>();
for (const row of h.prepare(`SELECT id, code FROM professional_body`).all() as Array<{ id: number; code: string }>) {
  bodyIdByCode.set(row.code, row.id);
}

function resolveByBarCouncil(code: string): { professionalBodyId: number | null; locationId: number | null; jurisdictionId: number | null } {
  const entry = BAR_COUNCIL[code];
  if (!entry) return { professionalBodyId: null, locationId: null, jurisdictionId: null };
  const professionalBodyId = bodyIdByCode.get(entry.bodyCode) ?? null;
  const loc = h.prepare(`SELECT id, jurisdiction_id AS jurisdictionId FROM location WHERE level=1 AND name=?`)
    .get(entry.state) as { id: number; jurisdictionId: number | null } | undefined;
  return { professionalBodyId, locationId: loc?.id ?? null, jurisdictionId: loc?.jurisdictionId ?? null };
}

const directory = readCsvObjects(join(outDir, 'advocates_directory.csv'));
process.stdout.write(`directory rows: ${directory.length}\n`);

const profilesDir = join(outDir, 'profiles');
const handleHasProfile = new Set(existsSync(profilesDir) ? readdirSync(profilesDir) : []);

let created = 0; let updated = 0; let skipped = 0;
let withProfile = 0; let withCases = 0; let totalCaseRows = 0;
let courtLinked = 0;
const professionalIdByHandle = new Map<string, number>();

for (const row of directory) {
  const handle = (row.handle ?? '').trim();
  const rawName = (row.name ?? '').trim();
  if (!handle || rawName.length < 3) { skipped += 1; continue; }

  const hasProfile = handleHasProfile.has(handle);
  const profileRows = hasProfile ? readCsvObjects(join(profilesDir, handle, 'profile.csv')) : [];
  const profile = profileRows[0];

  const barCode = (profile?.stateBarCouncil ?? row.stateBarCouncil ?? '').trim();
  const { professionalBodyId, locationId, jurisdictionId } = resolveByBarCouncil(barCode);

  const displayName = titleCaseName(rawName);
  const sourceRef = `verified:${handle}`;
  const sourceUrl = `https://ecourtsindia.com/advocate/${handle}`;

  const result = upsertProfessional({
    kind: 'advocate',
    fullName: rawName,
    displayName,
    professionalBodyId,
    countryId,
    jurisdictionId,
    locationId,
    publicOffice: profile?.officeAddress?.trim() || null,
    publicEmail: profile?.contactEmail?.trim() || null,
    publicPhone: profile?.contactNumber?.trim() || null,
    // NOT the raw ecourtsindia.com URL: photo_url must only ever be a local
    // path (see next.config.ts) — download-verified-photos.ts populates it
    // separately, and re-running this script must never clobber that back
    // to a remote URL that breaks next/image.
    sourceId,
    sourceRef,
    sourceUrl,
    sourceCapturedAt: ts,
  });
  if (result.created) created += 1; else if (result.changed) updated += 1;
  professionalIdByHandle.set(handle, result.id);

  const bio = profile?.about?.trim();
  if (bio) {
    h.prepare(`UPDATE professional SET bio = ?, updated_at = ? WHERE id = ?`).run(bio, ts, result.id);
  }
  const practiceName = profile?.practiceName?.trim() || row.practiceName?.trim();
  if (practiceName && practiceName !== displayName) {
    h.prepare(`UPDATE professional SET headline = ?, updated_at = ? WHERE id = ? AND headline IS NULL`).run(practiceName, ts, result.id);
  }

  // Self-declared "areas of practice" — case-type-shaped labels from the
  // advocate's own directory profile, kept separate from the curated
  // practice_area taxonomy (see 022 migration comment).
  const areasLabel = profile?.areasOfPracticeLabels?.trim();
  if (areasLabel) {
    const areas = [...new Set(areasLabel.split(';').map((s) => s.trim()).filter(Boolean))].slice(0, 20);
    const stmt = h.prepare(`INSERT OR IGNORE INTO professional_declared_area (professional_id, label) VALUES (?,?)`);
    for (const a of areas) stmt.run(result.id, a);
  }

  if (hasProfile) withProfile += 1;

  // -------------------------------------------------------------- cases.csv
  const casesPath = join(profilesDir, handle, 'cases.csv');
  if (!existsSync(casesPath)) continue;
  const raw = readFileSync(casesPath, 'utf-8');
  const rows = parseCsvRows(raw);
  if (rows.length <= 1) continue;
  const header = rows[0]!;
  const col = (name: string) => header.indexOf(name);
  const iStatus = col('caseStatus'); const iCategory = col('caseCategory');
  const iCourtName = col('courtName'); const iFilingYear = col('filingYear');

  let total = 0; let disposed = 0; let pending = 0;
  const courtCount = new Map<string, number>();
  // Keyed on a normalised form (trimmed, trailing punctuation stripped,
  // case-folded) — the source's own caseCategory field spells the same real
  // category inconsistently ("Negotiable Instruments Act - 138" vs
  // "NEGOTIABLE INSTRUMENTS ACT - 138" vs with a trailing comma), which
  // would otherwise fragment one category into several rows.
  const categoryCount = new Map<string, number>();
  const categoryDisplay = new Map<string, string>();
  const yearCount = new Map<number, number>();
  let minYear: number | null = null; let maxYear: number | null = null;

  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i]!;
    if (r.length === 1 && r[0] === '') continue;
    total += 1;
    const status = r[iStatus] ?? '';
    if (status === 'DISPOSED') disposed += 1;
    else if (status === 'PENDING') pending += 1;
    const court = (r[iCourtName] ?? '').trim();
    if (court) courtCount.set(court, (courtCount.get(court) ?? 0) + 1);
    const categoryRaw = (r[iCategory] ?? '').trim().replace(/[,.;]+$/, '').replace(/\s+/g, ' ');
    if (categoryRaw) {
      const key = categoryRaw.toLowerCase();
      categoryCount.set(key, (categoryCount.get(key) ?? 0) + 1);
      // Prefer a mixed-case display form over ALL CAPS when both are seen.
      const existing = categoryDisplay.get(key);
      if (!existing || (existing === existing.toUpperCase() && categoryRaw !== categoryRaw.toUpperCase())) {
        categoryDisplay.set(key, categoryRaw);
      }
    }
    const yearStr = r[iFilingYear] ?? '';
    const year = /^\d+$/.test(yearStr) ? Number(yearStr) : NaN;
    if (!Number.isNaN(year) && year >= MIN_FILING_YEAR && year <= MAX_FILING_YEAR) {
      yearCount.set(year, (yearCount.get(year) ?? 0) + 1);
      minYear = minYear === null ? year : Math.min(minYear, year);
      maxYear = maxYear === null ? year : Math.max(maxYear, year);
    }
  }

  if (total === 0) continue;
  withCases += 1;
  totalCaseRows += total;

  let mostActiveCourt: string | null = null; let mostActiveCourtN = 0;
  for (const [c, n] of courtCount) if (n > mostActiveCourtN) { mostActiveCourt = c; mostActiveCourtN = n; }

  transaction(() => {
    h.prepare(
      `INSERT INTO professional_case_stats
         (professional_id, total_cases, disposed_cases, pending_cases, disposal_rate_pct,
          distinct_court_count, most_active_court, first_filing_year, last_filing_year, years_active, computed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(professional_id) DO UPDATE SET
         total_cases=excluded.total_cases, disposed_cases=excluded.disposed_cases, pending_cases=excluded.pending_cases,
         disposal_rate_pct=excluded.disposal_rate_pct, distinct_court_count=excluded.distinct_court_count,
         most_active_court=excluded.most_active_court, first_filing_year=excluded.first_filing_year,
         last_filing_year=excluded.last_filing_year, years_active=excluded.years_active, computed_at=excluded.computed_at`,
    ).run(
      result.id, total, disposed, pending, total > 0 ? Math.round((disposed / total) * 1000) / 10 : null,
      courtCount.size, mostActiveCourt, minYear, maxYear,
      minYear !== null && maxYear !== null ? maxYear - minYear + 1 : null, ts,
    );

    h.prepare(`DELETE FROM professional_case_category WHERE professional_id = ?`).run(result.id);
    const topCategories = [...categoryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const catStmt = h.prepare(`INSERT INTO professional_case_category (professional_id, category_label, case_count, rank) VALUES (?,?,?,?)`);
    topCategories.forEach(([key, count], idx) => catStmt.run(result.id, categoryDisplay.get(key) ?? key, count, idx + 1));

    h.prepare(`DELETE FROM professional_case_year WHERE professional_id = ?`).run(result.id);
    const yearStmt = h.prepare(`INSERT INTO professional_case_year (professional_id, filing_year, case_count) VALUES (?,?,?)`);
    for (const [year, count] of yearCount) yearStmt.run(result.id, year, count);
  });

  // Court-of-appearance: same resolver the BCI pipeline uses, only linking
  // when a case names a Supreme Court/High Court this DB already tracks.
  const linkedHere = new Set<number>();
  for (const [courtName] of courtCount) {
    for (const hit of resolveCourtsFromOffice(courtName)) {
      if (linkedHere.has(hit.courtId)) continue;
      linkedHere.add(hit.courtId);
      linkCourt(result.id, hit.courtId, hit.chamberRef, false, false);
      courtLinked += 1;
    }
  }
}

process.stdout.write(`professionals: ${created} created, ${updated} updated, ${skipped} skipped\n`);
process.stdout.write(`with scraped profile: ${withProfile}\n`);
process.stdout.write(`with case history: ${withCases} (${totalCaseRows.toLocaleString()} case rows)\n`);
process.stdout.write(`court-of-appearance links: ${courtLinked}\n`);

recomputeConfidence();
const gate = applyPublishGate();
const indexed = rebuildSearchIndex();
process.stdout.write(`publish gate: ${gate.published} published, ${gate.withheld} withheld\n`);
process.stdout.write(`search index: ${indexed} documents\n`);
