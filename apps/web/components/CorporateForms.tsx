'use client';

import { useActionState, useState } from 'react';
import {
  corporateSignupAction, createOrganisationAction, inviteMemberAction,
  revokeInviteAction, setMemberRoleAction, removeMemberAction,
  acceptInviteAction, acceptInviteSignupAction,
} from '@/app/actions';
import { Field, FormError, FormSuccess, SubmitButton } from './Forms';

/**
 * Forms for the corporate surface.
 *
 * Each is a concrete component owning its own fields and taking only
 * serialisable props — the shape Forms.tsx's header note explains is the
 * only one that works across the server/client boundary.
 *
 * The organisation is always passed as a `slug` hidden field, and every
 * action re-resolves it against the signed-in user's real memberships. The
 * hidden field says *which* organisation the user means, never that they are
 * entitled to it.
 */

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', member: 'Member',
  billing: 'Billing contact', read_only: 'Read only',
};

const ROLE_HINT: Record<string, string> = {
  admin: 'Can invite and manage people, and book on the company’s behalf.',
  member: 'Can draft documents and book on the company’s behalf.',
  billing: 'Sees billing only. Cannot manage people or make bookings.',
  read_only: 'Can see the account, and change nothing.',
};

/** `Field` renders a hint and an error with predictable ids but has no way
 * to reach the control inside it to point at them — so every call site
 * builds its own `aria-describedby` with this, rather than each one
 * inventing (or forgetting) the association independently. */
function describedBy(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  return [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}

/** Create the company and the account together, for a new visitor. */
export function CorporateSignupForm() {
  const [state, formAction] = useActionState(corporateSignupAction, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};
  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <FormError message={state?.ok ? undefined : state?.message} />
      <Field name="companyName" label="Company name" required error={err.companyName}>
        <input id="companyName" name="companyName" className="input" autoComplete="organization" required
          defaultValue={val.companyName ?? ''} aria-invalid={Boolean(err.companyName)}
          aria-describedby={describedBy('companyName', false, Boolean(err.companyName))} />
      </Field>
      <Field name="fullName" label="Your name" required error={err.fullName}>
        <input id="fullName" name="fullName" className="input" autoComplete="name" required
          defaultValue={val.fullName ?? ''} aria-invalid={Boolean(err.fullName)}
          aria-describedby={describedBy('fullName', false, Boolean(err.fullName))} />
      </Field>
      <Field name="email" label="Work email" required error={err.email}>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required
          defaultValue={val.email ?? ''} aria-invalid={Boolean(err.email)}
          aria-describedby={describedBy('email', false, Boolean(err.email))} />
      </Field>
      <Field name="password" label="Password" hint="At least 8 characters." required error={err.password}>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password"
          required minLength={8} aria-invalid={Boolean(err.password)}
          aria-describedby={describedBy('password', true, Boolean(err.password))} />
      </Field>
      <SubmitButton pendingLabel="Creating…">Create the account</SubmitButton>
    </form>
  );
}

/** Create a company for someone already signed in. */
export function CreateOrganisationForm() {
  const [state, formAction] = useActionState(createOrganisationAction, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};
  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <FormError message={state?.ok ? undefined : state?.message} />
      <Field name="name" label="Company name" required error={err.name}>
        <input id="name" name="name" className="input" autoComplete="organization" required
          defaultValue={val.name ?? ''} aria-invalid={Boolean(err.name)}
          aria-describedby={describedBy('name', false, Boolean(err.name))} />
      </Field>
      <Field name="billingEmail" label="Billing email" hint="Optional." error={err.billingEmail}>
        <input id="billingEmail" name="billingEmail" type="email" className="input" autoComplete="email"
          defaultValue={val.billingEmail ?? ''} aria-invalid={Boolean(err.billingEmail)}
          aria-describedby={describedBy('billingEmail', true, Boolean(err.billingEmail))} />
      </Field>
      <SubmitButton pendingLabel="Creating…">Create the company account</SubmitButton>
    </form>
  );
}

export function InviteMemberForm({ slug, roles }: { slug: string; roles: readonly string[] }) {
  const [state, formAction] = useActionState(inviteMemberAction, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};
  // Controlled, not read from `val` (which only reflects the LAST failed
  // submission): the hint was permanently describing whatever role that
  // submission carried, ignoring every change the visitor made afterwards.
  const [role, setRole] = useState(val.role || 'member');
  return (
    <form action={formAction} className="stack gap-3" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.ok ? undefined : state?.message} />
      {state?.ok && (
        <FormSuccess heading="Invitation created" message={state.message} />
      )}
      <div className="form-grid">
        <Field name="inviteEmail" label="Email address" required error={err.email}>
          {/* autoComplete off: this is a third party's address, not the
              signed-in user's own — offering their own saved emails here
              invites inviting the wrong person by autofill. */}
          <input id="inviteEmail" name="email" type="email" className="input" autoComplete="off" required
            defaultValue={val.email ?? ''} aria-invalid={Boolean(err.email)}
            aria-describedby={describedBy('inviteEmail', false, Boolean(err.email))} />
        </Field>
        <Field name="inviteRole" label="Role" required error={err.role} hint={ROLE_HINT[role]}>
          <select id="inviteRole" name="role" className="select" value={role} onChange={(e) => setRole(e.target.value)}
            aria-describedby={describedBy('inviteRole', true, Boolean(err.role))}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
          </select>
        </Field>
      </div>
      <SubmitButton pendingLabel="Creating…" className="btn btn-primary btn-sm">Create invitation</SubmitButton>
    </form>
  );
}

export function RevokeInviteButton({ slug, inviteId }: { slug: string; inviteId: number }) {
  const [state, formAction] = useActionState(revokeInviteAction, null);
  return (
    <form action={formAction} className="row gap-2" style={{ alignItems: 'center' }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="inviteId" value={inviteId} />
      <SubmitButton pendingLabel="Revoking…" className="btn btn-ghost btn-sm">Revoke</SubmitButton>
      {state && !state.ok && <span className="error-text" role="alert">{state.message}</span>}
    </form>
  );
}

/**
 * Role change and removal, as one form per member row.
 *
 * The role select submits on change rather than needing a separate Save —
 * but there is still a real submit button, so the form works with
 * JavaScript off instead of silently doing nothing.
 */
export function MemberRow({
  slug, userId, fullName, email, role, roles, canManage,
}: {
  slug: string; userId: number; fullName: string; email: string;
  role: string; roles: readonly string[]; canManage: boolean;
}) {
  const [roleState, roleAction] = useActionState(setMemberRoleAction, null);
  const [removeState, removeAction] = useActionState(removeMemberAction, null);
  const error = (roleState && !roleState.ok && roleState.message)
    || (removeState && !removeState.ok && removeState.message)
    || undefined;

  return (
    <div className="result-card" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className="stack gap-2" style={{ minWidth: 0 }}>
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <strong>{fullName}</strong>
            <span className="t-caption">{email}</span>
          </div>
          {!canManage && <span className="chip chip-outline">{ROLE_LABEL[role] ?? role}</span>}
        </div>

        {canManage && (
          <div className="row wrap gap-2" style={{ alignItems: 'flex-end' }}>
            <form action={roleAction} className="row gap-2" style={{ alignItems: 'flex-end' }}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="targetUserId" value={userId} />
              <label className="stack gap-1">
                <span className="t-caption">Role</span>
                <select name="role" className="select" defaultValue={role} style={{ width: 'auto' }}>
                  {['owner', ...roles].map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
                </select>
              </label>
              <SubmitButton pendingLabel="Saving…" className="btn btn-secondary btn-sm">Save role</SubmitButton>
            </form>
            <form action={removeAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="targetUserId" value={userId} />
              <SubmitButton pendingLabel="Removing…" className="btn btn-ghost btn-sm">Remove</SubmitButton>
            </form>
          </div>
        )}

        {error && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{error}</span>}
      </div>
    </div>
  );
}

/** Accept an invitation when already signed in. */
export function AcceptInviteForm({ token, organisationName }: { token: string; organisationName: string }) {
  const [state, formAction] = useActionState(acceptInviteAction, null);
  return (
    <form action={formAction} className="stack gap-3">
      <input type="hidden" name="token" value={token} />
      <FormError message={state?.ok ? undefined : state?.message} />
      <SubmitButton pendingLabel="Joining…">Join {organisationName}</SubmitButton>
    </form>
  );
}

/** Accept an invitation and create an account in one step. */
export function AcceptInviteSignupForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(acceptInviteSignupAction, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};
  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state?.ok ? undefined : state?.message} />
      <Field name="fullName" label="Your name" required error={err.fullName}>
        <input id="fullName" name="fullName" className="input" autoComplete="name" required
          defaultValue={val.fullName ?? ''} aria-invalid={Boolean(err.fullName)}
          aria-describedby={describedBy('fullName', false, Boolean(err.fullName))} />
      </Field>
      <Field name="email" label="Email" required
        hint={`This invitation was created for ${email}.`} error={err.email}>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required
          defaultValue={val.email ?? email} aria-invalid={Boolean(err.email)}
          aria-describedby={describedBy('email', true, Boolean(err.email))} />
      </Field>
      <Field name="password" label="Choose a password" hint="At least 8 characters." required error={err.password}>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password"
          required minLength={8} aria-invalid={Boolean(err.password)}
          aria-describedby={describedBy('password', true, Boolean(err.password))} />
      </Field>
      <SubmitButton pendingLabel="Joining…">Create the account and join</SubmitButton>
    </form>
  );
}
