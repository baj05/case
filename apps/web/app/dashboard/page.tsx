import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { listClaims, databaseReady } from '@/lib/data';
import { relativeDate } from '@/lib/format';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Professional dashboard', robots: { index: false, follow: false } };

/**
 * Authentication now exists (RT-010) — this route requires a signed-in
 * account. What it does NOT yet have is any real per-professional data: no
 * signup flow assigns the 'professional' role, and claim approval does not
 * link a professional record to an app_user account. So a signed-in user
 * lands here honestly: real claim pipeline, no invented appointments.
 */
export default async function DashboardPage() {
  const user = await requireUser(undefined, '/dashboard');
  const claims = databaseReady() ? listClaims() : [];

  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 860 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Signed in as {user.fullName}</p>
        <h1 className="t-headline-lg">Professional dashboard</h1>
      </div>

      <Notice tone="info" title="Signed in — but not linked to a professional record yet">
        Authentication is real (you are signed in), but nothing yet links your account to a specific
        professional profile — claim approval does not do that step. Rather than show a screen of
        invented appointments and analytics, here is the honest position: the claim pipeline that
        unlocks a real per-professional dashboard is real and running, below.
      </Notice>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What will be here</h2>
        <div className="grid-auto">
          {[
            ['Today', 'Appointments, urgent requests and anything overdue — first, not after the charts.'],
            ['Consultation requests', 'Structured briefs from the intake classifier, with accept and decline.'],
            ['Profile', 'Practice areas, courts, languages, availability, and what is verified.'],
            ['Matters', 'A workspace per matter with documents, tasks and a timeline.'],
            ['Referrals', 'Send and receive matters across jurisdictions. Gated pending conduct review.'],
            ['Analytics', 'Profile views and response times. No vanity metrics that reward solicitation.'],
          ].map(([t, b]) => (
            <div key={t} className="card stack gap-2" style={{ padding: 18 }}>
              <strong>{t}</strong>
              <span className="t-body-sm ink-variant">{b}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Claim pipeline (live)</h2>
        {claims.length === 0 ? (
          <p className="t-body ink-variant">
            No claims submitted yet. Claim a profile and it will appear here and in the admin queue.
          </p>
        ) : (
          <div className="stack gap-2">
            {claims.slice(0, 8).map((c) => (
              <div key={String(c.id)} className="card row wrap gap-3" style={{ padding: 14, justifyContent: 'space-between' }}>
                <Link href={`/advocates/${c.professionalSlug}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                  {String(c.professionalName)}
                </Link>
                <span className="row gap-2">
                  <span className="chip chip-outline">{String(c.status).replace(/_/g, ' ')}</span>
                  <span className="mono t-caption">signal {Number(c.matchScore)}/100</span>
                  <span className="t-caption">{relativeDate(c.createdAt as string)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="row wrap gap-2">
        <Link href="/for-professionals" className="btn btn-primary">Find and claim your profile</Link>
        <Link href="/admin" className="btn btn-secondary">Admin workbench</Link>
      </div>
    </div>
  );
}
