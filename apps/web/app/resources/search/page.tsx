import Link from 'next/link';
import type { Metadata } from 'next';
import { databaseReady, runResourceSearch, getResourceCategories } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice, EmptyState } from '@/components/States';
import { ResourceSearch } from '@/components/ResourceSearch';
import { ResourceCard } from '@/components/ResourceCard';
import { ResourceFilters } from '@/components/ResourceFilters';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  return {
    title: q ? `${q} — resource search` : 'Search the legal resource library',
    description: q
      ? `Legal documents, forms, applications and official portals matching “${q}”.`
      : 'Search legal forms, agreements, notices, applications, affidavits, checklists and official government portals.',
    // A search result page is not the canonical home of any document.
    robots: { index: false, follow: true },
  };
}

const SORTS: Array<{ value: string; label: string }> = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'recent', label: 'Recently verified' },
  { value: 'popular', label: 'Most downloaded' },
  { value: 'quality', label: 'Best provenance' },
  { value: 'title', label: 'A to Z' },
];

export default async function ResourceSearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined);
  const page = Math.max(1, Number(one('page') ?? 1) || 1);

  const outcome = runResourceSearch({
    q: one('q'),
    category: one('category'),
    subcategory: one('subcategory'),
    type: one('type'),
    officialStatus: one('official'),
    state: one('state'),
    matter: one('matter'),
    domain: one('domain'),
    language: one('language'),
    format: one('format'),
    sort: one('sort'),
    previewOnly: one('preview') === '1',
    page,
    perPage: 20,
  });

  const categories = getResourceCategories();
  const q = one('q') ?? '';
  const lastPage = Math.max(1, Math.ceil(outcome.total / outcome.perPage));

  const groups = [
    {
      key: 'category', label: 'Category', openByDefault: true,
      options: outcome.facets.categories.map((c) => ({ label: c.name, value: c.slug, count: c.count })),
    },
    {
      key: 'official', label: 'Who published it', openByDefault: true,
      options: outcome.facets.officialStatus.map((s) => ({ label: s.label, value: s.code, count: s.count })),
    },
    {
      key: 'type', label: 'Document type',
      options: outcome.facets.types.map((t) => ({ label: t.label, value: t.code, count: t.count })),
    },
    {
      key: 'state', label: 'State or union territory',
      options: outcome.facets.states.map((s) => ({ label: s.name, value: s.name, count: s.count })),
    },
    {
      key: 'language', label: 'Language',
      options: outcome.facets.languages.map((l) => ({
        label: l.code === 'en' ? 'English' : l.code === 'hi' ? 'Hindi' : l.code.toUpperCase(),
        value: l.code, count: l.count,
      })),
    },
  ];

  function withParam(key: string, value: string): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && k !== key && k !== 'page') next.set(k, v);
    }
    next.set(key, value);
    return `/resources/search?${next.toString()}`;
  }

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && k !== 'page') next.set(k, v);
    if (target > 1) next.set('page', String(target));
    return next.toString() ? `/resources/search?${next.toString()}` : '/resources/search';
  }

  return (
    <div className="container section-tight stack gap-4">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / Search
      </nav>

      <ResourceSearch initial={q} size="sm" />

      {/* What we understood. The routing is never a black box. */}
      {outcome.intent && outcome.intent.signals.length > 0 && (
        <div className="card stack gap-2" style={{ padding: 14 }}>
          <p className="t-label-mono ink-variant">What we understood from that</p>
          <div className="row wrap gap-1">
            {outcome.intent.signals.map((signal, i) => (
              <span key={`${signal.kind}-${i}`} className="chip chip-outline" title={`from “${signal.from}”`}>
                {signal.kind}: <strong style={{ marginLeft: 4 }}>{signal.value}</strong>
              </span>
            ))}
          </div>
          {outcome.resolvedState && (
            <p className="t-caption">
              {outcome.resolvedState} resources are ranked first
              {outcome.intent.cityHint && !outcome.intent.stateHint
                ? ` — ${outcome.intent.cityHint} is in ${outcome.resolvedState}, and tenancy, stamp duty and the forum that hears a dispute are decided at state level`
                : ''}
              . Documents that genuinely apply across India are still shown, below them — a national template
              is often the right answer, and hiding it because you named a place would not help.
            </p>
          )}
        </div>
      )}

      {outcome.kits.length > 0 && (
        <div className="stack gap-2">
          <p className="t-label-mono ink-variant">This looks like a situation we have a kit for</p>
          <div className="row wrap gap-2">
            {outcome.kits.map((kit) => (
              <Link key={kit.slug} href={`/resources/kits/${kit.slug}`} className="chip chip-primary chip-button">
                {kit.title} →
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="search-layout">
        <ResourceFilters groups={groups} total={outcome.total} />

        <div className="stack gap-4" style={{ minWidth: 0 }}>
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="t-body-sm ink-variant">
              {outcome.total === 0
                ? 'No resources match'
                : `${formatNumber(outcome.total)} resource${outcome.total === 1 ? '' : 's'}`}
              {q && <> for <strong>{q}</strong></>}
              <span className="mono t-caption" style={{ marginLeft: 8 }}>{outcome.tookMs} ms</span>
            </p>
            <div className="row wrap gap-1">
              {SORTS.map((sort) => (
                <Link
                  key={sort.value}
                  href={withParam('sort', sort.value)}
                  className="chip chip-button chip-outline"
                  aria-current={(one('sort') ?? 'relevance') === sort.value ? 'true' : undefined}
                  style={(one('sort') ?? 'relevance') === sort.value
                    ? { background: 'var(--trust-navy)', color: 'var(--surface-lowest)', borderColor: 'transparent' }
                    : undefined}
                >
                  {sort.label}
                </Link>
              ))}
            </div>
          </div>

          {outcome.total === 0 ? (
            <EmptyState
              title="Nothing in the library matches that"
              body={
                'That is a fact about what we hold, not about what exists. The library covers what has been '
                + 'verified so far, and it says so rather than showing you an approximate answer.'
              }
              actions={[
                { label: 'Browse every category', href: '/resources', detail: 'See what is actually here' },
                { label: 'Search for an advocate instead', href: `/search${q ? `?q=${encodeURIComponent(q)}` : ''}`, detail: 'The same words, against the professional register' },
                { label: 'Ask Advo AI', href: '/advo-ai', detail: 'Describe the problem in your own words' },
              ]}
            />
          ) : (
            <>
              <div className="stack gap-3">
                {outcome.hits.map((card) => <ResourceCard key={card.id} card={card} />)}
              </div>

              <Pagination page={page} totalPages={lastPage} pageHref={pageHref} />
            </>
          )}

          <Notice tone="info">
            Every result says who published it. Nothing in this library is legal advice, and requirements
            differ between states — check the state note on any document before you rely on it.
          </Notice>
        </div>
      </div>

      <section className="stack gap-2">
        <h2 className="t-title">Or browse a category</h2>
        <div className="row wrap gap-1">
          {categories.filter((c) => c.resourceCount > 0).map((c) => (
            <Link key={c.code} href={`/resources/category/${c.slug}`} className="chip chip-button chip-outline">
              {c.name} <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{c.resourceCount}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
