import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '@/components/States';
import { getModerationQueue, getReportedReviews, databaseReady } from '@/lib/data';
import { requireUser } from '@/lib/auth';
import { relativeDate } from '@/lib/format';
import { avatarSrc } from '@/lib/avatars';
import { ModerateReviewForm } from '@/components/ModerateReviewForm';
import { DeleteReviewForm } from '@/components/DeleteReviewForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin — review moderation', robots: { index: false, follow: false } };

const STATUS_TABS = ['pending', 'auto_flagged', 'in_review', 'published', 'rejected'] as const;
// Not a moderation_status value — this tab reads open content_report rows
// instead of the review queue itself, so it's handled as its own branch below.
const REPORTED_TAB = 'reported';

/** An organisation can be a firm, a chamber or an LPO — each lives under a
 * different route, so 'organisation'/subjectKind alone was never enough to
 * build a link (the same gap fixed in apps/web/app/reviews/page.tsx). */
function subjectBasePath(kind: string): string {
  return kind === 'lpo' ? '/lpo' : kind === 'law_firm' || kind === 'chamber' ? '/firms' : '/advocates';
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser('platform_admin', '/admin/reviews');
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const { status: statusRaw } = await searchParams;
  const isReportedTab = statusRaw === REPORTED_TAB;
  const status = !isReportedTab && (STATUS_TABS as readonly string[]).includes(statusRaw ?? '') ? statusRaw : (isReportedTab ? undefined : 'pending');
  const queue = isReportedTab ? [] : getModerationQueue(status);
  const reported = isReportedTab ? getReportedReviews() : [];

  return (
    <div className="container section-tight stack gap-6">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Admin</p>
        <h1 className="t-headline-lg">Review moderation queue</h1>
        <p className="t-body ink-variant">
          Every review passes through here before it can publish. Trust tier and signals are internal —
          never shown to the public or to the professional being reviewed.
        </p>
      </div>

      <div className="row gap-1 wrap">
        {STATUS_TABS.map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={`chip chip-button ${status === s && !isReportedTab ? '' : 'chip-outline'}`}>
            {s.replace(/_/g, ' ')}
          </Link>
        ))}
        <Link href={`/admin/reviews?status=${REPORTED_TAB}`} className={`chip chip-button ${isReportedTab ? '' : 'chip-outline'}`}>
          Reported
        </Link>
      </div>

      {isReportedTab ? (
        <div className="stack gap-3">
          <p className="t-body ink-variant">
            Every review a visitor has reported, with the reason they gave. Resolving here (reject via
            moderation, or a permanent removal below) closes the report.
          </p>
          {reported.length === 0 && <p className="t-body ink-variant">No open reports.</p>}
          {reported.map((r) => (
            <article key={String(r.reportId)} className="card row gap-3" style={{ padding: 16, alignItems: 'flex-start' }}>
              <img src={avatarSrc(String(r.displayMode), r.avatarUrl)} alt="" width={36} height={36} style={{ borderRadius: '50%', flex: 'none' }} />
              <div className="stack gap-2" style={{ minWidth: 0, flex: 1 }}>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <span>
                    <strong>{r.authorName}</strong> → <Link href={`${subjectBasePath(r.subjectKind)}/${r.professionalSlug}`}>{r.professionalName}</Link>
                  </span>
                  <span className="row gap-2">
                    <span className="chip chip-error">{r.reason.replace(/_/g, ' ')}</span>
                    <span className="t-caption">reported {relativeDate(r.reportedAt)}</span>
                  </span>
                </div>
                <p className="t-body">{r.body}</p>
                <p className="t-body-sm ink-variant"><strong>Reporter's detail:</strong> {r.detail}</p>
                <div className="row wrap gap-2 t-caption">
                  <span>current status: {r.moderationStatus}</span>
                  <span>{r.displayMode}</span>
                </div>
                <ModerateReviewForm reviewId={r.reviewId} status={r.moderationStatus} />
                <DeleteReviewForm reviewId={r.reviewId} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="stack gap-3">
          {queue.length === 0 && <p className="t-body ink-variant">Nothing in this queue.</p>}
          {queue.map((r) => (
            <article key={String(r.id)} className="card row gap-3" style={{ padding: 16, alignItems: 'flex-start' }}>
              <img src={avatarSrc(String(r.displayMode), r.avatarUrl as string | null)} alt="" width={36} height={36} style={{ borderRadius: '50%', flex: 'none' }} />
              <div className="stack gap-2" style={{ minWidth: 0, flex: 1 }}>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <span>
                    <strong>{String(r.authorName)}</strong> → <Link href={`${subjectBasePath(String(r.subjectKind))}/${r.professionalSlug}`}>{String(r.professionalName)}</Link>
                  </span>
                  <span className="row gap-2">
                    <span className={`chip ${r.trustTier === 'high' ? 'chip-error' : r.trustTier === 'medium' ? 'chip-outline' : 'chip-lime'}`}>
                      {String(r.trustTier)} risk
                    </span>
                    <span className="t-caption">{relativeDate(String(r.createdAt))}</span>
                  </span>
                </div>
                <p className="t-body">{String(r.body)}</p>
                <div className="row wrap gap-2 t-caption">
                  <span>{String(r.experienceCategory)}</span>
                  <span>{String(r.displayMode)}</span>
                  <span>{String(r.basis)}</span>
                  {Array.isArray(r.trustSignals) && r.trustSignals.length > 0 && <span>signals: {(r.trustSignals as string[]).join(', ')}</span>}
                </div>
                <ModerateReviewForm reviewId={Number(r.id)} status={status ?? 'pending'} />
                <DeleteReviewForm reviewId={Number(r.id)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
