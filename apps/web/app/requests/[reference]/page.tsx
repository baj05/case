import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { getConsultationByReference } from '@lexhall/db';
import { databaseReady } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { LEGAL_COPY } from '@/lib/brand';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your consultation request', robots: { index: false, follow: false } };

export default async function RequestPage({ params }: { params: Promise<{ reference: string }> }) {
  if (!databaseReady()) notFound();
  const { reference } = await params;
  const req = getConsultationByReference(decodeURIComponent(reference));
  if (!req) notFound();

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <div className="stack gap-5">
        <div className="stack gap-2">
          <p className="t-label-mono ink-variant">Reference {req.reference}</p>
          <h1 className="t-headline-lg">Your request has been sent</h1>
          <p className="t-body ink-variant measure">
            {req.professionalName} has received your enquiry. Keep this reference — you can quote it
            in any correspondence.
          </p>
        </div>

        <Notice tone="ok" title="Sent">
          We do not chase professionals on your behalf and we do not guarantee a reply. If you do not
          hear back, you can send the same enquiry to someone else.
        </Notice>

        <div className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title">What you sent</h2>
          <dl className="fact-grid">
            <div><dt>To</dt><dd>{req.professionalName}</dd></div>
            <div><dt>Status</dt><dd style={{ textTransform: 'capitalize' }}>{String(req.status).replace(/_/g, ' ')}</dd></div>
            <div><dt>Sent</dt><dd>{formatDate(req.createdAt)}</dd></div>
            {req.practiceAreaName && <div><dt>Area</dt><dd>{req.practiceAreaName}</dd></div>}
            <div><dt>Preferred format</dt><dd style={{ textTransform: 'capitalize' }}>{String(req.preferredMode).replace(/_/g, ' ')}</dd></div>
            <div><dt>Urgency</dt><dd style={{ textTransform: 'capitalize' }}>{req.urgency}</dd></div>
          </dl>
          <hr className="divider" />
          <div className="stack gap-1">
            <span className="t-label-mono ink-variant">Your description</span>
            <p className="t-body-sm" style={{ whiteSpace: 'pre-wrap' }}>{req.summary}</p>
          </div>
        </div>

        <Notice tone="legal">{LEGAL_COPY.notAdvice}</Notice>

        <div className="row wrap gap-2">
          <Link href={`/advocates/${req.professionalSlug}`} className="btn btn-secondary">View the profile</Link>
          <Link href="/search" className="btn btn-ghost">Search for someone else</Link>
        </div>
      </div>
    </div>
  );
}
