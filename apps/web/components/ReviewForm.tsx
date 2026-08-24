'use client';

import { useActionState } from 'react';
import { submitReviewAction } from '@/app/actions';
import { Field, FormError, SubmitButton, RatingRadios } from './Forms';

export interface EligibleExperience { id: number; reference: string; occurredAt: string | null; kind: 'booking' | 'consultation' }

const DIMENSIONS = [
  { key: 'communication', label: 'Communication' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'processClarity', label: 'Process clarity' },
  { key: 'overallSatisfaction', label: 'Overall satisfaction' },
] as const;

export function ReviewForm({ slug, experiences }: { slug: string; experiences: EligibleExperience[] }) {
  const [state, formAction] = useActionState(submitReviewAction, null);
  const single = experiences.length === 1 ? experiences[0] : undefined;

  return (
    <form action={formAction} className="stack gap-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state?.ok ? undefined : state?.message} />

      {experiences.length > 1 ? (
        <Field name="experienceId" label="Which experience is this about?" required>
          <select name="experienceId" id="experienceId" className="input" required
            onChange={(e) => {
              const [kind, id] = e.currentTarget.value.split(':');
              const form = e.currentTarget.form!;
              (form.elements.namedItem('bookingId') as HTMLInputElement).value = kind === 'booking' ? (id ?? '') : '';
              (form.elements.namedItem('consultationRequestId') as HTMLInputElement).value = kind === 'consultation' ? (id ?? '') : '';
            }}>
            <option value="">Choose one</option>
            {experiences.map((e) => (
              <option key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>
                {e.kind === 'booking' ? 'Booked engagement' : 'Consultation'} — {e.reference}
              </option>
            ))}
          </select>
          <input type="hidden" name="bookingId" />
          <input type="hidden" name="consultationRequestId" />
        </Field>
      ) : (
        <>
          <input type="hidden" name="bookingId" value={single?.kind === 'booking' ? String(single.id) : ''} />
          <input type="hidden" name="consultationRequestId" value={single?.kind === 'consultation' ? String(single.id) : ''} />
        </>
      )}

      <Field name="reviewerType" label="You are">
        <select name="reviewerType" id="reviewerType" className="input" defaultValue="client">
          <option value="client">A client</option>
          <option value="former_client">A former client</option>
          <option value="lawyer">A lawyer (collaboration / referral)</option>
          <option value="corporate_legal_team">A corporate legal team</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <div className="grid-auto">
        {DIMENSIONS.map((d) => <RatingRadios key={d.key} name={d.key} label={d.label} required={d.key === 'overallSatisfaction'} />)}
      </div>

      <Field name="wouldRecommend" label="Would you recommend this professional?">
        <select name="wouldRecommend" id="wouldRecommend" className="input" defaultValue="">
          <option value="">Prefer not to say</option>
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
      </Field>

      <Field name="body" label="Your experience" required hint="At least 15 characters. No confidential matter details, opposing-party names, or privileged content, please.">
        <textarea id="body" name="body" className="textarea" required minLength={15} maxLength={4000} rows={6} />
      </Field>

      <Field name="displayMode" label="How should this appear?" required>
        <select name="displayMode" id="displayMode" className="input" defaultValue="pseudonymous">
          <option value="attributed">Full name</option>
          <option value="pseudonymous">First name + last initial</option>
          <option value="anonymous">Anonymous</option>
        </select>
      </Field>
      <p className="t-caption">
        Your identity is always retained internally for accountability, fraud checks and lawful
        requests, even when displayed anonymously — see <a href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>how this works</a>.
      </p>

      <SubmitButton pendingLabel="Submitting…">Submit for moderation</SubmitButton>
    </form>
  );
}
