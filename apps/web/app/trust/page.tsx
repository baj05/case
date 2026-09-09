import Link from 'next/link';
import type { Metadata } from 'next';
import { StarIcon, ShieldCheckIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Trust',
  description: 'How verification, ranking, and Legal Trust & Experience scoring work on this platform.',
};

export default function TrustIndexPage() {
  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2" style={{ maxWidth: '60ch' }}>
        <p className="t-label-mono ink-variant">Trust</p>
        <h1 className="t-display-lg">How we compute what you see.</h1>
        <p className="t-body-lg ink-variant">
          No ranking or score on this platform is a black box. Here is exactly how each one is
          calculated, sourced, and kept honest.
        </p>
      </div>
      <div className="row wrap gap-4">
        <Link href="/trust/reviews" className="card stack gap-2" style={{ padding: 20, flex: '1 1 260px', textDecoration: 'none' }}>
          <span className="section-icon" aria-hidden="true"><StarIcon size={16} /></span>
          <strong className="t-title-sm">Legal Trust &amp; Experience</strong>
          <span className="t-body-sm ink-variant">How the review-based experience score is calculated, and why a thin sample shows no score at all.</span>
        </Link>
        <Link href="/how-it-works" className="card stack gap-2" style={{ padding: 20, flex: '1 1 260px', textDecoration: 'none' }}>
          <span className="section-icon" aria-hidden="true"><ShieldCheckIcon size={16} /></span>
          <strong className="t-title-sm">How search ranking works</strong>
          <span className="t-body-sm ink-variant">The published weights behind every match score, and why nothing here can be paid for.</span>
        </Link>
      </div>
    </div>
  );
}
