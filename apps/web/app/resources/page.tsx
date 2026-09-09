import Link from 'next/link';
import type { Metadata } from 'next';
import {
  databaseReady, getResourceCategories, getResourceStats, getFeaturedResources,
  getResourceKits, getResourceCentres,
} from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice } from '@/components/States';
import { ResourceSearch } from '@/components/ResourceSearch';
import { ResourceCard } from '@/components/ResourceCard';
import { StateEmblemTicker } from '@/components/StateEmblemTicker';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Legal resource library — forms, agreements, applications and official portals',
  description:
    'Find the legal document, form or guide you need: rent agreements with the state rule that governs them, '
    + 'legal notices, affidavits, court documents, legal aid applications, PF and ESI forms, consumer complaints, '
    + 'electricity billing disputes and the official government portals for each — all free, and each one labelled '
    + 'with who published it.',
  alternates: { canonical: '/resources' },
};

const EXAMPLES = [
  'rent agreement for Maharashtra',
  'PF not deposited',
  'legal aid application',
  'consumer complaint form',
  'POSH policy',
  'electricity bill too high',
];

export default function ResourcesPage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn">
          The database has not been built yet. Run <code className="mono">npm run ingest</code>, then{' '}
          <code className="mono">node packages/ingestion/cli.ts --resources</code>.
        </Notice>
      </div>
    );
  }

  const stats = getResourceStats();
  const categories = getResourceCategories();
  const featured = getFeaturedResources();
  const kits = getResourceKits();
  const centres = getResourceCentres();

  const withContent = categories.filter((c) => c.resourceCount > 0);
  const empty = categories.filter((c) => c.resourceCount === 0);

  return (
    <>
      {/* ---- hero ------------------------------------------------------- */}
      <section className="hero textured">
        <div className="container hero-split">
          <div className="stack gap-6">
            <div className="stack gap-3" style={{ maxWidth: '54ch' }}>
              <p className="t-label-mono ink-variant">Resource library</p>
              <h1 className="t-display-lg">
                Find the legal document,<br />
                <span className="serif-em">form or guide</span> you need.
              </h1>
              <p className="t-body-lg ink-variant">
                {formatNumber(stats.published)} resources. {formatNumber(stats.official)} are published by the
                authority itself and open at their own site; {formatNumber(stats.templates)} are CaseADVO
                templates you can read here before downloading. Every one of them is free, and every one says
                plainly which of the two it is.
              </p>
            </div>

            <ResourceSearch examples={EXAMPLES} autoFocus />

            <div className="stat-strip">
              <span className="stat"><span className="stat-num">{formatNumber(stats.published)}</span><span className="stat-label">Resources</span></span>
              <span className="stat"><span className="stat-num">{formatNumber(stats.official)}</span><span className="stat-label">Official sources</span></span>
              <span className="stat"><span className="stat-num">{formatNumber(stats.previewable)}</span><span className="stat-label">Readable in the browser</span></span>
              <span className="stat"><span className="stat-num">{formatNumber(stats.states)}</span><span className="stat-label">States covered</span></span>
              <span className="stat"><span className="stat-num">{formatNumber(stats.authorities)}</span><span className="stat-label">Authorities</span></span>
            </div>
          </div>

          <div className="media-card-ghost">
            <video src="/media/resources-library-demo.webm" autoPlay loop muted playsInline />
          </div>
        </div>
      </section>

      {/* ---- state coverage, full width and dominant ------------------- */}
      <section className="section-tight" style={{ background: 'var(--surface-low)' }}>
        <div className="container stack gap-4">
          <div className="stack gap-1" style={{ textAlign: 'center' }}>
            <h2 className="t-headline-md">Every state and union territory</h2>
            <p className="t-body ink-variant" style={{ maxWidth: '56ch', marginInline: 'auto' }}>
              Documents on this page come from these governments' own portals — we link to their copy rather
              than hosting one, so you always reach the current version.
            </p>
          </div>
        </div>
        <StateEmblemTicker />
      </section>

      <div className="container stack gap-8" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)', paddingTop: 'clamp(32px, 5vw, 56px)' }}>
        {/* ---- what this is, said once and plainly ---------------------- */}
        <Notice tone="legal">
          <span>
            <strong>Two kinds of thing live here, and they are not the same.</strong>{' '}
            An <em>official</em> resource was published by the government body named on it — we link to their
            copy rather than hosting one, so you always reach the current version. A <em>CaseADVO template</em>{' '}
            is a document we wrote: a starting point for drafting, approved by nobody. Neither is legal advice,
            and requirements differ by state.{' '}
            <Link href="/resources/about" style={{ textDecoration: 'underline' }}>How this library works</Link>.
          </span>
        </Notice>

        {/* ---- kits: intent-led entry points --------------------------- */}
        <section className="stack gap-4">
          <div className="stack gap-1">
            <h2 className="t-headline-md">Start from what happened</h2>
            <p className="t-body ink-variant measure">
              Most people do not arrive knowing the name of the document they need. These are situations, and
              each one gathers the documents that situation actually requires — in the order they matter.
            </p>
          </div>
          <div className="grid-auto-lg">
            {kits.map((kit) => (
              <Link key={kit.slug} href={`/resources/kits/${kit.slug}`} className="card lift stack gap-2" style={{ padding: 20, textDecoration: 'none' }}>
                <span className="t-label-mono ink-variant">{kit.itemCount} documents</span>
                <span className="t-title">{kit.title}</span>
                <span className="t-body-sm ink-variant clamp-3">{kit.description}</span>
                {kit.stateAware && <span className="chip chip-lime" style={{ alignSelf: 'flex-start' }}>State-specific</span>}
              </Link>
            ))}
          </div>
        </section>

        {/* ---- categories ---------------------------------------------- */}
        <section className="stack gap-4">
          <div className="stack gap-1">
            <h2 className="t-headline-md">Browse by category</h2>
            <p className="t-body ink-variant measure">
              {withContent.length} categories hold documents today. The counts are live — nothing is listed
              here that is not actually in the library.
            </p>
          </div>
          <div className="grid-auto">
            {withContent.map((category) => (
              <Link
                key={category.code}
                href={`/resources/category/${category.slug}`}
                className="card lift stack gap-2"
                style={{ padding: 18, textDecoration: 'none' }}
              >
                <span className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="t-title-sm" style={{ fontWeight: 700 }}>{category.name}</span>
                  <span className="mono t-caption">{category.resourceCount}</span>
                </span>
                <span className="t-body-sm ink-variant clamp-3">{category.plainSummary}</span>
                {category.officialCount > 0 && (
                  <span className="t-caption">{category.officialCount} official</span>
                )}
              </Link>
            ))}
          </div>
          {empty.length > 0 && (
            <details className="acc">
              <summary>
                <span>{empty.length} categories are planned but hold nothing yet</span>
              </summary>
              <div className="acc-body stack gap-2">
                <p>
                  Listing an empty category as though it were full is the commonest way a resource library
                  misleads. These exist in the taxonomy and will be filled as sources are verified:
                </p>
                <div className="row wrap gap-1">
                  {empty.map((c) => <span key={c.code} className="chip chip-outline">{c.name}</span>)}
                </div>
              </div>
            </details>
          )}
        </section>

        {/* ---- featured ------------------------------------------------ */}
        <section className="stack gap-4">
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-headline-md">Official forms and portals</h2>
            <Link href="/resources/search?official=OFFICIAL" className="btn btn-secondary btn-sm">
              See all {formatNumber(stats.official)}
            </Link>
          </div>
          <div className="stack gap-3">
            {featured.official.map((card) => <ResourceCard key={card.id} card={card} />)}
          </div>
        </section>

        <section className="stack gap-4">
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-headline-md">Templates you can read here</h2>
            <Link href="/resources/search?official=PLATFORM_TEMPLATE" className="btn btn-secondary btn-sm">
              See all {formatNumber(stats.templates)}
            </Link>
          </div>
          <div className="stack gap-3">
            {featured.templates.map((card) => <ResourceCard key={card.id} card={card} />)}
          </div>
        </section>

        {/* ---- centres ------------------------------------------------- */}
        <section className="stack gap-4">
          <div className="stack gap-1">
            <h2 className="t-headline-md">Resource centres</h2>
            <p className="t-body ink-variant measure">
              Some people arrive with a situation rather than a document, and with entitlements they do not
              know they have. These pages start from who you are.
            </p>
          </div>
          <div className="grid-auto">
            {centres.map((centre) => (
              <Link
                key={centre.slug}
                href={`/resources/centres/${centre.slug}`}
                className="card lift stack gap-2"
                style={{ padding: 18, textDecoration: 'none' }}
              >
                <span className="t-title-sm" style={{ fontWeight: 700 }}>{centre.name}</span>
                <span className="t-body-sm ink-variant clamp-2">{centre.headline}</span>
                {centre.helplines.length > 0 && (
                  <span className="row wrap gap-1">
                    {centre.helplines.slice(0, 2).map((h) => (
                      <span key={h.value} className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>
                        {h.label} {h.value}
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* ---- recently checked ---------------------------------------- */}
        <section className="stack gap-4">
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="stack gap-1">
              <h2 className="t-headline-md">Recently verified</h2>
              <p className="t-body-sm ink-variant">
                Not "recently added" — recently <em>checked</em>. Every source is re-fetched on a schedule and
                the date shown is the last time it actually answered.
              </p>
            </div>
            <Link href="/resources/search?sort=recent" className="btn btn-secondary btn-sm">See more</Link>
          </div>
          <div className="stack gap-3">
            {featured.recent.slice(0, 4).map((card) => <ResourceCard key={card.id} card={card} />)}
          </div>
        </section>

        <section className="card stack gap-3" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 className="t-title-lg">Need this reviewed by someone?</h2>
          <p className="t-body ink-variant measure">
            A template is a starting point, and there are situations where signing one unreviewed is a bad
            idea — a property transaction, a termination, anything where the other side has a lawyer and you
            do not. You can search advocates by the exact matter this document belongs to.
          </p>
          <div className="row wrap gap-2">
            <Link href="/search" className="btn btn-primary">Find an advocate</Link>
            <Link href="/resources/kits/i-need-a-free-lawyer" className="btn btn-secondary">Cannot afford one?</Link>
            <Link href="/matters" className="btn btn-ghost">Browse legal matters</Link>
          </div>
          <p className="t-caption">
            CaseADVO does not take a share of any fee, and ranking in search cannot be bought — the weights are
            published. Nothing on this page is a recommendation of a particular advocate.
          </p>
        </section>
      </div>
    </>
  );
}
