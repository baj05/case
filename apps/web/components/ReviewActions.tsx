'use client';

import { useActionState, useState } from 'react';
import { voteReviewHelpfulAction, reportReviewAction, respondToReviewAction, withdrawReviewAction } from '@/app/actions';
import { SubmitButton, FormError } from './Forms';

export function VoteHelpfulForm({ reviewId, slug, helpfulCount }: { reviewId: number; slug: string; helpfulCount: number }) {
  return (
    <form action={voteReviewHelpfulAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="vote" value="1" />
      <button type="submit" className="btn btn-ghost btn-sm">Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}</button>
    </form>
  );
}

export function WithdrawReviewButton({ reviewId, slug }: { reviewId: number; slug: string }) {
  return (
    <form action={withdrawReviewAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="btn btn-ghost btn-sm">Withdraw</button>
    </form>
  );
}

export function ReportReviewForm({ reviewId, slug }: { reviewId: number; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportReviewAction, null);

  if (!open) return <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Report</button>;
  if (state?.ok) return <span className="t-caption">Reported — thank you.</span>;

  return (
    <form action={formAction} className="stack gap-2" style={{ padding: 10, background: 'var(--surface-low)', borderRadius: 'var(--r-md)' }}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.message && !state.ok ? state.message : undefined} />
      <select name="reason" className="input" defaultValue="incorrect_information">
        <option value="fake_review">Looks fake</option>
        <option value="spam">Spam</option>
        <option value="harassment">Harassment</option>
        <option value="confidential_disclosure">Confidential information</option>
        <option value="incorrect_information">Wrong professional / incorrect information</option>
        <option value="privacy">Privacy violation</option>
        <option value="other">Other</option>
      </select>
      <textarea name="detail" className="textarea" placeholder="Briefly, what's the issue?" required minLength={5} />
      <div className="row gap-2">
        <SubmitButton pendingLabel="Sending…" className="btn btn-secondary btn-sm">Submit report</SubmitButton>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export function RespondToReviewForm({ reviewId, slug }: { reviewId: number; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(respondToReviewAction, null);

  if (state?.ok) return <span className="t-caption">Response submitted for moderation.</span>;
  if (!open) return <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Respond</button>;

  return (
    <form action={formAction} className="stack gap-2" style={{ padding: 10, background: 'var(--surface-low)', borderRadius: 'var(--r-md)' }}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.message && !state.ok ? state.message : undefined} />
      <textarea name="body" className="textarea" placeholder="Your response, visible once moderated." required minLength={5} maxLength={2000} />
      <div className="row gap-2">
        <SubmitButton pendingLabel="Sending…" className="btn btn-secondary btn-sm">Submit response</SubmitButton>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
