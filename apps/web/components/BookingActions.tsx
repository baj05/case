'use client';

import { useActionState, useState } from 'react';
import { revealBookingDetailsAction, cancelBooking } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

/**
 * Reveal the confidential brief and meeting address for a visitor the
 * booking page could not already attribute to a session.
 *
 * The reference alone used to be treated as sufficient to read this — see
 * lib/booking-entitlement.ts. This form is the fallback for the no-account
 * booking flow: the reference is shown to anyone with the link, but the
 * email a booking was made with is not derivable from it, so asking for
 * both is a real (if modest) check rather than none at all.
 */
export function RevealBookingDetails({ reference }: { reference: string }) {
  const [state, formAction] = useActionState(revealBookingDetailsAction, null);

  if (state?.ok) {
    return (
      <div className="stack gap-1">
        <span className="t-label-mono ink-variant">What you told them</span>
        <p className="t-body-sm" style={{ whiteSpace: 'pre-wrap' }}>{state.brief}</p>
      </div>
    );
  }

  return (
    <div className="stack gap-2">
      <span className="t-label-mono ink-variant">What you told them</span>
      <p className="t-body-sm ink-variant">
        Hidden until you confirm the email this booking was made with.
      </p>
      <form action={formAction} className="row wrap gap-2" style={{ alignItems: 'flex-end' }}>
        <input type="hidden" name="reference" value={reference} />
        <Field name="revealEmail" label="Email used to book" error={state?.ok === false ? state.message : undefined}>
          <input id="revealEmail" name="email" type="email" className="input" autoComplete="email" required />
        </Field>
        <SubmitButton pendingLabel="Checking…" className="btn btn-secondary btn-sm">Show</SubmitButton>
      </form>
    </div>
  );
}

/**
 * Cancel a booking that has not already reached a terminal state.
 *
 * Works for a signed-in owner or org manager without asking for anything
 * further (cancelBooking re-derives that from the session); an anonymous
 * visitor is asked for the email, matching the existing no-account flow.
 */
export function CancelBookingForm({ reference }: { reference: string }) {
  const [state, formAction] = useActionState(cancelBooking, null);
  const [confirming, setConfirming] = useState(false);

  if (state?.ok) {
    return <p className="t-body-sm" role="status">Cancelled. The slot has been released.</p>;
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
        Cancel this booking
      </button>
    );
  }

  return (
    <form action={formAction} className="stack gap-2" style={{ maxWidth: '40ch' }}>
      <input type="hidden" name="reference" value={reference} />
      <FormError message={state?.ok === false ? state.message : undefined} />
      <Field name="cancelEmail" label="Confirm the email you booked with" hint="Not needed if you are signed in as the person or company that booked.">
        <input id="cancelEmail" name="email" type="email" className="input" autoComplete="email" />
      </Field>
      <Field name="cancelReason" label="Reason (optional)">
        <input id="cancelReason" name="reason" className="input" maxLength={500} />
      </Field>
      <div className="row gap-2">
        <SubmitButton pendingLabel="Cancelling…" className="btn btn-primary btn-sm">Confirm cancellation</SubmitButton>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Never mind</button>
      </div>
    </form>
  );
}
