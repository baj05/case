import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getFlags } from '@/lib/data';
import { listOrgsForUser } from '@lexhall/db';
import { currentUser } from '@/lib/auth';
import { Notice } from '@/components/States';
import { CorporateSignupForm, CreateOrganisationForm } from '@/components/CorporateForms';
import { COVER_TIERS } from '@/app/corporate/cover-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set up a company account — Corporate Suite',
  description: 'Create a company account so your team shares the same documents, bookings and legal paperwork.',
  robots: { index: false, follow: true },
};

export default async function CorporateStartPage({
  searchParams,
}: { searchParams: Promise<{ plan?: string }> }) {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  if (!getFlags().FEATURE_CORPORATE) notFound();

  const { plan: planSlug } = await searchParams;
  const plan = COVER_TIERS.find((t) => t.slug === planSlug);

  const user = await currentUser();
  const existing = user ? listOrgsForUser(user.id) : [];

  return (
    <div className="container section stack gap-6" style={{ maxWidth: '60ch' }}>
      <div className="stack gap-2">
        <Link href="/corporate" className="t-body-sm">← Corporate Suite</Link>
        <h1 className="t-headline-lg">Set up a company account</h1>
        <p className="t-body ink-variant">
          A company account keeps your documents and bookings together, and lets colleagues work in the
          same place instead of forwarding files to each other.
        </p>
      </div>

      {plan && (
        <Notice tone="info" title={`Setting up: ${plan.name}`}>
          {plan.priceMonthly
            ? `₹${plan.priceMonthly.toLocaleString('en-IN')}/month, or ₹${plan.priceYearly!.toLocaleString('en-IN')}/year.`
            : 'Custom pricing.'}{' '}
          Create your account below, then mention {plan.name} when your advocate reaches out to confirm scope
          and billing — nothing is charged automatically.
        </Notice>
      )}

      {existing.length > 0 && (
        <section className="stack gap-3">
          <h2 className="t-headline-md">Your accounts</h2>
          <div className="stack gap-2">
            {existing.map((m) => (
              <Link key={m.slug} href={`/corporate/o/${m.slug}`} className="result-card lift"
                style={{ gridTemplateColumns: 'minmax(0, 1fr)', textDecoration: 'none' }}>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <strong>{m.name}</strong>
                  <span className="chip chip-outline">{m.role.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="stack gap-3">
        <h2 className="t-headline-md">{user ? 'Add another company' : 'Create the account'}</h2>
        {user ? <CreateOrganisationForm /> : <CorporateSignupForm />}
      </section>

      <div className="notice notice-legal">
        <span className="notice-icon" aria-hidden="true">ⓘ</span>
        <span className="t-body-sm">
          caseADVO is not your lawyer. A company account is a place to prepare and keep paperwork; it is
          not legal advice, and nothing here creates a lawyer–client relationship.
        </span>
      </div>

      {!user && (
        <p className="t-body-sm ink-variant">
          Already have an account? <Link href="/login?next=/corporate/start">Sign in</Link> and you can create
          the company from here.
        </p>
      )}
    </div>
  );
}
