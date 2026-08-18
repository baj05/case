'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitDataRequest } from '@/app/actions';
import { Field, FormError, FormSuccess, SubmitButton } from './Forms';

const KINDS: Array<[string, string]> = [
  ['correction', 'Correct something that is wrong'],
  ['contact_removal', 'Remove contact details from my listing'],
  ['opt_out_listing', 'Remove my listing from public pages'],
  ['erasure', 'Erase my data entirely'],
  ['access', 'Tell me what data you hold about me'],
  ['export', 'Send me a copy of my data'],
  ['grievance', 'Raise a grievance'],
];

export function DataRequestForm({ profileSlug, cancelHref }: { profileSlug: string; cancelHref: string }) {
  const [state, formAction] = useActionState(submitDataRequest, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};

  if (state?.ok) return <FormSuccess heading="Request received" message={state.message} />;

  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="profile" value={profileSlug} />
      <FormError message={state?.message} />

      <Field name="kind" label="What would you like us to do?" required error={err.kind}>
        <select id="kind" name="kind" className="select" required defaultValue={val.kind ?? 'correction'}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>

      <div className="form-grid">
        <Field name="requesterName" label="Your name" required error={err.requesterName}>
          <input id="requesterName" name="requesterName" className="input" autoComplete="name" required
            defaultValue={val.requesterName ?? ''} aria-invalid={Boolean(err.requesterName)} />
        </Field>
        <Field name="requesterEmail" label="Your email" required error={err.requesterEmail}>
          <input id="requesterEmail" name="requesterEmail" type="email" className="input" autoComplete="email" required
            defaultValue={val.requesterEmail ?? ''} aria-invalid={Boolean(err.requesterEmail)} />
        </Field>
      </div>

      <Field name="requesterRelation" label="Are you the person concerned?">
        <select id="requesterRelation" name="requesterRelation" className="select" defaultValue={val.requesterRelation ?? 'self'}>
          <option value="self">Yes, this is about me</option>
          <option value="authorised_representative">No, I am authorised to act for them</option>
        </select>
      </Field>

      <Field name="detail" label="What should we change, and what is correct?" required
        hint="Be specific — which field, and what it should say. Please do not include documents here; we will ask if we need them."
        error={err.detail}>
        <textarea id="detail" name="detail" className="textarea" required minLength={20} maxLength={2000}
          defaultValue={val.detail ?? ''} aria-invalid={Boolean(err.detail)}
          aria-describedby={err.detail ? 'detail-error' : 'detail-hint'} />
      </Field>

      <div className="row wrap gap-2">
        <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
