'use client';

import { deleteReviewAction } from '@/app/actions';

export function DeleteReviewForm({ reviewId }: { reviewId: number }) {
  return (
    <form
      action={deleteReviewAction}
      className="row wrap gap-2"
      onSubmit={(e) => {
        if (!window.confirm('Remove this review permanently from public view? This cannot be undone from this screen.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="text" name="note" placeholder="Reason for removal (kept for the record)" className="input" style={{ flex: 1, minWidth: 180 }} />
      <button type="submit" className="btn btn-danger btn-sm">Remove review</button>
    </form>
  );
}
