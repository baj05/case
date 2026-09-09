import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheckIcon, DocumentIcon, MailIcon, GavelIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Privacy, terms of use, grievance redressal, and how to correct or remove a listing.',
};

const PAGES = [
  { href: '/legal/privacy', label: 'Privacy', body: 'What personal data this platform holds, why, and how to exercise your rights.', icon: <ShieldCheckIcon size={18} /> },
  { href: '/legal/terms', label: 'Terms of use', body: 'Terms of use for this platform.', icon: <DocumentIcon size={18} /> },
  { href: '/legal/grievance', label: 'Grievance redressal', body: 'How to raise a grievance and what happens next.', icon: <MailIcon size={18} /> },
  { href: '/legal/data-request', label: 'Correct or remove your listing', body: 'Ask us to fix, correct, or withhold a listing — no justification required.', icon: <GavelIcon size={18} /> },
];

export default function LegalIndexPage() {
  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2" style={{ maxWidth: '60ch' }}>
        <p className="t-label-mono ink-variant">Legal</p>
        <h1 className="t-display-lg">Privacy, terms, and how to raise a concern.</h1>
        <p className="t-body-lg ink-variant">
          Four real pages, no dead ends: what data we hold, the terms you&rsquo;re agreeing to, how to
          escalate a grievance, and the fastest path to correcting or removing a listing.
        </p>
      </div>
      <div className="row wrap gap-4">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} className="card stack gap-2" style={{ padding: 20, flex: '1 1 260px', textDecoration: 'none' }}>
            <span className="section-icon" aria-hidden="true">{p.icon}</span>
            <strong className="t-title-sm">{p.label}</strong>
            <span className="t-body-sm ink-variant">{p.body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
