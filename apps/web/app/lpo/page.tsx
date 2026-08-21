import Link from 'next/link';
import type { Metadata } from 'next';
import { getOrganisations, getOrgReviewSummary } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Legal process outsourcing (LPO) providers' };

export default function LpoPage() {
  const providers = getOrganisations('lpo');
  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Discovery</p>
        <h1 className="t-headline-lg">LPO providers</h1>
        <p className="t-body ink-variant">
          PF, ESI, labour compliance, document review and other legal process outsourcing services.
          Illustrative/demo records — see <Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>how this works</Link>.
        </p>
      </div>
      <div className="grid-auto">
        {providers.map((p) => {
          const s = getOrgReviewSummary(p.id);
          return (
            <Link key={p.slug} href={`/lpo/${p.slug}`} className="card lift stack gap-2" style={{ padding: 18, textDecoration: 'none' }}>
              <span className="t-title-sm" style={{ fontWeight: 700 }}>{p.name}</span>
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
