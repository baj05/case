import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '@/components/States';

export const metadata: Metadata = { title: 'Privacy', description: 'What personal data this platform holds, why, and how to exercise your rights.' };

export default function PrivacyPage() {
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 760 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Legal</p>
        <h1 className="t-headline-lg">Privacy</h1>
      </div>

      <Notice tone="warn" title="Prototype notice">
        This is a working summary of the platform&apos;s actual data handling, not a finished privacy
        notice. A published notice must be drafted and reviewed by counsel against the Digital Personal
        Data Protection Act 2023 before launch.
      </Notice>

      {[
        ['What we hold about professionals',
          'Name, professional role, Bar Council, jurisdiction, office or chamber address, and the official photograph — all from public registers, with the source URL and capture date recorded. We also hold personal email addresses, telephone numbers and residential addresses from those registers, which we do not publish and use only to verify that someone claiming a profile is who they say they are.'],
        ['What we hold about people making enquiries',
          'Your name, email, optional phone number, and the description you write. Enquiry descriptions are treated as confidential: they are excluded from every search index, and never included in analytics.'],
        ['What we log',
          'Search queries and what our classifier concluded from them, so we can find gaps in coverage. Queries are stored; matter descriptions are not.'],
        ['Your rights',
          'You can ask what we hold, ask us to correct it, ask for a copy, ask us to stop listing you, or ask for erasure. Every request is logged with a 30-day response clock.'],
      ].map(([h, b]) => (
        <section key={h} className="stack gap-2">
          <h2 className="t-headline-md">{h}</h2>
          <p className="t-body">{b}</p>
        </section>
      ))}

      <Link href="/legal/data-request" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Exercise a right</Link>
    </div>
  );
}
