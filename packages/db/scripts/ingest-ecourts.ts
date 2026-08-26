/**
 * Ingest court structure and the advocate directory from the eCourtsIndia
 * partner API.
 *
 *   npm run db:ecourts -- --structure              # states + districts (~39 calls)
 *   npm run db:ecourts -- --advocates --pages 20   # advocate discovery
 *   npm run db:ecourts -- --export <file>         # dump ingested rows to JSON
 *   npm run db:ecourts -- --import <file>         # load a dump (spends no credits)
 *   npm run db:ecourts -- --clear
 *
 * EVERY CALL SPENDS CREDITS, so nothing here is unbounded. `--pages` caps the
 * work explicitly and defaults low: an accidental run should cost pennies,
 * not the whole balance. Progress is written as it goes, so a run that is
 * interrupted or hits NO_CREDITS keeps everything it already fetched.
 */
import {
  listStates, listDistricts, searchCases, hasECourtsKey, ECourtsApiError,
  type CaseSearchResult,
} from '../../ingestion/src/ecourts-api.ts';
import { applySchema, db, now, transaction, toJson } from '../src/client.ts';

// Export, import and clear touch no network, so they must not require a key.
const NEEDS_KEY = !['--export', '--import', '--clear'].some((f) => process.argv.includes(f));
if (NEEDS_KEY && !hasECourtsKey()) {
  process.stderr.write('ECOURTS_API_KEY not set. See .env.example.\n');
  process.exit(1);
}

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const num = (f: string, d: number) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d;
};

applySchema();
const h = db();
const ts = now();

if (has('--clear')) {
  transaction(() => {
    for (const t of ['ecourts_advocate', 'ecourts_court', 'ecourts_district', 'ecourts_state']) {
      h.prepare(`DELETE FROM ${t}`).run();
    }
    h.prepare(`DELETE FROM source WHERE code = 'ecourtsindia-api'`).run();
  });
  process.stdout.write('cleared eCourts directory\n');
  process.exit(0);
}

/** Registered as its own source so a licensed API row is never confused with
 * a government-published or self-declared one. */
function sourceId(): number {
  h.prepare(
    `INSERT INTO source (code, name, publisher, base_url, authority, coverage_note,
       robots_checked_at, robots_allows, rate_limit_ms, is_enabled, publish_allowed, created_at, updated_at)
     VALUES ('ecourtsindia-api', 'eCourtsIndia partner API', 'eCourtsIndia (private aggregator over eCourts/NJDG)',
       'https://webapi.ecourtsindia.com', 'third_party_licensed', ?, ?, 0, 1200, 1, 1, ?, ?)
     ON CONFLICT(code) DO UPDATE SET coverage_note=excluded.coverage_note, updated_at=excluded.updated_at`,
  ).run(
    'Licensed REST API access. Site robots.txt refuses crawling; the API is the sanctioned route. '
    + 'Court structure and advocate appearances only — no litigant or party records imported.',
    ts, ts, ts,
  );
  return (h.prepare(`SELECT id FROM source WHERE code='ecourtsindia-api'`).get() as { id: number }).id;
}
const SRC = sourceId();

/* Export / import exist so the same ingested rows can be moved to another
   database — the Docker container, a colleague's machine — WITHOUT paying for
   the API calls a second time. Credits are the scarce resource here, not disk. */

const EXPORT_TABLES = ['ecourts_state', 'ecourts_district', 'ecourts_court', 'ecourts_advocate'] as const;

function argValue(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (has('--export')) {
  const file = argValue('--export');
  if (!file) { process.stderr.write('--export needs a file path\n'); process.exit(1); }
  const payload: Record<string, unknown> = { exportedAt: ts };
  for (const t of EXPORT_TABLES) {
    payload[t] = h.prepare(`SELECT * FROM ${t}`).all();
  }
  const { writeFileSync } = await import('node:fs');
  writeFileSync(file!, JSON.stringify(payload));
  for (const t of EXPORT_TABLES) {
    process.stdout.write(`  ${t}: ${(payload[t] as unknown[]).length}\n`);
  }
  process.stdout.write(`exported to ${file}\n`);
  process.exit(0);
}

if (has('--import')) {
  const file = argValue('--import');
  if (!file) { process.stderr.write('--import needs a file path\n'); process.exit(1); }
  const { readFileSync } = await import('node:fs');
  const payload = JSON.parse(readFileSync(file!, 'utf8')) as Record<string, Array<Record<string, unknown>>>;
  // source_id in the dump is the EXPORTING database's row id and means nothing
  // here; every imported row is repointed at this database's own source row.
  const localSource = sourceId();
  let total = 0;
  transaction(() => {
    for (const t of EXPORT_TABLES) {
      const rows = payload[t] ?? [];
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]!).filter((c) => c !== 'id');
      const stmt = h.prepare(
        `INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      );
      for (const r of rows) {
        stmt.run(...cols.map((c) => (c === 'source_id' ? localSource : r[c] as never)));
        total += 1;
      }
      process.stdout.write(`  ${t}: ${rows.length}\n`);
    }
  });
  process.stdout.write(`imported ${total} rows (no API calls, no credits spent)\n`);
  process.exit(0);
}

const HONORIFICS = /^(?:adv|advocate|mr|mrs|ms|miss|dr|shri|smt|sri|kum|late|m\/s)\.?\s+/gi;

/** Upper-cased, honorific- and punctuation-free. Deliberately conservative:
 * it normalises formatting, it does not guess that two spellings are one
 * person. */
function normalise(raw: string): string {
  return raw
    .replace(HONORIFICS, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** How much of a name we actually got. Drives whether the UI presents a row
 * as a person or as an unresolved name on the record. */
function confidenceOf(n: string): 'surname_only' | 'initials_surname' | 'full_name' {
  const parts = n.split(' ').filter(Boolean);
  if (parts.length === 1) return 'surname_only';
  // Two+ tokens where all but the last are single letters => "R K SHARMA".
  if (parts.slice(0, -1).every((p) => p.length === 1)) return 'initials_surname';
  return 'full_name';
}

// ------------------------------------------------------------------ structure

async function ingestStructure() {
  const states = await listStates();
  transaction(() => {
    const ins = h.prepare(
      `INSERT INTO ecourts_state (code, name, source_id, retrieved_at, created_at) VALUES (?,?,?,?,?)
       ON CONFLICT(code) DO UPDATE SET name=excluded.name, retrieved_at=excluded.retrieved_at`,
    );
    for (const s of states) ins.run(s.state, s.stateName, SRC, ts, ts);
  });
  process.stdout.write(`states: ${states.length}\n`);

  let districts = 0;
  for (const s of states) {
    try {
      const ds = await listDistricts(s.state);
      transaction(() => {
        const ins = h.prepare(
          `INSERT INTO ecourts_district (state_code, district_code, name, source_id, retrieved_at, created_at)
           VALUES (?,?,?,?,?,?)
           ON CONFLICT(state_code, district_code) DO UPDATE SET name=excluded.name, retrieved_at=excluded.retrieved_at`,
        );
        for (const d of ds) {
          const code = String(d.districtCode ?? '').trim();
          const name = String(d.districtName ?? '').trim();
          if (!code || !name) continue;
          ins.run(s.state, code, name, SRC, ts, ts);
          districts += 1;
        }
      });
      process.stdout.write(`  ${s.state} ${s.stateName}: ${ds.length} districts\n`);
    } catch (e) {
      // One bad state must not lose the other 37.
      process.stderr.write(`  ${s.state}: ${(e as Error).message}\n`);
      if ((e as ECourtsApiError).code === 'NO_CREDITS') throw e;
    }
  }
  process.stdout.write(`districts: ${districts}\n`);
}

// ------------------------------------------------------------------ advocates

/** Upsert one advocate name, accumulating appearances and court/state sets. */
function upsertAdvocate(raw: string, r: CaseSearchResult) {
  const norm = normalise(raw);
  if (norm.length < 2) return false;

  const existing = h.prepare(
    `SELECT id, court_codes, state_codes, first_filing_year, last_filing_year, appearance_count
       FROM ecourts_advocate WHERE name_normalised = ?`,
  ).get(norm) as {
    id: number; court_codes: string | null; state_codes: string | null;
    first_filing_year: number | null; last_filing_year: number | null; appearance_count: number;
  } | undefined;

  const courts = new Set<string>(existing?.court_codes ? JSON.parse(existing.court_codes) : []);
  const states = new Set<string>(existing?.state_codes ? JSON.parse(existing.state_codes) : []);
  if (r.courtCode) courts.add(r.courtCode);
  if (r.stateCode) states.add(r.stateCode);

  const yr = r.filingYear ?? null;
  const first = yr == null ? existing?.first_filing_year ?? null
    : Math.min(yr, existing?.first_filing_year ?? yr);
  const last = yr == null ? existing?.last_filing_year ?? null
    : Math.max(yr, existing?.last_filing_year ?? yr);

  if (existing) {
    h.prepare(
      `UPDATE ecourts_advocate SET appearance_count = appearance_count + 1,
         court_codes = ?, state_codes = ?, first_filing_year = ?, last_filing_year = ?, updated_at = ?
       WHERE id = ?`,
    ).run(toJson([...courts]), toJson([...states]), first, last, ts, existing.id);
  } else {
    h.prepare(
      `INSERT INTO ecourts_advocate
         (name_raw, name_normalised, identity_confidence, appearance_count, court_codes, state_codes,
          first_filing_year, last_filing_year, source_id, retrieved_at, created_at, updated_at)
       VALUES (?,?,?,1,?,?,?,?,?,?,?,?)`,
    ).run(raw.trim(), norm, confidenceOf(norm), toJson([...courts]), toJson([...states]),
      first, last, SRC, ts, ts, ts);
  }
  return true;
}

function recordCourt(r: CaseSearchResult) {
  if (!r.courtCode || !r.courtName) return;
  h.prepare(
    `INSERT INTO ecourts_court (code, name, state_code, case_count, source_id, retrieved_at, created_at)
     VALUES (?,?,?,1,?,?,?)
     ON CONFLICT(code) DO UPDATE SET case_count = case_count + 1, retrieved_at = excluded.retrieved_at`,
  ).run(r.courtCode, r.courtName, r.stateCode ?? null, SRC, ts, ts);
}

async function ingestAdvocates(pages: number, pageSize: number, seeds: string[]) {
  let advocates = 0;
  let cases = 0;

  for (const seed of seeds) {
    process.stdout.write(`\nseed "${seed}"\n`);
    for (let page = 1; page <= pages; page += 1) {
      let res;
      try {
        res = await searchCases({ advocates: seed, page, pageSize });
      } catch (e) {
        const err = e as ECourtsApiError;
        process.stderr.write(`  page ${page}: ${err.code} ${err.message}\n`);
        if (err.code === 'NO_CREDITS' || err.code === 'NOT_AUTHENTICATED') return { advocates, cases };
        break;
      }
      const results = res.results ?? [];
      if (results.length === 0) break;

      transaction(() => {
        for (const r of results) {
          cases += 1;
          recordCourt(r);
          for (const a of [...(r.petitionerAdvocates ?? []), ...(r.respondentAdvocates ?? [])]) {
            if (typeof a === 'string' && upsertAdvocate(a, r)) advocates += 1;
          }
        }
      });
      process.stdout.write(`  page ${page}/${pages}: ${results.length} cases, ${res.totalHits} total hits\n`);
      if (res.hasNextPage === false) break;
    }
  }
  return { advocates, cases };
}

// ----------------------------------------------------------------------- main

try {
  if (has('--structure')) await ingestStructure();

  if (has('--advocates')) {
    const pages = num('--pages', 3);
    const pageSize = num('--page-size', 100);
    // Common Indian surnames as discovery seeds. The API has no enumeration
    // endpoint, so coverage is inherently seed-driven and partial — this is a
    // sample of the record, never a census of the bar.
    const seeds = (argv.includes('--seeds')
      ? String(argv[argv.indexOf('--seeds') + 1]).split(',')
      : ['Sharma', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Gupta', 'Nair', 'Desai']
    ).map((s) => s.trim()).filter(Boolean);

    process.stdout.write(`advocate discovery: ${seeds.length} seeds x up to ${pages} pages x ${pageSize}\n`);
    const r = await ingestAdvocates(pages, pageSize, seeds);
    process.stdout.write(`\nappearances recorded: ${r.advocates} across ${r.cases} cases\n`);
  }

  const counts = h.prepare(
    `SELECT (SELECT count(*) FROM ecourts_state) s, (SELECT count(*) FROM ecourts_district) d,
            (SELECT count(*) FROM ecourts_advocate) a, (SELECT count(*) FROM ecourts_court) c`,
  ).get() as { s: number; d: number; a: number; c: number };
  process.stdout.write(`\ntotals — states ${counts.s}, districts ${counts.d}, advocates ${counts.a}, courts ${counts.c}\n`);
} catch (e) {
  process.stderr.write(`\nFAILED: ${(e as Error).message}\n`);
  process.stderr.write('Partial data already written is retained.\n');
  process.exit(1);
}
