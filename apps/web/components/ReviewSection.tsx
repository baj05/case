import Link from 'next/link';
import { getReviewSummary, getReviews } from '@/lib/data';
import type { ReviewFilter, ReviewSort } from '@lexhall/db';
import { relativeDate } from '@/lib/format';
import { VoteHelpfulForm, ReportReviewForm, RespondToReviewForm } from './ReviewActions';

const EXPERIENCE_LABEL: Record<string, string> = {
  consultation: 'Consultation', booking: 'Booked engagement', appointment: 'Appointment', legal_matter: 'Legal matter',
};

const DIMENSIONS: Array<{ key: 'communication' | 'responsiveness' | 'professionalism' | 'processClarity'; label: string }> = [
  { key: 'communication', label: 'Communication' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'processClarity', label: 'Process clarity' },
];

export function ReviewSection({
  professionalId, slug, currentUserId, isAdmin, filter, sort,
}: {
  professionalId: number; slug: string; currentUserId?: number; isAdmin: boolean;
  filter: ReviewFilter; sort: ReviewSort;
}) {
  const summary = getReviewSummary(professionalId);
  const reviews = getReviews(professionalId, { filter, sort, limit: 20 });

  const filterLink = (f: ReviewFilter) => `/advocates/${slug}?reviewFilter=${f}&reviewSort=${sort}#reviews`;
  const sortLink = (s: ReviewSort) => `/advocates/${slug}?reviewFilter=${filter}&reviewSort=${s}#reviews`;

  return (
    <div id="reviews" className="stack gap-4">
      {summary.insufficientSample ? (
        <p className="t-body ink-variant">
          {summary.count === 0
            ? 'No reviews have been published for this professional yet.'
            : `Based on ${summary.count} review${summary.count === 1 ? '' : 's'} — too few yet for a reliable breakdown.`}
        </p>
      ) : (
        <div className="stack gap-3">
          <div className="row wrap gap-4" style={{ alignItems: 'baseline' }}>
            <span className="row gap-2" style={{ alignItems: 'baseline' }}>
              <strong style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)' }}>{summary.overallSatisfaction}</strong>
              <span className="t-body ink-variant">/ 5 overall · {summary.count} reviews</span>
            </span>
            {summary.recommendPercent != null && (
              <span className="t-body ink-variant">{summary.recommendPercent}% would recommend</span>
            )}
            <span className="t-caption">{summary.verifiedCount} verified experience{summary.verifiedCount === 1 ? '' : 's'}</span>
          </div>
          <div className="row wrap gap-4">
            {([
              ['Communication', summary.communication], ['Responsiveness', summary.responsiveness],
              ['Professionalism', summary.professionalism], ['Process clarity', summary.processClarity],
            ] as const).map(([label, value]) => (
              <span key={label} className="t-body-sm">
                <span className="ink-variant">{label}</span> <strong>{value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
          <div className="row gap-1">
            {(['all', 'verified', 'anonymous'] as ReviewFilter[]).map((f) => (
              <Link key={f} href={filterLink(f)} className={`chip chip-button ${filter === f ? '' : 'chip-outline'}`}>
                {f === 'all' ? 'All' : f === 'verified' ? 'Verified' : 'Anonymous'}
              </Link>
            ))}
          </div>
          <div className="row gap-1">
            {(['recent', 'helpful', 'highest', 'lowest'] as ReviewSort[]).map((s) => (
              <Link key={s} href={sortLink(s)} className={`chip chip-button ${sort === s ? '' : 'chip-outline'}`}>
                {s === 'recent' ? 'Newest' : s === 'helpful' ? 'Most helpful' : s === 'highest' ? 'Highest rated' : 'Lowest rated'}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="stack gap-3">
        {reviews.map((r) => (
          <article key={r.id} className="card stack gap-2" style={{ padding: 16 }}>
            <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                <strong>{r.displayName}</strong>
                {r.verified && <span className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>Verified experience</span>}
                <span className="t-caption">{EXPERIENCE_LABEL[String(r.experienceCategory)] ?? 'Experience'}</span>
              </span>
              <span className="t-caption">{relativeDate(String(r.createdAt))}{r.edited ? ' · edited' : ''}</span>
            </div>

            <p className="t-body">{r.body}</p>

            <div className="row wrap gap-3 t-caption">
              {DIMENSIONS.map(({ key, label }) => {
                const value = r.ratings[key];
                return value != null ? <span key={key}>{label}: {value}/5</span> : null;
              })}
              {r.wouldRecommend && <span>Would recommend: {r.wouldRecommend}</span>}
            </div>

            {r.response && (
              <div className="stack gap-1" style={{ padding: 12, background: 'var(--surface-low)', borderRadius: 'var(--r-md)' }}>
                <span className="t-caption" style={{ fontWeight: 700 }}>Response from the professional</span>
                <p className="t-body-sm">{r.response.body}</p>
              </div>
            )}

            <div className="row wrap gap-2">
              {currentUserId && <VoteHelpfulForm reviewId={Number(r.id)} slug={slug} helpfulCount={Number(r.helpfulCount)} />}
              {currentUserId && <ReportReviewForm reviewId={Number(r.id)} slug={slug} />}
              {isAdmin && !r.response && <RespondToReviewForm reviewId={Number(r.id)} slug={slug} />}
            </div>
          </article>
        ))}
      </div>

      <Link href={`/advocates/${slug}/review`} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
        Write a review
      </Link>
    </div>
  );
}
