'use client';

import { moderateReviewAction } from '@/app/actions';

export function ModerateReviewForm({ reviewId, status }: { reviewId: number; status: string }) {
  return (
    <form action={moderateReviewAction} className="row wrap gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="text" name="note" placeholder="Moderation note (optional)" className="input" style={{ flex: 1, minWidth: 180 }} />
      {status !== 'published' && (
        <button type="submit" name="decision" value="published" className="btn btn-primary btn-sm">Publish</button>
      )}
      {status !== 'rejected' && (
        <button type="submit" name="decision" value="rejected" className="btn btn-secondary btn-sm">Reject</button>
      )}
      {status !== 'in_review' && (
        <button type="submit" name="decision" value="in_review" className="btn btn-ghost btn-sm">Send to human review</button>
      )}
    </form>
  );
}
