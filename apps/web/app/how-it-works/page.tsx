import Link from 'next/link';
import type { Metadata } from 'next';
import { RANKING_WEIGHTS, MATCH_FACTOR_LABELS, VERIFICATION_LEVELS } from '@lexhall/core';
import { Notice } from '@/components/States';
import { LEGAL_COPY } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'How results are ranked',
  description: 'The exact weighting used to order search results, why placement cannot be purchased, and how verification works.',
};

export default function HowItWorksPage() {
  const total = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
  return (
    <div className="container section-tight stack gap-8" style={{ maxWidth: 860 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Transparency</p>
        <h1 className="t-headline-lg">How results are ranked</h1>
        <p className="t-body-lg ink-variant measure">
          The weighting below is the actual weighting. Every result on the site can show you its own
          breakdown against it.
        </p>
      </div>

      <section className="stack gap-3">
        <h2 className="t-headline-md">The weighting</h2>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 480 }}>
            <thead><tr><th scope="col">Factor</th><th scope="col" style={{ textAlign: 'right' }}>Weight</th></tr></thead>
            <tbody>
              {Object.entries(RANKING_WEIGHTS).map(([key, weight]) => (
                <tr key={key}>
                  <th scope="row" style={{ fontWeight: 500 }}>{MATCH_FACTOR_LABELS[key as keyof typeof MATCH_FACTOR_LABELS]}</th>
                  <td className="num">{weight}</td>
                </tr>
              ))}
              <tr><th scope="row" style={{ fontWeight: 700 }}>Total</th><td className="num" style={{ fontWeight: 700 }}>{total}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What is deliberately absent</h2>
        <Notice tone="legal" title="Placement is not for sale">
          There is no subscription tier, advertising spend or &ldquo;featured&rdquo; multiplier in that
          table, and there is no hidden one either. The database column that would carry a paid boost
          is constrained to zero at the schema level, so it cannot be switched on by a configuration
          change — it would take a migration and a code change, both reviewable.
        </Notice>
        <p className="t-body">
          An unclaimed profile is not buried. If it is the most relevant record, it ranks first, and it
          says plainly that it has not been confirmed.
        </p>
      </section>

      <section className="stack gap-3" id="verification">
        <h2 className="t-headline-md">Verification levels</h2>
        <p className="t-body ink-variant">Each badge states what was actually checked.</p>
        <div className="stack gap-2">
          {VERIFICATION_LEVELS.map((lvl) => (
            <div key={lvl.level} className="card row wrap gap-3" style={{ padding: 14, justifyContent: 'space-between' }}>
              <div className="stack gap-1" style={{ minWidth: 0, flex: '1 1 260px' }}>
                <strong>{lvl.label}</strong>
                <span className="t-caption">{lvl.checked}</span>
              </div>
              <span className="mono t-caption">Level {lvl.level}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-3" id="reviews">
        <h2 className="t-headline-md">Why there are no reviews yet</h2>
        <p className="t-body">
          A review platform for legal professionals raises questions that a restaurant review platform
          does not: professional-conduct rules on solicitation and comparison, defamation exposure for
          both author and publisher, the lawful basis for publishing a reviewer&apos;s data, and the
          risk that a reviewer discloses privileged or confidential matter detail.
        </p>
        <p className="t-body">
          The review system is designed and the database schema is complete — reviews bind to a
          verified interaction, carry a moderation state, and grant a right of reply. It stays switched
          off behind a feature flag until that analysis is signed off. Shipping it first and asking
          later would be the wrong order.
        </p>
        <Notice tone="legal">{LEGAL_COPY.reviewsGated}</Notice>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Plain-language routing</h2>
        <p className="t-body">
          When you type a sentence, a deterministic classifier maps it to a practice area, matter type,
          location and court using a weighted synonym vocabulary. It is not a language model. That is a
          deliberate choice: it is explainable, it runs in under a millisecond, and it cannot invent
          legal advice. Search results show you what it concluded so you can correct it.
        </p>
        <Link href="/search?q=my+employer+has+not+deposited+my+PF" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
          Try it
        </Link>
      </section>
    </div>
  );
}
