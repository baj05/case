import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { AdvoOpener } from './AdvoOpener';
import { databaseReady } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Advo AI — the side chat that filters our directory',
  description:
    'Describe your legal problem in your own words. Advo AI works out the practice area, jurisdiction and court, then shortlists professionals — without leaving the page you were on.',
};

/**
 * Advo AI does not need a dedicated page: the launcher lives on every page as
 * a floating side panel (the master brief calls for a chat "on the side, not a
 * whole page"). This route exists only for deep links from email or press;
 * it explains what Advo AI is and offers a button that opens the launcher.
 * Keeping the route removes a broken link surface; keeping it thin stops it
 * from competing with search as a second-primary CTA.
 */
export default function AdvoAiLanding() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> first.
        </Notice>
      </div>
    );
  }
  return (
    <div className="container section stack gap-6" style={{ maxWidth: 720 }}>
      <div className="stack gap-3">
        <p className="t-label-mono ink-variant">Advo AI</p>
        <h1 className="t-headline-lg">The side chat that filters our directory</h1>
        <p className="t-body ink-variant measure">
          Describe your problem the way you would to a friend — <em>&ldquo;my landlord is not
          returning my deposit&rdquo;</em>, <em>&ldquo;my electricity bill is 40,000 rupees&rdquo;</em>,
          <em> &ldquo;PF not deposited for six months&rdquo;</em>. Advo AI works out the practice
          area, the jurisdiction, whether there is a specific matter type, and shortlists
          professionals for you. Every answer it offers is stitched together deterministically from
          our own taxonomy — it does not give legal advice.
        </p>
      </div>
      <div className="row wrap gap-3">
        {/* The chat lives on every page as a floating launcher. Rather than
            re-render the whole chat here, we open the launcher. */}
        <AdvoOpener />
        <Link href="/search" className="btn btn-secondary btn-pill btn-lg">Search directly</Link>
        <Link href="/matters" className="btn btn-ghost btn-lg">Browse legal matters</Link>
      </div>
      <Notice tone="info">
        Advo AI shortlists from our directory of professionals listed on official Bar Council
        registers. It does not represent them, cannot receive money on their behalf, and never
        ranks paid entries higher than unpaid ones.
      </Notice>
    </div>
  );
}
