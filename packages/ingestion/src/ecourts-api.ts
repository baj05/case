/**
 * eCourtsIndia REST API client — https://ecourtsindia.com/api
 *
 * This is the LICENSED route to this data. The site's robots.txt refuses
 * automated crawling precisely because the API is the front door; we go
 * through the door. Do not add a scraping fallback to this module.
 *
 * Differences from src/http.ts (the crawler) that justify a separate client:
 *   * requests are authenticated, so robots.txt is not the governing contract
 *   * every call spends credits, so failures must be loud and retries stingy
 *   * 401 / 402 / 429 each mean something specific and actionable
 *
 * The key is read from the environment and never logged, echoed, or included
 * in an error message.
 */

const BASE = (process.env.ECOURTS_API_BASE ?? 'https://webapi.ecourtsindia.com').replace(/\/$/, '');
const RATE_LIMIT_MS = Number(process.env.ECOURTS_RATE_LIMIT_MS ?? 1200);

export class ECourtsApiError extends Error {
  // Declared explicitly rather than as constructor parameter properties:
  // Node runs .ts by *erasing* types, and a parameter property needs a real
  // code transform (it emits an assignment), so it fails at load with
  // ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX.
  readonly code: string;
  readonly status: number | undefined;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ECourtsApiError';
    this.code = code;
    this.status = status;
  }
}

function apiKey(): string {
  const k = process.env.ECOURTS_API_KEY?.trim();
  if (!k) {
    throw new ECourtsApiError(
      'ECOURTS_API_KEY is not set. Add it to .env (see .env.example). '
      + 'Get a key at https://ecourtsindia.com/api',
      'NO_KEY',
    );
  }
  return k;
}

let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialised, rate-limited GET. Concurrency is deliberately 1: this is a
 * metered API, and parallelism here buys speed at the cost of predictability
 * in spend and in rate-limit behaviour. */
export async function ecourtsGet<T = unknown>(
  path: string,
  params: Record<string, string | number | string[] | undefined> = {},
): Promise<T> {
  const key = apiKey();

  const wait = RATE_LIMIT_MS - (Date.now() - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();

  const url = new URL(`${BASE}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    // Repeated keys, not comma-joined: the API documents courtCodes this way.
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
    else url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (cause) {
    throw new ECourtsApiError(`Network failure calling ${path}`, 'NETWORK');
  }

  if (!res.ok) {
    // Never interpolate the key or the full URL (it may carry query context)
    // into a thrown message — these propagate into logs.
    const detail = await res.text().catch(() => '');
    const snippet = detail.slice(0, 300);
    if (res.status === 401 || res.status === 403) {
      throw new ECourtsApiError(
        `Authentication rejected (${res.status}). Check ECOURTS_API_KEY is a live key and still active.`,
        'NOT_AUTHENTICATED', res.status,
      );
    }
    if (res.status === 402) {
      throw new ECourtsApiError('Out of API credits. Top up at https://ecourtsindia.com/api/pricing', 'NO_CREDITS', 402);
    }
    if (res.status === 429) {
      throw new ECourtsApiError('Rate limited. Raise ECOURTS_RATE_LIMIT_MS and retry.', 'RATE_LIMITED', 429);
    }
    throw new ECourtsApiError(`${path} failed: ${res.status} ${snippet}`, 'HTTP_ERROR', res.status);
  }

  const body = await res.json() as { success?: boolean; errorMessage?: string; data?: T };
  // The API wraps everything in {success, errorMessage, data} and returns 200
  // even for logical failures — so a 200 alone is not success.
  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    const msg = body.errorMessage ?? 'unknown error';
    throw new ECourtsApiError(`${path}: ${msg}`, msg === 'NOT_AUTHENTICATED' ? 'NOT_AUTHENTICATED' : 'API_ERROR');
  }
  return (body?.data ?? body) as T;
}

/** True if a usable key is configured — lets callers degrade gracefully
 * instead of throwing during module load. */
export function hasECourtsKey(): boolean {
  return Boolean(process.env.ECOURTS_API_KEY?.trim());
}

// ----------------------------------------------------------------- endpoints

export interface ECourtsState { state: string; stateName: string }
export interface ECourtsDistrict { districtCode?: string; districtName?: string; [k: string]: unknown }

/* The docs advertise /api/CauseList/... as public and unauthenticated, but it
   returns 401 in practice; the /api/partner/causelist/... equivalents work
   with a live key. Verified against both paths 2026-08-26. */
export function listStates() {
  return ecourtsGet<ECourtsState[]>('/api/partner/causelist/court-structure/states');
}

export function listDistricts(stateCode: string) {
  return ecourtsGet<ECourtsDistrict[]>(
    `/api/partner/causelist/court-structure/states/${encodeURIComponent(stateCode)}/districts`,
  );
}

export interface CaseSearchResult {
  cnr: string; caseType?: string; caseStatus?: string; filingDate?: string;
  courtCode?: string; courtName?: string; stateCode?: string; districtCode?: number;
  petitioners?: string[]; respondents?: string[];
  // Advocates arrive split by side, not as one list — and frequently as a
  // surname or initials only, which is why identity here is banded rather
  // than treated as a resolved person.
  petitionerAdvocates?: string[]; respondentAdvocates?: string[];
  judges?: string[]; caseCategoryFacetPath?: string[];
  hasOrders?: boolean; orderCount?: number; judgmentCount?: number;
  filingYear?: number; [k: string]: unknown;
}
export interface CaseSearchResponse {
  totalHits: number; page: number; pageSize: number; totalPages?: number;
  hasNextPage?: boolean;
  results: CaseSearchResult[];
  facets?: Record<string, { values: Record<string, number> }>;
}

/** Case search. `advocates` is the entry point for advocate discovery —
 * the API has no "list all advocates" endpoint, so an advocate directory is
 * built by searching and collecting the advocate names attached to cases. */
export function searchCases(opts: {
  query?: string; advocates?: string; courtCodes?: string[];
  filingDateFrom?: string; filingDateTo?: string; caseStatuses?: string[];
  page?: number; pageSize?: number;
}) {
  return ecourtsGet<CaseSearchResponse>('/api/partner/search', {
    query: opts.query,
    advocates: opts.advocates,
    courtCodes: opts.courtCodes,
    filingDateFrom: opts.filingDateFrom,
    filingDateTo: opts.filingDateTo,
    caseStatuses: opts.caseStatuses,
    page: opts.page,
    pageSize: opts.pageSize,
  });
}

export function getCase(cnr: string) {
  return ecourtsGet<Record<string, unknown>>(`/api/partner/case/${encodeURIComponent(cnr)}`);
}

/** Free per the docs — useful as a cheap connectivity probe. */
export function causelistAvailableDates(state: string) {
  return ecourtsGet<unknown>('/api/partner/causelist/available-dates', { state });
}
