/**
 * Server-only data access.
 *
 * Everything here runs on the server and delegates to @lexhall/db repositories.
 * No component composes SQL, and nothing in this file is importable from a
 * client component — the `server-only` guard makes that a build error rather
 * than a runtime surprise.
 */
import 'server-only';
import { cache } from 'react';
import {
  corpusStats, listPracticeAreas, listCourts, listStates, getFeatureFlags,
  getProfessionalBySlug, getProfileDetail, relatedProfessionals,
  searchProfessionals, suggest, recordSearchEvent, zeroResultQueries,
  dataHealth, listSources, listRuns, listIssues, listClaims, listDataRequests,
  listFeatureFlags, isInitialised, db,
  listDomains, listMatters, getMatter, listForums,
  listResourceCategories, resourceLibraryStats, featuredResources, searchResources,
  getResource as getResourceRepo, relatedResources, resourcesForMatter, resourcesForPracticeArea,
  listResourceKits, getResourceKit as getResourceKitRepo,
  listResourceCentres, getResourceCentre as getResourceCentreRepo,
  recordResourceEvent, toggleResourceBookmark, listBookmarks, bookmarkedSlugs,
  suggestResources, adminResourceDashboard, adminReviewQueue, publishedResourceSlugs,
  getProfessionalReviewSummary, listReviewsForProfessional, eligibleExperiences,
  listModerationQueue,
} from '@lexhall/db';
import type { SearchFilters, ResourceSearchFilters, ReviewFilter, ReviewSort } from '@lexhall/db';

/** Guard so a missing database renders a helpful page, not a stack trace. */
export function databaseReady(): boolean {
  try { return isInitialised(); } catch { return false; }
}

// `cache` dedupes within a single render pass, so a page that needs the corpus
// counts in two places still issues one query.
export const getCorpus = cache(() => corpusStats());
export const getPracticeAreas = cache(() => listPracticeAreas());
export const getCourts = cache((tier?: number) => listCourts(tier));
export const getStates = cache(() => listStates());
export const getFlags = cache(() => getFeatureFlags());

export const getProfessional = cache((slug: string) => getProfessionalBySlug(slug));
export const getDetail = cache((slug: string) => getProfileDetail(slug));
export const getRelated = cache((id: number, limit?: number) => relatedProfessionals(id, limit));

export const getReviewSummary = cache((professionalId: number) => getProfessionalReviewSummary(professionalId));
export function getReviews(professionalId: number, opts?: { filter?: ReviewFilter; sort?: ReviewSort; limit?: number; offset?: number }) {
  return listReviewsForProfessional(professionalId, opts);
}
export function getEligibleExperiences(userId: number, professionalId: number) {
  return eligibleExperiences(userId, professionalId);
}
export function getModerationQueue(status?: string) {
  return listModerationQueue(status);
}

export function runSearch(filters: SearchFilters) {
  return searchProfessionals(filters);
}

export function runSuggest(q: string, limit?: number) {
  return suggest(q, limit);
}

export { recordSearchEvent, zeroResultQueries, dataHealth, listSources, listRuns, listIssues, listClaims, listDataRequests, listFeatureFlags };

/** Bar Councils, with how many records each contributed. */
export const getBarCouncils = cache(() =>
  db().prepare(
    `SELECT pb.id, pb.code, pb.external_code AS externalCode, pb.name, pb.short_name AS shortName,
            pb.address, pb.website_url AS websiteUrl, pb.covers_regions AS coversRegions,
            pb.source_url AS sourceUrl, pb.last_verified_at AS lastVerifiedAt,
            j.name AS jurisdictionName,
            (SELECT count(*) FROM professional p WHERE p.professional_body_id = pb.id AND p.is_published = 1) AS recordCount
       FROM professional_body pb
       LEFT JOIN jurisdiction j ON j.id = pb.jurisdiction_id
      WHERE pb.deleted_at IS NULL
      ORDER BY pb.name`,
  ).all() as Array<{
    id: number; code: string; externalCode: string | null; name: string; shortName: string | null;
    address: string | null; websiteUrl: string | null; coversRegions: string | null;
    sourceUrl: string | null; lastVerifiedAt: string | null; jurisdictionName: string | null; recordCount: number;
  }>);

/** Editorial image credits, read from the manifest the fetch script writes. */
export const getImageCredits = cache(async () => {
  try {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const raw = await readFile(join(process.cwd(), 'public', 'img', 'editorial', 'credits.json'), 'utf8');
    return JSON.parse(raw) as Array<{
      slug: string; file: string; title: string | null; creator: string; creatorUrl: string | null;
      licence: string; licenceUrl: string | null; source: string | null; sourcePage: string | null;
    }>;
  } catch { return []; }
});

/** Judges — factual profiles only. No ratings, by design (COMPLIANCE C-14). */
export const getJudges = cache(() =>
  db().prepare(
    `SELECT j.id, j.full_name AS fullName, j.slug, j.designation,
            j.tenure_start AS tenureStart, j.tenure_end AS tenureEnd,
            j.source_url AS sourceUrl, j.last_verified_at AS lastVerifiedAt,
            c.name AS courtName, c.slug AS courtSlug
       FROM judge j LEFT JOIN court c ON c.id = j.court_id
      ORDER BY CASE WHEN j.designation LIKE '%Chief Justice%' THEN 0 ELSE 1 END, j.full_name`,
  ).all() as Array<{
    id: number; fullName: string; slug: string; designation: string | null;
    tenureStart: string | null; tenureEnd: string | null; sourceUrl: string | null;
    lastVerifiedAt: string | null; courtName: string | null; courtSlug: string | null;
  }>);

/**
 * Locally-supplied assets, synced by `npm run assets:sync`.
 * The hero prefers a hand-supplied cut-out figure and falls back to licensed
 * court photography, so the page is never broken by a missing file.
 */
export const getLocalAssets = cache(async () => {
  try {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const raw = await readFile(join(process.cwd(), 'public', 'img', 'local', 'manifest.json'), 'utf8');
    return JSON.parse(raw) as { hero: Array<{ file: string; name: string }>; figures: Array<{ file: string; name: string }>; backgrounds: Array<{ file: string; name: string }> };
  } catch {
    return { hero: [], figures: [], backgrounds: [] };
  }
});

/** Advocates with a sourced photograph, for the colour-block feature row. */
export const getFeaturedWithPhotos = cache((limit = 3) =>
  db().prepare(
    `SELECT p.slug, p.display_name AS displayName, p.body_role AS bodyRole, p.photo_url AS photoUrl,
            p.verification_level AS verificationLevel, p.years_experience AS yearsExperience,
            p.accepts_consultations AS acceptsConsultations,
            l.name AS locationName, pb.short_name AS bodyShort,
            fs.min_consult_minor AS minConsultMinor, fs.currency_code AS currencyCode,
            (SELECT pa.name FROM professional_practice_area ppa
               JOIN practice_area pa ON pa.id = ppa.practice_area_id
              WHERE ppa.professional_id = p.id ORDER BY ppa.is_primary DESC LIMIT 1) AS primaryArea
       FROM professional p
       LEFT JOIN location l ON l.id = p.primary_location_id
       LEFT JOIN professional_body pb ON pb.id = p.professional_body_id
       LEFT JOIN professional_fee_summary fs ON fs.professional_id = p.id
      WHERE p.is_published = 1 AND p.photo_url IS NOT NULL AND p.accepts_consultations = 1
      ORDER BY p.verification_level DESC, fs.min_consult_minor DESC
      LIMIT ?`,
  ).all(limit) as Array<{
    slug: string; displayName: string; bodyRole: string | null; photoUrl: string | null;
    verificationLevel: number; yearsExperience: number | null; acceptsConsultations: number;
    locationName: string | null; bodyShort: string | null;
    minConsultMinor: number | null; currencyCode: string | null; primaryArea: string | null;
  }>);

// ---------------------------------------------------------------- taxonomy
export const getDomains = cache(() => listDomains());
export const getMatters = cache((opts: { domainSlug?: string; practiceAreaSlug?: string; limit?: number } = {}) => listMatters(opts));
export const getMatterDetail = cache((slug: string) => getMatter(slug));
export const getForums = cache((kind?: string) => listForums(kind));

// ---------------------------------------------------------------------------
// Resource library
//
// Same discipline as everything else in this file: the page composes, the
// repository queries. Nothing below builds SQL.
// ---------------------------------------------------------------------------
export const getResourceCategories = cache(() => listResourceCategories());
export const getResourceStats = cache(() => resourceLibraryStats());
export const getFeaturedResources = cache(() => featuredResources());
export const getResourceKits = cache(() => listResourceKits());
export const getResourceKit = cache((slug: string, state?: string) => getResourceKitRepo(slug, state));
export const getResourceCentres = cache(() => listResourceCentres());
export const getResourceCentre = cache((slug: string) => getResourceCentreRepo(slug));
export const getResourceDetail = cache((slug: string) => getResourceRepo(slug));
export const getRelatedResources = cache((id: number, limit?: number) => relatedResources(id, limit));
export const getResourcesForMatter = cache((slug: string, limit?: number) => resourcesForMatter(slug, limit));
export const getResourcesForPracticeArea = cache((slug: string, limit?: number) => resourcesForPracticeArea(slug, limit));

export function runResourceSearch(filters: ResourceSearchFilters) {
  return searchResources(filters);
}

export {
  recordResourceEvent, toggleResourceBookmark, listBookmarks, bookmarkedSlugs,
  suggestResources, adminResourceDashboard, adminReviewQueue, publishedResourceSlugs,
};
export type { ResourceSearchFilters };
