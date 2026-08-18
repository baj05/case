/** Text utilities shared by ingestion, search and entity resolution. */

const HONORIFICS = new Set([
  'sh', 'shri', 'sri', 'smt', 'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'adv', 'advocate', 'hon', 'honble', 'justice', 'sardar', 'md',
]);

/** Fold to comparable plain ASCII lowercase. */
export function fold(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Elide apostrophes rather than splitting on them, so "HON'BLE" folds to
    // "honble" (a recognised honorific) instead of leaving a junk "ble" token,
    // and "O'Brien" folds to "obrien" instead of "o brien".
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise a person's name for deduplication.
 * Strips honorifics and collapses spacing, so "SH. O.P. FAIZI" and
 * "O P Faizi, Advocate" resolve to the same key.
 */
export function normaliseName(input: string): string {
  const tokens = fold(input).split(' ').filter(Boolean);
  const kept = tokens.filter((t) => !HONORIFICS.has(t.replace(/\./g, '')));
  return (kept.length > 0 ? kept : tokens).join(' ');
}

/** Title Case that respects initials: "SURYA PRAKASH KHATRI" -> "Surya Prakash Khatri". */
export function titleCaseName(input: string): string {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((word) => {
      // Keep initial clusters uppercase: "O.P." stays "O.P.", "K C" stays "K C".
      const bare = word.replace(/\./g, '');
      if (bare.length <= 2 && bare === bare.toUpperCase()) return word.toUpperCase();
      if (/^[A-Z]\.([A-Z]\.)+$/.test(word)) return word.toUpperCase();
      const lower = word.toLowerCase();
      // Preserve Mc/Mac and hyphenated names.
      return lower.replace(/(^|[-'])([a-z])/g, (_m, p, c: string) => p + c.toUpperCase());
    })
    .join(' ');
}

/** Trigram set, used for fuzzy name matching without a Postgres extension. */
export function trigrams(input: string): Set<string> {
  const padded = `  ${fold(input)} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

/** Jaccard similarity of trigram sets, 0..1. The pg_trgm stand-in. */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

/** Escape a user query for an FTS5 MATCH expression. */
export function toFtsQuery(raw: string): string {
  const tokens = fold(raw).split(' ').filter((t) => t.length > 1);
  if (tokens.length === 0) return '';
  // Quote every token (defuses FTS5 operators) and prefix-match the last one so
  // typing feels live.
  return tokens
    .map((t, i) => (i === tokens.length - 1 ? `"${t}"*` : `"${t}"`))
    .join(' OR ');
}

export function initials(name: string): string {
  const parts = normaliseName(name).split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '')[0] ?? ''}${(parts[parts.length - 1] ?? '')[0] ?? ''}`.toUpperCase();
}
