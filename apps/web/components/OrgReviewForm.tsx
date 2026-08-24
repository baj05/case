'use client';

import { useActionState, useState } from 'react';
import { submitOrganisationReviewAction } from '@/app/actions';
import { Field, FormError, SubmitButton, RatingRadios } from './Forms';
import { AvatarPicker } from './AvatarPicker';

const DIMENSIONS = [
  { key: 'communication', label: 'Communication' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'processClarity', label: 'Process / project management' },
  { key: 'overallSatisfaction', label: 'Overall satisfaction' },
] as const;

export function OrgReviewForm({ slug, basePath, kind }: { slug: string; basePath: '/firms' | '/lpo'; kind: string }) {
  const [state, formAction] = useActionState(submitOrganisationReviewAction, null);
  const isLpo = kind === 'lpo';
  const [displayMode, setDisplayMode] = useState<'attributed' | 'pseudonymous' | 'anonymous'>('attributed');

  return (
    <form action={formAction} className="stack gap-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="basePath" value={basePath} />
      <input type="hidden" name="experienceCategory" value="legal_matter" />
      <FormError message={state?.ok ? undefined : state?.message} />

      <Field name="reviewerType" label="You are">
        <select name="reviewerType" id="reviewerType" className="input" defaultValue="corporate_legal_team">
          <option value="corporate_legal_team">A corporate legal team / business client</option>
          <option value="client">An individual client</option>
          <option value="vendor">A vendor / partner organisation</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <div className="grid-auto">
        {DIMENSIONS.map((d) => (
          <RatingRadios key={d.key} name={d.key} label={isLpo && d.key === 'processClarity' ? 'Turnaround / SLA adherence' : d.label} required={d.key === 'overallSatisfaction'} />
        ))}
      </div>

      <Field name="wouldRecommend" label="Would you recommend this organisation?">
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
        <select name="displayMode" id="displayMode" className="input" defaultValue="attributed"
          onChange={(e) => setDisplayMode(e.currentTarget.value as typeof displayMode)}>
          <option value="attributed">Full name</option>
          <option value="pseudonymous">First name + last initial</option>
          <option value="anonymous">Anonymous</option>
        </select>
      </Field>
      <p className="t-caption">
        If your account email matches this organisation&apos;s own verified domain, your review is marked as a
        verified engagement — otherwise it publishes as an unverified experience. Your identity is always
        retained internally for accountability, even when displayed anonymously.
      </p>

      <AvatarPicker name="avatarUrl" disabled={displayMode === 'anonymous'} />

      <SubmitButton pendingLabel="Submitting…">Submit for moderation</SubmitButton>
    </form>
  );
}
