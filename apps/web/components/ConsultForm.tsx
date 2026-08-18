'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitConsultation } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

interface AreaOption { id: number; name: string; parentName: string | null }

/**
 * Consultation enquiry form. Receives only serialisable props from the server
 * page. On a validation failure the action returns the submitted values, which
 * are reapplied as defaults so nothing the user typed is ever lost (spec §103).
 */
export function ConsultForm({
  slug, areas, modes,
}: { slug: string; areas: AreaOption[]; modes: Array<[string, string]> }) {
  const [state, formAction] = useActionState(submitConsultation, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};

  return (
    <form action={formAction} className="stack gap-4" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <div className="form-grid">
        <Field name="requesterName" label="Your name" required error={err.requesterName}>
          <input id="requesterName" name="requesterName" className="input" autoComplete="name" required
            defaultValue={val.requesterName ?? ''} aria-invalid={Boolean(err.requesterName)}
            aria-describedby={err.requesterName ? 'requesterName-error' : undefined} />
        </Field>

        <Field name="requesterEmail" label="Email" required hint="Where the professional will reply." error={err.requesterEmail}>
          <input id="requesterEmail" name="requesterEmail" type="email" className="input" autoComplete="email" required
            defaultValue={val.requesterEmail ?? ''} aria-invalid={Boolean(err.requesterEmail)}
            aria-describedby={err.requesterEmail ? 'requesterEmail-error' : 'requesterEmail-hint'} />
        </Field>

        <Field name="requesterPhone" label="Phone" hint="Optional." error={err.requesterPhone}>
          <input id="requesterPhone" name="requesterPhone" type="tel" className="input" autoComplete="tel"
            defaultValue={val.requesterPhone ?? ''} aria-invalid={Boolean(err.requesterPhone)} />
        </Field>

        <Field name="preferredMode" label="How would you prefer to meet?">
          <select id="preferredMode" name="preferredMode" className="select" defaultValue={val.preferredMode ?? 'video'}>
            {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>

        <Field name="practiceAreaId" label="What is this about?" hint="Your best guess is fine.">
          <select id="practiceAreaId" name="practiceAreaId" className="select" defaultValue={val.practiceAreaId ?? ''}>
            <option value="">Not sure</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.parentName ? `${a.parentName} › ${a.name}` : a.name}</option>
            ))}
          </select>
        </Field>

        <Field name="urgency" label="How urgent is it?">
          <select id="urgency" name="urgency" className="select" defaultValue={val.urgency ?? 'normal'}>
            <option value="normal">No fixed deadline</option>
            <option value="urgent">There is a deadline soon</option>
            <option value="emergency">Urgent — today or tomorrow</option>
          </select>
        </Field>
      </div>

      <Field name="summary" label="What has happened?" required
        hint="A few sentences in your own words. Leave out names of other parties and anything confidential."
        error={err.summary}>
        <textarea id="summary" name="summary" className="textarea" required minLength={30} maxLength={2000}
          defaultValue={val.summary ?? ''}
          placeholder="For example: My employer has not deposited my PF contributions for eight months. I have raised it with HR twice in writing and had no reply."
          aria-invalid={Boolean(err.summary)}
          aria-describedby={err.summary ? 'summary-error' : 'summary-hint'} />
      </Field>

      <div className="stack gap-2">
        <label className="checkbox-row">
          <input type="checkbox" name="conflictAck" value="1" required aria-invalid={Boolean(err.conflictAck)} />
          <span className="t-body-sm">
            I understand this is an enquiry and not legal advice, that no lawyer–client relationship is
            created by sending it, and that the professional may decline — for example because of a
            conflict of interest.
          </span>
        </label>
        {err.conflictAck && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{err.conflictAck}</span>}
      </div>

      <div className="row wrap gap-2">
        <SubmitButton pendingLabel="Sending request…">Send request</SubmitButton>
        <Link href={`/advocates/${slug}`} className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
