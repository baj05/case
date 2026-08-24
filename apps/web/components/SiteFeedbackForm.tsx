'use client';

import { useActionState } from 'react';
import { submitSiteFeedbackAction } from '@/app/actions';
import { FormError, SubmitButton, RatingRadios } from './Forms';

const CATEGORIES = [
  { key: 'website', label: 'Website experience' },
  { key: 'search', label: 'Search experience' },
  { key: 'discovery', label: 'Lawyer discovery' },
  { key: 'booking', label: 'Booking experience' },
  { key: 'resources', label: 'Resources' },
  { key: 'speed', label: 'Speed' },
  { key: 'design', label: 'Design' },
] as const;

export function SiteFeedbackForm() {
  const [state, formAction] = useActionState(submitSiteFeedbackAction, null);

  if (state?.ok) {
    return (
      <div className="card stack gap-2" style={{ padding: 24, textAlign: 'center' }}>
        <strong className="t-title">Thank you</strong>
        <p className="t-body ink-variant">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="stack gap-5" noValidate>
      <FormError message={!state?.ok ? state?.message : undefined} />

      <div className="grid-auto">
        {CATEGORIES.map((c) => <RatingRadios key={c.key} name={c.key} label={c.label} />)}
      </div>

      <div className="field">
        <label className="label" htmlFor="recommendScore">Would you recommend CaseADVO? (0 = not at all, 10 = definitely)</label>
        <div className="row wrap gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <label key={n} className="row gap-1" style={{ alignItems: 'center' }}>
              <input type="radio" name="recommendScore" value={n} />
              <span className="t-caption">{n}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="improvementArea">What could we improve?</label>
        <select name="improvementArea" id="improvementArea" className="input" defaultValue="">
          <option value="">Prefer not to say</option>
          <option value="navigation">Navigation</option>
          <option value="search">Search</option>
          <option value="profiles">Lawyer profiles</option>
          <option value="reviews">Reviews</option>
          <option value="booking">Booking</option>
          <option value="resources">Resources</option>
          <option value="payments">Payments</option>
          <option value="mobile">Mobile experience</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="comment">Tell us more (optional)</label>
        <textarea id="comment" name="comment" className="textarea" maxLength={2000} rows={5} placeholder="What is the one thing we should improve?" />
      </div>

      <div className="field">
        <label className="label">How should this appear?</label>
        <div className="row gap-3">
          <label className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="radio" name="displayMode" value="anonymous" defaultChecked /> <span className="t-caption">Anonymous</span>
          </label>
          <label className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="radio" name="displayMode" value="attributed" /> <span className="t-caption">Linked to my account</span>
          </label>
        </div>
      </div>

      <SubmitButton pendingLabel="Submitting…">Submit feedback</SubmitButton>
    </form>
  );
}
