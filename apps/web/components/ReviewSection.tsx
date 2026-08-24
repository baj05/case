import Link from 'next/link';
import type { ReviewFilter, ReviewSort, ReviewListItem, ReviewSummary } from '@lexhall/db';
import { relativeDate } from '@/lib/format';
import { avatarSrc } from '@/lib/avatars';
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

/** Qualitative label for the overall score — never just a bare number. */
function experienceLabel(score: number | null): string {
  if (score == null) return '';
  if (score >= 4.6) return 'Excellent experience';
  if (score >= 4.0) return 'Very good experience';
  if (score >= 3.0) return 'Good experience';
  if (score >= 2.0) return 'Mixed experience';
  return 'Needs attention';
}

export function ReviewSection({
  basePath, slug, summary, reviews, currentUserId, isAdmin, filter, sort,
}: {
  basePath: string; slug: string; summary: ReviewSummary; reviews: ReviewListItem[];
  currentUserId?: number; isAdmin: boolean; filter: ReviewFilter; sort: ReviewSort;
}) {
  const filterLink = (f: ReviewFilter) => `${basePath}/${slug}?reviewFilter=${f}&reviewSort=${sort}#reviews`;
  const sortLink = (s: ReviewSort) => `${basePath}/${slug}?reviewFilter=${filter}&reviewSort=${s}#reviews`;

  return (
    <div id="reviews" className="stack gap-5">
      <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="t-headline-md">Legal Trust &amp; Experience</h2>
        <Link href="/trust/reviews" className="t-caption" style={{ textDecoration: 'underline' }}>How is this calculated?</Link>
      </div>

      {summary.band === 'none' && (
        <p className="t-body ink-variant">No experiences shared yet — be the first to share yours.</p>
      )}
      {summary.band === 'new' && (
        <p className="t-body ink-variant">
          New profile — {summary.count} experience{summary.count === 1 ? '' : 's'} shared so far, too few yet for a
          reliable score.
        </p>
      )}

      {(summary.band === 'early' || summary.band === 'established') && (
        <div className="stack gap-4">
          <div className="row wrap gap-5" style={{ alignItems: 'baseline' }}>
            <span className="row gap-2" style={{ alignItems: 'baseline' }}>
              <strong style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {summary.overallSatisfaction ?? '—'}
              </strong>
              <span className="t-body ink-variant">/ 5</span>
            </span>
            <span className="stack" style={{ gap: 0 }}>
              <strong className="t-title-sm">{experienceLabel(summary.overallSatisfaction ?? null)}</strong>
              <span className="t-caption">
                {summary.count} experience{summary.count === 1 ? '' : 's'}
                {summary.band === 'early' && ' · early feedback'}
              </span>
            </span>
            {summary.recommendPercent != null && (
              <span className="stack" style={{ gap: 0 }}>
                <strong className="t-title-sm">{summary.recommendPercent}%</strong>
                <span className="t-caption">would recommend</span>
              </span>
            )}
            <span className="t-caption">{summary.verifiedCount} verified experience{summary.verifiedCount === 1 ? '' : 's'}</span>
          </div>

          {summary.band === 'established' && summary.communication != null && (
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
          )}

          {summary.band === 'established' && summary.starDistribution && (
            <div className="stack gap-1" style={{ maxWidth: 360 }}>
              {summary.starDistribution.map((row) => (
                <div key={row.star} className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="t-caption mono" style={{ width: 28 }}>{row.star}★</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-high)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${row.percent}%`, background: 'var(--action-orange)' }} />
                  </span>
                  <span className="t-caption mono" style={{ width: 36, textAlign: 'right' }}>{row.percent}%</span>
                </div>
              ))}
            </div>
          )}

          {summary.band === 'established' && summary.satisfactionDistribution && (
            <div className="stack gap-1" style={{ maxWidth: 420 }}>
              {summary.satisfactionDistribution.map((row) => (
                <div key={row.level} className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="t-caption" style={{ width: 130 }}>{row.level}</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-high)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${row.percent}%`, background: 'var(--primary)' }} />
                  </span>
                  <span className="t-caption mono" style={{ width: 36, textAlign: 'right' }}>{row.percent}%</span>
                </div>
              ))}
            </div>
          )}

          {summary.band === 'established' && summary.themes && summary.themes.length > 0 && (
            <div className="stack gap-2">
              <span className="t-caption" style={{ fontWeight: 700 }}>What people mention</span>
              <div className="row wrap gap-1">
                {summary.themes.map((t) => (
                  <span key={t.theme} className={`chip ${t.sentiment === 'positive' ? 'chip-lime' : 'chip-outline'}`}>
                    {t.sentiment === 'positive' ? '✓' : '·'} {t.theme}
                  </span>
                ))}
              </div>
              <p className="t-caption">Based on {summary.count} published experience{summary.count === 1 ? '' : 's'}.</p>
            </div>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
          <div className="row wrap gap-1">
            {(['all', 'verified', 'anonymous'] as ReviewFilter[]).map((f) => (
              <Link key={f} href={filterLink(f)} className={`chip chip-button ${filter === f ? '' : 'chip-outline'}`}>
                {f === 'all' ? 'All' : f === 'verified' ? 'Verified' : 'Anonymous'}
              </Link>
            ))}
          </div>
          <div className="row wrap gap-1">
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
          <article key={String(r.id)} className="review-post">
            <img className="review-post-avatar" src={avatarSrc(String(r.displayMode), r.avatarUrl)} alt="" width={44} height={44} />
            <div className="stack gap-2" style={{ minWidth: 0, flex: 1 }}>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="row wrap gap-2" style={{ alignItems: 'baseline' }}>
                  <strong>{r.displayName}</strong>
                  {r.verified && (
                    <span className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>
                      {r.verifiedVia === 'domain' ? 'Verified — company domain' : 'Verified experience'}
                    </span>
                  )}
                  <span className="t-caption">{EXPERIENCE_LABEL[String(r.experienceCategory)] ?? 'Experience'}</span>
                </span>
                <span className="t-caption">{relativeDate(String(r.createdAt))}{r.edited ? ' · edited' : ''}</span>
              </div>

              <p className="t-body" style={{ wordBreak: 'break-word' }}>{r.body}</p>

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

              <div className="row wrap gap-1 review-post-actions">
                {currentUserId && <VoteHelpfulForm reviewId={Number(r.id)} slug={slug} helpfulCount={Number(r.helpfulCount)} />}
                {currentUserId && <ReportReviewForm reviewId={Number(r.id)} slug={slug} />}
                {isAdmin && !r.response && <RespondToReviewForm reviewId={Number(r.id)} slug={slug} />}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Link href={`${basePath}/${slug}/review`} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
        Write a review
      </Link>
    </div>
  );
}
