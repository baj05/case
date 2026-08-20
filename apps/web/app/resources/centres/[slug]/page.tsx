import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourceCentre, getResourceCentres } from '@/lib/data';
import { Notice } from '@/components/States';
import { ResourceCard } from '@/components/ResourceCard';
import { ResourceSearch } from '@/components/ResourceSearch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const centre = databaseReady() ? getResourceCentre(slug) : null;
  if (!centre) return { title: 'Resource centre' };
  return {
    title: `${centre.name} — ${centre.headline}`,
    description: centre.plainSummary,
    alternates: { canonical: `/resources/centres/${centre.slug}` },
  };
}

export default async function CentrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const centre = getResourceCentre(slug);
  if (!centre) notFound();
  const others = getResourceCentres().filter((c) => c.slug !== slug);

  const official = centre.resources.filter((r) => r.officialStatus === 'OFFICIAL');
  const templates = centre.resources.filter((r) => r.officialStatus !== 'OFFICIAL');

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / Centres / {centre.name}
      </nav>

      <header className="stack gap-3">
        <h1 className="t-headline-lg">{centre.name}</h1>
        <p className="t-body-lg ink-variant measure">{centre.headline}</p>
        <p className="t-body ink-variant measure">{centre.plainSummary}</p>
      </header>

      {/* Helplines first. Someone arriving here in an emergency should not have
          to read a taxonomy to find a phone number. */}
      {centre.helplines.length > 0 && (
        <section className="card stack gap-3" style={{ padding: 20, borderLeft: '4px solid var(--action-orange)' }}>
          <h2 className="t-title">If you need help now</h2>
          <div className="grid-auto">
            {centre.helplines.map((line) => (
              <div key={line.value} className="stack gap-1">
                <span className="t-label-mono ink-variant">{line.label}</span>
                <a href={`tel:${line.value}`} className="t-headline-md" style={{ textDecoration: 'none' }}>{line.value}</a>
                {line.note && <span className="t-caption">{line.note}</span>}
              </div>
            ))}
          </div>
          <p className="t-caption">
            These are public helplines operated by government bodies, not by Lexhall. We do not intermediate the
            call and we do not see it.
          </p>
        </section>
      )}

      <ResourceSearch size="sm" />

      {official.length > 0 && (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">Official routes and forms</h2>
            <p className="t-body-sm ink-variant measure">
              Published by the authority named on each one. Several of these are things you can do without a
              lawyer, and at no cost.
            </p>
          </div>
          {official.map((card) => <ResourceCard key={card.id} card={card} />)}
        </section>
      )}

      {templates.length > 0 && (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">Documents you can read and adapt</h2>
            <p className="t-body-sm ink-variant measure">
              Lexhall templates and checklists. Not official forms, and approved by nobody.
            </p>
          </div>
          {templates.map((card) => <ResourceCard key={card.id} card={card} />)}
        </section>
      )}

      {centre.resources.length === 0 && (
        <Notice tone="warn">
          This centre is defined in the taxonomy but does not yet gather any verified resources. It is listed
          so that the gap is visible rather than hidden.
        </Notice>
      )}

      <section className="stack gap-2">
        <h2 className="t-title">Other centres</h2>
        <div className="row wrap gap-1">
          {others.map((c) => (
            <Link key={c.slug} href={`/resources/centres/${c.slug}`} className="chip chip-button chip-outline">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <Notice tone="legal">
        This page gathers information and official routes. It is not legal advice, it does not assess your
        entitlement to anything, and the position differs between states.
      </Notice>
    </div>
  );
}
