/**
 * Reference data: countries, jurisdictions, locations, courts, taxonomy.
 * Seeding is idempotent — safe to re-run without duplicating rows.
 */
import { db, now, flag, transaction } from '../client.ts';
import { slugify } from '../ids.ts';
import {
  PRACTICE_AREAS, MATTER_TYPES, LANGUAGES,
  INDIA_STATES, INDIA_CITIES, INDIA_COURTS,
  fold,
} from '@lexhall/core';
import type { IntakeVocabulary } from '@lexhall/core';

export function seedReferenceData(): { countries: number; locations: number; courts: number; practiceAreas: number } {
  return transaction(() => {
    const h = db();
    const ts = now();

    // ---- country ----------------------------------------------------------
    h.prepare(
      `INSERT INTO country (iso2, iso3, name, currency_code, default_locale, default_timezone, phone_code, is_launched, created_at, updated_at)
       VALUES ('IN','IND','India','INR','en','Asia/Kolkata','+91',1,?,?)
       ON CONFLICT(iso2) DO UPDATE SET updated_at=excluded.updated_at`,
    ).run(ts, ts);
    const countryId = Number((h.prepare(`SELECT id FROM country WHERE iso2='IN'`).get() as { id: number }).id);

    // Jurisdictions the architecture supports but has not launched. Present so
    // the international abstraction is exercised, not merely asserted.
    for (const [iso2, iso3, name, cur, tz, phone] of [
      ['AE', 'ARE', 'United Arab Emirates', 'AED', 'Asia/Dubai', '+971'],
      ['GB', 'GBR', 'United Kingdom', 'GBP', 'Europe/London', '+44'],
      ['SG', 'SGP', 'Singapore', 'SGD', 'Asia/Singapore', '+65'],
    ] as const) {
      h.prepare(
        `INSERT INTO country (iso2, iso3, name, currency_code, default_locale, default_timezone, phone_code, is_launched, created_at, updated_at)
         VALUES (?,?,?,?,'en',?,?,0,?,?) ON CONFLICT(iso2) DO NOTHING`,
      ).run(iso2, iso3, name, cur, tz, phone, ts, ts);
    }

    // ---- jurisdiction + location hierarchy --------------------------------
    // Root location for the country, so `path` is uniform at every level.
    h.prepare(
      `INSERT INTO location (country_id, jurisdiction_id, parent_id, level, kind, name, slug, path, is_searchable, created_at, updated_at)
       VALUES (?, NULL, NULL, 0, 'country', 'India', 'india', '/', 0, ?, ?)
       ON CONFLICT(country_id, slug) DO NOTHING`,
    ).run(countryId, ts, ts);
    const rootId = Number((h.prepare(`SELECT id FROM location WHERE country_id=? AND slug='india'`).get(countryId) as { id: number }).id);
    h.prepare(`UPDATE location SET path=? WHERE id=?`).run(`/${rootId}/`, rootId);

    const stateLocId = new Map<string, number>();
    const jurisdictionId = new Map<string, number>();

    for (const st of INDIA_STATES) {
      const code = `IN-${st.code}`;
      h.prepare(
        `INSERT INTO jurisdiction (country_id, code, name, kind, legal_system, created_at, updated_at)
         VALUES (?,?,?,?,'common_law',?,?) ON CONFLICT(country_id, code) DO NOTHING`,
      ).run(countryId, code, st.name, st.kind, ts, ts);
      const jid = Number((h.prepare(`SELECT id FROM jurisdiction WHERE country_id=? AND code=?`).get(countryId, code) as { id: number }).id);
      jurisdictionId.set(st.code, jid);

      const slug = slugify(st.name);
      h.prepare(
        `INSERT INTO location (country_id, jurisdiction_id, parent_id, level, kind, name, slug, path, is_searchable, created_at, updated_at)
         VALUES (?,?,?,1,?,?,?,'',1,?,?) ON CONFLICT(country_id, slug) DO NOTHING`,
      ).run(countryId, jid, rootId, st.kind, st.name, slug, ts, ts);
      const lid = Number((h.prepare(`SELECT id FROM location WHERE country_id=? AND slug=?`).get(countryId, slug) as { id: number }).id);
      h.prepare(`UPDATE location SET path=?, jurisdiction_id=? WHERE id=?`).run(`/${rootId}/${lid}/`, jid, lid);
      stateLocId.set(st.code, lid);

      for (const alias of st.aliases ?? []) {
        h.prepare(`INSERT INTO location_alias (location_id, alias, kind) VALUES (?,?,'alternate_name') ON CONFLICT DO NOTHING`).run(lid, fold(alias));
      }
    }

    const cityLocId = new Map<string, number>();
    for (const city of INDIA_CITIES) {
      const parent = stateLocId.get(city.state);
      if (!parent) continue;
      const jid = jurisdictionId.get(city.state) ?? null;
      const slug = slugify(city.name);
      h.prepare(
        `INSERT INTO location (country_id, jurisdiction_id, parent_id, level, kind, name, slug, path, is_searchable, created_at, updated_at)
         VALUES (?,?,?,4,'city',?,?,'',1,?,?) ON CONFLICT(country_id, slug) DO NOTHING`,
      ).run(countryId, jid, parent, city.name, slug, ts, ts);
      const row = h.prepare(`SELECT id FROM location WHERE country_id=? AND slug=?`).get(countryId, slug) as { id: number } | undefined;
      if (!row) continue;
      h.prepare(`UPDATE location SET path=? WHERE id=?`).run(`/${rootId}/${parent}/${row.id}/`, row.id);
      cityLocId.set(city.name, Number(row.id));
      for (const alias of city.aliases ?? []) {
        h.prepare(`INSERT INTO location_alias (location_id, alias, kind) VALUES (?,?,'alternate_name') ON CONFLICT DO NOTHING`).run(row.id, fold(alias));
      }
    }

    // ---- courts (two passes so parent benches resolve) --------------------
    const courtIdByName = new Map<string, number>();
    for (const c of INDIA_COURTS) {
      const slug = slugify(c.name);
      const locId = c.seat ? cityLocId.get(c.seat) ?? null : null;
      const jid = c.state ? jurisdictionId.get(c.state) ?? null : null;
      h.prepare(
        `INSERT INTO court (country_id, jurisdiction_id, parent_id, location_id, tier, kind, name, short_name, slug, seat, is_bench, source_url, last_verified_at, created_at, updated_at)
         VALUES (?,?,NULL,?,?,?,?,?,?,?,?,NULL,?,?,?) ON CONFLICT(country_id, slug) DO NOTHING`,
      ).run(countryId, jid, locId, c.tier, c.kind, c.name, c.shortName ?? null, slug, c.seat ?? null, flag(Boolean(c.isBench)), ts, ts, ts);
      const row = h.prepare(`SELECT id FROM court WHERE country_id=? AND slug=?`).get(countryId, slug) as { id: number } | undefined;
      if (row) courtIdByName.set(c.name, Number(row.id));
    }
    for (const c of INDIA_COURTS) {
      if (!c.parent) continue;
      const child = courtIdByName.get(c.name);
      const parent = courtIdByName.get(c.parent);
      if (child && parent) h.prepare(`UPDATE court SET parent_id=? WHERE id=?`).run(parent, child);
    }

    // ---- practice areas (two passes for parents) --------------------------
    const paIdByCode = new Map<string, number>();
    for (const pa of PRACTICE_AREAS) {
      h.prepare(
        `INSERT INTO practice_area (parent_id, code, name, slug, plain_summary, sort_order, is_active, created_at, updated_at)
         VALUES (NULL,?,?,?,?,?,1,?,?) ON CONFLICT(code) DO UPDATE SET
           name=excluded.name, plain_summary=excluded.plain_summary, sort_order=excluded.sort_order, updated_at=excluded.updated_at`,
      ).run(pa.code, pa.name, pa.slug, pa.plainSummary, pa.sortOrder ?? 100, ts, ts);
      const row = h.prepare(`SELECT id FROM practice_area WHERE code=?`).get(pa.code) as { id: number };
      paIdByCode.set(pa.code, Number(row.id));
    }
    for (const pa of PRACTICE_AREAS) {
      if (!pa.parent) continue;
      const child = paIdByCode.get(pa.code);
      const parent = paIdByCode.get(pa.parent);
      if (child && parent) h.prepare(`UPDATE practice_area SET parent_id=? WHERE id=?`).run(parent, child);
    }
    for (const pa of PRACTICE_AREAS) {
      const id = paIdByCode.get(pa.code);
      if (!id) continue;
      for (const [phrase, weight, kind] of pa.synonyms) {
        h.prepare(
          `INSERT INTO practice_area_synonym (practice_area_id, phrase, weight, kind) VALUES (?,?,?,?)
           ON CONFLICT(practice_area_id, phrase) DO UPDATE SET weight=excluded.weight, kind=excluded.kind`,
        ).run(id, fold(phrase), weight, kind);
      }
    }

    for (const mt of MATTER_TYPES) {
      h.prepare(
        `INSERT INTO matter_type (code, name, slug, category, plain_summary, sort_order, is_active)
         VALUES (?,?,?,?,?,?,1) ON CONFLICT(code) DO UPDATE SET name=excluded.name, plain_summary=excluded.plain_summary`,
      ).run(mt.code, mt.name, mt.slug, mt.category, mt.plainSummary, mt.sortOrder);
    }

    for (const l of LANGUAGES) {
      h.prepare(
        `INSERT INTO language (iso639, name, native_name, sort_order) VALUES (?,?,?,?)
         ON CONFLICT(iso639) DO UPDATE SET name=excluded.name`,
      ).run(l.iso639, l.name, l.nativeName, l.sortOrder);
    }

    // ---- feature flags, mirrored from .env for admin visibility -----------
    const FLAGS: Array<[string, string, string]> = [
      ['FEATURE_REVIEWS', 'Public reviews of professionals', 'Blocked pending counsel sign-off: BCI Rule 36 solicitation risk, defamation exposure, DPDP basis for publishing reviewer data. See COMPLIANCE_MATRIX C-09.'],
      ['FEATURE_ANONYMOUS_REVIEWS', 'Reviews displayed pseudonymously', 'Higher risk than attributed reviews; identity must still be retained internally. Blocked pending C-10.'],
      ['FEATURE_PAYMENTS', 'Collect consultation fees on platform', 'Blocked pending analysis of fee-sharing and commission rules. See C-12.'],
      ['FEATURE_PAID_RANKING', 'Paid placement in search results', 'Permanently disabled by design. ADR-009; plan.grants_ranking_boost is CHECK-constrained to 0.'],
      ['FEATURE_REFERRALS', 'Lawyer-to-lawyer matter referral', 'Blocked pending C-11: referral must carry no fee and requires client consent to disclosure.'],
      ['FEATURE_CONTRACT_SAAS', 'Contract lifecycle management', 'Phase 3.'],
      ['FEATURE_MEDIATION', 'Mediation workspace', 'Phase 3; requires Mediation Act 2023 conformance review.'],
      ['FEATURE_ARBITRATION', 'Arbitration workspace', 'Phase 3.'],
      ['FEATURE_AI_INTAKE', 'Plain-language intake routing', 'Enabled. Deterministic classifier only — no generative advice. ADR-006.'],
      ['FEATURE_INGEST_LIVE', 'Live crawling of public sources', 'Enabled for sources whose robots.txt permits it and whose terms have been reviewed.'],
    ];
    for (const [key, desc, gate] of FLAGS) {
      const envValue = process.env[key];
      const enabled = envValue === undefined ? (key === 'FEATURE_AI_INTAKE' || key === 'FEATURE_INGEST_LIVE') : envValue === 'true';
      h.prepare(
        `INSERT INTO feature_flag (key, enabled, description, gate_note, updated_at) VALUES (?,?,?,?,?)
         ON CONFLICT(key) DO UPDATE SET description=excluded.description, gate_note=excluded.gate_note, updated_at=excluded.updated_at`,
      ).run(key, flag(enabled && key !== 'FEATURE_PAID_RANKING'), desc, gate, ts);
    }

    const count = (t: string) => Number((h.prepare(`SELECT count(*) n FROM ${t}`).get() as { n: number }).n);
    return { countries: count('country'), locations: count('location'), courts: count('court'), practiceAreas: count('practice_area') };
  });
}

/** Vocabulary for the intake classifier, read from the database. */
export function loadIntakeVocabulary(): IntakeVocabulary {
  const h = db();
  const practiceAreas = (h.prepare(
    `SELECT id, code, name, slug FROM practice_area WHERE is_active=1 ORDER BY sort_order`,
  ).all() as Array<{ id: number; code: string; name: string; slug: string }>).map((pa) => ({
    ...pa,
    synonyms: (h.prepare(`SELECT phrase, weight FROM practice_area_synonym WHERE practice_area_id=?`).all(pa.id) as Array<{ phrase: string; weight: number }>),
  }));

  const locations = (h.prepare(
    `SELECT id, name, slug, level FROM location WHERE is_searchable=1`,
  ).all() as Array<{ id: number; name: string; slug: string; level: number }>).map((l) => ({
    ...l,
    aliases: (h.prepare(`SELECT alias FROM location_alias WHERE location_id=?`).all(l.id) as Array<{ alias: string }>).map((a) => a.alias),
  }));

  const courts = (h.prepare(
    `SELECT id, name, short_name, slug, tier FROM court`,
  ).all() as Array<{ id: number; name: string; short_name: string | null; slug: string; tier: number }>).map((c) => ({
    id: c.id, name: c.name, shortName: c.short_name, slug: c.slug, tier: c.tier,
    aliases: courtAliases(c.name),
  }));

  const matterTypes = (h.prepare(
    `SELECT id, code, name, slug FROM matter_type WHERE is_active=1 ORDER BY sort_order`,
  ).all() as Array<{ id: number; code: string; name: string; slug: string }>).map((m) => ({ ...m, synonyms: [] as string[] }));

  return { practiceAreas, locations, courts, matterTypes };
}

/** Aliases live in the seed file; look them up by name at load time. */
function courtAliases(name: string): string[] {
  const seed = INDIA_COURTS.find((c) => c.name === name);
  return seed?.aliases ?? [];
}

export function listPracticeAreas() {
  return db().prepare(
    `SELECT pa.id, pa.code, pa.name, pa.slug, pa.plain_summary AS plainSummary, pa.parent_id AS parentId,
            parent.name AS parentName, parent.slug AS parentSlug,
            (SELECT count(*) FROM professional_practice_area ppa
               JOIN professional p ON p.id = ppa.professional_id
              WHERE ppa.practice_area_id = pa.id AND p.is_published = 1 AND p.deleted_at IS NULL) AS professionalCount
       FROM practice_area pa
       LEFT JOIN practice_area parent ON parent.id = pa.parent_id
      WHERE pa.is_active = 1
      ORDER BY COALESCE(parent.sort_order, pa.sort_order), pa.sort_order`,
  ).all() as Array<{
    id: number; code: string; name: string; slug: string; plainSummary: string;
    parentId: number | null; parentName: string | null; parentSlug: string | null; professionalCount: number;
  }>;
}

export function listCourts(tier?: number) {
  const sql = `SELECT c.id, c.name, c.short_name AS shortName, c.slug, c.tier, c.kind, c.seat, c.is_bench AS isBench,
                      l.name AS locationName, j.name AS jurisdictionName,
                      (SELECT count(*) FROM professional_court pc
                         JOIN professional p ON p.id = pc.professional_id
                        WHERE pc.court_id = c.id AND p.is_published = 1 AND p.deleted_at IS NULL) AS professionalCount
                 FROM court c
                 LEFT JOIN location l ON l.id = c.location_id
                 LEFT JOIN jurisdiction j ON j.id = c.jurisdiction_id
                ${tier ? 'WHERE c.tier = ?' : ''}
                ORDER BY c.tier, c.name`;
  const stmt = db().prepare(sql);
  return (tier ? stmt.all(tier) : stmt.all()) as Array<{
    id: number; name: string; shortName: string | null; slug: string; tier: number; kind: string;
    seat: string | null; isBench: number; locationName: string | null; jurisdictionName: string | null; professionalCount: number;
  }>;
}

export function listStates() {
  return db().prepare(
    `SELECT l.id, l.name, l.slug, l.level,
            (SELECT count(*) FROM professional p WHERE p.primary_jurisdiction_id = l.jurisdiction_id AND p.is_published = 1 AND p.deleted_at IS NULL) AS professionalCount
       FROM location l WHERE l.level = 1 ORDER BY l.name`,
  ).all() as Array<{ id: number; name: string; slug: string; level: number; professionalCount: number }>;
}

export function getFeatureFlags(): Record<string, boolean> {
  const rows = db().prepare(`SELECT key, enabled FROM feature_flag`).all() as Array<{ key: string; enabled: number }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.enabled === 1]));
}

export function listFeatureFlags() {
  return db().prepare(`SELECT key, enabled, description, gate_note AS gateNote FROM feature_flag ORDER BY key`).all() as Array<{
    key: string; enabled: number; description: string; gateNote: string;
  }>;
}
