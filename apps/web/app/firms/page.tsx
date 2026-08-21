import Link from 'next/link';
import type { Metadata } from 'next';
import { getOrganisations, getOrgReviewSummary } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Law firms & chambers' };

export default function FirmsPage() {
  const firms = [...getOrganisations('law_firm'), ...getOrganisations('chamber')];
  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Discovery</p>
        <h1 className="t-headline-lg">Law firms &amp; chambers</h1>
        <p className="t-body ink-variant">
          Team-level experience, not just an individual advocate's. Illustrative/demo records —
          see <Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>how this works</Link>.
        </p>
      </div>
      <div className="grid-auto">
        {firms.map((f) => {
          const s = getOrgReviewSummary(f.id);
          return (
            <Link key={f.slug} href={`/firms/${f.slug}`} className="card lift stack gap-2" style={{ padding: 18, textDecoration: 'none' }}>
              <span className="t-title-sm" style={{ fontWeight: 700 }}>{f.name}</span>
              <span className="t-caption">
                {s.insufficientSample
                  ? (s.count === 0 ? 'No experiences yet' : `${s.count} experience${s.count === 1 ? '' : 's'}`)
                  : `${s.overallSatisfaction} / 5 · ${s.count} experiences`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
