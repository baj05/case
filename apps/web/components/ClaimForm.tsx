'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitClaim } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

export function ClaimForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState(submitClaim, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};

  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <div className="form-grid">
        <Field name="contactEmail" label="Your email" required
          hint="Use the address on the Bar Council record if you can — it is the strongest signal."
          error={err.contactEmail}>
          <input id="contactEmail" name="contactEmail" type="email" className="input" autoComplete="email" required
            defaultValue={val.contactEmail ?? ''} aria-invalid={Boolean(err.contactEmail)}
            aria-describedby={err.contactEmail ? 'contactEmail-error' : 'contactEmail-hint'} />
        </Field>

        <Field name="contactPhone" label="Your phone" hint="Optional, but it helps us verify." error={err.contactPhone}>
          <input id="contactPhone" name="contactPhone" type="tel" className="input" autoComplete="tel"
            defaultValue={val.contactPhone ?? ''} aria-invalid={Boolean(err.contactPhone)} />
        </Field>
      </div>

      <Field name="enrolmentNumber" label="Bar enrolment number"
        hint="Optional here, required before we can show “Bar enrolment verified”. Format varies by Council, e.g. D/1234/2005."
        error={err.enrolmentNumber}>
        <input id="enrolmentNumber" name="enrolmentNumber" className="input mono" defaultValue={val.enrolmentNumber ?? ''} />
      </Field>

      <Field name="statement" label="How can we confirm this is you?" required
        hint="For example: the chamber address listed, your position on the Council, or a professional website that names you."
        error={err.statement}>
        <textarea id="statement" name="statement" className="textarea" required minLength={20} maxLength={1200}
          defaultValue={val.statement ?? ''} aria-invalid={Boolean(err.statement)}
          aria-describedby={err.statement ? 'statement-error' : 'statement-hint'} />
      </Field>

      <div className="stack gap-2">
        <label className="checkbox-row">
          <input type="checkbox" name="declaration" value="1" required aria-invalid={Boolean(err.declaration)} />
          <span className="t-body-sm">
            I declare that I am the person described in this profile, or a person they have authorised,
            and that the information I have given is true. I understand that impersonating a legal
            professional is a serious matter and that claims are logged.
          </span>
        </label>
        {err.declaration && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{err.declaration}</span>}
      </div>

      <div className="row wrap gap-2">
        <SubmitButton pendingLabel="Submitting claim…">Submit claim</SubmitButton>
        <Link href={`/advocates/${slug}`} className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
