import Link from 'next/link';
import type { Metadata } from 'next';
import { getDomains, getMatters, databaseReady } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Legal matters — every kind of legal problem, in plain words',
  description:
    'Browse legal matters by domain: family, property, rent, employment, electricity, consumer, tax, criminal and more. Each matter explains the issues involved, what a lawyer actually does, and which forum decides it.',
};

export default function MattersPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const domains = getDomains();
  const matters = getMatters({ limit: 1000 });
  const total = matters.length;

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Browse</p>
        <h1 className="t-headline-lg">Legal matters</h1>
        <p className="t-body ink-variant measure">
          {formatNumber(total)} matters across {domains.length} domains. A matter is the problem as
          you would describe it — an excess electricity bill, a deposit the landlord kept, PF that
          was never deposited — not the statute it falls under. Each one names the issues involved,
          the work a lawyer does on it, and the forum that decides it.
        </p>
      </div>

      <div className="grid-auto-lg">
        {domains.map((d) => {
          const inDomain = matters.filter((m) => m.domainSlug === d.slug);
          return (
            <section key={d.code} className="card stack gap-3" style={{ padding: 20 }}>
              <div className="stack gap-2">
                <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 className="t-title">
                    <Link href={`/matters/${d.slug}`} style={{ textDecoration: 'underline' }}>{d.name}</Link>
                  </h2>
                  <span className="t-label-mono ink-variant">{d.matterCount}</span>
                </div>
                <p className="t-body-sm ink-variant">{d.plainSummary}</p>
              </div>
              {inDomain.length > 0 && (
                <div className="row wrap gap-1">
                  {inDomain.slice(0, 6).map((m) => (
                    <Link key={String(m.slug)} href={`/matters/${d.slug}/${m.slug}`} className="chip chip-button chip-outline">
                      {String(m.name)}
                    </Link>
                  ))}
                  {inDomain.length > 6 && (
                    <Link href={`/matters/${d.slug}`} className="chip chip-button">+{inDomain.length - 6} more</Link>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Notice tone="info">
        This taxonomy describes what each kind of matter involves. It is not legal advice, and the
        forum listed is the one that ordinarily hears such a matter — your own case may belong
        somewhere else. <Link href="/forums" style={{ textDecoration: 'underline' }}>See every forum and tribunal</Link>.
      </Notice>
    </div>
  );
}
