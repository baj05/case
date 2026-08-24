import type { Metadata } from 'next';
import { getSiteFeedbackSummaryCached, getSiteFeedbackList, databaseReady } from '@/lib/data';
import { requireUser } from '@/lib/auth';
import { Notice } from '@/components/States';
import { relativeDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin — platform feedback', robots: { index: false, follow: false } };

const AREA_LABEL: Record<string, string> = {
  navigation: 'Navigation', search: 'Search', profiles: 'Lawyer profiles', reviews: 'Reviews',
  booking: 'Booking', resources: 'Resources', payments: 'Payments', mobile: 'Mobile experience', other: 'Other',
};

export default async function AdminSiteFeedbackPage() {
  await requireUser('platform_admin', '/admin/site-feedback');
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const summary = getSiteFeedbackSummaryCached();
  const items = getSiteFeedbackList(50);

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Admin</p>
        <h1 className="t-headline-lg">CaseADVO platform feedback</h1>
        <p className="t-body ink-variant">
          Kept entirely separate from advocate/firm/LPO reviews — this is feedback about the
          website itself, from <code className="mono">/rate-us</code>.
        </p>
      </div>

      <div className="row wrap gap-4">
        <div className="card stack gap-1" style={{ padding: 18 }}>
          <span className="t-caption">Responses</span>
          <strong style={{ fontSize: '1.5rem' }}>{summary.count}</strong>
        </div>
        <div className="card stack gap-1" style={{ padding: 18 }}>
          <span className="t-caption">Average category rating</span>
          <strong style={{ fontSize: '1.5rem' }}>{summary.averageOverall ?? '—'}</strong>
        </div>
        <div className="card stack gap-1" style={{ padding: 18 }}>
          <span className="t-caption">NPS (promoters − detractors)</span>
          <strong style={{ fontSize: '1.5rem' }}>{summary.npsPercent != null ? `${summary.npsPercent}%` : '—'}</strong>
        </div>
      </div>

      {summary.topImprovementAreas.length > 0 && (
        <div className="stack gap-2">
          <h2 className="t-headline-md">Most-mentioned improvement areas</h2>
          <div className="row wrap gap-1">
            {summary.topImprovementAreas.map((a) => (
              <span key={a.area} className="chip chip-outline">{AREA_LABEL[a.area] ?? a.area} ({a.count})</span>
            ))}
          </div>
        </div>
      )}

      <div className="stack gap-3">
        <h2 className="t-headline-md">Recent responses</h2>
        {items.length === 0 && <p className="t-body ink-variant">No feedback submitted yet.</p>}
        {items.map((f) => (
          <div key={String(f.id)} className="card stack gap-1" style={{ padding: 14 }}>
            <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
              <span className="t-caption">
                {f.displayMode === 'attributed' && f.authorFullName ? String(f.authorFullName) : 'Anonymous'}
                {f.recommendScore != null && ` · recommend ${f.recommendScore}/10`}
                {f.improvementArea && ` · ${AREA_LABEL[String(f.improvementArea)] ?? f.improvementArea}`}
              </span>
              <span className="t-caption">{relativeDate(String(f.createdAt))}</span>
            </div>
            {f.comment && <p className="t-body-sm">{f.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
