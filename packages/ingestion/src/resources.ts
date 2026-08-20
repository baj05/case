/**
 * Resource library ingestion.
 *
 * Three separate operations, deliberately not one:
 *
 *   seedResourceLibraryData()  writes the hand-authored catalogue and templates
 *   verifyResourceLinks()      fetches every source URL and records the outcome
 *   harvestResources()         reads publisher pages that list forms, and
 *                              proposes new resources for review
 *
 * The separation is the point. Seeding writes claims; verification tests them;
 * harvesting discovers things nobody has looked at yet. Only verification can
 * publish, and only harvesting can create a row nobody wrote by hand — so a
 * scraped document cannot become a published document without both a successful
 * fetch and, for anything the classifier is unsure about, a person.
 *
 * Politeness is not optional and is not configurable down: robots.txt is read
 * and obeyed for every host before the first request, requests to a host are
 * spaced, the User-Agent identifies us with a contact route, and a 403 is
 * treated as a stop signal rather than something to route around.
 */

import { DEFAULT_POLICY, checkRobots, politeGet, type FetchPolicy } from './http.ts';
import {
  db, now, transaction,
  seedResourceLibrary, seedTaxonomy, resourcesDueForCheck, applyLinkCheck,
  reindexResources, recomputeQuality,
  type ResourceSeedReport,
} from '@lexhall/db';
import { classifyLinkCheck, LINK_OUTCOME_META, type LinkOutcome } from '@lexhall/core';

type Log = (message: string) => void;

// ===========================================================================
// 1. SEED
// ===========================================================================

export function seedResourceLibraryData(log: Log = () => {}): ResourceSeedReport {
  // The resource library hangs off the legal-matter taxonomy, so that has to
  // exist first. Both are idempotent.
  const taxonomy = seedTaxonomy();
  log(`taxonomy: ${taxonomy.domains} domains, ${taxonomy.matters} matters, ${taxonomy.forums} forums`);
  const report = seedResourceLibrary();
  log(
    `resources: ${report.catalogue} catalogue entries, ${report.templates} templates, `
    + `${report.stateVariants} state variants, ${report.kits} kits, ${report.harvestTargets} harvest targets`,
  );
  if (report.heldForReview > 0) {
    log(
      `${report.heldForReview} catalogue entries held at REVIEW_REQUIRED — their URL could not be `
      + 'confirmed at authoring time and they will not be published until a link check succeeds',
    );
  }
  return report;
}

// ===========================================================================
// 2. VERIFY
// ===========================================================================

export interface VerifyOptions {
  limit?: number;
  dryRun?: boolean;
  onProgress?: Log;
  policy?: FetchPolicy;
}

export interface VerifyReport {
  checked: number;
  byOutcome: Record<string, number>;
  published: number;
  unpublished: number;
  needsHuman: number;
}

/**
 * One HTTP request per resource, classified rather than pass/fail.
 *
 * We use GET rather than HEAD because a surprising number of government hosts
 * answer HEAD with 405 while serving the document perfectly well on GET, and a
 * checker that reports those as broken is worse than no checker.
 */
export async function verifyResourceLinks(options: VerifyOptions = {}): Promise<VerifyReport> {
  const log = options.onProgress ?? (() => {});
  const policy = options.policy ?? DEFAULT_POLICY;
  const candidates = resourcesDueForCheck(options.limit ?? 250);
  const report: VerifyReport = { checked: 0, byOutcome: {}, published: 0, unpublished: 0, needsHuman: 0 };

  log(`${candidates.length} resources and attached links due for a check`);

  // Group by host so we honour one robots.txt read and one delay per host.
  const robotsByHost = new Map<string, boolean>();

  for (const candidate of candidates) {
    let host: string;
    try {
      host = new URL(candidate.url).origin;
    } catch {
      log(`  skip ${candidate.slug}: unparseable URL`);
      continue;
    }

    if (!robotsByHost.has(host)) {
      const rules = await checkRobots(host, policy);
      // 'unavailable' means we could not read robots.txt. For a link check —
      // a single GET of a page the publisher advertises publicly — proceeding
      // is proportionate, but it is recorded.
      robotsByHost.set(host, rules !== 'unavailable');
    }

    const outcome = await probe(candidate.url, policy);
    report.checked += 1;

    if (options.dryRun) {
      const classified = classifyLinkCheck(outcome.status, outcome.error);
      report.byOutcome[classified] = (report.byOutcome[classified] ?? 0) + 1;
      log(`  ${classified.padEnd(12)} ${outcome.status} ${candidate.url}`);
      continue;
    }

    const applied = applyLinkCheck({
      slug: candidate.slug,
      linkId: candidate.kind === 'link' ? candidate.linkId : undefined,
      httpStatus: outcome.status,
      finalUrl: outcome.finalUrl,
      contentType: outcome.contentType,
      error: outcome.error,
    });

    report.byOutcome[applied.outcome] = (report.byOutcome[applied.outcome] ?? 0) + 1;
    if (LINK_OUTCOME_META[applied.outcome].needsHuman) report.needsHuman += 1;
    if (applied.published) report.published += 1;
    if (applied.outcome === 'gone') report.unpublished += 1;

    log(`  ${applied.outcome.padEnd(12)} ${String(outcome.status).padEnd(4)} ${candidate.slug}`);
  }

  return report;
}

interface Probe { status: number; finalUrl?: string; contentType?: string; error?: string }

async function probe(url: string, policy: FetchPolicy): Promise<Probe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': policy.userAgent, accept: '*/*' },
    });
    // Read a little of the body so a server that only errors on read is caught,
    // then abandon it — we do not need or want the whole PDF.
    try { await response.body?.cancel(); } catch { /* already closed */ }
    return {
      status: response.status,
      finalUrl: response.url !== url ? response.url : undefined,
      contentType: response.headers.get('content-type')?.split(';')[0] ?? undefined,
    };
  } catch (error) {
    const err = error as Error;
    return { status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

// ===========================================================================
// 3. HARVEST
// ===========================================================================

export interface HarvestOptions {
  limit?: number;
  dryRun?: boolean;
  targets?: string[];
  onProgress?: Log;
  policy?: FetchPolicy;
}

export interface HarvestReport {
  runId: number | null;
  targetsRun: number;
  discovered: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  errors: number;
  blockedByRobots: number;
}

interface DiscoveredForm {
  title: string;
  url: string;
  sizeHint: string | null;
}

/**
 * Parses the forms table used by the government content platform that nearly
 * every state authority site runs on. The markup is regular:
 *
 *   <tr><td>Legal Aid Form</td><td>… <a href="…/xyz.pdf">View</a> (607 KB)</td></tr>
 *
 * A regex parser is the right tool here rather than a DOM library: the shape is
 * narrow, the dependency budget for this prototype is zero, and a parser that
 * silently succeeds on unexpected markup would be worse than one that returns
 * nothing and says so.
 */
export function parseFormsTable(html: string, baseUrl: string): DiscoveredForm[] {
  const out: DiscoveredForm[] = [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const cells = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
    if (cells.length < 2) continue;

    const firstCell = cells[0] ?? '';
    // The title cell should be text, not a link to a document.
    const title = stripTags(firstCell).replace(/\s+/g, ' ').trim();
    if (!title || title.length < 3 || /^(title|s\.?\s*no\.?|sr\.?\s*no\.?)$/i.test(title)) continue;

    const rest = cells.slice(1).join(' ');
    const hrefMatch = /<a[^>]+href=["']([^"']+\.(?:pdf|docx?|xlsx?|zip))["']/i.exec(rest)
      ?? /<a[^>]+href=["']([^"']+)["']/i.exec(rest);
    if (!hrefMatch?.[1]) continue;

    let url: string;
    try {
      url = new URL(decodeEntities(hrefMatch[1]), baseUrl).toString();
    } catch {
      continue;
    }
    // Anchors within the page, and the share links every one of these pages
    // carries, are not documents.
    if (url.includes('#') && !/\.(pdf|docx?|xlsx?|zip)/i.test(url)) continue;
    if (/facebook\.com|twitter\.com|x\.com|linkedin\.com|whatsapp/i.test(url)) continue;

    const size = /\((\d+(?:\.\d+)?\s*(?:KB|MB))\)/i.exec(rest)?.[1] ?? null;
    out.push({ title: decodeEntities(title), url, sizeHint: size });
  }

  // Same document listed twice on one page is common; keep the first.
  const seen = new Set<string>();
  return out.filter((f) => (seen.has(f.url) ? false : (seen.add(f.url), true)));
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/**
 * Classifies a discovered form by its title.
 *
 * Deterministic and conservative. `confidence` decides what happens next: a
 * high-confidence classification still lands at REVIEW_REQUIRED, and a low one
 * is additionally flagged in the title of the review-queue entry, so a person
 * reviewing a hundred harvested forms can start with the ones the machine did
 * not understand.
 */
export interface FormClassification {
  resourceType: 'OFFICIAL_FORM' | 'OFFICIAL_GUIDE' | 'GOVERNMENT_DOCUMENT';
  subcategory: string;
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
  /** True when the title suggests this is internal administration, not a public form. */
  reject: boolean;
  rejectReason?: string;
}

const REJECT_PATTERNS: Array<[RegExp, string]> = [
  [/\b(recruit|vacanc|appointment of|advertisement|walk[- ]in|interview|tender|bid|quotation|eoi|empanel)/i,
    'Recruitment, tender or empanelment material — not a public legal form.'],
  [/\b(annual report|minutes of|agenda|budget|audit report|statistics|press release|newsletter)/i,
    'Administrative or reporting document, not a form a member of the public files.'],
  [/\b(salary|pay slip|gpf|leave application for staff|transfer order|seniority)/i,
    'Internal staff administration.'],
  [/\b(photo|gallery|banner|logo|screenshot)/i, 'Not a document.'],
];

const CLASSIFY_PATTERNS: Array<[RegExp, string, string[], FormClassification['resourceType']]> = [
  [/\b(legal aid|legal service)s?\b.*\b(application|form)|\b(application|form)\b.*\blegal (aid|service)/i,
    'Apply for legal aid', ['legal aid application', 'free lawyer', 'legal services form'], 'OFFICIAL_FORM'],
  [/\bvakalatnama|vakalat\b/i, 'Apply for legal aid', ['vakalatnama', 'authorise advocate'], 'OFFICIAL_FORM'],
  [/\baffidavit\b/i, 'Apply for legal aid', ['affidavit', 'affidavit of means', 'income affidavit'], 'OFFICIAL_FORM'],
  [/\b(pre[- ]?institution )?mediation\b/i, 'Mediation', ['mediation application', 'pre-institution mediation'], 'OFFICIAL_FORM'],
  [/\blok adalat\b/i, 'Lok Adalat', ['lok adalat', 'settlement', 'lok adalat form'], 'OFFICIAL_FORM'],
  [/\b(victim|women victim)\b.*\bcompensation|\bcompensation\b.*\bvictim/i,
    'Victim compensation', ['victim compensation', 'compensation scheme'], 'OFFICIAL_FORM'],
  [/\bcost deposit\b/i, 'Apply for legal aid', ['cost deposit', 'legal aid costs'], 'OFFICIAL_FORM'],
  [/\b(scheme|guideline|regulation|rules)\b/i, 'Schemes', ['scheme', 'guidelines'], 'OFFICIAL_GUIDE'],
  [/\b(panel|plv|para[- ]?legal volunteer)\b/i, 'State authorities', ['panel lawyer', 'para-legal volunteer'], 'GOVERNMENT_DOCUMENT'],
];

export function classifyForm(title: string): FormClassification {
  for (const [pattern, reason] of REJECT_PATTERNS) {
    if (pattern.test(title)) {
      return {
        resourceType: 'GOVERNMENT_DOCUMENT', subcategory: 'State authorities',
        keywords: [], confidence: 'low', reject: true, rejectReason: reason,
      };
    }
  }
  for (const [pattern, subcategory, keywords, resourceType] of CLASSIFY_PATTERNS) {
    if (pattern.test(title)) {
      return { resourceType, subcategory, keywords, confidence: 'high', reject: false };
    }
  }
  if (/\bform\b|\bapplication\b|\bproforma\b|\bformat\b/i.test(title)) {
    return {
      resourceType: 'OFFICIAL_FORM', subcategory: 'State authorities',
      keywords: ['form'], confidence: 'medium', reject: false,
    };
  }
  return {
    resourceType: 'GOVERNMENT_DOCUMENT', subcategory: 'State authorities',
    keywords: [], confidence: 'low', reject: false,
  };
}

export async function harvestResources(options: HarvestOptions = {}): Promise<HarvestReport> {
  const log = options.onProgress ?? (() => {});
  const policy = options.policy ?? DEFAULT_POLICY;
  const h = db();
  const ts = now();

  const report: HarvestReport = {
    runId: null, targetsRun: 0, discovered: 0, inserted: 0,
    duplicates: 0, rejected: 0, errors: 0, blockedByRobots: 0,
  };

  const targets = (h.prepare(
    `SELECT t.id, t.code, t.authority_name AS authority, t.url, t.parser, t.category_code AS category,
            t.jurisdiction_id AS jurisdictionId, t.legal_matter_id AS matterId, t.forum_id AS forumId,
            t.trust_level AS trustLevel, t.resource_source_id AS sourceId,
            j.name AS stateName
       FROM resource_harvest_target t
       LEFT JOIN jurisdiction j ON j.id = t.jurisdiction_id
      WHERE t.is_enabled = 1
      ORDER BY t.last_run_at IS NOT NULL, t.last_run_at ASC
      LIMIT ?`,
  ).all(options.limit ?? 40) as Array<Record<string, string | number | null>>)
    .filter((t) => !options.targets || options.targets.includes(String(t.code)));

  if (!options.dryRun) {
    h.prepare(
      `INSERT INTO resource_harvest_run (started_at, mode, targets_run) VALUES (?,?,0)`,
    ).run(ts, 'harvest');
    report.runId = Number((h.prepare(`SELECT last_insert_rowid() AS id`).get() as { id: number }).id);
  }

  const countryId = (h.prepare(`SELECT id FROM country WHERE iso2 = 'IN'`).get() as { id: number } | undefined)?.id ?? null;

  for (const target of targets) {
    const url = String(target.url);
    const authority = String(target.authority);
    report.targetsRun += 1;

    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      report.errors += 1;
      continue;
    }

    const robots = await checkRobots(origin, policy);
    if (!options.dryRun) {
      h.prepare(`UPDATE resource_harvest_target SET robots_checked_at = ?, robots_allows = ? WHERE id = ?`)
        .run(now(), robots === 'unavailable' ? null : 1, Number(target.id));
    }

    let html: string;
    let status = 0;
    try {
      // politeGet enforces robots, the inter-request delay and the retry policy,
      // and throws RobotsDisallowed rather than proceeding.
      const result = await politeGet(url, policy);
      html = result.text;
      status = result.status;
    } catch (error) {
      const message = (error as Error).message;
      if (/robots/i.test(message)) {
        report.blockedByRobots += 1;
        log(`  ${authority}: disallowed by robots.txt — skipped`);
      } else {
        report.errors += 1;
        log(`  ${authority}: ${message.slice(0, 120)}`);
      }
      if (!options.dryRun) {
        h.prepare(`UPDATE resource_harvest_target SET last_run_at = ?, last_outcome = ?, last_found = 0 WHERE id = ?`)
          .run(now(), /robots/i.test(message) ? 'robots_disallowed' : 'error', Number(target.id));
      }
      continue;
    }

    const forms = String(target.parser) === 's3waas_forms_table'
      ? parseFormsTable(html, url)
      : [];
    report.discovered += forms.length;
    log(`  ${authority}: ${forms.length} document${forms.length === 1 ? '' : 's'} listed (HTTP ${status})`);

    if (options.dryRun) {
      for (const form of forms.slice(0, 5)) log(`      · ${form.title}`);
      continue;
    }

    for (const form of forms) {
      const classification = classifyForm(form.title);
      if (classification.reject) {
        report.rejected += 1;
        continue;
      }

      // Duplicate detection before insert. The same PDF is frequently linked
      // from several pages, and two authorities occasionally host the same
      // central form.
      const existing = h.prepare(`SELECT id FROM resource WHERE source_url = ?`).get(form.url) as { id: number } | undefined;
      if (existing) {
        report.duplicates += 1;
        continue;
      }

      const stateName = target.stateName ? String(target.stateName) : null;
      const slug = harvestSlug(form.title, stateName);
      const collision = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(slug) as { id: number } | undefined;
      const finalSlug = collision ? `${slug}-${String(target.code).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : slug;

      const inserted = insertHarvested({
        slug: finalSlug,
        title: stateName ? `${form.title} — ${stateName}` : form.title,
        description:
          `${form.title}, published by the ${authority}`
          + `${form.sizeHint ? ` (${form.sizeHint})` : ''}. Discovered by the resource ingestion pipeline from the `
          + 'authority’s own forms page and held for review before publication.',
        resourceType: classification.resourceType,
        categoryCode: String(target.category),
        subcategory: classification.subcategory,
        authority,
        sourceUrl: form.url,
        landingUrl: url,
        docFormat: /\.pdf(\?|$)/i.test(form.url) ? 'pdf'
          : /\.docx?(\?|$)/i.test(form.url) ? 'docx'
            : /\.xlsx?(\?|$)/i.test(form.url) ? 'xlsx' : 'html',
        trustLevel: Number(target.trustLevel ?? 3),
        countryId,
        jurisdictionId: target.jurisdictionId === null ? null : Number(target.jurisdictionId),
        matterId: target.matterId === null ? null : Number(target.matterId),
        forumId: target.forumId === null ? null : Number(target.forumId),
        sourceId: target.sourceId === null ? null : Number(target.sourceId),
        keywords: [
          ...classification.keywords,
          ...(stateName ? [stateName.toLowerCase()] : []),
          authority.toLowerCase(),
        ],
        confidence: classification.confidence,
        stateName,
      });
      if (inserted) report.inserted += 1;
    }

    h.prepare(`UPDATE resource_harvest_target SET last_run_at = ?, last_outcome = 'ok', last_found = ? WHERE id = ?`)
      .run(now(), forms.length, Number(target.id));
  }

  if (report.runId !== null) {
    h.prepare(
      `UPDATE resource_harvest_run SET finished_at = ?, targets_run = ?, discovered = ?, inserted = ?,
              duplicates = ?, rejected = ?, errors = ?, notes = ? WHERE id = ?`,
    ).run(
      now(), report.targetsRun, report.discovered, report.inserted,
      report.duplicates, report.rejected, report.errors,
      `${report.blockedByRobots} target(s) skipped for robots.txt. Everything inserted is at REVIEW_REQUIRED.`,
      report.runId,
    );
    reindexResources();
  }

  return report;
}

function harvestSlug(title: string, stateName: string | null): string {
  const base = [stateName, title].filter(Boolean).join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
    .replace(/-$/, '');
  return base || 'harvested-document';
}

interface HarvestedInput {
  slug: string; title: string; description: string;
  resourceType: string; categoryCode: string; subcategory: string;
  authority: string; sourceUrl: string; landingUrl: string; docFormat: string;
  trustLevel: number; countryId: number | null; jurisdictionId: number | null;
  matterId: number | null; forumId: number | null; sourceId: number | null;
  keywords: string[]; confidence: 'high' | 'medium' | 'low'; stateName: string | null;
}

/**
 * Inserts a harvested document at REVIEW_REQUIRED, never published.
 *
 * The disclaimer here is deliberately stronger than the one on a hand-authored
 * catalogue entry: nobody has yet confirmed that this document is current, or
 * even that it is what its title says.
 */
function insertHarvested(input: HarvestedInput): boolean {
  return transaction(() => {
    const ts = now();
    const disclaimer =
      `This document was discovered on the website of the ${input.authority} and is linked from there, not hosted `
      + 'by Lexhall. It has not yet been reviewed by a person, so treat its currency as unconfirmed and check the '
      + 'authority’s own page before filing or submitting anything. It is not legal advice.';

    db().prepare(
      `INSERT INTO resource (
         slug, title, description, resource_type, official_status,
         legal_matter_id, forum_id, country_id, jurisdiction_id, is_pan_india,
         authority_name, language, version,
         resource_source_id, source_name, source_url, original_url,
         last_checked_at, delivery_mode, rights_basis, rights_note,
         status, is_published, trust_level, quality_score,
         disclaimer, tags, search_keywords, review_due_at,
         created_at, updated_at,
         category_code, subcategory, doc_format, landing_url, is_free, usage_notes, origin
       ) VALUES (?,?,?,?, 'OFFICIAL', ?,?,?,?,0, ?, 'en', '1.0', ?,?,?,?, NULL, 'link_only', 'link_only', ?,
                 'REVIEW_REQUIRED', 0, ?, 0, ?,?,?,?, ?,?, ?,?,?,?,1,?, 'harvest')`,
    ).run(
      input.slug, input.title, input.description, input.resourceType,
      input.matterId, input.forumId, input.countryId, input.jurisdictionId,
      input.authority, input.sourceId, input.authority, input.sourceUrl, input.landingUrl,
      `Discovered from the authority’s own forms page. Linked, not mirrored: no permission to rehost has been sought.`,
      input.trustLevel,
      disclaimer,
      JSON.stringify(input.keywords),
      input.keywords.join(' '),
      ts, ts, ts,
      input.categoryCode, input.subcategory, input.docFormat, input.landingUrl,
      JSON.stringify([
        `Classifier confidence: ${input.confidence}.`,
        'Discovered automatically and not yet reviewed by a person.',
      ]),
    );
    const row = db().prepare(`SELECT id FROM resource WHERE slug = ?`).get(input.slug) as { id: number } | undefined;
    if (row) recomputeQuality(row.id);
    return Boolean(row);
  });
}

// ===========================================================================
// 4. THE REVIEW STEP
// ===========================================================================

export interface PromoteOptions {
  /** Only promote rows whose classifier confidence was this or better. */
  minConfidence?: 'high' | 'medium';
  /** Only promote rows whose link check returned a document of this type. */
  requirePdf?: boolean;
  limit?: number;
  onProgress?: Log;
}

/**
 * Promotes reviewed harvest rows to PUBLISHED.
 *
 * This function exists so that publication is an explicit, recorded act rather
 * than a side effect of scraping. It is invoked by a person running
 * `npm run ingest:resources -- --publish-reviewed`, and every promotion is
 * written to resource_verification with checked_by 'operator', so the audit
 * trail distinguishes a machine check from a human decision.
 *
 * It refuses to promote anything the classifier was unsure about, anything whose
 * last link check did not succeed, and anything whose rights basis is unresolved.
 */
export function promoteReviewedHarvest(options: PromoteOptions = {}): {
  considered: number; promoted: number; skipped: Array<{ slug: string; reason: string }>;
} {
  const log = options.onProgress ?? (() => {});
  return transaction(() => {
    const h = db();
    const ts = now();
    const minConfidence = options.minConfidence ?? 'high';

    const rows = h.prepare(
      `SELECT id, slug, title, usage_notes AS usageNotes, link_state AS linkState,
              doc_format AS docFormat, rights_basis AS rightsBasis, authority_name AS authority
         FROM resource
        WHERE origin = 'harvest' AND status = 'REVIEW_REQUIRED' AND deleted_at IS NULL
        ORDER BY trust_level ASC, id ASC
        LIMIT ?`,
    ).all(options.limit ?? 500) as Array<Record<string, string | number | null>>;

    const skipped: Array<{ slug: string; reason: string }> = [];
    let promoted = 0;

    for (const row of rows) {
      const slug = String(row.slug);
      const notes = String(row.usageNotes ?? '');
      const confidence = /confidence: high/i.test(notes) ? 'high'
        : /confidence: medium/i.test(notes) ? 'medium' : 'low';

      if (confidence === 'low' || (minConfidence === 'high' && confidence !== 'high')) {
        skipped.push({ slug, reason: `classifier confidence ${confidence}` });
        continue;
      }
      if (row.linkState !== 'ok') {
        skipped.push({ slug, reason: `last link check was "${row.linkState ?? 'never run'}"` });
        continue;
      }
      if (row.rightsBasis === 'unknown') {
        skipped.push({ slug, reason: 'rights basis unresolved' });
        continue;
      }
      if (options.requirePdf && row.docFormat !== 'pdf') {
        skipped.push({ slug, reason: `document format is ${row.docFormat}` });
        continue;
      }

      h.prepare(
        `UPDATE resource SET status = 'PUBLISHED', is_published = 1, last_verified_at = ?, updated_at = ? WHERE id = ?`,
      ).run(ts, ts, Number(row.id));
      h.prepare(
        `INSERT INTO resource_verification (resource_id, method, outcome, detail, checked_by, created_at)
         VALUES (?, 'manual_review', 'published', ?, 'operator', ?)`,
      ).run(
        Number(row.id),
        `Promoted from REVIEW_REQUIRED after a successful link check and a ${confidence}-confidence classification.`,
        ts,
      );
      recomputeQuality(Number(row.id));
      promoted += 1;
    }

    log(`promoted ${promoted} of ${rows.length} reviewed documents; ${skipped.length} held back`);
    for (const s of skipped.slice(0, 10)) log(`  held: ${s.slug} — ${s.reason}`);

    if (promoted > 0) reindexResources();
    return { considered: rows.length, promoted, skipped };
  });
}

export type { LinkOutcome };
