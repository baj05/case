import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourceCategories, runResourceSearch } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice, EmptyState } from '@/components/States';
import { ResourceCard } from '@/components/ResourceCard';
import { ResourceSearch } from '@/components/ResourceSearch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!databaseReady()) return { title: 'Resources' };
  const category = getResourceCategories().find((c) => c.slug === slug);
  if (!category) return { title: 'Category not found' };
  return {
    title: `${category.name} — legal forms, templates and official sources`,
    description: category.plainSummary,
    alternates: { canonical: `/resources/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const categories = getResourceCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const subcategory = typeof query.subcategory === 'string' ? query.subcategory : undefined;
  const state = typeof query.state === 'string' ? query.state : undefined;

  const outcome = runResourceSearch({
    category: slug, subcategory, state, perPage: 60, sort: 'relevance',
  });

  // Which subcategories actually hold something. Listing an empty one as a filter
  // is the small dishonesty that makes a library feel bigger than it is.
  const populated = new Map<string, number>();
  for (const card of runResourceSearch({ category: slug, perPage: 200 }).hits) {
    if (card.subcategory) populated.set(card.subcategory, (populated.get(card.subcategory) ?? 0) + 1);
  }

  const siblings = categories.filter((c) => c.slug !== slug && c.resourceCount > 0).slice(0, 10);

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / {category.name}
      </nav>

      <header className="stack gap-3">
        <h1 className="t-headline-lg">{category.name}</h1>
        <p className="t-body-lg ink-variant measure">{category.plainSummary}</p>
        <div className="row wrap gap-2">
          <span className="chip">{formatNumber(category.resourceCount)} resources</span>
          {category.officialCount > 0 && (
            <span className="chip chip-teal">{formatNumber(category.officialCount)} official</span>
          )}
        </div>
      </header>

      <ResourceSearch size="sm" />

      {category.subcategories.length > 0 && (
        <section className="stack gap-2">
          <p className="t-label-mono ink-variant">Narrow it down</p>
          <div className="row wrap gap-1">
            <Link
              href={`/resources/category/${slug}`}
              className="chip chip-button chip-outline"
              aria-current={!subcategory ? 'true' : undefined}
              style={!subcategory ? { background: 'var(--trust-navy)', color: 'var(--surface-lowest)', borderColor: 'transparent' } : undefined}
            >
              Everything
            </Link>
            {category.subcategories.map((sub) => {
              const count = populated.get(sub) ?? 0;
              if (count === 0) return null;
              return (
                <Link
                  key={sub}
                  href={`/resources/category/${slug}?subcategory=${encodeURIComponent(sub)}`}
                  className="chip chip-button chip-outline"
                  aria-current={subcategory === sub ? 'true' : undefined}
                  style={subcategory === sub ? { background: 'var(--trust-navy)', color: 'var(--surface-lowest)', borderColor: 'transparent' } : undefined}
                >
                  {sub} <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{count}</span>
                </Link>
              );
            })}
          </div>
          {category.subcategories.some((s) => (populated.get(s) ?? 0) === 0) && (
            <p className="t-caption">
              Subcategories with nothing in them are not shown. The taxonomy is larger than the holdings, and
              pretending otherwise would waste your time.
            </p>
          )}
        </section>
      )}

      {outcome.facets.states.length > 0 && (
        <section className="stack gap-2">
          <p className="t-label-mono ink-variant">By state</p>
          <div className="row wrap gap-1">
            {outcome.facets.states.slice(0, 18).map((s) => (
              <Link
                key={s.name}
                href={`/resources/category/${slug}?state=${encodeURIComponent(s.name)}${subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ''}`}
                className="chip chip-button chip-outline"
                aria-current={state === s.name ? 'true' : undefined}
                style={state === s.name ? { background: 'var(--trust-navy)', color: 'var(--surface-lowest)', borderColor: 'transparent' } : undefined}
              >
                {s.name} <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{s.count}</span>
              </Link>
            ))}
          </div>
          {state && (
            <p className="t-caption">
              Showing {state} resources and those that genuinely apply across India. Nothing from another
              state is substituted in.
            </p>
          )}
        </section>
      )}

      {outcome.total === 0 ? (
        <EmptyState
          title={`Nothing in ${category.name} matches that`}
          body="Either the filters are too narrow, or the library does not hold it yet."
          actions={[
            { label: `All of ${category.name}`, href: `/resources/category/${slug}` },
            { label: 'The whole library', href: '/resources' },
          ]}
        />
      ) : (
        <section className="stack gap-3">
          <p className="t-body-sm ink-variant">
            {formatNumber(outcome.total)} resource{outcome.total === 1 ? '' : 's'}
            {subcategory && <> in {subcategory}</>}
            {state && <> for {state}</>}
          </p>
          {outcome.hits.map((card) => <ResourceCard key={card.id} card={card} />)}
        </section>
      )}

      <section className="stack gap-2">
        <h2 className="t-title">Other categories</h2>
        <div className="row wrap gap-1">
          {siblings.map((c) => (
            <Link key={c.code} href={`/resources/category/${c.slug}`} className="chip chip-button chip-outline">
              {c.name} <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{c.resourceCount}</span>
            </Link>
          ))}
        </div>
      </section>

      <Notice tone="legal">
        Nothing in this category is legal advice. Where a resource is marked official it belongs to the
        authority named on it, and where it is marked as a Lexhall template it has been approved by nobody.
      </Notice>
    </div>
  );
}
