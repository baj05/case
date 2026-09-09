/** Formatting helpers. Locale-aware, no hardcoded symbols (spec §107). */

export function formatDate(iso: string | null | undefined, locale = 'en-IN'): string {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not recorded';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 'never';
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function formatNumber(n: number, locale = 'en-IN'): string {
  return n.toLocaleString(locale);
}

/** A client-safe duplicate of @lexhall/db's formatMinor — that package
 * pulls in node:sqlite transitively, which Turbopack cannot put in a
 * client bundle, so anything imported into a 'use client' component must
 * come from here instead, never from @lexhall/db directly. */
export function formatMinor(minor: number | null | undefined, currency = 'INR', locale = 'en-IN'): string {
  if (minor === null || minor === undefined) return 'On request';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(0)}`;
  }
}

/** Build a canonical search URL so filters are shareable and bookmarkable. */
export function searchHref(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `/search?${qs}` : '/search';
}

export const COURT_TIER_LABEL: Record<number, string> = {
  1: 'Supreme Court', 2: 'High Court', 3: 'District Court',
  4: 'Tribunal', 5: 'Consumer Commission', 6: 'Special Court', 7: 'Arbitral Institution',
};

/**
 * Indian short-scale magnitude — 51070663 → "5.11 Cr", 6478459 → "64.78 Lakh".
 *
 * At judicial-pendency magnitudes a fully grouped number ("5,10,70,663") is
 * accurate but unreadable at a glance, and the Western "51M" form is not how
 * an Indian legal reader scales quantity. Pair this with formatNumber() when
 * the exact figure also matters.
 */
export function compactIndian(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)} Lakh`;
  return formatNumber(n);
}
