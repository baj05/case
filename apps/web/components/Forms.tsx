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

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <span className="notice-icon" aria-hidden="true">!</span>
      <span>{message}</span>
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
    <div className="field">
      <label className="label">{label}</label>
      <div className="row gap-2">
        {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
          <label key={n} className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="radio" name={name} value={n} required={required} />
            <span className="t-caption">{n}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
