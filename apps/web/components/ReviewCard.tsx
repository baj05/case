import Link from 'next/link';
import type { ReactNode } from 'react';
import { relativeDate } from '@/lib/format';
import { avatarSrc } from '@/lib/avatars';

const EXPERIENCE_LABEL: Record<string, string> = {
  consultation: 'Consultation', booking: 'Booked engagement', appointment: 'Appointment', legal_matter: 'Legal matter',
};

export interface ReviewCardData {
  id: number | string;
  body: string;
  verified: boolean;
  verifiedVia: 'booking' | 'domain';
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  displayMode: string;
  experienceCategory: string;
  overallSatisfaction: number | null;
  createdAt: string;
  edited?: boolean;
}

/**
 * Shared card for a single review, used by both the /reviews hub feed and
 * the per-profile review list — previously each pasted its own near-
 * identical markup. `subject` (who the review is on) is hub-only; `detail`
 * (ratings breakdown / professional's response / Helpful-Report-Respond
 * actions) is profile-only and stays owned by the caller so this component
 * doesn't need to know about ReviewListItem's extra fields or the review
 * server actions.
 *
 * The second line under the name shows `@handle` only when the reviewer
 * actually set one (a real, optional field — see normaliseHandle in
 * @lexhall/db) — never a fabricated one. Absent a handle, it falls back to
 * the experience category, exactly as this card always showed.
 */
export function ReviewCard({
  review, subject, detail, clampBody = false,
}: {
  review: ReviewCardData;
  subject?: { name: string; href: string };
  detail?: ReactNode;
  clampBody?: boolean;
}) {
  const secondary = review.handle ? `@${review.handle}` : (EXPERIENCE_LABEL[review.experienceCategory] ?? 'Experience');

  return (
    <article className="review-post">
      {review.overallSatisfaction != null && (
        <span className="review-post-rating" aria-label={`Rated ${review.overallSatisfaction} out of 5`}>
          <span aria-hidden="true">★</span> {review.overallSatisfaction}
        </span>
      )}
      <img className="review-post-avatar" src={avatarSrc(review.displayMode, review.avatarUrl)} alt="" width={44} height={44} />
      <div className="stack gap-2" style={{ minWidth: 0, flex: 1 }}>
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="row wrap gap-1" style={{ alignItems: 'center' }}>
              <strong>{review.displayName}</strong>
              {review.verified && (
                <span className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>
                  <span aria-hidden="true">✓</span>{' '}
                  {review.verifiedVia === 'domain' ? 'Verified — company domain' : 'Verified experience'}
                </span>
              )}
            </span>
            <span className="t-caption ink-variant">
              {secondary}
              {subject && <> · on <Link href={subject.href}>{subject.name}</Link></>}
            </span>
          </span>
          <span className="t-caption" style={{ flex: 'none' }}>
            {relativeDate(review.createdAt)}{review.edited ? ' · edited' : ''}
          </span>
        </div>

        <p className={`t-body${clampBody ? ' clamp-3' : ''}`} style={{ wordBreak: 'break-word' }}>{review.body}</p>

        {detail}
      </div>
    </article>
  );
}
