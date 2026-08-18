import Link from 'next/link';
import type { Metadata } from 'next';
import { getCourts, databaseReady } from '@/lib/data';
import { searchHref, COURT_TIER_LABEL } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Courts and tribunals',
  description: 'The Supreme Court, all 25 High Courts and their benches, district courts, tribunals, consumer commissions and arbitral institutions.',
};

export default function CourtsPage() {
  if (!databaseReady()) return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  const courts = getCourts();
  const tiers = [...new Set(courts.map((c) => c.tier))].sort((a, b) => a - b);

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Jurisdiction</p>
        <h1 className="t-headline-lg">Courts and tribunals</h1>
        <p className="t-body ink-variant measure">
          A court is often the most precise way to find the right professional — the question is
          usually not just what the matter is about, but where it will be heard.
        </p>
      </div>

      {tiers.map((tier) => {
        const group = courts.filter((c) => c.tier === tier);
        return (
          <section key={tier} className="stack gap-3">
            <h2 className="t-headline-md">{COURT_TIER_LABEL[tier] ?? `Tier ${tier}`}</h2>
            <div className="grid-auto">
              {group.map((c) => (
                <Link key={c.id} href={searchHref({ court: c.slug })} className="card stack gap-2" style={{ padding: 16 }}>
                  <span className="t-body" style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="row wrap gap-1">
                    {c.seat && <span className="chip chip-outline">{c.seat}</span>}
                    {c.isBench === 1 && <span className="chip chip-outline">Bench</span>}
                    {c.professionalCount > 0 && <span className="chip chip-primary">{c.professionalCount} listed</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
