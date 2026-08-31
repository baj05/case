import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getFlags } from '@/lib/data';
import { peekInvite } from '@lexhall/db';
import { currentUser } from '@/lib/auth';
import { Notice } from '@/components/States';
import { AcceptInviteForm, AcceptInviteSignupForm } from '@/components/CorporateForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Join a company account',
  // The URL contains a live credential. It must never be indexed, and no
  // referrer may carry it to another site.
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  if (!getFlags().FEATURE_CORPORATE) notFound();

  const invite = peekInvite(token);
  const user = await currentUser();

  // One message for expired, revoked, already-used and never-existed. Telling
  // them apart would let someone probing tokens learn which guesses were warm.
  if (!invite) {
    return (
      <div className="container section stack gap-4" style={{ maxWidth: '54ch' }}>
        <h1 className="t-headline-lg">This invitation is not valid</h1>
        <Notice tone="warn" title="Nothing to join">
          The link may have expired, been used already, or been withdrawn. Ask whoever invited you to send
          a new one.
        </Notice>
        <Link href="/" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>Back to caseADVO</Link>
      </div>
    );
  }

  return (
    <div className="container section stack gap-5" style={{ maxWidth: '54ch' }}>
      <div className="stack gap-2">
        <h1 className="t-headline-lg">Join {invite.organisationName}</h1>
        <p className="t-body ink-variant">
          You have been invited as <strong>{invite.role.replace('_', ' ')}</strong>. Joining lets you work on
          the company’s documents and bookings alongside your colleagues.
        </p>
      </div>

      {user ? (
        <div className="stack gap-3">
          <p className="t-body-sm ink-variant">Signed in as {user.email}.</p>
          <AcceptInviteForm token={token} organisationName={invite.organisationName} />
          <p className="t-caption">
            Wrong account? <Link href="/login">Sign in as someone else</Link> and open this link again.
          </p>
        </div>
      ) : (
        <div className="stack gap-4">
          <AcceptInviteSignupForm token={token} email={invite.email} />
          <p className="t-body-sm ink-variant">
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(`/corporate/join/${token}`)}`}>Sign in</Link>{' '}
            and you will come straight back here.
          </p>
        </div>
      )}

      <div className="notice notice-legal">
        <span className="notice-icon" aria-hidden="true">ⓘ</span>
        <span className="t-body-sm">
          Holding this link is not proof of your email address, so we do not treat it as verifying one.
          Joining gives you access to this company’s account only.
        </span>
      </div>
    </div>
  );
}
