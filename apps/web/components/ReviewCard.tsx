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
 * Deliberately minimal, tweet-embed-style header: name + a small verified
 * mark, then one quiet second line — never more than that crammed next to
 * the name. That second line shows `@handle` only when the reviewer
 * actually set one (a real, optional field — see normaliseHandle in
 * @lexhall/db); absent a handle it falls back to the experience category,
 * never a fabricated one. Rating, verification detail and (on the hub
 * feed) who the review is about all move to one quiet footer line instead
 * of piling into the header.
 */
export function ReviewCard({
  review, subject, detail,
}: {
  review: ReviewCardData;
  subject?: { name: string; href: string };
  detail?: ReactNode;
}) {
  const secondary = review.handle ? `@${review.handle}` : (EXPERIENCE_LABEL[review.experienceCategory] ?? 'Experience');
  const verifiedLabel = review.verifiedVia === 'domain' ? 'Verified — company domain' : 'Verified experience';

  return (
    <article className="review-post">
      <img className="review-post-avatar" src={avatarSrc(review.displayMode, review.avatarUrl)} alt="" width={48} height={48} />
      <div className="stack gap-1" style={{ minWidth: 0, flex: 1 }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <strong className="review-post-name">{review.displayName}</strong>
            {review.verified && (
              <span className="review-post-check" role="img" aria-label={verifiedLabel} title={verifiedLabel}>✓</span>
            )}
          </span>
          <span className="review-post-handle">{secondary}</span>
        </div>

        <p className="t-body-lg review-post-body" style={{ wordBreak: 'break-word' }}>{review.body}</p>

        {detail}

        <div className="review-post-footer">
          <span>
            {review.overallSatisfaction != null && <>★ {review.overallSatisfaction}/5</>}
            {review.overallSatisfaction != null && review.verified && ' · '}
            {review.verified && verifiedLabel}
            {subject && <> · on <Link href={subject.href}>{subject.name}</Link></>}
          </span>
          <span>{relativeDate(review.createdAt)}{review.edited ? ' · edited' : ''}</span>
        </div>
      </div>
    </article>
  );
}
