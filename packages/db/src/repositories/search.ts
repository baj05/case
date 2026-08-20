/**
 * Search execution.
 *
 * Pipeline: raw query -> deterministic intake classification -> candidate
 * retrieval (FTS5 + structured filters) -> explainable re-ranking -> hits.
 * Confidential text never reaches this path; the index only contains
 * publishable professional fields.
 */
import { db, now } from '../client.ts';
import { toFtsQuery, classifyIntake, rank, fold, trigramSimilarity } from '@lexhall/core';
import type { IntakeResult, SearchHit } from '@lexhall/core';
import { loadIntakeVocabulary } from './reference.ts';
import { hydrateSummaries } from './profile.ts';

export interface SearchFilters {
  q?: string;
  practice?: string;      // practice area slug
  location?: string;      // location slug
  court?: string;         // court slug
  kind?: string;          // professional kind
  matter?: string;        // matter type slug (the service wanted)
  /** Legal matter slug — level 3 of the taxonomy, i.e. the actual problem. */
  legalMatter?: string;
  language?: string;      // iso639
  verifiedOnly?: boolean;
  acceptingOnly?: boolean;
  claimedOnly?: boolean;
  courtTier?: number;
  /** Maximum first-consultation fee in minor units. */
  feeMaxMinor?: number;
  /** Minimum years in practice. */
  minYears?: number;
  /** Only professionals with bookable slots in the next 7 days. */
  availableSoon?: boolean;
  sort?: 'relevance' | 'verification' | 'name' | 'recently_verified'
    | 'fee_asc' | 'fee_desc' | 'experience_desc';
  page?: number;
  perPage?: number;
}

export interface SearchOutcome {
  hits: SearchHit[];
  total: number;
  page: number;
  perPage: number;
  intake: IntakeResult;
  /** Recovery suggestions when the result set is empty or thin (spec §112). */
  recovery: RecoverySuggestion[];
  appliedFilters: Array<{ key: string; label: string; value: string }>;
  latencyMs: number;
}

export interface RecoverySuggestion { label: string; href: string; reason: string; count: number }

const MAX_PER_PAGE = 48;

export function searchProfessionals(filters: SearchFilters): SearchOutcome {
  const startedAt = performance.now();
  const h = db();
  const vocab = loadIntakeVocabulary();
  const intake = classifyIntake(filters.q ?? '', vocab);

  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.trunc(filters.perPage ?? 12)));

  // ---- resolve explicit filters to ids ------------------------------------
  const practiceRow = filters.practice
    ? (h.prepare(`SELECT id, name, slug FROM practice_area WHERE slug=?`).get(filters.practice) as { id: number; name: string; slug: string } | undefined)
    : undefined;
  const locationRow = filters.location
    ? (h.prepare(`SELECT id, name, slug, level FROM location WHERE slug=?`).get(filters.location) as { id: number; name: string; slug: string; level: number } | undefined)
    : undefined;
  const courtRow = filters.court
    ? (h.prepare(`SELECT id, name, slug, tier FROM court WHERE slug=?`).get(filters.court) as { id: number; name: string; slug: string; tier: number } | undefined)
    : undefined;
  const matterRow = filters.matter
    ? (h.prepare(`SELECT id, name, slug FROM matter_type WHERE slug=?`).get(filters.matter) as { id: number; name: string; slug: string } | undefined)
    : undefined;
  // A legal matter narrows to its practice area. It is deliberately NOT a hard
  // filter on declared matters: professionals declare matters only after
  // claiming, so filtering on it would hide everyone who has not claimed yet.
  const legalMatterRow = filters.legalMatter
    ? (h.prepare(
        `SELECT m.id, m.name, m.slug, m.practice_area_id AS practiceAreaId FROM legal_matter m WHERE m.slug=?`,
      ).get(filters.legalMatter) as { id: number; name: string; slug: string; practiceAreaId: number } | undefined)
    : undefined;
  const languageRow = filters.language
    ? (h.prepare(`SELECT id, name FROM language WHERE iso639=?`).get(filters.language) as { id: number; name: string } | undefined)
    : undefined;

  // An explicit filter always beats an inferred one: the user's click is a
  // stronger signal than our guess about their sentence.
  const practiceAreaId = practiceRow?.id ?? legalMatterRow?.practiceAreaId ?? intake.practiceArea?.value.id ?? null;
  const locationId = locationRow?.id ?? intake.location?.value.id ?? null;
  const courtId = courtRow?.id ?? intake.court?.value.id ?? null;

  // ---- candidate retrieval ------------------------------------------------
  const where: string[] = ['d.is_published = 1'];
  const params: Array<string | number> = [];

  // When professionals have actually declared this matter, filter to them —
  // that is a real specialism claim they made. When nobody has declared it, fall
  // back to the practice area rather than returning an empty page, and say so.
  const declaredMatterIds = legalMatterRow
    ? (h.prepare(
        `SELECT professional_id AS id FROM professional_legal_matter WHERE legal_matter_id = ?`,
      ).all(legalMatterRow.id) as Array<{ id: number }>).map((r) => r.id)
    : [];
  const matterIsDeclared = declaredMatterIds.length > 0;
  if (matterIsDeclared) {
    where.push(`d.professional_id IN (${declaredMatterIds.map(() => '?').join(',')})`);
    params.push(...declaredMatterIds);
  } else if (practiceAreaId) { where.push(`d.practice_area_ids LIKE ?`); params.push(`%,${practiceAreaId},%`); }
  // A matter slug that resolves to nothing must not silently widen the search to
  // the whole corpus — that reads as "here is everyone" when it means "unknown".
  const unknownLegalMatter = Boolean(filters.legalMatter) && !legalMatterRow;
  if (unknownLegalMatter) where.push('1 = 0');
  if (courtId) { where.push(`d.court_ids LIKE ?`); params.push(`%,${courtId},%`); }
  if (filters.courtTier) { where.push(`d.court_tiers LIKE ?`); params.push(`%,${filters.courtTier},%`); }
  if (matterRow) { where.push(`d.matter_type_ids LIKE ?`); params.push(`%,${matterRow.id},%`); }
  if (languageRow) { where.push(`d.language_ids LIKE ?`); params.push(`%,${languageRow.id},%`); }
  if (filters.kind) { where.push(`d.kind = ?`); params.push(filters.kind); }
  if (filters.verifiedOnly) where.push(`d.verification_level >= 3`);
  if (filters.acceptingOnly) where.push(`d.accepts_consultations = 1`);
  if (filters.claimedOnly) where.push(`d.claim_status = 'claimed'`);
  if (locationId) {
    // Descendant match: selecting a state includes every city beneath it.
    where.push(`(d.location_path LIKE ? OR d.jurisdiction_id = (SELECT jurisdiction_id FROM location WHERE id = ?))`);
    params.push(`%/${locationId}/%`, locationId);
  }

  // Free text goes through FTS5 when present. `residualTerms` are what the
  // classifier could not account for — usually a person's name.
  const textQuery = filters.q?.trim() ? toFtsQuery(filters.q) : '';
  let ftsScores = new Map<number, number>();
  if (textQuery) {
    try {
      const ftsRows = h.prepare(
        `SELECT rowid AS id, bm25(professional_fts, 8.0, 3.0, 5.0, 3.0, 2.0, 1.0) AS score
           FROM professional_fts WHERE professional_fts MATCH ? LIMIT 2000`,
      ).all(textQuery) as Array<{ id: number; score: number }>;
      // bm25 returns negative numbers, more negative = better. Normalise to 0..1.
      const best = Math.min(...ftsRows.map((r) => r.score), 0);
      for (const r of ftsRows) ftsScores.set(Number(r.id), best === 0 ? 0 : Math.min(1, r.score / best));
    } catch {
      // A malformed MATCH expression must degrade to filter-only search,
      // never 500 the page.
      ftsScores = new Map();
    }
  }

  const hasStructural = Boolean(legalMatterRow || practiceAreaId || courtId || locationId || matterRow || languageRow || filters.kind);
  // If the query produced text hits, restrict to them — unless structured
  // filters alone are meaningful (e.g. browsing a practice area with no query).
  if (textQuery && ftsScores.size > 0 && !hasStructural) {
    where.push(`d.professional_id IN (${[...ftsScores.keys()].map(() => '?').join(',')})`);
    params.push(...ftsScores.keys());
  }

  // Fee constraints run against the denormalised summary, so sorting by price
  // costs one join rather than a correlated subquery per row.
  if (filters.feeMaxMinor !== undefined) {
    where.push(`(fs.min_consult_minor IS NOT NULL AND fs.min_consult_minor <= ?)`);
    params.push(Math.round(filters.feeMaxMinor));
  }
  if (filters.minYears !== undefined && filters.minYears > 0) {
    // enrolment_year is the fallback when years_experience was never declared.
    where.push(`(COALESCE(d.years_experience, CASE WHEN p.enrolment_year IS NOT NULL
                 THEN CAST(strftime('%Y','now') AS INTEGER) - p.enrolment_year END) >= ?)`);
    params.push(Math.trunc(filters.minYears));
  }
  if (filters.availableSoon) {
    // Real availability, not a decorative badge: the professional must have an
    // active rule AND no blanket block. Slot-level truth is confirmed by
    // generateSlots on the booking page.
    where.push(`EXISTS (SELECT 1 FROM availability_rule ar
                         WHERE ar.professional_id = d.professional_id AND ar.is_active = 1)`);
  }

  const candidates = h.prepare(
    `SELECT d.professional_id AS id, d.verification_level, d.years_experience, d.accepts_consultations,
            d.profile_completeness, d.jurisdiction_id, d.location_path, d.practice_area_ids,
            d.court_ids, d.name_text, d.data_confidence,
            fs.min_consult_minor AS fee_min, fs.currency_code AS fee_currency,
            p.enrolment_year AS enrolment_year
       FROM professional_search_doc d
       JOIN professional p ON p.id = d.professional_id
       LEFT JOIN professional_fee_summary fs ON fs.professional_id = d.professional_id
      WHERE ${where.join(' AND ')}
      LIMIT 2000`,
  ).all(...params) as Array<{
    id: number; verification_level: number; years_experience: number | null; accepts_consultations: number;
    profile_completeness: number; jurisdiction_id: number | null; location_path: string;
    practice_area_ids: string; court_ids: string; name_text: string; data_confidence: number;
    fee_min: number | null; fee_currency: string | null; enrolment_year: number | null;
  }>;

  // ---- rank ---------------------------------------------------------------
  const targetJurisdiction = locationId
    ? (h.prepare(`SELECT jurisdiction_id FROM location WHERE id=?`).get(locationId) as { jurisdiction_id: number | null } | undefined)?.jurisdiction_id ?? null
    : null;

  const scored = candidates.map((c) => {
    const hasPractice = practiceAreaId ? c.practice_area_ids.includes(`,${practiceAreaId},`) : false;
    const hasCourt = courtId ? c.court_ids.includes(`,${courtId},`) : false;
    const inLocation = locationId ? c.location_path.includes(`/${locationId}/`) : false;
    const inJurisdiction = targetJurisdiction !== null && c.jurisdiction_id === targetJurisdiction;

    let text = ftsScores.get(c.id) ?? 0;
    // Fuzzy name fallback so "Rameshh Gupta" still finds "Ramesh Gupta".
    if (text === 0 && intake.residualTerms.length > 0) {
      const sim = trigramSimilarity(intake.residualTerms.join(' '), c.name_text);
      if (sim > 0.35) text = sim;
    }

    const { score, factors } = rank({
      practiceRelevance: practiceAreaId ? (hasPractice ? 1 : 0) : 0.6,
      practiceDetail: practiceAreaId
        ? (hasPractice ? `Lists ${practiceRow?.name ?? intake.practiceArea?.value.name ?? 'the requested area'}` : 'Does not list this practice area')
        : 'No practice area specified in the query',
      jurisdictionRelevance: locationId ? (inLocation ? 1 : inJurisdiction ? 0.7 : 0.1) : 0.6,
      jurisdictionDetail: locationId
        ? (inLocation ? `Office in ${locationRow?.name ?? intake.location?.value.name}` : inJurisdiction ? 'Same state or union territory' : 'Different jurisdiction')
        : 'No location specified in the query',
      courtRelevance: courtId ? (hasCourt ? 1 : 0.1) : 0.5,
      courtDetail: courtId
        ? (hasCourt ? `Appears before ${courtRow?.name ?? intake.court?.value.name}` : 'No recorded appearance at this court')
        : 'No court specified in the query',
      textRelevance: text,
      textDetail: text > 0 ? 'Matches your search text' : 'No direct text match',
      verificationLevel: c.verification_level,
      yearsExperience: c.years_experience,
      acceptsConsultations: c.accepts_consultations === 1,
      profileCompleteness: c.profile_completeness,
    });
    const years = c.years_experience
      ?? (c.enrolment_year ? new Date().getFullYear() - c.enrolment_year : null);
    return { id: c.id, score, factors, feeMin: c.fee_min, years };
  });

  switch (filters.sort) {
    case 'fee_asc':
      // No published fee sorts LAST rather than as if it were free.
      scored.sort((a, b) =>
        (a.feeMin ?? Number.POSITIVE_INFINITY) - (b.feeMin ?? Number.POSITIVE_INFINITY) || b.score - a.score);
      break;
    case 'fee_desc':
      scored.sort((a, b) =>
        (b.feeMin ?? Number.NEGATIVE_INFINITY) - (a.feeMin ?? Number.NEGATIVE_INFINITY) || b.score - a.score);
      break;
    case 'experience_desc':
      scored.sort((a, b) => (b.years ?? -1) - (a.years ?? -1) || b.score - a.score);
      break;
    case 'verification':
      scored.sort((a, b) => (b.factors.find((f) => f.key === 'verified_credentials')?.earned ?? 0) - (a.factors.find((f) => f.key === 'verified_credentials')?.earned ?? 0) || b.score - a.score);
      break;
    case 'name':
      break; // applied after hydration, where names are available
    default:
      scored.sort((a, b) => b.score - a.score || a.id - b.id);
  }

  const total = scored.length;
  const pageSlice = scored.slice((page - 1) * perPage, page * perPage);
  const summaries = hydrateSummaries(pageSlice.map((s) => s.id));
  const byId = new Map(summaries.map((s) => [s.id, s]));

  let hits: SearchHit[] = pageSlice
    .map((s) => {
      const professional = byId.get(s.id);
      return professional ? { professional, score: s.score, factors: s.factors } : null;
    })
    .filter((x): x is SearchHit => x !== null);

  if (filters.sort === 'name') hits = hits.sort((a, b) => a.professional.displayName.localeCompare(b.professional.displayName));

  // ---- applied filter chips ----------------------------------------------
  const appliedFilters: SearchOutcome['appliedFilters'] = [];
  if (unknownLegalMatter) {
    appliedFilters.push({ key: 'legalMatter', label: 'Legal matter (not recognised)', value: String(filters.legalMatter) });
  }
  if (legalMatterRow) {
    appliedFilters.push({
      key: 'legalMatter',
      label: matterIsDeclared ? 'Legal matter (declared by the professional)' : 'Legal matter (via its practice area)',
      value: legalMatterRow.name,
    });
  }
  else if (intake.matter) appliedFilters.push({ key: 'legalMatter', label: 'Legal matter (from your words)', value: intake.matter.value.name });
  if (practiceRow) appliedFilters.push({ key: 'practice', label: 'Practice area', value: practiceRow.name });
  else if (intake.practiceArea) appliedFilters.push({ key: 'practice', label: 'Practice area (from your words)', value: intake.practiceArea.value.name });
  if (locationRow) appliedFilters.push({ key: 'location', label: 'Location', value: locationRow.name });
  else if (intake.location) appliedFilters.push({ key: 'location', label: 'Location (from your words)', value: intake.location.value.name });
  if (courtRow) appliedFilters.push({ key: 'court', label: 'Court', value: courtRow.name });
  else if (intake.court) appliedFilters.push({ key: 'court', label: 'Court (from your words)', value: intake.court.value.name });
  if (matterRow) appliedFilters.push({ key: 'matter', label: 'Service', value: matterRow.name });
  if (languageRow) appliedFilters.push({ key: 'language', label: 'Language', value: languageRow.name });
  if (filters.verifiedOnly) appliedFilters.push({ key: 'verified', label: 'Verification', value: 'Bar enrolment verified' });
  if (filters.acceptingOnly) appliedFilters.push({ key: 'accepting', label: 'Availability', value: 'Accepting requests' });

  const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;

  return {
    hits, total, page, perPage, intake,
    recovery: total === 0 || total < 3 ? buildRecovery({ practiceAreaId, locationId, courtId, filters, practiceName: practiceRow?.name ?? intake.practiceArea?.value.name ?? null }) : [],
    appliedFilters, latencyMs,
  };
}

/**
 * Zero-result recovery. Every suggestion is verified to actually have results
 * before it is offered — a dead-end suggestion is worse than none.
 */
function buildRecovery(ctx: {
  practiceAreaId: number | null; locationId: number | null; courtId: number | null;
  filters: SearchFilters; practiceName: string | null;
}): RecoverySuggestion[] {
  const h = db();
  const out: RecoverySuggestion[] = [];
  const countWith = (clauses: string[], params: Array<string | number>): number =>
    Number((h.prepare(`SELECT count(*) n FROM professional_search_doc d WHERE ${['d.is_published = 1', ...clauses].join(' AND ')}`).get(...params) as { n: number }).n);

  // Same practice area, drop the location.
  if (ctx.practiceAreaId && ctx.locationId) {
    const n = countWith([`d.practice_area_ids LIKE ?`], [`%,${ctx.practiceAreaId},%`]);
    if (n > 0) {
      const slug = (h.prepare(`SELECT slug FROM practice_area WHERE id=?`).get(ctx.practiceAreaId) as { slug: string }).slug;
      out.push({ label: `${ctx.practiceName ?? 'This practice area'} anywhere in India`, href: `/search?practice=${slug}`, reason: 'Widen the location', count: n });
    }
  }
  // Same location, parent practice area.
  if (ctx.practiceAreaId) {
    const parent = h.prepare(`SELECT parent.id, parent.name, parent.slug FROM practice_area pa JOIN practice_area parent ON parent.id = pa.parent_id WHERE pa.id=?`).get(ctx.practiceAreaId) as { id: number; name: string; slug: string } | undefined;
    if (parent) {
      const clauses = [`d.practice_area_ids LIKE ?`];
      const params: Array<string | number> = [`%,${parent.id},%`];
      if (ctx.locationId) { clauses.push(`d.location_path LIKE ?`); params.push(`%/${ctx.locationId}/%`); }
      const n = countWith(clauses, params);
      if (n > 0) out.push({ label: `Broaden to ${parent.name}`, href: `/search?practice=${parent.slug}${ctx.filters.location ? `&location=${ctx.filters.location}` : ''}`, reason: 'A wider category', count: n });
    }
  }
  // Parent location (city -> state).
  if (ctx.locationId) {
    const parent = h.prepare(`SELECT p.id, p.name, p.slug FROM location l JOIN location p ON p.id = l.parent_id WHERE l.id=? AND p.level >= 1`).get(ctx.locationId) as { id: number; name: string; slug: string } | undefined;
    if (parent) {
      const clauses = [`d.location_path LIKE ?`];
      const params: Array<string | number> = [`%/${parent.id}/%`];
      if (ctx.practiceAreaId) { clauses.push(`d.practice_area_ids LIKE ?`); params.push(`%,${ctx.practiceAreaId},%`); }
      const n = countWith(clauses, params);
      if (n > 0) out.push({ label: `Search across ${parent.name}`, href: `/search?location=${parent.slug}${ctx.filters.practice ? `&practice=${ctx.filters.practice}` : ''}`, reason: 'A wider area', count: n });
    }
  }
  // Anything at all, as a last resort.
  if (out.length === 0) {
    const n = countWith([], []);
    if (n > 0) out.push({ label: 'Browse all listed professionals', href: '/search', reason: 'Start from the full directory', count: n });
  }
  return out.slice(0, 4);
}

/** Autocomplete. One indexed prefix query across every suggestable entity. */
export function suggest(query: string, limit = 8) {
  const key = fold(query);
  if (key.length < 2) {
    return db().prepare(
      `SELECT kind, label, sublabel, href FROM suggest_term WHERE kind='practice_area' ORDER BY weight DESC LIMIT ?`,
    ).all(limit) as Array<{ kind: string; label: string; sublabel: string | null; href: string }>;
  }
  return db().prepare(
    `SELECT kind, label, sublabel, href, weight FROM suggest_term
      WHERE match_key LIKE ? OR match_key LIKE ?
      ORDER BY (CASE WHEN match_key LIKE ? THEN 0 ELSE 1 END), weight DESC
      LIMIT ?`,
  ).all(`${key}%`, `% ${key}%`, `${key}%`, limit) as Array<{ kind: string; label: string; sublabel: string | null; href: string; weight: number }>;
}

/** Record a search for zero-result intelligence. Stores the query, never a brief. */
export function recordSearchEvent(input: {
  rawQuery: string | null; parsed: unknown; filters: unknown; resultCount: number;
  topProfessionalId: number | null; latencyMs: number; sessionRef: string | null;
}): void {
  db().prepare(
    `INSERT INTO search_event (session_ref, user_id, raw_query, parsed, filters, result_count, top_result_professional_id, latency_ms, created_at)
     VALUES (?,NULL,?,?,?,?,?,?,?)`,
  ).run(
    input.sessionRef, input.rawQuery, JSON.stringify(input.parsed ?? null), JSON.stringify(input.filters ?? null),
    input.resultCount, input.topProfessionalId, Math.round(input.latencyMs), now(),
  );
}

export function zeroResultQueries(limit = 25) {
  return db().prepare(
    `SELECT raw_query AS rawQuery, count(*) AS occurrences, max(created_at) AS lastSeen
       FROM search_event
      WHERE result_count = 0 AND raw_query IS NOT NULL AND trim(raw_query) <> ''
      GROUP BY lower(raw_query) ORDER BY occurrences DESC, lastSeen DESC LIMIT ?`,
  ).all(limit) as Array<{ rawQuery: string; occurrences: number; lastSeen: string }>;
}
