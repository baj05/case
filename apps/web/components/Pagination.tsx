import Link from 'next/link';

/**
 * Numbered pagination, shared by every route that paginates a list of
 * results. Before this, `/search`, `/case-records` and `/resources/search`
 * each hand-rolled their own Previous/Next-only pager — no page numbers, no
 * shared markup, one of them without even a "page X of Y" count.
 *
 * A plain server component (real `<Link>`s, no client JS) because every
 * caller already computes `page`/`totalPages` server-side and just needs a
 * URL builder — nothing here needs to run in the browser.
 */
export function Pagination({
  page, totalPages, pageHref,
}: {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Builds the href for a given page number, preserving whatever other
   * query params (search term, filters) the caller's own URL carries. */
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1
        ? <Link href={pageHref(page - 1)} className="page-link page-prev" rel="prev" aria-label="Previous page">‹ Previous</Link>
        : <span className="page-link page-prev" aria-disabled="true">‹ Previous</span>}

      <span className="row gap-1" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {pageWindow(page, totalPages).map((item, i) => (
          item === ELLIPSIS
            // Index is fine as a key here: this list is derived fresh from
            // (page, totalPages) every render, never reordered or edited.
            // eslint-disable-next-line react/no-array-index-key
            ? <span key={`ellipsis-${i}`} className="page-ellipsis" aria-hidden="true">…</span>
            : item === page
              ? <span key={item} className="page-link page-current" aria-current="page">{item}</span>
              : <Link key={item} href={pageHref(item)} className="page-link">{item}</Link>
        ))}
      </span>

      {page < totalPages
        ? <Link href={pageHref(page + 1)} className="page-link page-next" rel="next" aria-label="Next page">Next ›</Link>
        : <span className="page-link page-next" aria-disabled="true">Next ›</span>}
    </nav>
  );
}

const ELLIPSIS = Symbol('ellipsis');

/**
 * The standard truncated-window pagination list: always show the first and
 * last page, a window around the current page, and an ellipsis for any gap
 * — e.g. for page 6 of 42: `1 … 4 5 [6] 7 8 … 42`. `delta` is how many
 * pages show on each side of the current one.
 */
function pageWindow(current: number, total: number, delta = 2): Array<number | typeof ELLIPSIS> {
  const out: Array<number | typeof ELLIPSIS> = [1];
  const from = Math.max(2, current - delta);
  const to = Math.min(total - 1, current + delta);

  if (from > 2) out.push(ELLIPSIS);
  for (let p = from; p <= to; p += 1) out.push(p);
  if (to < total - 1) out.push(ELLIPSIS);

  if (total > 1) out.push(total);
  return out;
}
