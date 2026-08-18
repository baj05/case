import Link from 'next/link';
import type { Metadata } from 'next';
import { getBarCouncils, databaseReady } from '@/lib/data';
import { formatNumber, relativeDate } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'State Bar Councils',
  description: 'The 24 State Bar Councils of India, their contact details, and the records we have ingested from each.',
};

export default function BarCouncilsPage() {
  if (!databaseReady()) return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  const councils = getBarCouncils();

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Source of record</p>
        <h1 className="t-headline-lg">State Bar Councils</h1>
        <p className="t-body ink-variant measure">
          Advocates in India are enrolled with a State Bar Council under the Advocates Act 1961. These
          are the {councils.length} councils listed by the Bar Council of India, and what we hold from each.
        </p>
      </div>

      <Notice tone="legal" title="What this covers, and what it does not">
        The Bar Council of India publishes each council&apos;s elected office-bearers, not the full roll
        of enrolled advocates. Full rolls are published separately by each council in its own format.
        {' '}<Link href="/data-sources" style={{ textDecoration: 'underline' }}>Read the detail</Link>.
      </Notice>

      <div className="grid-auto-lg">
        {councils.map((c) => {
          let regions: string[] = [];
          try { regions = c.coversRegions ? (JSON.parse(c.coversRegions) as string[]) : []; } catch { regions = []; }
          return (
            <article key={c.id} className="card stack gap-3" style={{ padding: 20 }}>
              <div className="stack gap-2">
                <h2 className="t-title">{c.name}</h2>
                {regions.length > 0 && (
                  <div className="row wrap gap-1">
                    {regions.slice(0, 4).map((r) => <span key={r} className="chip chip-outline">{r}</span>)}
                  </div>
                )}
              </div>
              {c.address && <p className="t-body-sm ink-variant">{c.address}</p>}
              <dl className="fact-grid">
                <div><dt>Records held</dt><dd>{formatNumber(c.recordCount)}</dd></div>
                <div><dt>Last checked</dt><dd>{relativeDate(c.lastVerifiedAt)}</dd></div>
              </dl>
              <div className="row wrap gap-2">
                <Link href={`/search?q=${encodeURIComponent(c.name)}`} className="btn btn-secondary btn-sm">See its records</Link>
                {c.websiteUrl && (
                  <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost btn-sm">
                    Official site ↗
                  </a>
                )}
              </div>
              {c.sourceUrl && (
                <p className="t-caption">
                  Source: <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ textDecoration: 'underline' }}>barcouncilofindia.org</a>
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
