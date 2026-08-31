import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourcesBySlug, getFlags } from '@/lib/data';
import { Notice } from '@/components/States';
import { CORPORATE_SUITE_GROUPS } from '@lexhall/core';
import type { ResourceCard } from '@lexhall/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Corporate Suite — fill and download company legal documents',
  description:
    'Employment agreements, NDAs, founders’ agreements, board resolutions and workplace policy — answer a short '
    + 'set of questions and get a completed document, not just a blank template.',
  alternates: { canonical: '/corporate' },
};

export default function CorporateSuitePage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  if (!getFlags().FEATURE_CORPORATE) notFound();

  const allSlugs = CORPORATE_SUITE_GROUPS.flatMap((g) => g.slugs);
  const cards = getResourcesBySlug(allSlugs);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  return (
    <>
      <section className="hero textured">
        <div className="container stack gap-4">
          <div className="stack gap-3" style={{ maxWidth: '60ch' }}>
            <h1 className="t-headline-xl">Corporate Suite</h1>
            <p className="t-body-lg ink-variant">
              The company paperwork that comes up on a normal week — hiring, an NDA before a deal, a founders’
              agreement, a board resolution. Answer a short set of questions and download a completed document,
              not a template full of blanks.
            </p>
          </div>
        </div>
      </section>

      <div className="container section stack gap-7">
        {CORPORATE_SUITE_GROUPS.map((group) => {
          const groupCards = group.slugs.map((s) => bySlug.get(s)).filter((c): c is ResourceCard => Boolean(c));
          if (groupCards.length === 0) return null;
          return (
            <section key={group.id} className="stack gap-4">
              <h2 className="t-headline-md">{group.heading}</h2>
              <div className="grid-auto">
                {groupCards.map((card) => (
                  <article key={card.slug} className="result-card lift" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                    <div className="stack gap-2" style={{ minWidth: 0 }}>
                      <div className="row wrap gap-1">
                        <span className={`chip ${card.typeTone}`}>{card.typeLabel}</span>
                      </div>
                      <h3 className="t-title">
                        <Link href={`/corporate/${card.slug}`} style={{ textDecoration: 'none' }}>{card.title}</Link>
                      </h3>
                      <p className="t-body-sm ink-variant clamp-2">{card.description}</p>
                      <Link href={`/corporate/${card.slug}`} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                        Fill it in
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
