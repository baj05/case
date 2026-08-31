import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getFlags } from '@/lib/data';
import { listOrgMembers, listOrgInvites, INVITABLE_ROLES } from '@lexhall/db';
import { requireOrgMember, can } from '@/lib/org';
import { Notice } from '@/components/States';
import { InviteMemberForm, RevokeInviteButton, MemberRow } from '@/components/CorporateForms';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Team — Corporate Suite',
  robots: { index: false, follow: false },
};

export default async function CorporateTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  if (!getFlags().FEATURE_CORPORATE) notFound();

  // 'member.invite' rather than 'org.read': a read_only member or a billing
  // contact has no business on this page at all, and the guard — not the
  // rendering — is what keeps them off it.
  const ctx = await requireOrgMember(slug, 'member.invite', `/corporate/o/${slug}/team`);
  const { membership, entitlements } = ctx;

  const members = listOrgMembers(membership.organisationId);
  const invites = listOrgInvites(membership.organisationId);
  const open = invites.filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt > new Date().toISOString());
  const seatsUsed = members.length + open.length;
  const canManage = can(membership.role, 'member.manage');

  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2">
        <Link href={`/corporate/o/${slug}`} className="t-body-sm">← {membership.name}</Link>
        <h1 className="t-headline-lg">Team</h1>
        <p className="t-body-sm ink-variant">
          {seatsUsed} of {entitlements.seatLimit} seats used, counting open invitations.
        </p>
      </div>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Invite someone</h2>
        <Notice tone="info" title="Invitations are links, not emails">
          This build has no mailer, so the invitation link is shown to you once, right after you create it,
          and you pass it on yourself. Only a hash of it is stored — it cannot be shown again, so a lost
          link means creating a new invitation.
        </Notice>
        <InviteMemberForm slug={slug} roles={INVITABLE_ROLES} />
      </section>

      {open.length > 0 && (
        <section className="stack gap-3">
          <h2 className="t-headline-md">Open invitations</h2>
          <div className="stack gap-2">
            {open.map((i) => (
              <div key={i.id} className="result-card" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stack gap-1" style={{ minWidth: 0 }}>
                    <strong>{i.email}</strong>
                    <span className="t-caption">
                      {i.role.replace('_', ' ')} · expires {formatDate(i.expiresAt)}
                    </span>
                  </div>
                  <RevokeInviteButton slug={slug} inviteId={i.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack gap-3">
        <h2 className="t-headline-md">People in this account</h2>
        {!canManage && (
          <p className="t-body-sm ink-variant">
            You can invite people, but changing roles and removing people is limited to owners and admins.
          </p>
        )}
        <div className="stack gap-2">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              slug={slug}
              userId={m.userId}
              fullName={m.fullName}
              email={m.email}
              role={m.role}
              roles={INVITABLE_ROLES}
              canManage={canManage}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
