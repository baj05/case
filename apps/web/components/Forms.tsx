'use client';

import { useFormStatus } from 'react-dom';

/**
 * Shared form primitives.
 *
 * NOTE ON THE SERVER/CLIENT BOUNDARY: an earlier version of this file exported
 * a generic `ActionForm` that took `children` as a render function. That cannot
 * work — a server component cannot pass a function prop to a client component,
 * and Next.js rejects it at render time. Concrete form components that own
 * their own fields and receive only serialisable props are the correct shape.
 * See ClaimForm, ConsultForm and DataRequestForm.
 */

export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

/** Submit button reflecting pending state; cannot be double-fired. */
export function SubmitButton({ children, pendingLabel = 'Sending…', className = 'btn btn-primary' }:
  { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} data-loading={pending} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
      {pending && <span className="sr-only">{pendingLabel}</span>}
    </button>
  );
}

export function Field({
  name, label, hint, error, required, children,
}: {
  name: string; label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}{required && <span className="req" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <span className="hint" id={`${name}-hint`}>{hint}</span>}
      {children}
      {error && (
        <span className="error-text" id={`${name}-error`} role="alert">
          <span aria-hidden="true">!</span>{error}
        </span>
      )}
    </div>
  );
}

/**
 * Always renders the `role="alert"` container, even with no message — only
 * the text inside is conditional. A live region that is CREATED at the same
 * instant its text appears is exactly the case screen readers announce
 * unreliably; one already present in the tree, whose content later changes,
 * is the case they announce.
 */
export function FormError({ message }: { message?: string }) {
  return (
    <div className="notice notice-error" role="alert" hidden={!message}>
      {message && (
        <>
          <span className="notice-icon" aria-hidden="true">!</span>
          <span>{message}</span>
        </>
      )}
    </div>
  );
}

export function FormSuccess({ heading, message }: { heading?: string; message?: string }) {
  return (
    <div className="notice notice-ok" role="status">
      <span className="notice-icon" aria-hidden="true">✓</span>
      <div className="stack gap-1">
        {heading && <strong>{heading}</strong>}
        <span>{message}</span>
      </div>
    </div>
  );
}

/** A 1..5 rating row of radio inputs with visible numeric labels — used by
 * every review/feedback form (advocate, organisation, site feedback) so the
 * markup lives in exactly one place. */
export function RatingRadios({ name, label, required = false, scale = 5 }: { name: string; label: string; required?: boolean; scale?: number }) {
  return (
    // fieldset/legend, not a bare label with no htmlFor: without a real
    // grouping element these five radios were announced as unrelated
    // options with no group name to tell a screen-reader user why.
    <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="label" style={{ padding: 0 }}>{label}</legend>
      <div className="row gap-2">
        {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
          <label key={n} className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="radio" name={name} value={n} required={required} />
            <span className="t-caption">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
