/**
 * Resource library — seeding, search, retrieval, verification and analytics.
 *
 * Two rules are enforced here rather than left to the UI, because the UI is the
 * wrong place for them:
 *
 *   1. Nothing is published unless it has been verified. `seedResourceLibrary`
 *      inserts catalogue rows at VERIFIED at most, and only the verification
 *      pass — which actually fetches the URL — moves a row to PUBLISHED. A row
 *      whose URL nobody could open stays at REVIEW_REQUIRED and is invisible to
 *      the public site (spec §63).
 *   2. A document may not claim to be official unless it is.
 *      `assertStatusConsistent` throws at seed time on a type/status mismatch,
 *      so a bad row cannot reach the database at all (spec §81).
 *
 * Analytics are aggregate only. `resource_event` records that a preview
 * happened, never who previewed it — the documents in this library disclose that
 * a person may be facing eviction, a criminal charge or domestic violence, and
 * that is not data to accumulate against an identity.
 */

import { db, now, transaction, toJson, fromJson, flag } from '../client.ts';
import { slugify } from '../ids.ts';
import {
  RESOURCE_CATEGORIES, RESOURCE_CENTRES, RESOURCE_SOURCES, RESOURCE_KITS,
  TENANCY_TEMPLATES, NOTICE_TEMPLATES, TEMPLATES_SET_2,
  CATALOG_CENTRAL, CATALOG_STATES, SLSA_HARVEST_TARGETS, TENANCY_REGIMES,
  RESOURCE_TYPE_META, OFFICIAL_STATUS_META, LINK_OUTCOME_META,
  disclaimerFor, assertStatusConsistent, qualityScore, reviewIntervalDays,
  parseResourceQuery, matchKits, downloadFilename, classifyLinkCheck,
  INDIA_STATES, fold, toFtsQuery, normaliseTemplateFields,
} from '@lexhall/core';
import type {
  ResourceCatalogSeed, ResourceTemplateSeed, ResourceType, OfficialStatus, LinkOutcome, TemplateField,
} from '@lexhall/core';

const ALL_TEMPLATES: ResourceTemplateSeed[] = [...TENANCY_TEMPLATES, ...NOTICE_TEMPLATES, ...TEMPLATES_SET_2];
const ALL_CATALOG: ResourceCatalogSeed[] = [...CATALOG_CENTRAL, ...CATALOG_STATES];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function idMap(sql: string, keyColumn = 'code'): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of db().prepare(sql).all() as Array<Record<string, string | number>>) {
    out.set(String(row[keyColumn]), Number(row.id));
  }
  return out;
}

/** Words per rendered A4 page, used only to give the preview a page count. */
const WORDS_PER_PAGE = 420;

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export interface ResourceSeedReport {
  categories: number;
  sources: number;
  harvestTargets: number;
  catalogue: number;
  templates: number;
  stateVariants: number;
  kits: number;
  links: number;
  indexed: number;
  heldForReview: number;
}

export function seedResourceLibrary(): ResourceSeedReport {
  return transaction(() => {
    const h = db();
    const ts = now();
    const report: ResourceSeedReport = {
      categories: 0, sources: 0, harvestTargets: 0, catalogue: 0, templates: 0,
      stateVariants: 0, kits: 0, links: 0, indexed: 0, heldForReview: 0,
    };

    const domainId = idMap(`SELECT id, code FROM legal_domain`);
    const matterId = idMap(`SELECT id, code FROM legal_matter`);
    const practiceAreaId = idMap(`SELECT id, code FROM practice_area`);
    const forumId = idMap(`SELECT id, code FROM forum`);
    const jurisdictionId = idMap(`SELECT id, code FROM jurisdiction`);
    const countryRow = h.prepare(`SELECT id FROM country WHERE iso2 = 'IN'`).get() as { id: number } | undefined;
    const indiaId = countryRow?.id ?? null;

    // ---- categories -------------------------------------------------------
    for (const c of RESOURCE_CATEGORIES) {
      h.prepare(
        `INSERT INTO resource_category
           (code, name, slug, plain_summary, icon_hint, legal_domain_id, subcategories, sort_order, is_active, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,1,?,?)
         ON CONFLICT(code) DO UPDATE SET
           name=excluded.name, slug=excluded.slug, plain_summary=excluded.plain_summary,
           icon_hint=excluded.icon_hint, legal_domain_id=excluded.legal_domain_id,
           subcategories=excluded.subcategories, sort_order=excluded.sort_order,
           updated_at=excluded.updated_at`,
      ).run(
        c.code, c.name, c.slug, c.plainSummary, c.icon,
        c.domain ? domainId.get(c.domain) ?? null : null,
        toJson(c.subcategories), c.sortOrder, ts, ts,
      );
      report.categories += 1;
    }

    // ---- sources ----------------------------------------------------------
    for (const s of RESOURCE_SOURCES) {
      h.prepare(
        `INSERT INTO resource_source
           (code, name, publisher, base_url, trust_level, category, mirror_permitted, rights_note, is_enabled, created_at, updated_at)
         VALUES (?,?,?,?,?,?,0,?,1,?,?)
         ON CONFLICT(code) DO UPDATE SET
           name=excluded.name, publisher=excluded.publisher, base_url=excluded.base_url,
           trust_level=excluded.trust_level, category=excluded.category,
           rights_note=excluded.rights_note, updated_at=excluded.updated_at`,
      ).run(s.code, s.name, s.publisher, s.baseUrl, s.trustLevel, s.category, s.rightsNote, ts, ts);
      report.sources += 1;
    }
    const sourceId = idMap(`SELECT id, code FROM resource_source`);

    // ---- harvest targets --------------------------------------------------
    // One per state legal services authority. These are pages that publish a
    // list of forms; the pipeline reads them rather than us hand-copying links
    // that will be stale in a month.
    for (const t of SLSA_HARVEST_TARGETS) {
      h.prepare(
        `INSERT INTO resource_harvest_target
           (code, resource_source_id, authority_name, url, parser, category_code,
            jurisdiction_id, legal_matter_id, forum_id, trust_level, is_enabled, created_at, updated_at)
         VALUES (?,?,?,?,'s3waas_forms_table','RC_LEGAL_AID',?,?,?,3,1,?,?)
         ON CONFLICT(code) DO UPDATE SET
           authority_name=excluded.authority_name, url=excluded.url,
           jurisdiction_id=excluded.jurisdiction_id, updated_at=excluded.updated_at`,
      ).run(
        `SLSA_${t.host.toUpperCase()}`, sourceId.get('NALSA') ?? null, t.authority, t.formsUrl,
        jurisdictionId.get(t.stateCode) ?? null, matterId.get('A_LEGAL_AID') ?? null,
        forumId.get('F_SLSA') ?? null, ts, ts,
      );
      report.harvestTargets += 1;
    }

    // ---- catalogue (official, link-only) ---------------------------------
    for (const entry of ALL_CATALOG) {
      assertStatusConsistent(entry.type, entry.officialStatus, entry.slug);

      const state = entry.stateCode ? jurisdictionId.get(entry.stateCode) ?? null : null;
      const stateName = entry.stateCode
        ? INDIA_STATES.find((s) => `IN-${s.code}` === entry.stateCode || s.code === entry.stateCode)?.name
        : undefined;

      // Unconfirmed URLs are seeded but held back. The library does not publish
      // a link nobody has opened; the verification pass may promote it later.
      const status = entry.confirmed ? 'VERIFIED' : 'REVIEW_REQUIRED';
      if (!entry.confirmed) report.heldForReview += 1;

      const quality = qualityScore({
        trustLevel: entry.trustLevel,
        officialStatus: entry.officialStatus,
        lastVerifiedAt: entry.confirmed ? ts : null,
        hasDescription: entry.description.length > 40,
        hasJurisdiction: Boolean(state) || entry.panIndia,
        hasMatter: Boolean(entry.matter || entry.practiceArea),
        hasPreview: false,
        linkOk: entry.confirmed,
      });

      upsertResource({
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        resourceType: entry.type,
        officialStatus: entry.officialStatus,
        categoryCode: entry.category,
        subcategory: entry.subcategory ?? null,
        legalDomainId: null,
        practiceAreaId: entry.practiceArea ? practiceAreaId.get(entry.practiceArea) ?? null : null,
        legalMatterId: entry.matter ? matterId.get(entry.matter) ?? null : null,
        forumId: entry.forum ? forumId.get(entry.forum) ?? null : null,
        countryId: indiaId,
        jurisdictionId: state,
        isPanIndia: entry.panIndia,
        authorityName: entry.authority,
        language: entry.language ?? 'en',
        version: '1.0',
        resourceSourceId: sourceId.get(entry.source) ?? null,
        sourceName: RESOURCE_SOURCES.find((s) => s.code === entry.source)?.name ?? entry.authority,
        sourceUrl: entry.url,
        originalUrl: entry.url,
        landingUrl: entry.landingUrl ?? null,
        docFormat: entry.docFormat,
        deliveryMode: 'link_only',
        rightsBasis: 'link_only',
        rightsNote: RESOURCE_SOURCES.find((s) => s.code === entry.source)?.rightsNote
          ?? 'Linked to the publisher’s own copy. No local copy is hosted.',
        status,
        isPublished: false,
        trustLevel: entry.trustLevel,
        qualityScore: quality.score,
        disclaimer: disclaimerFor(entry.type, entry.officialStatus, { stateName }),
        tags: entry.keywords,
        searchKeywords: entry.keywords.join(' '),
        usageNotes: entry.notes,
        origin: 'catalogue',
        lastVerifiedAt: entry.confirmed ? ts : null,
        lastOkAt: entry.confirmed ? ts : null,
        linkState: entry.confirmed ? 'ok' : null,
        reviewDueAt: addDays(ts, reviewIntervalDays(entry.type, entry.officialStatus)),
        ts,
      });
      report.catalogue += 1;
    }

    // ---- platform templates ---------------------------------------------
    for (const tpl of ALL_TEMPLATES) {
      report.links += seedTemplate(tpl, {
        ts, indiaId, matterId, practiceAreaId, forumId, jurisdictionId, sourceId,
      });
      report.templates += 1;
    }

    // ---- state tenancy variants -----------------------------------------
    // The point of the whole library: not one national rent agreement, but the
    // base document plus the state rule that governs it. Generated from
    // TENANCY_REGIMES rather than duplicating the body twelve times.
    const baseTenancy = TENANCY_TEMPLATES.find((t) => t.slug === 'residential-rent-agreement-11-month');
    if (baseTenancy) {
      for (const regime of TENANCY_REGIMES) {
        const state = jurisdictionId.get(regime.stateCode) ?? null;
        const slug = `rent-agreement-${slugify(regime.stateName)}`;
        const body = [
          `RESIDENTIAL TENANCY IN ${regime.stateName.toUpperCase()} — WHAT THE STATE RULE REQUIRES`,
          '',
          regime.headline,
          '',
          ...regime.points.map((p, i) => `${i + 1}. ${p}`),
          '',
          '---',
          '',
          'THE AGREEMENT ITSELF',
          '',
          'The document below is the general residential tenancy agreement from this library. Read the',
          `${regime.stateName} points above first: they change what you must do with it, not what it says.`,
          '',
          baseTenancy.body,
        ].join('\n');

        const quality = qualityScore({
          trustLevel: 6, officialStatus: 'PLATFORM_TEMPLATE', lastVerifiedAt: ts,
          hasDescription: true, hasJurisdiction: true, hasMatter: true, hasPreview: true, linkOk: true,
        });

        const id = upsertResource({
          slug,
          title: `Residential rent agreement — ${regime.stateName}`,
          description:
            `The residential tenancy agreement with the ${regime.stateName} position on registration, stamp duty and `
            + `the forum that hears a dispute. ${regime.headline}`,
          resourceType: 'AGREEMENT_TEMPLATE',
          officialStatus: 'PLATFORM_TEMPLATE',
          categoryCode: 'RC_PROPERTY',
          subcategory: 'Rent & tenancy',
          legalDomainId: domainId.get('D_PROPERTY') ?? null,
          practiceAreaId: practiceAreaId.get('PROPERTY') ?? null,
          legalMatterId: matterId.get('P_RENT_AGREEMENT') ?? null,
          forumId: forumId.get('F_RENT_AUTHORITY') ?? forumId.get('F_RENT_CONTROLLER') ?? null,
          countryId: indiaId,
          jurisdictionId: state,
          isPanIndia: false,
          authorityName: null,
          language: 'en',
          version: '1.0',
          resourceSourceId: null,
          sourceName: 'CaseADVO',
          sourceUrl: null,
          originalUrl: null,
          landingUrl: null,
          docFormat: 'template',
          deliveryMode: 'mirrored',
          rightsBasis: 'platform_owned',
          rightsNote: 'Written by CaseADVO. CaseADVO may publish and distribute it.',
          status: 'PUBLISHED',
          isPublished: true,
          trustLevel: 6,
          qualityScore: quality.score,
          disclaimer: disclaimerFor('AGREEMENT_TEMPLATE', 'PLATFORM_TEMPLATE', { stateName: regime.stateName }),
          tags: ['rent agreement', regime.stateName.toLowerCase(), regime.instrument.toLowerCase(), 'tenancy', 'registration'],
          searchKeywords: [
            `rent agreement ${regime.stateName}`, `rental agreement ${regime.stateName}`,
            regime.instrument, 'tenancy agreement', 'lease',
          ].join(' '),
          usageNotes: regime.points.slice(0, 3),
          origin: 'template',
          lastVerifiedAt: ts,
          lastOkAt: ts,
          linkState: 'ok',
          reviewDueAt: addDays(ts, 365),
          ts,
        });

        const words = body.split(/\s+/).length;
        h.prepare(
          `INSERT INTO resource_template
             (resource_id, version, body, fields, before_you_use, jurisdiction_notes, word_count, page_count, is_current, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,1,?,?)
           ON CONFLICT(resource_id, version) DO UPDATE SET
             body=excluded.body, fields=excluded.fields, before_you_use=excluded.before_you_use,
             jurisdiction_notes=excluded.jurisdiction_notes, word_count=excluded.word_count,
             page_count=excluded.page_count, updated_at=excluded.updated_at`,
        ).run(
          id, '1.0', body, toJson(baseTenancy.fields),
          toJson([
            ...regime.points,
            ...baseTenancy.beforeYouUse,
          ]),
          // One combined note for the state, then the general notes. Splitting the
          // state points into "note 1", "note 2" produced headings that told the
          // reader nothing — the heading has to be the question being answered.
          toJson([
            {
              heading: `${regime.stateName}: what this state requires`,
              body: [regime.headline, '', ...regime.points.map((p) => `• ${p}`)].join('\n'),
            },
            ...baseTenancy.jurisdictionNotes,
          ]),
          words, Math.max(1, Math.ceil(words / WORDS_PER_PAGE)), ts, ts,
        );

        for (const [i, src] of regime.sources.entries()) {
          h.prepare(
            `INSERT INTO resource_link (resource_id, label, url, publisher, kind, sort_order, created_at)
             VALUES (?,?,?,?,'authority',?,?)
             ON CONFLICT(resource_id, url) DO UPDATE SET label=excluded.label, publisher=excluded.publisher`,
          ).run(id, src.label, src.url, src.publisher, (i + 1) * 10, ts);
          report.links += 1;
        }

        indexResource(id);
        report.stateVariants += 1;
      }
    }

    // ---- kits -------------------------------------------------------------
    for (const kit of RESOURCE_KITS) {
      h.prepare(
        `INSERT INTO resource_collection
           (slug, title, description, kind, intent_phrase, legal_domain_id, disclaimer,
            is_published, sort_order, state_aware, intent_synonyms, pull_categories, created_at, updated_at)
         VALUES (?,?,?,'kit',?,?,?,1,?,?,?,?,?,?)
         ON CONFLICT(slug) DO UPDATE SET
           title=excluded.title, description=excluded.description, intent_phrase=excluded.intent_phrase,
           legal_domain_id=excluded.legal_domain_id, disclaimer=excluded.disclaimer,
           sort_order=excluded.sort_order, state_aware=excluded.state_aware,
           intent_synonyms=excluded.intent_synonyms, pull_categories=excluded.pull_categories,
           updated_at=excluded.updated_at`,
      ).run(
        kit.slug, kit.title, kit.description, kit.intentPhrase,
        kit.domain ? domainId.get(kit.domain) ?? null : null,
        kit.disclaimer, kit.sortOrder, flag(kit.stateAware),
        toJson(kit.intentSynonyms), toJson(kit.pullCategories ?? []), ts, ts,
      );
      const collection = h.prepare(`SELECT id FROM resource_collection WHERE slug = ?`).get(kit.slug) as { id: number };
      for (const [i, item] of kit.items.entries()) {
        const res = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(item.slug) as { id: number } | undefined;
        if (!res) continue;  // a kit may reference a resource held back for review
        h.prepare(
          `INSERT INTO resource_collection_item (collection_id, resource_id, note, sort_order)
           VALUES (?,?,?,?)
           ON CONFLICT(collection_id, resource_id) DO UPDATE SET note=excluded.note, sort_order=excluded.sort_order`,
        ).run(collection.id, res.id, item.note, (i + 1) * 10);
      }
      report.kits += 1;
    }

    // ---- relate resources within a kit ----------------------------------
    // Membership of the same kit is a real relationship: those documents are
    // used together. Recording it means the "related" list on a detail page is
    // editorial rather than a category query.
    for (const kit of RESOURCE_KITS) {
      const slugs = kit.items.map((i) => i.slug);
      for (const from of slugs) {
        for (const to of slugs) {
          if (from === to) continue;
          h.prepare(
            `INSERT OR IGNORE INTO resource_relation (from_resource_id, to_resource_id, relation)
             SELECT a.id, b.id, 'part_of_kit' FROM resource a, resource b WHERE a.slug = ? AND b.slug = ?`,
          ).run(from, to);
        }
      }
    }

    report.indexed = reindexResources();
    return report;
  });
}

interface UpsertResourceInput {
  slug: string; title: string; description: string;
  resourceType: ResourceType; officialStatus: OfficialStatus;
  categoryCode: string; subcategory: string | null;
  legalDomainId: number | null; practiceAreaId: number | null;
  legalMatterId: number | null; forumId: number | null;
  countryId: number | null; jurisdictionId: number | null; isPanIndia: boolean;
  authorityName: string | null; language: string; version: string;
  resourceSourceId: number | null; sourceName: string | null;
  sourceUrl: string | null; originalUrl: string | null; landingUrl: string | null;
  docFormat: string; deliveryMode: string; rightsBasis: string; rightsNote: string;
  status: string; isPublished: boolean; trustLevel: number; qualityScore: number;
  disclaimer: string; tags: string[]; searchKeywords: string; usageNotes: string[];
  origin: string;
  lastVerifiedAt: string | null; lastOkAt: string | null; linkState: string | null;
  reviewDueAt: string; ts: string;
}

function upsertResource(input: UpsertResourceInput): number {
  const h = db();
  // Domain is derived from the category when the caller did not set it, so a
  // resource is always reachable from the same domain tree as a professional.
  const domainFromCategory = input.legalDomainId ?? (() => {
    const cat = RESOURCE_CATEGORIES.find((c) => c.code === input.categoryCode);
    if (!cat?.domain) return null;
    const row = h.prepare(`SELECT id FROM legal_domain WHERE code = ?`).get(cat.domain) as { id: number } | undefined;
    return row?.id ?? null;
  })();

  h.prepare(
    `INSERT INTO resource (
       slug, title, description, resource_type, official_status,
       legal_domain_id, practice_area_id, legal_matter_id, forum_id,
       country_id, jurisdiction_id, is_pan_india,
       authority_name, language, version,
       resource_source_id, source_name, source_url, original_url,
       last_verified_at, last_checked_at,
       delivery_mode, rights_basis, rights_note,
       status, is_published, trust_level, quality_score,
       disclaimer, tags, search_keywords,
       review_due_at, created_at, updated_at,
       category_code, subcategory, doc_format, landing_url, is_free, usage_notes,
       last_ok_at, link_state, origin
     ) VALUES (?,?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?, ?,?,?,?, ?,?, ?,?,?, ?,?,?,?, ?,?,?, ?,?,?, ?,?,?,?,1,?, ?,?,?)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, description=excluded.description, resource_type=excluded.resource_type,
       official_status=excluded.official_status, legal_domain_id=excluded.legal_domain_id,
       practice_area_id=excluded.practice_area_id, legal_matter_id=excluded.legal_matter_id,
       forum_id=excluded.forum_id, country_id=excluded.country_id, jurisdiction_id=excluded.jurisdiction_id,
       is_pan_india=excluded.is_pan_india, authority_name=excluded.authority_name,
       resource_source_id=excluded.resource_source_id, source_name=excluded.source_name,
       source_url=excluded.source_url, original_url=excluded.original_url,
       delivery_mode=excluded.delivery_mode, rights_basis=excluded.rights_basis,
       rights_note=excluded.rights_note, trust_level=excluded.trust_level,
       quality_score=excluded.quality_score, disclaimer=excluded.disclaimer,
       tags=excluded.tags, search_keywords=excluded.search_keywords,
       category_code=excluded.category_code, subcategory=excluded.subcategory,
       doc_format=excluded.doc_format, landing_url=excluded.landing_url,
       usage_notes=excluded.usage_notes, origin=excluded.origin,
       review_due_at=excluded.review_due_at, updated_at=excluded.updated_at,
       -- Status and publication survive a re-seed. An administrative decision
       -- to withdraw something, and a verification pass that published
       -- something, must both outlive the next run of the ingestion CLI.
       status = CASE
                  WHEN resource.status IN ('WITHDRAWN','ARCHIVED','REJECTED','PUBLISHED','UNDER_REVIEW')
                    THEN resource.status
                  ELSE excluded.status
                END,
       is_published = CASE
                        WHEN resource.status IN ('WITHDRAWN','ARCHIVED','REJECTED') THEN 0
                        ELSE resource.is_published
                      END`,
  ).run(
    input.slug, input.title, input.description, input.resourceType, input.officialStatus,
    domainFromCategory, input.practiceAreaId, input.legalMatterId, input.forumId,
    input.countryId, input.jurisdictionId, flag(input.isPanIndia),
    input.authorityName, input.language, input.version,
    input.resourceSourceId, input.sourceName, input.sourceUrl, input.originalUrl,
    input.lastVerifiedAt, input.lastVerifiedAt,
    input.deliveryMode, input.rightsBasis, input.rightsNote,
    input.status, flag(input.isPublished), input.trustLevel, input.qualityScore,
    input.disclaimer, toJson(input.tags), input.searchKeywords,
    input.reviewDueAt, input.ts, input.ts,
    input.categoryCode, input.subcategory, input.docFormat, input.landingUrl, toJson(input.usageNotes),
    input.lastOkAt, input.linkState, input.origin,
  );

  const row = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(input.slug) as { id: number };
  return row.id;
}

interface SeedContext {
  ts: string; indiaId: number | null;
  matterId: Map<string, number>; practiceAreaId: Map<string, number>;
  forumId: Map<string, number>; jurisdictionId: Map<string, number>;
  sourceId: Map<string, number>;
}

function seedTemplate(tpl: ResourceTemplateSeed, ctx: SeedContext): number {
  const h = db();
  assertStatusConsistent(tpl.type as ResourceType, 'PLATFORM_TEMPLATE', tpl.slug);

  const words = tpl.body.split(/\s+/).length;
  const category = categoryForTemplate(tpl);
  const quality = qualityScore({
    trustLevel: 6, officialStatus: 'PLATFORM_TEMPLATE', lastVerifiedAt: ctx.ts,
    hasDescription: tpl.description.length > 40, hasJurisdiction: true,
    hasMatter: Boolean(tpl.matter || tpl.practiceArea), hasPreview: true, linkOk: true,
  });

  const id = upsertResource({
    slug: tpl.slug,
    title: tpl.title,
    description: tpl.description,
    resourceType: tpl.type as ResourceType,
    officialStatus: 'PLATFORM_TEMPLATE',
    categoryCode: category.code,
    subcategory: category.subcategory,
    legalDomainId: null,
    practiceAreaId: tpl.practiceArea ? ctx.practiceAreaId.get(tpl.practiceArea) ?? null : null,
    legalMatterId: tpl.matter ? ctx.matterId.get(tpl.matter) ?? null : null,
    forumId: tpl.forum ? ctx.forumId.get(tpl.forum) ?? null : null,
    countryId: ctx.indiaId,
    jurisdictionId: null,
    isPanIndia: tpl.panIndia,
    authorityName: null,
    language: 'en',
    version: tpl.version,
    resourceSourceId: null,
    sourceName: 'CaseADVO',
    sourceUrl: null,
    originalUrl: null,
    landingUrl: null,
    docFormat: 'template',
    deliveryMode: 'mirrored',
    rightsBasis: 'platform_owned',
    rightsNote: 'Written by CaseADVO. CaseADVO may publish and distribute it.',
    status: 'PUBLISHED',
    isPublished: true,
    trustLevel: 6,
    qualityScore: quality.score,
    disclaimer: disclaimerFor(tpl.type as ResourceType, 'PLATFORM_TEMPLATE'),
    tags: tpl.keywords,
    searchKeywords: tpl.keywords.join(' '),
    usageNotes: tpl.beforeYouUse.slice(0, 3),
    origin: 'template',
    lastVerifiedAt: ctx.ts,
    lastOkAt: ctx.ts,
    linkState: 'ok',
    reviewDueAt: addDays(ctx.ts, 365),
    ts: ctx.ts,
  });

  h.prepare(
    `INSERT INTO resource_template
       (resource_id, version, body, fields, before_you_use, jurisdiction_notes, word_count, page_count, is_current, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?)
     ON CONFLICT(resource_id, version) DO UPDATE SET
       body=excluded.body, fields=excluded.fields, before_you_use=excluded.before_you_use,
       jurisdiction_notes=excluded.jurisdiction_notes, word_count=excluded.word_count,
       page_count=excluded.page_count, updated_at=excluded.updated_at`,
  ).run(
    id, tpl.version, tpl.body, toJson(normaliseTemplateFields(tpl.fields)), toJson(tpl.beforeYouUse),
    toJson(tpl.jurisdictionNotes), words, Math.max(1, Math.ceil(words / WORDS_PER_PAGE)), ctx.ts, ctx.ts,
  );

  // Record the version so a later revision does not silently overwrite history.
  h.prepare(
    `INSERT INTO resource_version (resource_id, version, effective_from, change_note, created_at)
     SELECT ?,?,?,?,?
      WHERE NOT EXISTS (SELECT 1 FROM resource_version WHERE resource_id = ? AND version = ?)`,
  ).run(id, tpl.version, ctx.ts, 'Initial published version of this template.', ctx.ts, id, tpl.version);

  let links = 0;
  for (const [i, link] of (tpl.officialLinks ?? []).entries()) {
    h.prepare(
      `INSERT INTO resource_link (resource_id, label, url, publisher, kind, sort_order, created_at)
       VALUES (?,?,?,?,'official_form',?,?)
       ON CONFLICT(resource_id, url) DO UPDATE SET label=excluded.label, publisher=excluded.publisher`,
    ).run(id, link.label, link.url, link.publisher, (i + 1) * 10, ctx.ts);
    links += 1;
  }

  indexResource(id);
  return links;
}

/** Maps a template onto the public category tree. */
function categoryForTemplate(tpl: ResourceTemplateSeed): { code: string; subcategory: string | null } {
  const byMatter: Record<string, [string, string]> = {
    P_RENT_AGREEMENT: ['RC_PROPERTY', 'Rent & tenancy'],
    P_LEASE_COMMERCIAL: ['RC_PROPERTY', 'Rent & tenancy'],
    P_DEPOSIT: ['RC_PROPERTY', 'Rent & tenancy'],
    P_EVICTION: ['RC_PROPERTY', 'Rent & tenancy'],
    P_TITLE: ['RC_PROPERTY', 'Title & due diligence'],
    B_CHEQUE: ['RC_LEGAL_NOTICES', 'Money & recovery'],
    B_RECOVERY: ['RC_LEGAL_NOTICES', 'Money & recovery'],
    C_DEFECTIVE: ['RC_CONSUMER', 'Complaints'],
    E_BILL_EXCESS: ['RC_ELECTRICITY', 'Billing disputes'],
    PU_RTI: ['RC_RTI', 'Applications'],
    PF_NOT_DEPOSITED: ['RC_PF_ESI', 'Grievance routes'],
    L_UNPAID: ['RC_EMPLOYMENT', 'Wages & dues'],
    L_EMPLOYMENT_CONTRACT: ['RC_EMPLOYMENT', 'Hiring documents'],
    L_TERMINATION: ['RC_EMPLOYMENT', 'Exit & discipline'],
    L_POSH: ['RC_EMPLOYMENT', 'POSH'],
    CT_NDA: ['RC_AGREEMENTS', 'Confidentiality & IP'],
    CT_SERVICE_AGREEMENT: ['RC_AGREEMENTS', 'Services & vendors'],
    CO_FOUNDERS: ['RC_CORPORATE', 'Founders & investment'],
    CO_ROC: ['RC_CORPORATE', 'Resolutions'],
    CV_APPEAL: ['RC_COURT_DOCUMENTS', 'Authorisation'],
    CV_AFFIDAVIT: ['RC_AFFIDAVITS', 'Identity & name'],
  };
  if (tpl.type === 'CHECKLIST') {
    const byType = tpl.matter && byMatter[tpl.matter];
    return { code: byType?.[0] ?? 'RC_CHECKLISTS', subcategory: 'Before you sign' };
  }
  if (tpl.type === 'AFFIDAVIT_TEMPLATE') return { code: 'RC_AFFIDAVITS', subcategory: 'Identity & name' };
  if (tpl.type === 'NOTICE_TEMPLATE') {
    const hit = tpl.matter ? byMatter[tpl.matter] : undefined;
    return { code: hit?.[0] ?? 'RC_LEGAL_NOTICES', subcategory: hit?.[1] ?? 'Contract & services' };
  }
  const hit = tpl.matter ? byMatter[tpl.matter] : undefined;
  if (hit) return { code: hit[0], subcategory: hit[1] };
  if (tpl.type === 'AGREEMENT_TEMPLATE') return { code: 'RC_AGREEMENTS', subcategory: null };
  if (tpl.type === 'APPLICATION_TEMPLATE') return { code: 'RC_APPLICATIONS', subcategory: null };
  if (tpl.type === 'GUIDE') return { code: 'RC_GUIDES', subcategory: 'Process guides' };
  return { code: 'RC_GUIDES', subcategory: null };
}

// ---------------------------------------------------------------------------
// Full-text index
// ---------------------------------------------------------------------------

export function indexResource(id: number): void {
  const h = db();
  const row = h.prepare(
    `SELECT r.id, r.title, r.description, r.search_keywords AS keywords, r.tags,
            r.authority_name AS authority, r.subcategory,
            j.name AS stateName, m.name AS matterName,
            (SELECT t.body FROM resource_template t WHERE t.resource_id = r.id AND t.is_current = 1 LIMIT 1) AS body
       FROM resource r
       LEFT JOIN jurisdiction j ON j.id = r.jurisdiction_id
       LEFT JOIN legal_matter m ON m.id = r.legal_matter_id
      WHERE r.id = ?`,
  ).get(id) as Record<string, string | null> | undefined;
  if (!row) return;

  h.prepare(`DELETE FROM resource_fts WHERE rowid = ?`).run(id);
  h.prepare(`INSERT INTO resource_fts (rowid, title, description, keywords, body) VALUES (?,?,?,?,?)`).run(
    id,
    fold(String(row.title ?? '')),
    fold(String(row.description ?? '')),
    fold([
      row.keywords, row.authority, row.subcategory, row.stateName, row.matterName,
      ...fromJson<string[]>(row.tags, []),
    ].filter(Boolean).join(' ')),
    // Only the first part of a long document is indexed: enough to make
    // "find forms mentioning EPFO" work without bloating the index with
    // boilerplate that appears in every agreement.
    fold(String(row.body ?? '').slice(0, 20_000)),
  );
}

export function reindexResources(): number {
  return transaction(() => {
    const h = db();
    h.prepare(`DELETE FROM resource_fts`).run();
    const ids = h.prepare(`SELECT id FROM resource WHERE deleted_at IS NULL`).all() as Array<{ id: number }>;
    for (const { id } of ids) indexResource(id);
    return ids.length;
  });
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export interface ResourceCard {
  id: number;
  slug: string;
  title: string;
  description: string;
  resourceType: string;
  typeLabel: string;
  typeTone: string;
  officialStatus: string;
  statusLabel: string;
  statusTone: string;
  categoryCode: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  authorityName: string | null;
  stateName: string | null;
  isPanIndia: boolean;
  language: string;
  docFormat: string;
  version: string;
  lastVerifiedAt: string | null;
  qualityScore: number;
  trustLevel: number;
  hasPreview: boolean;
  sourceUrl: string | null;
  downloadCount: number;
  matterName: string | null;
  matterSlug: string | null;
  domainSlug: string | null;
}

const CARD_COLUMNS = `
  r.id, r.slug, r.title, r.description, r.resource_type AS resourceType,
  r.official_status AS officialStatus, r.category_code AS categoryCode, r.subcategory,
  r.authority_name AS authorityName, r.is_pan_india AS isPanIndia, r.language,
  r.doc_format AS docFormat, r.version, r.last_verified_at AS lastVerifiedAt,
  r.quality_score AS qualityScore, r.trust_level AS trustLevel,
  r.source_url AS sourceUrl, r.download_count AS downloadCount,
  j.name AS stateName, c.name AS categoryName, c.slug AS categorySlug,
  m.name AS matterName, m.slug AS matterSlug, d.slug AS domainSlug,
  (SELECT count(*) FROM resource_template t WHERE t.resource_id = r.id AND t.is_current = 1) AS previewCount
`;

const CARD_JOINS = `
  FROM resource r
  LEFT JOIN jurisdiction j ON j.id = r.jurisdiction_id
  LEFT JOIN resource_category c ON c.code = r.category_code
  LEFT JOIN legal_matter m ON m.id = r.legal_matter_id
  LEFT JOIN legal_domain d ON d.id = r.legal_domain_id
`;

function toCard(row: Record<string, string | number | null>): ResourceCard {
  const type = String(row.resourceType) as ResourceType;
  const status = String(row.officialStatus) as OfficialStatus;
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    resourceType: type,
    typeLabel: RESOURCE_TYPE_META[type]?.label ?? type,
    typeTone: RESOURCE_TYPE_META[type]?.tone ?? 'chip',
    officialStatus: status,
    statusLabel: OFFICIAL_STATUS_META[status]?.short ?? status,
    statusTone: OFFICIAL_STATUS_META[status]?.tone ?? 'chip-outline',
    categoryCode: row.categoryCode ? String(row.categoryCode) : null,
    categoryName: row.categoryName ? String(row.categoryName) : null,
    categorySlug: row.categorySlug ? String(row.categorySlug) : null,
    subcategory: row.subcategory ? String(row.subcategory) : null,
    authorityName: row.authorityName ? String(row.authorityName) : null,
    stateName: row.stateName ? String(row.stateName) : null,
    isPanIndia: row.isPanIndia === 1,
    language: String(row.language ?? 'en'),
    docFormat: String(row.docFormat ?? 'html'),
    version: String(row.version ?? '1.0'),
    lastVerifiedAt: row.lastVerifiedAt ? String(row.lastVerifiedAt) : null,
    qualityScore: Number(row.qualityScore ?? 0),
    trustLevel: Number(row.trustLevel ?? 6),
    hasPreview: Number(row.previewCount ?? 0) > 0,
    sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
    downloadCount: Number(row.downloadCount ?? 0),
    matterName: row.matterName ? String(row.matterName) : null,
    matterSlug: row.matterSlug ? String(row.matterSlug) : null,
    domainSlug: row.domainSlug ? String(row.domainSlug) : null,
  };
}

export function listResourceCategories() {
  return db().prepare(
    `SELECT c.code, c.name, c.slug, c.plain_summary AS plainSummary, c.icon_hint AS icon,
            c.subcategories, c.sort_order AS sortOrder,
            (SELECT count(*) FROM resource r WHERE r.category_code = c.code AND r.is_published = 1) AS resourceCount,
            (SELECT count(*) FROM resource r WHERE r.category_code = c.code AND r.is_published = 1
               AND r.official_status = 'OFFICIAL') AS officialCount
       FROM resource_category c
      WHERE c.is_active = 1
      ORDER BY c.sort_order`,
  ).all().map((row) => {
    const r = row as Record<string, string | number>;
    return {
      code: String(r.code), name: String(r.name), slug: String(r.slug),
      plainSummary: String(r.plainSummary), icon: r.icon ? String(r.icon) : null,
      subcategories: fromJson<string[]>(String(r.subcategories), []),
      resourceCount: Number(r.resourceCount), officialCount: Number(r.officialCount),
    };
  });
}

export interface ResourceSearchFilters {
  q?: string;
  category?: string;          // category slug
  subcategory?: string;
  type?: string;              // resource type code
  officialStatus?: string;
  state?: string;             // jurisdiction name or code
  matter?: string;            // legal matter slug
  domain?: string;            // legal domain slug
  language?: string;
  format?: string;
  /** 'relevance' | 'recent' | 'popular' | 'quality' | 'title' */
  sort?: string;
  page?: number;
  perPage?: number;
  /** Include only resources previewable in the browser. */
  previewOnly?: boolean;
}

export interface ResourceSearchOutcome {
  hits: ResourceCard[];
  total: number;
  page: number;
  perPage: number;
  /** What the query was understood to mean, shown back to the user. */
  intent: ReturnType<typeof parseResourceQuery> | null;
  /** The jurisdiction actually applied, including one resolved from a city name. */
  resolvedState: string | null;
  kits: Array<{ slug: string; title: string; description: string; score: number }>;
  facets: {
    categories: Array<{ slug: string; name: string; count: number }>;
    types: Array<{ code: string; label: string; count: number }>;
    officialStatus: Array<{ code: string; label: string; count: number }>;
    states: Array<{ name: string; count: number }>;
    languages: Array<{ code: string; count: number }>;
  };
  tookMs: number;
}

export function searchResources(filters: ResourceSearchFilters): ResourceSearchOutcome {
  const started = performance.now();
  const h = db();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(60, Math.max(1, filters.perPage ?? 20));

  const stateNames = INDIA_STATES.map((s) => s.name);
  const cityNames = (h.prepare(`SELECT name FROM location WHERE level >= 2 LIMIT 400`).all() as Array<{ name: string }>)
    .map((r) => r.name);
  const intent = filters.q && filters.q.trim().length > 0
    ? parseResourceQuery(filters.q, stateNames, cityNames)
    : null;

  // A city resolves to its state. Somebody who types "rent agreement in Noida"
  // needs the Uttar Pradesh tenancy position, and has no reason to know that is
  // the thing to ask for — resolving it here is the difference between the
  // library being jurisdiction-aware and merely claiming to be.
  const cityState = (() => {
    if (!intent?.cityHint) return undefined;
    const row = h.prepare(
      `SELECT j.name FROM location l JOIN jurisdiction j ON j.id = l.jurisdiction_id
        WHERE lower(l.name) = lower(?) AND j.name IS NOT NULL LIMIT 1`,
    ).get(intent.cityHint) as { name: string } | undefined;
    return row?.name;
  })();

  const where: string[] = ['r.is_published = 1', 'r.deleted_at IS NULL'];
  const params: Array<string | number> = [];

  // Free text.
  //
  // Resource search uses AND semantics, unlike the professional search box which
  // uses OR for live-typing feel. The difference matters: with OR, "rent
  // agreement" matches every document containing either word, and the ranking
  // muddies to the point where a rent receipt outranks a rent agreement. If AND
  // finds nothing, we widen to OR rather than showing an empty library for one
  // stray word.
  let ftsIds: number[] | null = null;
  /** id → bm25 score, kept so equally-relevant documents can be treated as equal. */
  let ftsScore = new Map<number, number>();

  if (filters.q && filters.q.trim().length > 1) {
    const runMatch = (query: string): Array<{ id: number; score: number }> => {
      try {
        return h.prepare(
          `SELECT rowid AS id, bm25(resource_fts, 8.0, 4.0, 6.0, 1.0) AS score
             FROM resource_fts WHERE resource_fts MATCH ?
            ORDER BY score LIMIT 400`,
        ).all(query) as Array<{ id: number; score: number }>;
      } catch {
        return [];
      }
    };

    // Two kinds of word are removed before the AND is built.
    //
    // The state name, because it is already applied as a filter: requiring
    // "maharashtra" in the text as well would return only the documents whose
    // wording happens to name the state, and hide every pan-India rent agreement
    // from somebody who told us where they are.
    //
    // And ordinary connective words, because ANDing "for" excludes any document
    // that does not happen to contain it.
    const STOPWORDS = new Set([
      'for', 'the', 'and', 'with', 'from', 'that', 'this', 'need', 'want', 'how',
      'can', 'get', 'any', 'are', 'was', 'has', 'have', 'about', 'into', 'what',
      'which', 'when', 'where', 'who', 'please', 'give', 'show', 'find', 'looking',
      'in', 'on', 'at', 'of', 'to', 'my', 'me', 'is', 'it', 'do', 'am', 'be', 'by', 'or', 'if',
    ]);
    // City names come out too, for the same reason as state names: the place is
    // a filter, not a word the document has to contain.
    const placeWords = new Set(
      [
        ...(intent?.stateHint ? fold(intent.stateHint).split(' ') : []),
        ...(intent?.cityHint ? fold(intent.cityHint).split(' ') : []),
      ].filter(Boolean),
    );
    const stateWords = placeWords;
    const rawTokens = fold(filters.q).split(' ').filter((t) => t.length > 1);
    const tokens = (() => {
      const kept = rawTokens.filter((t) => !STOPWORDS.has(t) && !stateWords.has(t));
      // Never strip everything: a query that is only a state name should still
      // match that state's documents rather than returning nothing.
      return kept.length > 0 ? kept : rawTokens;
    })();
    let rows: Array<{ id: number; score: number }> = [];
    if (tokens.length > 0) {
      const and = tokens.map((t, i) => (i === tokens.length - 1 ? `"${t}"*` : `"${t}"`)).join(' AND ');
      rows = runMatch(and);
      if (rows.length === 0) rows = runMatch(toFtsQuery(fold(filters.q)));
    }
    ftsIds = rows.map((r) => r.id);
    ftsScore = new Map(rows.map((r) => [r.id, r.score]));

    if (ftsIds.length === 0) {
      const like = `%${fold(filters.q)}%`;
      ftsIds = (h.prepare(
        `SELECT id FROM resource
          WHERE is_published = 1 AND (lower(title) LIKE ? OR lower(description) LIKE ? OR lower(search_keywords) LIKE ?)
          LIMIT 200`,
      ).all(like, like, like) as Array<{ id: number }>).map((r) => r.id);
    }
    if (ftsIds.length === 0) {
      // Nothing matched. Say so honestly rather than returning the whole library.
      where.push('1 = 0');
    } else {
      where.push(`r.id IN (${ftsIds.map(() => '?').join(',')})`);
      params.push(...ftsIds);
    }
  }

  // The parsed intent narrows, it does not exclude: a user searching
  // "rent agreement for Mumbai" should still see pan-India documents, ranked
  // below the Maharashtra ones.
  if (filters.category) { where.push('c.slug = ?'); params.push(filters.category); }
  if (filters.subcategory) { where.push('r.subcategory = ?'); params.push(filters.subcategory); }
  if (filters.type) { where.push('r.resource_type = ?'); params.push(filters.type); }
  if (filters.officialStatus) { where.push('r.official_status = ?'); params.push(filters.officialStatus); }
  if (filters.matter) { where.push('m.slug = ?'); params.push(filters.matter); }
  if (filters.domain) { where.push('d.slug = ?'); params.push(filters.domain); }
  if (filters.language) { where.push('r.language = ?'); params.push(filters.language); }
  if (filters.format) { where.push('r.doc_format = ?'); params.push(filters.format); }
  if (filters.previewOnly) {
    where.push('EXISTS (SELECT 1 FROM resource_template t WHERE t.resource_id = r.id AND t.is_current = 1)');
  }

  const stateFilter = filters.state ?? intent?.stateHint ?? cityState;
  if (stateFilter) {
    // A state filter includes pan-India resources. Excluding them would hide the
    // national template from someone who told us their state, which is the
    // opposite of helpful.
    where.push('(j.name = ? OR j.code = ? OR r.is_pan_india = 1)');
    params.push(stateFilter, stateFilter);
  }

  const clause = where.join(' AND ');

  const stateBoost = stateFilter ? `CASE WHEN j.name = ? THEN 1 ELSE 0 END DESC,` : '';
  const boostParams = stateFilter ? [stateFilter] : [];

  // Text relevance has to survive into the ORDER BY, or it is not relevance.
  //
  // The bug this fixes was live and instructive: filtering by an id set from FTS
  // and then ordering by official-status-then-quality meant that "rent agreement
  // for Maharashtra" returned the Maharashtra electricity regulator first — a
  // perfectly good official resource, and completely wrong. What the user typed
  // must outrank our own preference for official material.
  //
  // The ids are integers this database produced, interpolated because SQLite has
  // no ordinal-position operator; they are coerced with Number() so nothing but
  // an integer can reach the statement.
  //
  // Documents are bucketed by BM25 score rather than by position. Thirty-four
  // state legal services authorities publish near-identical pages and score
  // identically, so ordering by position would return whichever state happened
  // to come out of the index first — which looks like a preference for Assam.
  // Bucketing by score means genuine ties tie, and the tie then breaks on
  // something meaningful: whether the document applies nationally, and how close
  // its publisher is to the authority.
  // A tenth of a BM25 point. Fine enough that a genuinely better match wins —
  // "residential rent agreement" over "rent receipt" — and coarse enough that
  // documents scoring identically stay tied.
  const SCORE_GRANULARITY = 10;
  const relevanceRank = ftsIds && ftsIds.length > 0
    ? `CASE r.id ${ftsIds
      .map((id) => `WHEN ${Number(id)} THEN ${Math.round((ftsScore.get(id) ?? 0) * SCORE_GRANULARITY)}`)
      .join(' ')} ELSE 9999 END,`
    : '';

  // With no state named, a document that genuinely applies nationally is the
  // better answer than one state's version of it.
  const breadth = stateFilter ? '' : 'r.is_pan_india DESC, r.trust_level ASC,';

  const order = (() => {
    switch (filters.sort) {
      case 'recent': return `${stateBoost} r.last_verified_at DESC NULLS LAST, r.id DESC`;
      case 'popular': return `${stateBoost} r.download_count DESC, r.view_count DESC, r.quality_score DESC`;
      case 'title': return `${stateBoost} r.title COLLATE NOCASE ASC`;
      case 'quality': return `${stateBoost} r.quality_score DESC, r.trust_level ASC`;
      default:
        // Relevance: the jurisdiction the user named, then how well the text
        // actually matches, then official material over ours, then provenance.
        return `${stateBoost} ${relevanceRank} ${breadth}`
          + ` CASE r.official_status WHEN 'OFFICIAL' THEN 0 WHEN 'PLATFORM_TEMPLATE' THEN 1 ELSE 2 END,`
          + ` r.quality_score DESC, r.trust_level ASC, r.title COLLATE NOCASE`;
    }
  })();

  const total = Number(
    (h.prepare(`SELECT count(*) AS n ${CARD_JOINS} WHERE ${clause}`).get(...params) as { n: number }).n,
  );

  const rows = h.prepare(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS} WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`,
  ).all(...params, ...boostParams, perPage, (page - 1) * perPage) as Array<Record<string, string | number | null>>;

  // Facets are computed over the filtered set minus the facet's own dimension
  // would be ideal; computing them over the text-matched set is the honest
  // compromise that keeps the query count at one per facet.
  const facetBase = filters.q ? clause : 'r.is_published = 1 AND r.deleted_at IS NULL';
  const facetParams = filters.q ? params : [];

  const facetRows = <T extends Record<string, string | number>>(sql: string) =>
    h.prepare(sql).all(...facetParams) as T[];

  const facets = {
    categories: facetRows<{ slug: string; name: string; n: number }>(
      `SELECT c.slug, c.name, count(*) AS n ${CARD_JOINS} WHERE ${facetBase} AND c.slug IS NOT NULL
        GROUP BY c.slug ORDER BY n DESC`,
    ).map((r) => ({ slug: r.slug, name: r.name, count: Number(r.n) })),
    types: facetRows<{ resource_type: string; n: number }>(
      `SELECT r.resource_type, count(*) AS n ${CARD_JOINS} WHERE ${facetBase} GROUP BY r.resource_type ORDER BY n DESC`,
    ).map((r) => ({
      code: r.resource_type,
      label: RESOURCE_TYPE_META[r.resource_type as ResourceType]?.label ?? r.resource_type,
      count: Number(r.n),
    })),
    officialStatus: facetRows<{ official_status: string; n: number }>(
      `SELECT r.official_status, count(*) AS n ${CARD_JOINS} WHERE ${facetBase} GROUP BY r.official_status ORDER BY n DESC`,
    ).map((r) => ({
      code: r.official_status,
      label: OFFICIAL_STATUS_META[r.official_status as OfficialStatus]?.label ?? r.official_status,
      count: Number(r.n),
    })),
    states: facetRows<{ name: string; n: number }>(
      `SELECT j.name, count(*) AS n ${CARD_JOINS} WHERE ${facetBase} AND j.name IS NOT NULL
        GROUP BY j.name ORDER BY n DESC LIMIT 40`,
    ).map((r) => ({ name: r.name, count: Number(r.n) })),
    languages: facetRows<{ language: string; n: number }>(
      `SELECT r.language, count(*) AS n ${CARD_JOINS} WHERE ${facetBase} GROUP BY r.language ORDER BY n DESC`,
    ).map((r) => ({ code: r.language, count: Number(r.n) })),
  };

  const kits = filters.q
    ? matchKits(filters.q).map(({ kit, score }) => ({
      slug: kit.slug, title: kit.title, description: kit.description, score,
    }))
    : [];

  return {
    hits: rows.map(toCard),
    total, page, perPage, intent, kits, facets,
    resolvedState: stateFilter ?? null,
    tookMs: Math.round((performance.now() - started) * 100) / 100,
  };
}

export interface ResourceDetail extends ResourceCard {
  disclaimer: string;
  rightsBasis: string;
  rightsNote: string;
  deliveryMode: string;
  sourceName: string | null;
  originalUrl: string | null;
  landingUrl: string | null;
  status: string;
  linkState: string | null;
  linkStateLabel: string | null;
  lastCheckedAt: string | null;
  lastOkAt: string | null;
  reviewDueAt: string | null;
  usageNotes: string[];
  tags: string[];
  viewCount: number;
  previewCount: number;
  template: {
    version: string;
    body: string;
    fields: TemplateField[];
    beforeYouUse: string[];
    jurisdictionNotes: Array<{ heading: string; body: string }>;
    wordCount: number;
    pageCount: number;
  } | null;
  links: Array<{ label: string; url: string; publisher: string | null; kind: string }>;
  versions: Array<{ version: string; effectiveFrom: string | null; changeNote: string; supersededAt: string | null }>;
  verifications: Array<{ method: string; outcome: string; httpStatus: number | null; detail: string | null; createdAt: string }>;
  qualityBreakdown: ReturnType<typeof qualityScore>;
  filename: string;
}

export function getResource(slug: string): ResourceDetail | null {
  const h = db();
  const row = h.prepare(
    `SELECT ${CARD_COLUMNS},
            r.disclaimer, r.rights_basis AS rightsBasis, r.rights_note AS rightsNote,
            r.delivery_mode AS deliveryMode, r.source_name AS sourceName,
            r.original_url AS originalUrl, r.landing_url AS landingUrl,
            r.status, r.link_state AS linkState, r.last_checked_at AS lastCheckedAt,
            r.last_ok_at AS lastOkAt, r.review_due_at AS reviewDueAt,
            r.usage_notes AS usageNotes, r.tags AS tagsJson,
            r.view_count AS viewCount, r.preview_count AS previewCountTotal
     ${CARD_JOINS}
      WHERE r.slug = ? AND r.deleted_at IS NULL`,
  ).get(slug) as Record<string, string | number | null> | undefined;
  if (!row) return null;

  const card = toCard(row);
  const id = card.id;

  const tplRow = h.prepare(
    `SELECT version, body, fields, before_you_use AS beforeYouUse, jurisdiction_notes AS jurisdictionNotes,
            word_count AS wordCount, page_count AS pageCount
       FROM resource_template WHERE resource_id = ? AND is_current = 1 ORDER BY id DESC LIMIT 1`,
  ).get(id) as Record<string, string | number> | undefined;

  const links = (h.prepare(
    `SELECT label, url, publisher, kind FROM resource_link WHERE resource_id = ? ORDER BY sort_order`,
  ).all(id) as Array<Record<string, string | null>>).map((l) => ({
    label: String(l.label), url: String(l.url),
    publisher: l.publisher ? String(l.publisher) : null, kind: String(l.kind),
  }));

  const versions = (h.prepare(
    `SELECT version, effective_from AS effectiveFrom, change_note AS changeNote, superseded_at AS supersededAt
       FROM resource_version WHERE resource_id = ? ORDER BY created_at DESC`,
  ).all(id) as Array<Record<string, string | null>>).map((v) => ({
    version: String(v.version), effectiveFrom: v.effectiveFrom ? String(v.effectiveFrom) : null,
    changeNote: String(v.changeNote), supersededAt: v.supersededAt ? String(v.supersededAt) : null,
  }));

  const verifications = (h.prepare(
    `SELECT method, outcome, http_status AS httpStatus, detail, created_at AS createdAt
       FROM resource_verification WHERE resource_id = ? ORDER BY created_at DESC LIMIT 10`,
  ).all(id) as Array<Record<string, string | number | null>>).map((v) => ({
    method: String(v.method), outcome: String(v.outcome),
    httpStatus: v.httpStatus === null ? null : Number(v.httpStatus),
    detail: v.detail ? String(v.detail) : null, createdAt: String(v.createdAt),
  }));

  const breakdown = qualityScore({
    trustLevel: card.trustLevel,
    officialStatus: card.officialStatus as OfficialStatus,
    lastVerifiedAt: card.lastVerifiedAt,
    hasDescription: card.description.length > 40,
    hasJurisdiction: Boolean(card.stateName) || card.isPanIndia,
    hasMatter: Boolean(card.matterName),
    hasPreview: Boolean(tplRow),
    linkOk: row.linkState === 'ok' || card.officialStatus === 'PLATFORM_TEMPLATE',
  });

  const linkState = row.linkState ? String(row.linkState) : null;

  return {
    ...card,
    disclaimer: String(row.disclaimer),
    rightsBasis: String(row.rightsBasis),
    rightsNote: String(row.rightsNote),
    deliveryMode: String(row.deliveryMode),
    sourceName: row.sourceName ? String(row.sourceName) : null,
    originalUrl: row.originalUrl ? String(row.originalUrl) : null,
    landingUrl: row.landingUrl ? String(row.landingUrl) : null,
    status: String(row.status),
    linkState,
    linkStateLabel: linkState ? LINK_OUTCOME_META[linkState as LinkOutcome]?.label ?? linkState : null,
    lastCheckedAt: row.lastCheckedAt ? String(row.lastCheckedAt) : null,
    lastOkAt: row.lastOkAt ? String(row.lastOkAt) : null,
    reviewDueAt: row.reviewDueAt ? String(row.reviewDueAt) : null,
    usageNotes: fromJson<string[]>(row.usageNotes as string, []),
    tags: fromJson<string[]>(row.tagsJson as string, []),
    viewCount: Number(row.viewCount ?? 0),
    previewCount: Number(row.previewCountTotal ?? 0),
    template: tplRow
      ? {
        version: String(tplRow.version),
        body: String(tplRow.body),
        fields: fromJson(String(tplRow.fields), [] as TemplateField[]),
        beforeYouUse: fromJson(String(tplRow.beforeYouUse), [] as string[]),
        jurisdictionNotes: fromJson(String(tplRow.jurisdictionNotes), [] as Array<{ heading: string; body: string }>),
        wordCount: Number(tplRow.wordCount),
        pageCount: Number(tplRow.pageCount),
      }
      : null,
    links,
    versions,
    verifications,
    qualityBreakdown: breakdown,
    filename: downloadFilename({
      title: card.title, stateName: card.stateName, version: card.version, extension: 'docx',
    }),
  };
}

/** Related resources: same kit first, then same matter, then same category. */
export function relatedResources(id: number, limit = 6): ResourceCard[] {
  const rows = db().prepare(
    `SELECT ${CARD_COLUMNS}, 0 AS rank ${CARD_JOINS}
       JOIN resource_relation rel ON rel.to_resource_id = r.id AND rel.from_resource_id = ?
      WHERE r.is_published = 1 AND r.deleted_at IS NULL
      UNION
     SELECT ${CARD_COLUMNS}, 1 AS rank ${CARD_JOINS}
      WHERE r.is_published = 1 AND r.deleted_at IS NULL AND r.id <> ?
        AND r.legal_matter_id = (SELECT legal_matter_id FROM resource WHERE id = ?)
        AND r.legal_matter_id IS NOT NULL
      UNION
     SELECT ${CARD_COLUMNS}, 2 AS rank ${CARD_JOINS}
      WHERE r.is_published = 1 AND r.deleted_at IS NULL AND r.id <> ?
        AND r.category_code = (SELECT category_code FROM resource WHERE id = ?)
      ORDER BY rank, qualityScore DESC
      LIMIT ?`,
  ).all(id, id, id, id, id, limit * 3) as Array<Record<string, string | number | null>>;

  const seen = new Set<number>();
  const out: ResourceCard[] = [];
  for (const row of rows) {
    const card = toCard(row);
    if (card.id === id || seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
    if (out.length >= limit) break;
  }
  return out;
}

export function featuredResources(): {
  popular: ResourceCard[]; recent: ResourceCard[]; official: ResourceCard[]; templates: ResourceCard[];
} {
  const pick = (clause: string, order: string, limit: number) =>
    (db().prepare(
      `SELECT ${CARD_COLUMNS} ${CARD_JOINS} WHERE r.is_published = 1 AND r.deleted_at IS NULL AND ${clause}
        ORDER BY ${order} LIMIT ?`,
    ).all(limit) as Array<Record<string, string | number | null>>).map(toCard);

  return {
    popular: pick('1=1', 'r.download_count DESC, r.view_count DESC, r.quality_score DESC', 6),
    recent: pick('1=1', 'r.last_verified_at DESC NULLS LAST, r.id DESC', 6),
    official: pick("r.official_status = 'OFFICIAL'", 'r.trust_level ASC, r.quality_score DESC', 6),
    templates: pick("r.official_status = 'PLATFORM_TEMPLATE'", 'r.quality_score DESC, r.title', 6),
  };
}

export function resourceLibraryStats() {
  const h = db();
  const one = (sql: string) => Number((h.prepare(sql).get() as { n: number }).n);
  return {
    published: one(`SELECT count(*) AS n FROM resource WHERE is_published = 1`),
    official: one(`SELECT count(*) AS n FROM resource WHERE is_published = 1 AND official_status = 'OFFICIAL'`),
    templates: one(`SELECT count(*) AS n FROM resource WHERE is_published = 1 AND official_status = 'PLATFORM_TEMPLATE'`),
    previewable: one(
      `SELECT count(*) AS n FROM resource r WHERE r.is_published = 1
        AND EXISTS (SELECT 1 FROM resource_template t WHERE t.resource_id = r.id AND t.is_current = 1)`,
    ),
    states: one(`SELECT count(DISTINCT jurisdiction_id) AS n FROM resource WHERE is_published = 1 AND jurisdiction_id IS NOT NULL`),
    authorities: one(`SELECT count(DISTINCT authority_name) AS n FROM resource WHERE is_published = 1 AND authority_name IS NOT NULL`),
    categories: one(`SELECT count(*) AS n FROM resource_category WHERE is_active = 1`),
    kits: one(`SELECT count(*) AS n FROM resource_collection WHERE kind = 'kit' AND is_published = 1`),
    downloads: one(`SELECT coalesce(sum(download_count), 0) AS n FROM resource`),
    awaitingReview: one(`SELECT count(*) AS n FROM resource WHERE status IN ('RAW','REVIEW_REQUIRED')`),
  };
}

// ---------------------------------------------------------------------------
// Kits and centres
// ---------------------------------------------------------------------------

export function listResourceKits() {
  return (db().prepare(
    `SELECT k.slug, k.title, k.description, k.intent_phrase AS intentPhrase, k.disclaimer,
            k.state_aware AS stateAware, k.sort_order AS sortOrder,
            d.slug AS domainSlug, d.name AS domainName,
            (SELECT count(*) FROM resource_collection_item i WHERE i.collection_id = k.id) AS itemCount
       FROM resource_collection k
       LEFT JOIN legal_domain d ON d.id = k.legal_domain_id
      WHERE k.kind = 'kit' AND k.is_published = 1
      ORDER BY k.sort_order`,
  ).all() as Array<Record<string, string | number | null>>).map((r) => ({
    slug: String(r.slug), title: String(r.title), description: String(r.description),
    intentPhrase: r.intentPhrase ? String(r.intentPhrase) : null,
    disclaimer: r.disclaimer ? String(r.disclaimer) : null,
    stateAware: r.stateAware === 1, itemCount: Number(r.itemCount),
    domainSlug: r.domainSlug ? String(r.domainSlug) : null,
    domainName: r.domainName ? String(r.domainName) : null,
  }));
}

export function getResourceKit(slug: string, state?: string) {
  const h = db();
  const kit = h.prepare(
    `SELECT k.id, k.slug, k.title, k.description, k.intent_phrase AS intentPhrase, k.disclaimer,
            k.state_aware AS stateAware, k.pull_categories AS pullCategories,
            d.slug AS domainSlug, d.name AS domainName
       FROM resource_collection k
       LEFT JOIN legal_domain d ON d.id = k.legal_domain_id
      WHERE k.slug = ? AND k.kind = 'kit'`,
  ).get(slug) as Record<string, string | number | null> | undefined;
  if (!kit) return null;

  const items = (h.prepare(
    `SELECT ${CARD_COLUMNS}, i.note ${CARD_JOINS}
       JOIN resource_collection_item i ON i.resource_id = r.id
      WHERE i.collection_id = ? AND r.is_published = 1
      ORDER BY i.sort_order`,
  ).all(Number(kit.id)) as Array<Record<string, string | number | null>>).map((row) => ({
    ...toCard(row), note: String(row.note ?? ''),
  }));

  // State-aware kits add the resources that exist for the user's state in the
  // categories the kit draws on. Where nothing exists for that state, the page
  // says so rather than substituting another state's authority.
  let stateItems: ResourceCard[] = [];
  const pull = fromJson<string[]>(kit.pullCategories as string, []);
  if (kit.stateAware === 1 && state && pull.length > 0) {
    stateItems = (h.prepare(
      `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
        WHERE r.is_published = 1 AND r.deleted_at IS NULL
          AND r.category_code IN (${pull.map(() => '?').join(',')})
          AND (j.name = ? OR j.code = ?)
        ORDER BY r.trust_level ASC, r.quality_score DESC LIMIT 12`,
    ).all(...pull, state, state) as Array<Record<string, string | number | null>>).map(toCard);
  }

  return {
    slug: String(kit.slug), title: String(kit.title), description: String(kit.description),
    intentPhrase: kit.intentPhrase ? String(kit.intentPhrase) : null,
    disclaimer: kit.disclaimer ? String(kit.disclaimer) : null,
    stateAware: kit.stateAware === 1,
    domainSlug: kit.domainSlug ? String(kit.domainSlug) : null,
    domainName: kit.domainName ? String(kit.domainName) : null,
    items, stateItems, state: state ?? null,
    pullCategories: pull,
  };
}

export function getResourceCentre(slug: string) {
  const centre = RESOURCE_CENTRES.find((c) => c.slug === slug);
  if (!centre) return null;
  const h = db();
  const resources = centre.categories.length > 0
    ? (h.prepare(
      `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
        WHERE r.is_published = 1 AND r.deleted_at IS NULL
          AND (r.category_code IN (${centre.categories.map(() => '?').join(',')})
               OR m.code IN (${centre.matters.map(() => '?').join(',')}))
        ORDER BY CASE r.official_status WHEN 'OFFICIAL' THEN 0 ELSE 1 END, r.quality_score DESC
        LIMIT 40`,
    ).all(...centre.categories, ...centre.matters) as Array<Record<string, string | number | null>>).map(toCard)
    : [];
  return { ...centre, resources };
}

export function listResourceCentres() {
  return RESOURCE_CENTRES.map((c) => ({
    slug: c.slug, name: c.name, headline: c.headline, plainSummary: c.plainSummary,
    sortOrder: c.sortOrder, helplines: c.helplines,
  })).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Resources attached to a legal matter — the join that makes the taxonomy pay off. */
export function resourcesForMatter(matterSlug: string, limit = 8): ResourceCard[] {
  return (db().prepare(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
      WHERE r.is_published = 1 AND r.deleted_at IS NULL AND m.slug = ?
      ORDER BY CASE r.official_status WHEN 'OFFICIAL' THEN 0 ELSE 1 END, r.quality_score DESC
      LIMIT ?`,
  ).all(matterSlug, limit) as Array<Record<string, string | number | null>>).map(toCard);
}

/**
 * Resources for a known, fixed set of slugs — e.g. the corporate document
 * suite, which is curated by slug in resource-templates-2.ts rather than by
 * a database category. Preserves the caller's ordering (the curated suite
 * order) instead of whatever order SQLite happens to return.
 */
export function resourcesBySlug(slugs: readonly string[]): ResourceCard[] {
  if (slugs.length === 0) return [];
  const placeholders = slugs.map(() => '?').join(',');
  const rows = db().prepare(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
      WHERE r.is_published = 1 AND r.deleted_at IS NULL AND r.slug IN (${placeholders})`,
  ).all(...slugs) as Array<Record<string, string | number | null>>;
  const bySlug = new Map(rows.map((r) => [String(r.slug), toCard(r)]));
  return slugs.map((s) => bySlug.get(s)).filter((c): c is ResourceCard => Boolean(c));
}

/** Resources for a practice area, used to connect the marketplace to the library. */
export function resourcesForPracticeArea(practiceAreaSlug: string, limit = 6): ResourceCard[] {
  return (db().prepare(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
       LEFT JOIN practice_area pa ON pa.id = r.practice_area_id
      WHERE r.is_published = 1 AND r.deleted_at IS NULL AND pa.slug = ?
      ORDER BY r.quality_score DESC LIMIT ?`,
  ).all(practiceAreaSlug, limit) as Array<Record<string, string | number | null>>).map(toCard);
}

// ---------------------------------------------------------------------------
// Aggregate analytics. No identity, ever.
// ---------------------------------------------------------------------------

export type ResourceEventKind = 'view' | 'preview' | 'download' | 'source_open' | 'share';

export function recordResourceEvent(slug: string, kind: ResourceEventKind): void {
  const h = db();
  const row = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(slug) as { id: number } | undefined;
  if (!row) return;
  const ts = now();
  h.prepare(`INSERT INTO resource_event (resource_id, kind, occurred_at) VALUES (?,?,?)`).run(row.id, kind, ts);
  const column = kind === 'download' ? 'download_count' : kind === 'preview' ? 'preview_count' : 'view_count';
  h.prepare(`UPDATE resource SET ${column} = ${column} + 1 WHERE id = ?`).run(row.id);
}

/**
 * Counts only, never field values or completed text — see 018_document_builder.sql.
 * Answers "is the document builder used, and does it work", nothing more.
 */
export interface DocumentFillInput {
  slug: string;
  templateVersion: string;
  format: string;
  fieldCount: number;
  filledCount: number;
  leftOpenCount: number;
  mode: 'manual' | 'ai_assisted';
}

/**
 * Counts only — never the user's prose, never the extracted values.
 * See 018_document_builder.sql and COMPLIANCE_MATRIX C-17a.
 */
export interface AiExtractionInput {
  slug: string;
  promptChars: number;
  fieldsOffered: number;
  fieldsReturned: number;
  lowConfidence: number;
  rejected: number;
  model: string;
  latencyMs: number;
  outcome: string;
}

export function recordAiExtraction(input: AiExtractionInput): void {
  const h = db();
  const row = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(input.slug) as { id: number } | undefined;
  if (!row) return;
  h.prepare(
    `INSERT INTO ai_field_extraction (resource_id, prompt_chars, fields_offered, fields_returned,
       low_confidence, rejected, model, latency_ms, outcome, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(row.id, input.promptChars, input.fieldsOffered, input.fieldsReturned,
    input.lowConfidence, input.rejected, input.model, input.latencyMs, input.outcome, now());
}

export function recordDocumentFill(input: DocumentFillInput): void {
  const h = db();
  const row = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(input.slug) as { id: number } | undefined;
  if (!row) return;
  h.prepare(
    `INSERT INTO document_fill (resource_id, template_version, format, field_count, filled_count, left_open_count, mode, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(row.id, input.templateVersion, input.format, input.fieldCount, input.filledCount, input.leftOpenCount, input.mode, now());
}

/**
 * Bookmarks. There is no authentication in this build, so a bookmark is keyed to
 * an opaque session reference held in a cookie. That is a deliberate limitation
 * and the UI says so: it is a device-local list, not an account.
 */
export function toggleResourceBookmark(sessionRef: string, slug: string): { saved: boolean } {
  return transaction(() => {
    const h = db();
    const row = h.prepare(`SELECT id FROM resource WHERE slug = ?`).get(slug) as { id: number } | undefined;
    if (!row) return { saved: false };
    const existing = h.prepare(
      `SELECT id FROM resource_bookmark WHERE session_ref = ? AND resource_id = ?`,
    ).get(sessionRef, row.id) as { id: number } | undefined;
    if (existing) {
      h.prepare(`DELETE FROM resource_bookmark WHERE id = ?`).run(existing.id);
      return { saved: false };
    }
    h.prepare(
      `INSERT INTO resource_bookmark (session_ref, resource_id, created_at) VALUES (?,?,?)`,
    ).run(sessionRef, row.id, now());
    return { saved: true };
  });
}

export function listBookmarks(sessionRef: string): ResourceCard[] {
  return (db().prepare(
    `SELECT ${CARD_COLUMNS} ${CARD_JOINS}
       JOIN resource_bookmark b ON b.resource_id = r.id
      WHERE b.session_ref = ? AND r.deleted_at IS NULL
      ORDER BY b.created_at DESC LIMIT 100`,
  ).all(sessionRef) as Array<Record<string, string | number | null>>).map(toCard);
}

export function bookmarkedSlugs(sessionRef: string): string[] {
  return (db().prepare(
    `SELECT r.slug FROM resource_bookmark b JOIN resource r ON r.id = b.resource_id WHERE b.session_ref = ?`,
  ).all(sessionRef) as Array<{ slug: string }>).map((r) => r.slug);
}

// ---------------------------------------------------------------------------
// Verification and administration
// ---------------------------------------------------------------------------

export interface CheckCandidate {
  id: number; slug: string; title: string; url: string; kind: 'resource' | 'link'; linkId?: number;
}

/** Resources whose review is due, oldest first, plus everything never checked. */
export function resourcesDueForCheck(limit = 200): CheckCandidate[] {
  const h = db();
  const ts = now();
  const resources = (h.prepare(
    `SELECT id, slug, title, coalesce(source_url, landing_url) AS url
       FROM resource
      WHERE deleted_at IS NULL
        AND coalesce(source_url, landing_url) IS NOT NULL
        AND status NOT IN ('ARCHIVED','REJECTED')
        -- Anything not yet public is always due: publication requires a
        -- successful fetch, so a row waiting to be published must be checked on
        -- the next pass rather than waiting out its review interval.
        AND (is_published = 0
             OR last_checked_at IS NULL
             OR review_due_at IS NULL
             OR review_due_at <= ?)
      ORDER BY last_checked_at IS NOT NULL, last_checked_at ASC
      LIMIT ?`,
  ).all(ts, limit) as Array<{ id: number; slug: string; title: string; url: string }>)
    .map((r) => ({ ...r, kind: 'resource' as const }));

  const links = (h.prepare(
    `SELECT l.id AS linkId, l.resource_id AS id, r.slug, l.label AS title, l.url
       FROM resource_link l JOIN resource r ON r.id = l.resource_id
      WHERE l.last_checked_at IS NULL OR l.last_checked_at <= ?
      ORDER BY l.last_checked_at IS NOT NULL, l.last_checked_at ASC
      LIMIT ?`,
  ).all(addDays(ts, -90), Math.max(20, Math.floor(limit / 4))) as Array<{
    linkId: number; id: number; slug: string; title: string; url: string;
  }>).map((r) => ({ ...r, kind: 'link' as const }));

  return [...resources, ...links];
}

export interface LinkCheckResult {
  slug: string;
  linkId?: number;
  httpStatus: number;
  finalUrl?: string;
  contentType?: string;
  error?: string;
}

/**
 * Applies the outcome of a link check.
 *
 * The classification matters more than the status code. A 403 from a government
 * site that blocks automated clients means "a person has to look", not "this
 * document is gone" — treating it as gone would empty the library of exactly the
 * sources that matter most. So:
 *
 *   ok / redirected  → verified, and published if it was waiting for this
 *   blocked          → flagged for a human, publication unchanged
 *   gone             → unpublished and marked for review; this is a real failure
 *   unreachable      → flagged; could be the source, could be our network
 */
export function applyLinkCheck(result: LinkCheckResult): { outcome: LinkOutcome; published: boolean } {
  return transaction(() => {
    const h = db();
    const ts = now();
    const outcome = classifyLinkCheck(result.httpStatus, result.error);
    const meta = LINK_OUTCOME_META[outcome];

    const row = h.prepare(
      `SELECT id, status, is_published, resource_type, official_status, origin FROM resource WHERE slug = ?`,
    ).get(result.slug) as {
      id: number; status: string; is_published: number; resource_type: string;
      official_status: string; origin: string;
    } | undefined;
    if (!row) return { outcome, published: false };

    if (result.linkId) {
      h.prepare(`UPDATE resource_link SET last_checked_at = ?, link_state = ? WHERE id = ?`)
        .run(ts, outcome, result.linkId);
      h.prepare(
        `INSERT INTO resource_verification (resource_id, method, outcome, http_status, detail, checked_by, created_at)
         VALUES (?,'link_check',?,?,?,'system',?)`,
      ).run(row.id, outcome, result.httpStatus, `Attached link: ${result.finalUrl ?? ''} ${result.error ?? ''}`.trim(), ts);
      return { outcome, published: row.is_published === 1 };
    }

    let status = row.status;
    let published = row.is_published === 1;

    if (meta.healthy && outcome !== 'blocked') {
      // A reachable resource that a person wrote into the catalogue becomes
      // publishable here: somebody chose the URL and described the document, and
      // this fetch is the confirmation that the URL answers.
      //
      // A HARVESTED row does not. Nobody has read it, its classification was made
      // by a regex, and a successful fetch proves only that a file exists at an
      // address — not that it is the document its link text claimed, nor that it
      // is current. Those go through promoteReviewedHarvest, which is an explicit
      // operator action (spec §63). A link check must never be the thing that
      // publishes scraped content.
      const publishable = row.origin !== 'harvest';
      if (publishable && ['REVIEW_REQUIRED', 'RAW', 'VERIFIED', 'UNDER_REVIEW'].includes(status)) {
        status = 'PUBLISHED';
        published = true;
      } else if (!publishable && status === 'RAW') {
        // Reachable, classified, and now waiting for a person rather than a bot.
        status = 'REVIEW_REQUIRED';
      }
    } else if (outcome === 'gone') {
      status = 'UNDER_REVIEW';
      published = false;
    } else if (outcome === 'blocked' && status === 'REVIEW_REQUIRED') {
      // Still held. A blocked check is not evidence the page exists.
      status = 'REVIEW_REQUIRED';
    } else if (outcome === 'unreachable' && published) {
      status = 'UNDER_REVIEW';
      // Left published: one failed fetch from one network is not grounds to
      // remove a government form from the library.
    }

    const interval = reviewIntervalDays(row.resource_type as ResourceType, row.official_status as OfficialStatus);
    h.prepare(
      `UPDATE resource SET
         last_checked_at = ?, link_state = ?, status = ?, is_published = ?,
         last_ok_at = CASE WHEN ? THEN ? ELSE last_ok_at END,
         last_verified_at = CASE WHEN ? THEN ? ELSE last_verified_at END,
         review_due_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      ts, outcome, status, flag(published),
      meta.healthy && outcome !== 'blocked' ? 1 : 0, ts,
      meta.healthy && outcome !== 'blocked' ? 1 : 0, ts,
      addDays(ts, outcome === 'ok' ? interval : 14), ts, row.id,
    );

    h.prepare(
      `INSERT INTO resource_verification (resource_id, method, outcome, http_status, detail, checked_by, created_at)
       VALUES (?,'link_check',?,?,?,'system',?)`,
    ).run(
      row.id, outcome, result.httpStatus,
      [result.finalUrl ? `final: ${result.finalUrl}` : null,
        result.contentType ? `type: ${result.contentType}` : null,
        result.error ? `error: ${result.error}` : null].filter(Boolean).join('; ') || null,
      ts,
    );

    // The quality score depends on freshness and reachability, so it moves.
    recomputeQuality(row.id);
    return { outcome, published };
  });
}

export function recomputeQuality(id: number): number {
  const h = db();
  const row = h.prepare(
    `SELECT r.trust_level AS trustLevel, r.official_status AS officialStatus,
            r.last_verified_at AS lastVerifiedAt, r.description, r.is_pan_india AS panIndia,
            r.jurisdiction_id AS jurisdictionId, r.legal_matter_id AS matterId, r.link_state AS linkState,
            (SELECT count(*) FROM resource_template t WHERE t.resource_id = r.id AND t.is_current = 1) AS tpl
       FROM resource r WHERE r.id = ?`,
  ).get(id) as Record<string, string | number | null> | undefined;
  if (!row) return 0;
  const { score } = qualityScore({
    trustLevel: Number(row.trustLevel ?? 6),
    officialStatus: String(row.officialStatus) as OfficialStatus,
    lastVerifiedAt: row.lastVerifiedAt ? String(row.lastVerifiedAt) : null,
    hasDescription: String(row.description ?? '').length > 40,
    hasJurisdiction: row.panIndia === 1 || row.jurisdictionId !== null,
    hasMatter: row.matterId !== null,
    hasPreview: Number(row.tpl ?? 0) > 0,
    linkOk: row.linkState === 'ok' || String(row.officialStatus) === 'PLATFORM_TEMPLATE',
  });
  h.prepare(`UPDATE resource SET quality_score = ? WHERE id = ?`).run(score, id);
  return score;
}

export function adminResourceDashboard() {
  const h = db();
  const one = (sql: string, ...p: Array<string | number>) => Number((h.prepare(sql).get(...p) as { n: number }).n);
  const ts = now();
  return {
    total: one(`SELECT count(*) AS n FROM resource WHERE deleted_at IS NULL`),
    published: one(`SELECT count(*) AS n FROM resource WHERE is_published = 1`),
    byStatus: (h.prepare(
      `SELECT status, count(*) AS n FROM resource WHERE deleted_at IS NULL GROUP BY status ORDER BY n DESC`,
    ).all() as Array<{ status: string; n: number }>),
    byOfficialStatus: (h.prepare(
      `SELECT official_status AS status, count(*) AS n FROM resource WHERE deleted_at IS NULL GROUP BY official_status`,
    ).all() as Array<{ status: string; n: number }>),
    byLinkState: (h.prepare(
      `SELECT coalesce(link_state, 'never checked') AS state, count(*) AS n FROM resource
        WHERE deleted_at IS NULL GROUP BY link_state ORDER BY n DESC`,
    ).all() as Array<{ state: string; n: number }>),
    awaitingReview: one(`SELECT count(*) AS n FROM resource WHERE status IN ('RAW','REVIEW_REQUIRED')`),
    reviewOverdue: one(`SELECT count(*) AS n FROM resource WHERE is_published = 1 AND review_due_at IS NOT NULL AND review_due_at <= ?`, ts),
    broken: one(`SELECT count(*) AS n FROM resource WHERE link_state IN ('gone','server_error')`),
    blocked: one(`SELECT count(*) AS n FROM resource WHERE link_state = 'blocked'`),
    neverChecked: one(`SELECT count(*) AS n FROM resource WHERE last_checked_at IS NULL AND source_url IS NOT NULL`),
    rightsUnresolved: one(`SELECT count(*) AS n FROM resource WHERE rights_basis = 'unknown'`),
    downloads: one(`SELECT coalesce(sum(download_count),0) AS n FROM resource`),
    previews: one(`SELECT coalesce(sum(preview_count),0) AS n FROM resource`),
    harvestTargets: one(`SELECT count(*) AS n FROM resource_harvest_target WHERE is_enabled = 1`),
    duplicateCandidates: (h.prepare(
      `SELECT source_url AS url, count(*) AS n FROM resource
        WHERE source_url IS NOT NULL AND deleted_at IS NULL
        GROUP BY source_url HAVING count(*) > 1 ORDER BY n DESC LIMIT 20`,
    ).all() as Array<{ url: string; n: number }>),
    popular: (h.prepare(
      `SELECT slug, title, download_count AS downloads, view_count AS views FROM resource
        WHERE is_published = 1 ORDER BY download_count DESC, view_count DESC LIMIT 10`,
    ).all() as Array<{ slug: string; title: string; downloads: number; views: number }>),
    runs: (h.prepare(
      `SELECT id, started_at AS startedAt, finished_at AS finishedAt, mode, targets_run AS targetsRun,
              discovered, inserted, duplicates, rejected, errors, notes
         FROM resource_harvest_run ORDER BY id DESC LIMIT 10`,
    ).all() as Array<Record<string, string | number | null>>),
  };
}

export function adminReviewQueue(limit = 50) {
  return db().prepare(
    `SELECT r.slug, r.title, r.status, r.official_status AS officialStatus, r.resource_type AS resourceType,
            r.authority_name AS authorityName, r.source_url AS sourceUrl, r.link_state AS linkState,
            r.last_checked_at AS lastCheckedAt, r.trust_level AS trustLevel, r.origin,
            j.name AS stateName
       FROM resource r LEFT JOIN jurisdiction j ON j.id = r.jurisdiction_id
      WHERE r.status IN ('RAW','REVIEW_REQUIRED','UNDER_REVIEW') AND r.deleted_at IS NULL
      ORDER BY CASE r.status WHEN 'UNDER_REVIEW' THEN 0 WHEN 'REVIEW_REQUIRED' THEN 1 ELSE 2 END,
               r.trust_level ASC, r.title
      LIMIT ?`,
  ).all(limit) as Array<Record<string, string | number | null>>;
}

/** All published resource slugs, for the sitemap. */
export function publishedResourceSlugs(): Array<{ slug: string; updatedAt: string }> {
  return db().prepare(
    `SELECT slug, coalesce(updated_at, created_at) AS updatedAt FROM resource
      WHERE is_published = 1 AND deleted_at IS NULL ORDER BY slug`,
  ).all() as Array<{ slug: string; updatedAt: string }>;
}

/** Suggestions for the resource search box. */
export function suggestResources(q: string, limit = 8) {
  const term = fold(q).trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const rows = db().prepare(
    `SELECT slug, title, resource_type AS resourceType, official_status AS officialStatus,
            category_code AS categoryCode
       FROM resource
      WHERE is_published = 1 AND (lower(title) LIKE ? OR lower(search_keywords) LIKE ?)
      ORDER BY CASE WHEN lower(title) LIKE ? THEN 0 ELSE 1 END, quality_score DESC
      LIMIT ?`,
  ).all(like, like, `${term}%`, limit) as Array<Record<string, string>>;
  return rows.map((r) => ({
    slug: r.slug, title: r.title,
    kind: RESOURCE_TYPE_META[r.resourceType as ResourceType]?.label ?? r.resourceType,
    official: r.officialStatus === 'OFFICIAL',
  }));
}
