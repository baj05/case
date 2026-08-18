import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { Notice } from '@/components/States';

export const metadata: Metadata = { title: 'Grievance redressal', description: 'How to raise a grievance and what happens next.' };

export default function GrievancePage() {
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 760 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Legal</p>
        <h1 className="t-headline-lg">Grievance redressal</h1>
      </div>
      <p className="t-body">
        If something on this platform has harmed you — an inaccurate listing, an impersonation, a
        misuse of your data — you can raise a grievance and we will investigate it.
      </p>
      <div className="card stack gap-3" style={{ padding: 20 }}>
        <h2 className="t-title">How to raise one</h2>
        <ol className="stack gap-2" style={{ listStyle: 'decimal', paddingLeft: 20 }}>
          <li className="t-body-sm">Submit the <Link href="/legal/data-request" style={{ textDecoration: 'underline' }}>request form</Link>, choosing &ldquo;Raise a grievance&rdquo;.</li>
          <li className="t-body-sm">You get a reference. The request enters a queue ordered by due date, not by convenience.</li>
          <li className="t-body-sm">We acknowledge, investigate, and respond within 30 days.</li>
          <li className="t-body-sm">If a listing is the subject of the grievance, we withhold it from public pages while we investigate.</li>
        </ol>
      </div>
      <Notice tone="warn" title="Prototype notice">
        A named Grievance Officer with published contact details is required before launch. For now,
        requests reach <a href={`mailto:${BRAND.supportEmail}`} style={{ textDecoration: 'underline' }}>{BRAND.supportEmail}</a>.
      </Notice>
    </div>
  );
}
