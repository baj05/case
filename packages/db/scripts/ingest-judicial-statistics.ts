/**
 * Ingest NJDG judicial statistics from the structured research extract.
 *
 *   npm run db:judicial            # ingest
 *   npm run db:judicial -- --clear # remove all ingested rows first
 *
 * Reads research/ecourts/structured/judicial-statistics.json — a reviewed,
 * checked-in artifact — rather than crawling at ingest time. Crawling and
 * importing are deliberately separate steps: the crawl output can be
 * inspected and diffed in review before anything touches the database, and
 * a rebuild never depends on a live third-party site being up.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applySchema, db, now, transaction } from '../src/client.ts';

interface Extract {
  dataVersion: string;
  retrievedAt: string;
  sources: Array<{
    id: string; name: string; url: string; publisher: string;
    authority: string; robotsPolicy: string;
  }>;
  pendency: Array<Record<string, unknown>>;
  ageBands: Array<Record<string, unknown>>;
  flow: Array<Record<string, unknown>>;
  litigantProfile: Array<Record<string, unknown>>;
  highCourtCaseTypes: Array<Record<string, unknown>>;
  highCourtDelayReasons: Array<Record<string, unknown>>;
  supremeCourtRegistration?: Array<Record<string, unknown>>;
  supremeCourtCoram?: Array<Record<string, unknown>>;
  highCourts: string[];
}

const ROOT = join(import.meta.dirname, '..', '..', '..');
const EXTRACT = join(ROOT, 'research', 'ecourts', 'structured', 'judicial-statistics.json');

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

applySchema();
const h = db();
const ts = now();
const clear = process.argv.includes('--clear');

if (clear) {
  transaction(() => {
    h.prepare(`DELETE FROM judicial_statistic`).run();
    h.prepare(`DELETE FROM high_court`).run();
    h.prepare(`DELETE FROM source WHERE code LIKE 'njdg-%'`).run();
  });
  process.stdout.write('cleared judicial statistics\n');
  process.exit(0);
}

const data = JSON.parse(readFileSync(EXTRACT, 'utf8')) as Extract;

/** Register each NJDG endpoint as a first-class source, with the robots
 * finding recorded — so provenance is queryable, not just a code comment. */
function upsertSource(s: Extract['sources'][number]): number {
  h.prepare(
    `INSERT INTO source (code, name, publisher, base_url, authority, coverage_note,
       robots_checked_at, robots_allows, rate_limit_ms, is_enabled, publish_allowed, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,1,2000,1,1,?,?)
     ON CONFLICT(code) DO UPDATE SET
       name=excluded.name, publisher=excluded.publisher, base_url=excluded.base_url,
       authority=excluded.authority, coverage_note=excluded.coverage_note,
       robots_checked_at=excluded.robots_checked_at, updated_at=excluded.updated_at`,
  ).run(
    s.id, s.name, s.publisher, s.url, s.authority,
    `Aggregate judicial statistics only — no case records or personal data. ${s.robotsPolicy}.`,
    ts, ts, ts,
  );
  const row = h.prepare(`SELECT id FROM source WHERE code = ?`).get(s.id) as { id: number };
  return row.id;
}

const sourceIds = new Map<string, number>();
let stats = 0;
let courts = 0;

transaction(() => {
  for (const s of data.sources) sourceIds.set(s.id, upsertSource(s));

  const insertStat = h.prepare(
    `INSERT INTO judicial_statistic
       (source_id, tier, metric_group, label, civil, criminal, total, percent,
        sort_order, data_version, retrieved_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(source_id, tier, metric_group, label, data_version) DO NOTHING`,
  );

  /** Each tier is published by its own grid — attributing them all to one
   * source would misstate provenance. */
  const sourceForTier = (tier: string) => {
    const code = tier === 'high_court' ? 'njdg-highcourt'
      : tier === 'supreme_court' ? 'njdg-supremecourt'
        : 'njdg-district';
    const id = sourceIds.get(code);
    if (!id) throw new Error(`no source registered for tier '${tier}' (expected ${code})`);
    return id;
  };

  function add(
    group: string,
    rows: Array<Record<string, unknown>>,
    label: (r: Record<string, unknown>) => string,
    tierOf: (r: Record<string, unknown>) => string,
  ) {
    rows.forEach((r, i) => {
      const tier = tierOf(r);
      insertStat.run(
        sourceForTier(tier), tier, group, label(r),
        (r.civil as number) ?? null, (r.criminal as number) ?? null,
        (r.total as number) ?? null, (r.percent as number) ?? null,
        i, data.dataVersion, data.retrievedAt, ts,
      );
      stats += 1;
    });
  }

  add('pendency', data.pendency, () => 'total_pending', (r) => String(r.tier));
  add('age_band', data.ageBands, (r) => String(r.band), (r) => String(r.tier));
  add('flow', data.flow, (r) => String(r.metric), (r) => String(r.tier));
  add('litigant_profile', data.litigantProfile, (r) => String(r.group), (r) => String(r.tier));
  add('case_type', data.highCourtCaseTypes, (r) => String(r.caseType), () => 'high_court');
  add('delay_reason', data.highCourtDelayReasons, (r) => String(r.reason), () => 'high_court');
  add('registration', data.supremeCourtRegistration ?? [], (r) => String(r.label), () => 'supreme_court');

  // Coram carries an extra "includes connected matters" figure that the
  // generic shape has no column for; `percent` is unused for this group, so
  // it is reused to carry it rather than adding a column for one dimension.
  (data.supremeCourtCoram ?? []).forEach((r, i) => {
    insertStat.run(
      sourceForTier('supreme_court'), 'supreme_court', 'coram', String(r.bench),
      (r.civil as number) ?? null, (r.criminal as number) ?? null,
      (r.total as number) ?? null, (r.withConnected as number) ?? null,
      i, data.dataVersion, data.retrievedAt, ts,
    );
    stats += 1;
  });

  // Pendency rows carry extra fields the generic shape has no column for;
  // store them as their own labelled rows so nothing silently drops.
  for (const p of data.pendency) {
    const tier = String(p.tier);
    if (p.olderThanOneYearCount != null) {
      insertStat.run(
        sourceForTier(tier), tier, 'pendency', 'older_than_one_year',
        null, null, p.olderThanOneYearCount as number, (p.olderThanOneYearPercent as number) ?? null,
        1, data.dataVersion, data.retrievedAt, ts,
      );
      stats += 1;
    }
  }

  const insertCourt = h.prepare(
    `INSERT INTO high_court (name, slug, source_id, retrieved_at, created_at)
     VALUES (?,?,?,?,?) ON CONFLICT(slug) DO NOTHING`,
  );
  for (const name of data.highCourts) {
    insertCourt.run(name, slugify(name), sourceIds.get('njdg-highcourt')!, data.retrievedAt, ts);
    courts += 1;
  }
});

process.stdout.write(`ingested ${stats} statistic rows, ${courts} high courts\n`);
process.stdout.write(`data version ${data.dataVersion}, retrieved ${data.retrievedAt}\n`);
