import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { LEGAL_COPY } from '@/lib/brand';

export const metadata: Metadata = { title: 'Terms', description: 'Terms of use for this platform.' };

export default function TermsPage() {
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 760 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Legal</p>
        <h1 className="t-headline-lg">Terms of use</h1>
      </div>
      <Notice tone="warn" title="Prototype notice">
        Placeholder terms describing how the prototype actually behaves. Enforceable terms must be
        drafted and reviewed by counsel before launch.
      </Notice>
      <section className="stack gap-2">
        <h2 className="t-headline-md">Not legal advice</h2>
        <p className="t-body">{LEGAL_COPY.notAdvice}</p>
      </section>
      <section className="stack gap-2">
        <h2 className="t-headline-md">No endorsement</h2>
        <p className="t-body">{LEGAL_COPY.noEndorsement}</p>
      </section>
      <section className="stack gap-2">
        <h2 className="t-headline-md">Fees</h2>
        <p className="t-body">{LEGAL_COPY.feesGated}</p>
      </section>
      <section className="stack gap-2">
        <h2 className="t-headline-md">Accuracy</h2>
        <p className="t-body">
          Listings are compiled from third-party public registers and may be incomplete or out of date.
          Each profile states when it was captured and last checked. Verify anything that matters
          directly with the professional or the relevant Bar Council.
        </p>
      </section>
    </div>
  );
}
