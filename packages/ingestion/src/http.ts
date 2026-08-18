/**
 * Polite HTTP client for ingestion.
 *
 * Non-negotiables enforced here rather than left to each adapter:
 *   * robots.txt is fetched, parsed and obeyed before any path is requested
 *   * a minimum delay between requests to the same host
 *   * an identifying User-Agent with a contact route
 *   * bounded retries with backoff, and no retry on 4xx
 *
 * A 403 or a robots disallow is a stop signal, never something to work around.
 */

export interface FetchPolicy {
  userAgent: string;
  minDelayMs: number;
  maxRetries: number;
  timeoutMs: number;
}

export const DEFAULT_POLICY: FetchPolicy = {
  userAgent: process.env.INGEST_USER_AGENT
    ?? 'LexhallBot/0.1 (+http://localhost:3000/bot; data-correction@lexhall.example)',
  minDelayMs: Number(process.env.INGEST_RATE_LIMIT_MS ?? 2000),
  maxRetries: 3,
  timeoutMs: 45_000,
};

interface RobotsRules { disallow: string[]; allow: string[]; crawlDelayMs: number | null }

const robotsCache = new Map<string, RobotsRules | 'unavailable'>();
const lastRequestAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimal robots.txt parser: the directives that actually bind a crawler. */
function parseRobots(text: string, userAgent: string): RobotsRules {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    const key = (rawKey ?? '').toLowerCase().trim();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { disallow: [], allow: [], crawlDelayMs: null } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'disallow' && value) current.rules.disallow.push(value);
    else if (key === 'allow' && value) current.rules.allow.push(value);
    else if (key === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) current.rules.crawlDelayMs = seconds * 1000;
    }
  }

  const ua = userAgent.toLowerCase();
  // Prefer a group naming our agent; fall back to the wildcard group.
  const specific = groups.find((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  return specific?.rules ?? wildcard?.rules ?? { disallow: [], allow: [], crawlDelayMs: null };
}

/** Longest-match wins, Allow beats Disallow at equal length (the RFC rule). */
function isAllowed(rules: RobotsRules, path: string): boolean {
  const match = (patterns: string[]): number => {
    let best = -1;
    for (const p of patterns) {
      const literal = p.replace(/\*$/, '');
      if (path.startsWith(literal) && literal.length > best) best = literal.length;
    }
    return best;
  };
  const disallowed = match(rules.disallow);
  const allowed = match(rules.allow);
  if (disallowed < 0) return true;
  return allowed >= disallowed;
}

export async function checkRobots(baseUrl: string, policy: FetchPolicy = DEFAULT_POLICY): Promise<RobotsRules | 'unavailable'> {
  const origin = new URL(baseUrl).origin;
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': policy.userAgent },
      signal: AbortSignal.timeout(policy.timeoutMs),
    });
    if (!res.ok) { robotsCache.set(origin, 'unavailable'); return 'unavailable'; }
    const rules = parseRobots(await res.text(), policy.userAgent);
    robotsCache.set(origin, rules);
    return rules;
  } catch {
    robotsCache.set(origin, 'unavailable');
    return 'unavailable';
  }
}

export class RobotsDisallowed extends Error {
  constructor(url: string) { super(`robots.txt disallows ${url}`); this.name = 'RobotsDisallowed'; }
}

/** Rate-limited, robots-respecting GET. Returns response text. */
export async function politeGet(url: string, policy: FetchPolicy = DEFAULT_POLICY): Promise<{ text: string; status: number }> {
  const parsed = new URL(url);
  const rules = await checkRobots(url, policy);
  if (rules !== 'unavailable' && !isAllowed(rules, parsed.pathname)) throw new RobotsDisallowed(url);

  const delay = Math.max(policy.minDelayMs, rules !== 'unavailable' ? rules.crawlDelayMs ?? 0 : 0);
  const since = Date.now() - (lastRequestAt.get(parsed.host) ?? 0);
  if (since < delay) await sleep(delay - since);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt += 1) {
    lastRequestAt.set(parsed.host, Date.now());
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': policy.userAgent, accept: 'text/plain, text/html;q=0.9, */*;q=0.5' },
        signal: AbortSignal.timeout(policy.timeoutMs),
      });
      // 4xx is a decision by the server. Respect it; do not retry or evade.
      if (res.status >= 400 && res.status < 500) {
        return { text: '', status: res.status };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { text: await res.text(), status: res.status };
    } catch (error) {
      lastError = error as Error;
      if (attempt < policy.maxRetries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError ?? new Error(`failed to fetch ${url}`);
}

/**
 * Render a JavaScript-dependent page to text.
 *
 * The Bar Council site is a client-rendered UmiJS application, so its public
 * pages return an empty shell to a plain GET. Rather than reverse-engineering
 * and hitting internal API routes (several of which robots.txt disallows), we
 * render the permitted public page and parse the result — the same content a
 * human visitor sees at the same URL.
 *
 * Strategy is pluggable so production can point at a self-hosted Playwright
 * worker instead of a third-party reader. ADR-005.
 */
export type RenderStrategy = 'http' | 'reader';

export async function renderPage(url: string, strategy: RenderStrategy, policy: FetchPolicy = DEFAULT_POLICY): Promise<{ text: string; status: number; via: string }> {
  // robots is always evaluated against the ORIGIN url, never the reader's.
  const parsed = new URL(url);
  const rules = await checkRobots(url, policy);
  if (rules !== 'unavailable' && !isAllowed(rules, parsed.pathname)) throw new RobotsDisallowed(url);

  if (strategy === 'http') {
    const r = await politeGet(url, policy);
    return { ...r, via: 'http' };
  }

  const readerUrl = `https://r.jina.ai/${url}`;
  const since = Date.now() - (lastRequestAt.get(parsed.host) ?? 0);
  if (since < policy.minDelayMs) await sleep(policy.minDelayMs - since);
  lastRequestAt.set(parsed.host, Date.now());

  const res = await fetch(readerUrl, {
    headers: { 'user-agent': policy.userAgent, accept: 'text/plain' },
    signal: AbortSignal.timeout(policy.timeoutMs),
  });
  if (!res.ok) throw new Error(`render failed: HTTP ${res.status}`);
  return { text: await res.text(), status: res.status, via: 'reader:r.jina.ai' };
}
