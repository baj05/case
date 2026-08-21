'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, null);
  const val = state?.values ?? {};

  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <Field name="email" label="Email">
        <input id="email" name="email" type="email" className="input" autoComplete="email" required
          defaultValue={val.email ?? ''} />
      </Field>
      <Field name="password" label="Password">
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </Field>

      <div className="row wrap gap-2">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn btn-ghost">
          Create an account instead
        </Link>
      </div>
    </form>
  );
}
