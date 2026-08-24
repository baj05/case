import type { Metadata } from 'next';
import { SiteFeedbackForm } from '@/components/SiteFeedbackForm';

export const metadata: Metadata = { title: 'Rate CaseADVO', description: 'Tell us how the platform itself is doing — separate from reviewing a lawyer.' };

export default function RateUsPage() {
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 640 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Platform feedback</p>
        <h1 className="t-headline-lg">How are we doing?</h1>
        <p className="t-body ink-variant">
          Your feedback helps us make CaseADVO better. This is about the website itself — not
          about any advocate, firm or LPO provider. To rate a professional you have worked with,{' '}
          go to their profile and use <strong>Write a review</strong> there instead.
        </p>
      </div>
      <SiteFeedbackForm />
    </div>
  );
}
