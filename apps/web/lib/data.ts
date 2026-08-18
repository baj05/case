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
} from '@lexhall/db';
import type { SearchFilters } from '@lexhall/db';

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
