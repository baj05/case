'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signupAction, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};

  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <Field name="fullName" label="Full name" required error={err.fullName}>
        <input id="fullName" name="fullName" className="input" autoComplete="name" required
          defaultValue={val.fullName ?? ''} aria-invalid={Boolean(err.fullName)} />
      </Field>
      <Field name="email" label="Email" required error={err.email}>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required
          defaultValue={val.email ?? ''} aria-invalid={Boolean(err.email)} />
      </Field>
      <Field name="password" label="Password" required hint="At least 8 characters." error={err.password}>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8}
          aria-invalid={Boolean(err.password)} />
      </Field>

      <div className="row wrap gap-2">
        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn btn-ghost">
          Sign in instead
        </Link>
      </div>
    </form>
  );
}
