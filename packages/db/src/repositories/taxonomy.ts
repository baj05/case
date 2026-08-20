/**
 * Seeds and reads the 6-level legal matter taxonomy.
 * Idempotent — safe to re-run.
 */
import { db, now, transaction } from '../client.ts';
import { slugify } from '../ids.ts';
import {
  fold, LEGAL_DOMAINS, LEGAL_MATTERS, FORUMS, EXTRA_PRACTICE_AREAS, EXTRA_MATTER_TYPES,
  ADDITIONAL_MATTERS, ADDITIONAL_FORUMS, ADDITIONAL_MATTER_SYNONYMS,
} from '@lexhall/core';

/** Both taxonomy passes, merged. Pass 2 closed gaps found by driving real queries. */
const ALL_FORUMS = [...FORUMS, ...ADDITIONAL_FORUMS];
const ALL_MATTERS = [...LEGAL_MATTERS, ...ADDITIONAL_MATTERS];

export function seedTaxonomy(): {
  domains: number; practiceAreas: number; matters: number;
  issues: number; forums: number; synonyms: number; matterForums: number; matterServices: number;
} {
  return transaction(() => {
    const h = db();
    const ts = now();

    // ---- level 1: domains -------------------------------------------------
    for (const d of LEGAL_DOMAINS) {
      h.prepare(
        `INSERT INTO legal_domain (code, name, slug, plain_summary, icon_hint, sort_order, is_active, created_at, updated_at)
         VALUES (?,?,?,?,?,?,1,?,?)
         ON CONFLICT(code) DO UPDATE SET name=excluded.name, plain_summary=excluded.plain_summary,
           icon_hint=excluded.icon_hint, sort_order=excluded.sort_order, updated_at=excluded.updated_at`,
      ).run(d.code, d.name, d.slug, d.plainSummary, d.icon ?? null, d.sortOrder, ts, ts);
    }
    const domainId = new Map<string, number>();
    for (const r of h.prepare(`SELECT id, code FROM legal_domain`).all() as Array<{ id: number; code: string }>) {
      domainId.set(r.code, r.id);
    }

    // ---- level 2: extra practice areas + attach all to domains ------------
    for (const pa of EXTRA_PRACTICE_AREAS) {
      h.prepare(
        `INSERT INTO practice_area (parent_id, code, name, slug, plain_summary, sort_order, is_active, legal_domain_id, created_at, updated_at)
         VALUES (NULL,?,?,?,?,?,1,?,?,?)
         ON CONFLICT(code) DO UPDATE SET name=excluded.name, plain_summary=excluded.plain_summary,
           legal_domain_id=excluded.legal_domain_id, updated_at=excluded.updated_at`,
      ).run(pa.code, pa.name, pa.slug, pa.plainSummary, pa.sortOrder, domainId.get(pa.domain) ?? null, ts, ts);
      const paRow = h.prepare(`SELECT id FROM practice_area WHERE code=?`).get(pa.code) as { id: number };
      for (const [phrase, weight] of pa.synonyms) {
        h.prepare(
          `INSERT INTO practice_area_synonym (practice_area_id, phrase, weight, kind) VALUES (?,?,?,'plain')
           ON CONFLICT(practice_area_id, phrase) DO UPDATE SET weight=excluded.weight`,
        ).run(paRow.id, fold(String(phrase)), Number(weight));
      }
    }
    // Map the original practice areas onto their domain.
    for (const d of LEGAL_DOMAINS) {
      for (const code of d.practiceAreas) {
        h.prepare(`UPDATE practice_area SET legal_domain_id=?, updated_at=? WHERE code=?`)
          .run(domainId.get(d.code) ?? null, ts, code);
      }
    }
    // Child practice areas inherit their parent's domain.
    h.prepare(
      `UPDATE practice_area SET legal_domain_id = (
         SELECT p.legal_domain_id FROM practice_area p WHERE p.id = practice_area.parent_id)
       WHERE parent_id IS NOT NULL AND legal_domain_id IS NULL`,
    ).run();

    // ---- level 5: extra services -----------------------------------------
    for (const mt of EXTRA_MATTER_TYPES) {
      h.prepare(
        `INSERT INTO matter_type (code, name, slug, category, plain_summary, sort_order, is_active)
         VALUES (?,?,?,?,?,?,1) ON CONFLICT(code) DO UPDATE SET name=excluded.name`,
      ).run(mt.code, mt.name, mt.slug, mt.category, mt.plainSummary, mt.sortOrder);
    }

    // ---- level 6: forums (two passes for escalation links) ---------------
    for (const f of ALL_FORUMS) {
      const courtId = f.courtSlug
        ? (h.prepare(`SELECT id FROM court WHERE slug=?`).get(f.courtSlug) as { id: number } | undefined)?.id ?? null
        : null;
      h.prepare(
        `INSERT INTO forum (code, name, short_name, slug, kind, level, court_id, statute, website_url, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(code) DO UPDATE SET name=excluded.name, short_name=excluded.short_name,
           kind=excluded.kind, level=excluded.level, court_id=excluded.court_id,
           statute=excluded.statute, website_url=excluded.website_url, updated_at=excluded.updated_at`,
      ).run(f.code, f.name, f.short ?? null, f.slug, f.kind, f.level ?? 'central', courtId,
        f.statute ?? null, f.url ?? null, ts, ts);
    }
    const forumId = new Map<string, number>();
    for (const r of h.prepare(`SELECT id, code FROM forum`).all() as Array<{ id: number; code: string }>) {
      forumId.set(r.code, r.id);
    }
    for (const f of ALL_FORUMS) {
      if (!f.escalates) continue;
      h.prepare(`UPDATE forum SET escalates_to_id=? WHERE code=?`).run(forumId.get(f.escalates) ?? null, f.code);
    }

    // ---- level 3/4: matters, synonyms, issues, services, forums ----------
    let issues = 0;
    let synonyms = 0;
    let matterForums = 0;
    let matterServices = 0;

    for (const m of ALL_MATTERS) {
      const pa = h.prepare(`SELECT id FROM practice_area WHERE code=?`).get(m.pa) as { id: number } | undefined;
      if (!pa) continue;   // a matter without its practice area is skipped, not guessed at

      h.prepare(
        `INSERT INTO legal_matter (practice_area_id, code, name, slug, plain_summary, typical_party,
           default_urgency, sort_order, is_active, created_at)
         VALUES (?,?,?,?,?,?,?,?,1,?)
         ON CONFLICT(code) DO UPDATE SET name=excluded.name, slug=excluded.slug,
           plain_summary=excluded.plain_summary, typical_party=excluded.typical_party,
           default_urgency=excluded.default_urgency, practice_area_id=excluded.practice_area_id`,
      ).run(pa.id, m.code, m.name, m.slug, m.summary ?? null, m.party ?? 'any',
        m.urgency ?? 'normal', 100, ts);
      const mid = (h.prepare(`SELECT id FROM legal_matter WHERE code=?`).get(m.code) as { id: number }).id;

      for (const phrase of m.syn ?? []) {
        h.prepare(
          `INSERT INTO legal_matter_synonym (legal_matter_id, phrase, weight, kind) VALUES (?,?,?,'plain')
           ON CONFLICT(legal_matter_id, phrase) DO NOTHING`,
        ).run(mid, fold(phrase), phrase.split(' ').length >= 3 ? 10 : 8);
        synonyms += 1;
      }
      for (const [i, name] of (m.issues ?? []).entries()) {
        h.prepare(
          `INSERT INTO legal_issue (legal_matter_id, name, slug, sort_order, created_at) VALUES (?,?,?,?,?)
           ON CONFLICT(legal_matter_id, slug) DO NOTHING`,
        ).run(mid, name, slugify(name), (i + 1) * 10, ts);
        issues += 1;
      }
      for (const code of m.svc ?? []) {
        const mt = h.prepare(`SELECT id FROM matter_type WHERE code=?`).get(code) as { id: number } | undefined;
        if (!mt) continue;
        h.prepare(
          `INSERT INTO legal_matter_service (legal_matter_id, matter_type_id, is_typical) VALUES (?,?,1)
           ON CONFLICT DO NOTHING`,
        ).run(mid, mt.id);
        matterServices += 1;
      }
      for (const [i, code] of (m.forums ?? []).entries()) {
        const fid = forumId.get(code);
        if (!fid) continue;
        // First listed forum is where the matter ordinarily starts.
        h.prepare(
          `INSERT INTO legal_matter_forum (legal_matter_id, forum_id, stage) VALUES (?,?,?)
           ON CONFLICT DO NOTHING`,
        ).run(mid, fid, i === 0 ? 'first_instance' : 'appeal');
        matterForums += 1;
      }
    }

    // Extra phrasings for matters seeded in pass one. An unknown code is
    // reported rather than silently ignored — it means a matter was renamed.
    const unknownSynonymTargets: string[] = [];
    for (const [code, phrases] of Object.entries(ADDITIONAL_MATTER_SYNONYMS)) {
      const row = h.prepare(`SELECT id FROM legal_matter WHERE code=?`).get(code) as { id: number } | undefined;
      if (!row) { unknownSynonymTargets.push(code); continue; }
      for (const phrase of phrases) {
        h.prepare(
          `INSERT INTO legal_matter_synonym (legal_matter_id, phrase, weight, kind) VALUES (?,?,?,'plain')
           ON CONFLICT(legal_matter_id, phrase) DO NOTHING`,
        ).run(row.id, fold(phrase), phrase.split(' ').length >= 3 ? 10 : 8);
        synonyms += 1;
      }
    }
    if (unknownSynonymTargets.length) {
      console.warn('[taxonomy] synonyms target unknown matter codes:', unknownSynonymTargets.join(', '));
    }

    const one = (sql: string) => Number((h.prepare(sql).get() as { n: number }).n);
    return {
      domains: one(`SELECT count(*) n FROM legal_domain`),
      practiceAreas: one(`SELECT count(*) n FROM practice_area`),
      matters: one(`SELECT count(*) n FROM legal_matter`),
      issues, forums: one(`SELECT count(*) n FROM forum`), synonyms, matterForums, matterServices,
    };
  });
}

// ------------------------------------------------------------------- reads
export function listDomains() {
  return db().prepare(
    `SELECT d.id, d.code, d.name, d.slug, d.plain_summary AS plainSummary, d.icon_hint AS icon,
            (SELECT count(*) FROM practice_area pa WHERE pa.legal_domain_id = d.id AND pa.is_active=1) AS practiceAreaCount,
            (SELECT count(*) FROM legal_matter m JOIN practice_area pa2 ON pa2.id = m.practice_area_id
              WHERE pa2.legal_domain_id = d.id AND m.is_active=1) AS matterCount
       FROM legal_domain d WHERE d.is_active=1 ORDER BY d.sort_order`,
  ).all() as Array<{
    id: number; code: string; name: string; slug: string; plainSummary: string;
    icon: string | null; practiceAreaCount: number; matterCount: number;
  }>;
}

export function listMatters(opts: { domainSlug?: string; practiceAreaSlug?: string; limit?: number } = {}) {
  const where: string[] = ['m.is_active=1'];
  const params: Array<string | number> = [];
  if (opts.domainSlug) { where.push(`d.slug = ?`); params.push(opts.domainSlug); }
  if (opts.practiceAreaSlug) { where.push(`pa.slug = ?`); params.push(opts.practiceAreaSlug); }
  params.push(opts.limit ?? 500);
  return db().prepare(
    `SELECT m.id, m.code, m.name, m.slug, m.plain_summary AS plainSummary,
            m.typical_party AS typicalParty, m.default_urgency AS defaultUrgency,
            pa.name AS practiceAreaName, pa.slug AS practiceAreaSlug,
            d.name AS domainName, d.slug AS domainSlug,
            (SELECT count(*) FROM legal_issue i WHERE i.legal_matter_id = m.id) AS issueCount,
            (SELECT count(*) FROM legal_matter_forum lf WHERE lf.legal_matter_id = m.id) AS forumCount,
            (SELECT count(*) FROM resource r WHERE r.legal_matter_id = m.id AND r.is_published=1) AS resourceCount
       FROM legal_matter m
       JOIN practice_area pa ON pa.id = m.practice_area_id
       LEFT JOIN legal_domain d ON d.id = pa.legal_domain_id
      WHERE ${where.join(' AND ')}
      ORDER BY d.sort_order, pa.sort_order, m.name LIMIT ?`,
  ).all(...params) as Array<Record<string, string | number | null>>;
}

export interface MatterDetail {
  id: number;
  code: string;
  name: string;
  slug: string;
  plainSummary: string | null;
  typicalParty: string;
  defaultUrgency: string;
  practiceAreaId: number;
  practiceAreaName: string;
  practiceAreaSlug: string;
  domainId: number | null;
  domainName: string | null;
  domainSlug: string | null;
  issues: Array<{ name: string; slug: string }>;
  services: Array<{ code: string; name: string; slug: string; plainSummary: string }>;
  forums: Array<{
    code: string; name: string; shortName: string | null; slug: string; kind: string;
    level: string; statute: string | null; websiteUrl: string | null; stage: string;
    escalatesToName: string | null; escalatesToSlug: string | null;
  }>;
  synonyms: string[];
}

export function getMatter(slug: string): MatterDetail | null {
  const h = db();
  const m = h.prepare(
    `SELECT m.id, m.code, m.name, m.slug, m.plain_summary AS plainSummary,
            m.typical_party AS typicalParty, m.default_urgency AS defaultUrgency,
            pa.id AS practiceAreaId, pa.name AS practiceAreaName, pa.slug AS practiceAreaSlug,
            d.id AS domainId, d.name AS domainName, d.slug AS domainSlug
       FROM legal_matter m
       JOIN practice_area pa ON pa.id = m.practice_area_id
       LEFT JOIN legal_domain d ON d.id = pa.legal_domain_id
      WHERE m.slug = ? AND m.is_active = 1`,
  ).get(slug) as Omit<MatterDetail, 'issues' | 'services' | 'forums' | 'synonyms'> | undefined;
  if (!m) return null;
  const id = m.id;
  return {
    ...m,
    issues: h.prepare(`SELECT name, slug FROM legal_issue WHERE legal_matter_id=? ORDER BY sort_order`).all(id) as MatterDetail['issues'],
    services: h.prepare(
      `SELECT mt.code, mt.name, mt.slug, mt.plain_summary AS plainSummary FROM legal_matter_service lms
         JOIN matter_type mt ON mt.id = lms.matter_type_id WHERE lms.legal_matter_id=? ORDER BY mt.sort_order`,
    ).all(id) as MatterDetail['services'],
    forums: h.prepare(
      `SELECT f.code, f.name, f.short_name AS shortName, f.slug, f.kind, f.level, f.statute,
              f.website_url AS websiteUrl, lf.stage,
              ef.name AS escalatesToName, ef.slug AS escalatesToSlug
         FROM legal_matter_forum lf
         JOIN forum f ON f.id = lf.forum_id
         LEFT JOIN forum ef ON ef.id = f.escalates_to_id
        WHERE lf.legal_matter_id=?
        ORDER BY CASE lf.stage WHEN 'first_instance' THEN 0 WHEN 'grievance' THEN 1 ELSE 2 END, f.level`,
    ).all(id) as MatterDetail['forums'],
    synonyms: (h.prepare(`SELECT phrase FROM legal_matter_synonym WHERE legal_matter_id=? ORDER BY weight DESC LIMIT 8`).all(id) as Array<{ phrase: string }>).map((r) => r.phrase),
  };
}

export function listForums(kind?: string) {
  const sql = `SELECT f.id, f.code, f.name, f.short_name AS shortName, f.slug, f.kind, f.level,
                      f.statute, f.website_url AS websiteUrl,
                      ef.name AS escalatesToName, ef.slug AS escalatesToSlug,
                      (SELECT count(*) FROM legal_matter_forum lf WHERE lf.forum_id = f.id) AS matterCount
                 FROM forum f LEFT JOIN forum ef ON ef.id = f.escalates_to_id
                ${kind ? 'WHERE f.kind = ?' : ''}
                ORDER BY CASE f.kind WHEN 'court' THEN 0 WHEN 'tribunal' THEN 1 WHEN 'appellate_tribunal' THEN 2
                  WHEN 'commission' THEN 3 WHEN 'regulator' THEN 4 WHEN 'ombudsman' THEN 5
                  WHEN 'authority' THEN 6 WHEN 'grievance_cell' THEN 7 WHEN 'adr' THEN 8 ELSE 9 END, f.name`;
  const stmt = db().prepare(sql);
  return (kind ? stmt.all(kind) : stmt.all()) as Array<Record<string, string | number | null>>;
}

/** Matter-level vocabulary for the intake classifier, so plain language resolves
 *  to a specific matter rather than only a broad practice area. */
export function loadMatterVocabulary() {
  const h = db();
  return (h.prepare(
    `SELECT m.id, m.code, m.name, m.slug, pa.slug AS paSlug, pa.id AS paId
       FROM legal_matter m JOIN practice_area pa ON pa.id = m.practice_area_id WHERE m.is_active=1`,
  ).all() as Array<{ id: number; code: string; name: string; slug: string; paSlug: string; paId: number }>).map((m) => ({
    ...m,
    synonyms: (h.prepare(`SELECT phrase, weight FROM legal_matter_synonym WHERE legal_matter_id=?`).all(m.id) as Array<{ phrase: string; weight: number }>),
  }));
}
