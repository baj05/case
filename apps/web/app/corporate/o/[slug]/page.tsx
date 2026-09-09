import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getFlags, getResourcesBySlug } from '@/lib/data';
import { listOrgMembers, listOrgBookings } from '@lexhall/db';
import { requireOrgMember, can } from '@/lib/org';
import { Notice } from '@/components/States';
import { CORPORATE_SUITE_SLUGS } from '@lexhall/core';
import { CompanyProfileForm } from '@/components/CorporateForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Company account — Corporate Suite',
  // A tenant page must never be indexed: the title alone would disclose
  // which companies have accounts here.
  robots: { index: false, follow: false },
};

export default async function CorporateOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  if (!getFlags().FEATURE_CORPORATE) notFound();

  const ctx = await requireOrgMember(slug, 'org.read', `/corporate/o/${slug}`);
  const { membership, entitlements } = ctx;

  const members = listOrgMembers(membership.organisationId);
  const bookings = listOrgBookings(membership.organisationId, 10);
  const documents = getResourcesBySlug(CORPORATE_SUITE_SLUGS.slice(0, 4));

  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2">
        <Link href="/corporate" className="t-body-sm">← Corporate Suite</Link>
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 className="t-headline-lg">{membership.name}</h1>
          <span className="chip chip-outline">You are: {membership.role.replace('_', ' ')}</span>
        </div>
      </div>

      {ctx.viaPlatformAdmin && (
        <Notice tone="info" title="Viewing as a platform administrator">
          You are seeing this account because you hold the <code className="mono">platform_admin</code> role,
          not because you are a member of it. This view is read-only — administrators cannot change a
          customer’s roster from here.
        </Notice>
      )}

      <div className="grid-auto">
        <div className="card stack gap-1" style={{ padding: 16 }}>
          <span className="t-label-mono ink-variant">People</span>
          <span className="t-headline-md">{members.length} of {entitlements.seatLimit}</span>
          <span className="t-caption">Seats include open invitations.</span>
        </div>
        <div className="card stack gap-1" style={{ padding: 16 }}>
          <span className="t-label-mono ink-variant">Company bookings</span>
          <span className="t-headline-md">{bookings.length}</span>
          <span className="t-caption">Only bookings made in the company’s name appear here.</span>
        </div>
      </div>

      <section className="card stack gap-3" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
        <div className="stack gap-1">
          <h2 className="t-headline-md">Company profile</h2>
          <p className="t-body-sm ink-variant measure">
            What an advocate assigned to this account sees before the first conversation — so they arrive
            with context, not a blank page.
          </p>
        </div>
        {!ctx.viaPlatformAdmin && can(membership.role, 'org.settings') ? (
          <CompanyProfileForm slug={slug} industry={membership.industry} about={membership.about} />
        ) : (
          <div className="stack gap-2">
            <p className="t-body-sm">
              <strong>Industry:</strong> {membership.industry ?? <span className="ink-variant">Not stated</span>}
            </p>
            <p className="t-body-sm">
              <strong>About:</strong> {membership.about ?? <span className="ink-variant">Not stated</span>}
            </p>
          </div>
        )}
      </section>

      <section className="stack gap-3">
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="t-headline-md">Documents</h2>
          <Link href="/corporate" className="btn btn-secondary btn-sm">All documents</Link>
        </div>
        <div className="grid-auto">
          {documents.map((d) => (
            <article key={d.slug} className="result-card lift" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <div className="stack gap-2" style={{ minWidth: 0 }}>
                <h3 className="t-title">
                  <Link href={`/corporate/${d.slug}`} style={{ textDecoration: 'none' }}>{d.title}</Link>
                </h3>
                <p className="t-body-sm ink-variant clamp-2">{d.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stack gap-3">
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="t-headline-md">People</h2>
          {can(membership.role, 'member.invite') && !ctx.viaPlatformAdmin && (
            <Link href={`/corporate/o/${slug}/team`} className="btn btn-primary btn-sm">Manage the team</Link>
          )}
        </div>
        <div className="stack gap-2">
          {members.map((m) => (
            <div key={m.userId} className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
              <span>{m.fullName} <span className="t-caption">{m.email}</span></span>
              <span className="chip chip-outline">{m.role.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Recent company bookings</h2>
        {bookings.length === 0 ? (
          <Notice tone="info" title="No company bookings yet">
            A booking counts as the company’s when a member makes it from this account. Bookings made
            personally, or before this account existed, stay with the person who made them.
          </Notice>
        ) : (
          <div className="stack gap-2">
            {bookings.map((b) => (
              <div key={b.reference} className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                <span>
                  <Link href={`/bookings/${b.reference}`}>{b.reference}</Link>
                  {' — '}{b.professionalName}
                </span>
                <span className="t-caption">{b.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
