import type { Metadata } from 'next';
import Link from 'next/link';
import { getCaseCorpusStats, getTopCaseCategories, getTopCourts, getAdvocateCountByState, getCorpus, databaseReady } from '@/lib/data';
import { searchHref } from '@/lib/format';
import { Notice } from '@/components/States';
import { IMPLAUSIBLE_CASE_COUNT } from '@lexhall/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Case insights — real case data behind the directory',
  description:
    'Aggregate statistics computed live from the real case histories behind CaseADVO\'s advocate '
    + 'directory — total cases on record, most-cited courts and case categories, with full source '
    + 'attribution and honest caveats.',
};

const grouped = (n: number) => n.toLocaleString('en-IN');

function Bar({ value, max, color = 'var(--secondary)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span style={{ height: 6, borderRadius: 4, background: 'var(--surface-high)', overflow: 'hidden', display: 'block' }}>
      <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color }} />
    </span>
  );
}

export default function CaseInsightsPage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> to build the local database.
        </Notice>
      </div>
    );
  }

  const stats = getCaseCorpusStats();
  const categories = getTopCaseCategories(12);
  const courts = getTopCourts(10);
  const states = getAdvocateCountByState(12);
  const corpus = getCorpus();

  const maxCategory = Math.max(...categories.map((c) => c.advocateCount), 1);
  const maxCourt = Math.max(...courts.map((c) => c.advocateCount), 1);
  const maxState = Math.max(...states.map((s) => s.count), 1);
  const disposalRatePct = stats.totalCases > 0 ? Math.round((stats.totalDisposed / stats.totalCases) * 1000) / 10 : null;

  return (
    <div className="container section stack gap-8">
      <div className="stack gap-2" style={{ maxWidth: '62ch' }}>
        <p className="t-label-mono ink-variant">Case insights</p>
        <h1 className="t-display-lg">The real case data behind this directory</h1>
        <p className="t-body-lg ink-variant">
          Every number below is a live query against the same case records shown on individual profile
          pages — nothing here is a separate, pre-written statistic that could drift out of sync.
        </p>
      </div>

      <Notice tone="info" title="How to read these numbers">
        Case counts are matched to an advocate by name on the source site (ecourtsindia.com), not a
        verified unique identity — {stats.implausibleVolumeCount} profile{stats.implausibleVolumeCount === 1 ? '' : 's'} out
        of {grouped(stats.professionalsWithCases)} with case history show an implausibly high count
        (over {grouped(IMPLAUSIBLE_CASE_COUNT)}), almost certainly several real people sharing a common
        name merged under one profile. Those are flagged individually on their own page; the totals
        below are the real, unfiltered sums, including them.
      </Notice>

      <div className="row wrap gap-6">
        <div className="stack" style={{ gap: 0 }}>
          <strong style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {grouped(stats.totalCases)}
          </strong>
          <span className="t-caption">total cases on record · {grouped(stats.professionalsWithCases)} advocates</span>
        </div>
        {disposalRatePct != null && (
          <div className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">{disposalRatePct}%</strong>
            <span className="t-caption">disposed ({grouped(stats.totalDisposed)} of {grouped(stats.totalCases)})</span>
          </div>
        )}
        <div className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(stats.totalPending)}</strong>
          <span className="t-caption">pending</span>
        </div>
        <div className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(stats.medianCasesPerAdvocate)}</strong>
          <span className="t-caption">median cases per advocate (with any on record)</span>
        </div>
        <div className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(corpus.professionals)}</strong>
          <span className="t-caption">total professionals listed</span>
        </div>
      </div>

      <div className="row wrap gap-6" style={{ alignItems: 'flex-start' }}>
        <section className="card stack gap-4" style={{ padding: 'clamp(18px, 3vw, 26px)', flex: '1 1 380px' }}>
          <div className="stack gap-1">
            <h2 className="t-title-lg">Most common case categories</h2>
            <p className="t-body-sm ink-variant">
              Ranked by how many distinct advocates carry the category in their own top 3 — not a raw
              case-row count, which one high-volume profile could dominate.
            </p>
          </div>
          <div className="stack gap-3">
            {categories.map((c) => (
              <div key={c.label} className="stack gap-1">
                <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="t-body-sm clamp-2">{c.label}</span>
                  <strong className="mono t-body-sm">{c.advocateCount}</strong>
                </div>
                <Bar value={c.advocateCount} max={maxCategory} />
              </div>
            ))}
          </div>
        </section>

        <section className="card stack gap-4" style={{ padding: 'clamp(18px, 3vw, 26px)', flex: '1 1 380px' }}>
          <div className="stack gap-1">
            <h2 className="t-title-lg">Most-cited courts</h2>
            <p className="t-body-sm ink-variant">
              Real court-of-appearance links, evidenced from case records — Supreme Court and High Courts
              only; most case rows name a district court not in this platform&rsquo;s curated court list.
            </p>
          </div>
          <div className="stack gap-3">
            {courts.map((c) => (
              <div key={c.name} className="stack gap-1">
                <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Link href={searchHref({ court: c.slug })} className="t-body-sm">{c.shortName ?? c.name}</Link>
                  <strong className="mono t-body-sm">{c.advocateCount}</strong>
                </div>
                <Bar value={c.advocateCount} max={maxCourt} color="var(--action-orange)" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card stack gap-4" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
        <div className="stack gap-1">
          <h2 className="t-title-lg">Advocates by state</h2>
          <p className="t-body-sm ink-variant">Same counts the search filter panel and state map use.</p>
        </div>
        <div className="stack gap-3">
          {states.map((s) => (
            <div key={s.slug} className="stack gap-1">
              <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Link href={searchHref({ location: s.slug })} className="t-body-sm">{s.name}</Link>
                <strong className="mono t-body-sm">{grouped(s.count)}</strong>
              </div>
              <Bar value={s.count} max={maxState} color="var(--growth-teal)" />
            </div>
          ))}
        </div>
      </section>

      <p className="t-caption">
        Sourced from ecourtsindia.com&rsquo;s public case listings and Verified Advocates directory.
        &ldquo;Disposed&rdquo; means a case concluded, not who prevailed — this platform does not
        record or infer outcomes. <Link href="/search" style={{ textDecoration: 'underline' }}>Browse the full directory</Link>.
      </p>
    </div>
  );
}
