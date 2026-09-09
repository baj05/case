import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourcesBySlug, getFlags, getCorpus } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice } from '@/components/States';
import { CORPORATE_SUITE_GROUPS } from '@lexhall/core';
import type { ResourceCard } from '@lexhall/db';
import { BriefcaseIcon, UsersIcon, GavelIcon, DocumentIcon, CheckCircleIcon } from '@/components/Icons';
import { COVER_TIERS } from './cover-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Corporate Suite — a subscription legal team for your company',
  description:
    'CaseADVO Cover: a monthly or yearly plan that covers your company’s recurring legal work — agreements, '
    + 'notarisation, stamp papers, compliance and advice — without hiring in-house or calling a lawyer from scratch '
    + 'every time.',
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
  const corpus = getCorpus();

  return (
    <>
      {/* ================================================ HERO — the pitch */}
      <section className="hero textured">
        <div className="container hero-split">
          <div className="stack gap-4">
            <p className="t-label-mono ink-variant">Corporate Suite · CaseADVO Cover</p>
            <h1 className="t-headline-xl">We’ve got your company’s legal work covered.</h1>
            <p className="t-body-lg ink-variant">
              A monthly or yearly plan that acts like a legal team on retainer — agreements drafted, documents
              notarised and stamped, compliance tracked, questions answered — so you stop hiring a lawyer from
              scratch every time something comes up.
            </p>
            <div className="row wrap gap-2">
              <Link href="#cover-plans" className="btn btn-primary">See the plans</Link>
              <Link href="#how-it-works" className="btn btn-secondary">How it works</Link>
            </div>
          </div>
          <div className="media-card-ghost">
            <video src="/media/corporate-cover-hero.webm" autoPlay loop muted playsInline />
          </div>
        </div>
      </section>

      {/* ============================================ COVERAGE — no directory */}
      <section className="section-tight" style={{ background: 'var(--surface-low)' }}>
        <div className="container stack gap-4">
          <div className="stack gap-2" style={{ textAlign: 'center', marginInline: 'auto', maxWidth: '64ch' }}>
            <h2 className="t-headline-md">Need a lawyer in Mumbai? Covered. In Ladakh? Also covered.</h2>
            <p className="t-body ink-variant">
              No browsing a directory, no cold-calling firms, no explaining your business from zero each time.
              Tell us once, and we bring the advocate to the matter — anywhere you’re registered or operating.
            </p>
          </div>
          <div className="stat-strip" style={{ justifyContent: 'center' }}>
            <span className="stat"><span className="stat-num">{formatNumber(corpus.states)}</span><span className="stat-label">States &amp; UTs reachable</span></span>
            <span className="stat"><span className="stat-num">{formatNumber(corpus.bodies)}</span><span className="stat-label">State Bar Councils covered</span></span>
            <span className="stat"><span className="stat-num">{formatNumber(corpus.professionals)}</span><span className="stat-label">Verified advocates to draw from</span></span>
          </div>
        </div>
      </section>

      {/* =============================================== PLANS — the tiers */}
      <section id="cover-plans" className="container section stack gap-6">
        <div className="stack gap-2" style={{ maxWidth: '60ch' }}>
          <p className="t-label-mono ink-variant">Plans</p>
          <h2 className="t-headline-lg">Pick a cover. Cancel or change it whenever your workload does.</h2>
          <p className="t-body ink-variant">
            Every plan bundles the paperwork a company actually deals with — drafting, notarisation, stamp
            papers, legal advice — instead of billing each one separately. Bigger, one-off matters — a
            fund-raise, litigation, an acquisition — are always scoped and quoted on top, never buried in the
            small print.
          </p>
        </div>

        <div className="cover-tier-grid">
          {COVER_TIERS.map((tier) => (
            <div key={tier.slug} className={`card cover-tier stack gap-4 ${tier.featured ? 'cover-tier-featured' : ''}`} style={{ padding: 'clamp(18px, 3vw, 24px)' }}>
              {tier.featured && <span className="chip chip-teal" style={{ alignSelf: 'flex-start' }}>Most chosen</span>}
              <div className="stack gap-1">
                <span className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="section-icon" aria-hidden="true">{tier.icon}</span>
                  <strong className="t-title">{tier.name}</strong>
                </span>
                <p className="t-caption ink-variant">{tier.tagline}</p>
              </div>

              <div className="stack gap-0">
                {tier.priceMonthly ? (
                  <>
                    <span className="t-headline-md">₹{formatNumber(tier.priceMonthly)}<span className="t-body-sm ink-variant">/month</span></span>
                    <span className="t-caption ink-variant">or ₹{formatNumber(tier.priceYearly!)}/year — 2 months free</span>
                  </>
                ) : (
                  <span className="t-headline-md">Custom pricing</span>
                )}
              </div>

              <ul className="stack gap-2 list-plain">
                {tier.includes.map((line) => (
                  <li key={line} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                    <span aria-hidden="true" className="ink-accent"><CheckCircleIcon size={14} /></span>
                    <span className="t-body-sm">{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/corporate/start?plan=${tier.slug}`}
                className={`btn ${tier.featured ? 'btn-primary' : 'btn-secondary'}`}
                style={{ marginTop: 'auto' }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="t-caption ink-variant">
          Plans are a service commitment, not an automatic card charge — tell us which cover you want when you
          set up your company account, and we confirm scope and billing with you directly before anything starts.
          No fee reaches CaseADVO from the legal work itself, the same as everywhere else on this site.
        </p>
      </section>

      {/* ======================================================= HOW IT WORKS */}
      <section id="how-it-works" className="section-tight" style={{ background: 'var(--surface-low)' }}>
        <div className="container hero-split">
          <div className="stack gap-4">
            <p className="t-label-mono ink-variant">How it works</p>
            <h2 className="t-headline-lg">You do the talking. We do the paperwork.</h2>
            <ol className="stack gap-3">
              {[
                {
                  icon: <BriefcaseIcon size={16} />, title: 'Tell us about your company',
                  body: 'A two-minute profile — who you are, what you do, your industry — so whoever picks up your matter isn’t starting from zero.',
                },
                {
                  icon: <UsersIcon size={16} />, title: 'We assign your advocate',
                  body: 'Matched to your industry and the matter at hand, ready before the first call. On Diamond Cover, you browse the full directory and choose one yourself instead.',
                },
                {
                  icon: <GavelIcon size={16} />, title: 'You talk, they listen',
                  body: 'A real conversation about the actual problem — not a support ticket, not a form.',
                },
                {
                  icon: <DocumentIcon size={16} />, title: 'We execute',
                  body: 'Drafting, notarising, filing, advising — whatever the matter needs, covered by your plan.',
                },
              ].map((step, i) => (
                <li key={step.title} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span
                    className="mono" aria-hidden="true"
                    style={{
                      flex: 'none', width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--trust-navy)', color: 'var(--surface-lowest)',
                      display: 'grid', placeItems: 'center', fontSize: '0.75rem',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="stack gap-1">
                    <span className="t-title-sm row gap-2" style={{ alignItems: 'center' }}>{step.icon} {step.title}</span>
                    <span className="t-body-sm ink-variant">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/corporate/start" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Set up your company account</Link>
          </div>
          <div className="media-card-ghost">
            <video src="/media/corporate-cover-how-it-works.webm" autoPlay loop muted playsInline />
          </div>
        </div>
      </section>

      {/* ============================================= DOCUMENT LIBRARY (existing) */}
      <div className="container section stack gap-7">
        <div className="stack gap-2" style={{ maxWidth: '60ch' }}>
          <h2 className="t-headline-lg">Prefer to handle just one document?</h2>
          <p className="t-body ink-variant">
            No plan required — every document below is free to fill in and download on its own, the paperwork
            that comes up on a normal week: hiring, an NDA before a deal, a founders’ agreement, a board
            resolution.
          </p>
        </div>
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
                      {/* Every card says "Fill it in" — a screen-reader
                          user listing links by name alone hears that
                          phrase once per document with no way to tell
                          them apart. */}
                      <Link
                        href={`/corporate/${card.slug}`}
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: 'flex-start' }}
                        aria-label={`Fill in ${card.title}`}
                      >
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
