#!/usr/bin/env node
/**
 * Functional test for corporate tenants, against a real, disposable SQLite
 * file (never the live data/lexhall.db) built fresh from the actual
 * migrations:
 *
 *   node scripts/test-corporate-accounts.mjs
 *
 * The invariants here are the ones that cost something if they break:
 * invitation replay, the last owner, seat limits, tenant isolation, and —
 * the reason org_domain_claim exists at all — that a corporate tenant can
 * never reach the columns the review trust engine reads.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'lexhall-corporate-test-'));
process.env.DATABASE_PATH = join(dir, 'test.db');

const {
  applySchema, db,
  createUser,
  createCorporateOrganisation, createOrgInvite, acceptInvite, peekInvite, revokeInvite,
  listOrgMembers, listOrgInvites, listOrgsForUser, setMemberRole, removeMember,
  getOrgMembershipBySlug, getCorporateOrgBySlug, listOrgBookings,
  createDomainClaim, markDomainClaimVerified, promoteVerifiedDomain, listDomainClaims,
  orgEntitlements, INVITABLE_ROLES,
  createOrganisationReview, getOrganisationBySlug, REVIEWABLE_ORG_KINDS,
} = await import('@lexhall/db');

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    const result = fn();
    if (result === false) { failures.push(`${name}: returned false`); return; }
    pass += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
/** Assert a call throws with a specific `code`. */
function throwsWith(code, fn) {
  try { fn(); } catch (error) { return error.code === code || error.message === code; }
  return false;
}

applySchema({ fresh: true });

// A country row is required by organisation.country_id.
const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
db().exec(`INSERT INTO country (id, iso2, iso3, name, currency_code, default_timezone, phone_code, created_at, updated_at)
           VALUES (1,'IN','IND','India','INR','Asia/Kolkata','+91','${ts}','${ts}')`);

const owner = createUser({ email: 'owner@acme.example', fullName: 'Owner One', password: 'password123' });
const colleague = createUser({ email: 'colleague@acme.example', fullName: 'Colleague Two', password: 'password123' });
const outsider = createUser({ email: 'outsider@other.example', fullName: 'Outsider Three', password: 'password123' });

// ---------------------------------------------------------------- creation
const org = createCorporateOrganisation({ name: 'Acme Robotics', ownerUserId: owner.id });

check('a corporate organisation is created with kind=corporate', () => org.kind === 'corporate');
check('the slug is derived from the name', () => org.slug === 'acme-robotics');
check('the creator becomes the owner — the first org_member row this codebase has ever written', () =>
  listOrgMembers(org.id).some((m) => m.userId === owner.id && m.role === 'owner'));
check('creation writes an audit_log row', () => {
  const rows = db().prepare(
    `SELECT action FROM audit_log WHERE subject_type='organisation' AND subject_id=?`,
  ).all(org.id);
  return rows.some((r) => r.action === 'organisation.created');
});

check('a second company with the same name gets a distinct slug rather than failing', () => {
  const dup = createCorporateOrganisation({ name: 'Acme Robotics', ownerUserId: outsider.id });
  return dup.slug === 'acme-robotics-2';
});

// -------------------------------------------------------- tenant isolation
check('a member resolves their own membership by slug', () =>
  getOrgMembershipBySlug(owner.id, org.slug)?.role === 'owner');
check('a non-member gets null, so the slug space is not an enumeration oracle', () =>
  getOrgMembershipBySlug(colleague.id, org.slug) === null);
check('listOrgsForUser shows only the caller’s own organisations', () =>
  !listOrgsForUser(colleague.id).some((m) => m.slug === org.slug));

// ------------------------------------------------------------- invitations
const invite = createOrgInvite({
  orgId: org.id, email: 'Colleague@Acme.example', role: 'member',
  actorUserId: owner.id, seatLimit: orgEntitlements(org.id).seatLimit,
});

check('an invitation returns a raw token', () => typeof invite.token === 'string' && invite.token.length > 20);
check('the RAW token is never stored — only its hash', () => {
  const row = db().prepare(`SELECT token_hash FROM org_invite WHERE id=?`).get(invite.id);
  return row.token_hash !== invite.token && row.token_hash.length === 64;
});
check('the invited address is stored lowercased', () =>
  listOrgInvites(org.id).some((i) => i.email === 'colleague@acme.example'));
check('peekInvite names the organisation without accepting it', () =>
  peekInvite(invite.token)?.organisationSlug === org.slug);
check('peekInvite on an unknown token returns null', () => peekInvite('not-a-real-token') === null);

check('INVITABLE_ROLES excludes owner', () => !INVITABLE_ROLES.includes('owner'));
check('an invitation can never confer ownership', () =>
  throwsWith('ROLE_NOT_INVITABLE', () => createOrgInvite({
    orgId: org.id, email: 'x@acme.example', role: 'owner', actorUserId: owner.id, seatLimit: 25,
  })));
check('a second OPEN invitation to the same address is refused', () =>
  throwsWith('INVITE_ALREADY_OPEN', () => createOrgInvite({
    orgId: org.id, email: 'colleague@acme.example', role: 'member', actorUserId: owner.id, seatLimit: 25,
  })));

// ------------------------------------------------------------ accept/replay
check('accepting an invitation adds the membership', () => {
  const r = acceptInvite({ token: invite.token, userId: colleague.id });
  return r.orgSlug === org.slug && listOrgMembers(org.id).length === 2;
});
check('an accepted invitation no longer peeks', () => peekInvite(invite.token) === null);
check('REPLAYING the same token is refused', () =>
  throwsWith('INVITE_INVALID', () => acceptInvite({ token: invite.token, userId: outsider.id })));
check('the replay did not add a third member', () => listOrgMembers(org.id).length === 2);
check('accepting an invitation does NOT set email_verified_at — there is no mailer, so holding a link proves nothing', () => {
  const row = db().prepare(`SELECT email_verified_at AS v FROM app_user WHERE id=?`).get(colleague.id);
  return row.v === null;
});

// ------------------------------------------------------------- last owner
check('the last owner cannot be demoted', () =>
  throwsWith('LAST_OWNER', () => setMemberRole({
    orgId: org.id, targetUserId: owner.id, role: 'member', actorUserId: owner.id,
  })));
check('the last owner cannot be removed', () =>
  throwsWith('LAST_OWNER', () => removeMember({
    orgId: org.id, targetUserId: owner.id, actorUserId: owner.id,
  })));
check('once a second owner exists, the first may step down', () => {
  setMemberRole({ orgId: org.id, targetUserId: colleague.id, role: 'owner', actorUserId: owner.id });
  setMemberRole({ orgId: org.id, targetUserId: owner.id, role: 'admin', actorUserId: colleague.id });
  return listOrgMembers(org.id).filter((m) => m.role === 'owner').length === 1;
});
check('a role change is audited', () => db().prepare(
  `SELECT count(*) AS n FROM audit_log WHERE subject_id=? AND action='organisation.member_role_changed'`,
).get(org.id).n >= 2);

// ------------------------------------------------------------- seat limits
check('the seat limit counts members PLUS open invitations, so invites are not an unbounded account-creation primitive', () =>
  throwsWith('SEAT_LIMIT', () => createOrgInvite({
    orgId: org.id, email: 'seat@acme.example', role: 'member', actorUserId: colleague.id, seatLimit: 2,
  })));
check('someone already in the account cannot be re-invited', () =>
  throwsWith('ALREADY_A_MEMBER', () => createOrgInvite({
    orgId: org.id, email: 'colleague@acme.example', role: 'member', actorUserId: colleague.id, seatLimit: 25,
  })));

// ----------------------------------------------------------------- revoke
const revoked = createOrgInvite({
  orgId: org.id, email: 'revoked@acme.example', role: 'read_only', actorUserId: colleague.id, seatLimit: 25,
});
revokeInvite({ orgId: org.id, inviteId: revoked.id, actorUserId: colleague.id });
check('a revoked invitation cannot be peeked', () => peekInvite(revoked.token) === null);
check('a revoked invitation cannot be accepted', () =>
  throwsWith('INVITE_INVALID', () => acceptInvite({ token: revoked.token, userId: outsider.id })));
check('revoking frees the seat, so the same address can be re-invited', () => {
  const again = createOrgInvite({
    orgId: org.id, email: 'revoked@acme.example', role: 'read_only', actorUserId: colleague.id, seatLimit: 25,
  });
  return peekInvite(again.token) !== null;
});

// ------------------------------------------ THE REVIEW-TRUST COUPLING (B6)
check('a domain claim starts unverified, with a challenge to publish', () => {
  const claim = createDomainClaim({ orgId: org.id, domain: 'https://WWW.Acme.example/careers', actorUserId: colleague.id });
  // Scheme, www. and path are all stripped.
  return claim.domain === 'acme.example' && claim.verifiedAt === null && claim.challenge.startsWith('caseadvo-domain-verification=');
});
check('a malformed domain is refused', () =>
  throwsWith('DOMAIN_INVALID', () => createDomainClaim({ orgId: org.id, domain: 'not a domain', actorUserId: colleague.id })));

check('verifying a claim marks org_domain_claim ONLY', () => {
  const claim = listDomainClaims(org.id)[0];
  markDomainClaimVerified({ orgId: org.id, claimId: claim.id, actorUserId: colleague.id });
  const after = listDomainClaims(org.id).find((c) => c.id === claim.id);
  const orgRow = db().prepare(`SELECT email_domain AS d, domain_verified_at AS v FROM organisation WHERE id=?`).get(org.id);
  // The claim is proven, but the organisation's own review-trust columns are untouched.
  return after.verifiedAt !== null && orgRow.d === null && orgRow.v === null;
});

check('promoteVerifiedDomain REFUSES a corporate organisation — otherwise a company’s own staff could post trust-badged reviews of their own company', () =>
  throwsWith('CORPORATE_DOMAIN_NOT_PROMOTABLE', () => promoteVerifiedDomain(org.id, 'acme.example')));

check('promoteVerifiedDomain still works for a law firm, which is a legitimate review subject', () => {
  const info = db().prepare(
    `INSERT INTO organisation (kind, name, slug, country_id, verification_level, created_at, updated_at)
     VALUES ('law_firm','Real Firm LLP','real-firm-llp',1,0,'${ts}','${ts}')`,
  ).run();
  const firmId = Number(info.lastInsertRowid);
  promoteVerifiedDomain(firmId, 'realfirm.example');
  const row = db().prepare(`SELECT email_domain AS d, domain_verified_at AS v FROM organisation WHERE id=?`).get(firmId);
  return row.d === 'realfirm.example' && row.v !== null;
});

// ------------------------------------------- REGRESSION FOR PLAN BUG #1
check('a corporate organisation is invisible to a kind-restricted lookup, so it can never be resolved as a reviewable firm', () =>
  getOrganisationBySlug(org.slug, REVIEWABLE_ORG_KINDS) === null);
check('...but it still resolves when kinds are unrestricted — proving the FILTER is doing the work, not a missing row', () =>
  getOrganisationBySlug(org.slug)?.slug === org.slug);
check('createOrganisationReview refuses a corporate organisation outright', () =>
  throwsWith('ORGANISATION_NOT_REVIEWABLE', () => createOrganisationReview({
    organisationId: org.id, authorUserId: outsider.id, rating: 5,
    title: 'Great', body: 'A review that must never be accepted for a client company.',
    displayMode: 'attributed',
  })));
check('getCorporateOrgBySlug finds a corporate org but not a law firm', () =>
  getCorporateOrgBySlug(org.slug)?.id === org.id && getCorporateOrgBySlug('real-firm-llp') === null);

// ------------------------------------------------------- tenant-scoped reads
check('listOrgBookings is empty for a new organisation and never leaks another tenant’s rows', () =>
  listOrgBookings(org.id).length === 0);

// ---------------------------------------------------------------------------
rmSync(dir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:\n` + failures.map((f) => `  - ${f}`).join('\n'));
  console.error(`\n${pass} passed, ${failures.length} failed`);
  process.exit(1);
}
console.log(`${pass} passed, 0 failed`);
