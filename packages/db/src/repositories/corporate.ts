/**
 * Corporate tenants — organisations a company creates and staffs itself.
 *
 * This is the first place in the codebase that writes `org_member`. Until
 * now `organisation` rows were read-only public listings (law firms, LPOs)
 * and the membership table, present since 003_platform.sql, was never
 * populated by anything.
 *
 * Two rules are enforced here rather than in the UI, because a Server
 * Action can be invoked directly and a page guard is not a security
 * boundary:
 *
 *   1. Every mutation writes `audit_log`. This is the first tenant-mutating
 *      surface in the product; who added, removed or re-roled whom is
 *      exactly the history that gets asked for after an incident.
 *   2. An organisation can never be left without an owner. `setMemberRole`
 *      and `removeMember` refuse the operation rather than "helpfully"
 *      promoting someone.
 */
import { createHash, randomBytes } from 'node:crypto';
import { db, now, transaction } from '../client.ts';
import { slugify } from '../ids.ts';

export type OrgRole = 'owner' | 'admin' | 'member' | 'billing' | 'read_only';

/** Roles an invitation may confer. Ownership transfer is a separate act. */
export const INVITABLE_ROLES: readonly OrgRole[] =
  Object.freeze(['admin', 'member', 'billing', 'read_only'] as const);

export class CorporateError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}

const INVITE_TTL_DAYS = 14;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function writeAudit(input: {
  actorUserId: number | null; action: string; subjectId: number;
  after?: unknown; reason: string;
}): void {
  db().prepare(
    `INSERT INTO audit_log (actor_user_id, actor_role, action, subject_type, subject_id, after_state, reason, created_at)
     VALUES (?,?,?,'organisation',?,?,?,?)`,
  ).run(
    input.actorUserId, 'public', input.action, input.subjectId,
    input.after === undefined ? null : JSON.stringify(input.after),
    input.reason, now(),
  );
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface OrgSummary {
  id: number; name: string; slug: string; kind: string;
  emailDomain: string | null; domainVerifiedAt: string | null;
}

/**
 * Create a corporate organisation and make its creator the owner.
 *
 * The slug is derived from the name and retried on UNIQUE violation rather
 * than pre-checked with a SELECT: two companies with the same name signing
 * up concurrently would both see "slug is free" and one INSERT would then
 * fail. Catching the constraint is the only version that is actually
 * correct under concurrency.
 */
export function createCorporateOrganisation(input: {
  name: string; ownerUserId: number; countryId?: number;
  billingEmail?: string | null; gstin?: string | null;
}): OrgSummary {
  const name = input.name.trim();
  if (name.length < 2) throw new CorporateError('NAME_TOO_SHORT');
  const base = slugify(name) || 'company';

  return transaction(() => {
    const h = db();
    const countryId = input.countryId
      ?? (h.prepare(`SELECT id FROM country WHERE iso2 = 'IN'`).get() as { id: number } | undefined)?.id;
    if (!countryId) throw new CorporateError('COUNTRY_NOT_FOUND');

    const ts = now();
    let orgId: number | null = null;
    let slug = base;

    for (let attempt = 1; attempt <= 25; attempt += 1) {
      slug = attempt === 1 ? base : `${base}-${attempt}`;
      try {
        const info = h.prepare(
          `INSERT INTO organisation (kind, name, slug, country_id, billing_email, gstin,
                                     verification_level, created_at, updated_at)
           VALUES ('corporate',?,?,?,?,?,0,?,?)`,
        ).run(name, slug, countryId, input.billingEmail ?? null, input.gstin ?? null, ts, ts);
        orgId = Number(info.lastInsertRowid);
        break;
      } catch (error) {
        // Only a slug collision is retryable; anything else is a real fault.
        if (!/UNIQUE/i.test((error as Error).message)) throw error;
      }
    }
    if (orgId === null) throw new CorporateError('SLUG_EXHAUSTED');

    h.prepare(
      `INSERT INTO org_member (organisation_id, user_id, role, joined_at, created_at)
       VALUES (?,?,'owner',?,?)`,
    ).run(orgId, input.ownerUserId, ts, ts);

    writeAudit({
      actorUserId: input.ownerUserId,
      action: 'organisation.created',
      subjectId: orgId,
      after: { name, slug, kind: 'corporate', ownerUserId: input.ownerUserId },
      reason: 'Corporate account created',
    });

    return { id: orgId, name, slug, kind: 'corporate', emailDomain: null, domainVerifiedAt: null };
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface OrgMembership {
  organisationId: number; slug: string; name: string; kind: string;
  role: OrgRole; emailDomain: string | null; domainVerifiedAt: string | null;
}

/** Organisations this user belongs to, for an account switcher. */
export function listOrgsForUser(userId: number): OrgMembership[] {
  // Restricted to kind='corporate' — see getOrgMembershipBySlug just above
  // for why. This module's whole OrgRole/capability model (owner/admin/
  // member/billing/read_only, mapped through lib/org.ts's `can()`) was
  // designed for corporate tenants specifically; a differently-purposed
  // org_member row on a law firm or LPO listing must not be interpreted
  // through it, e.g. as a grant of booking.manage over that firm's bookings.
  return db().prepare(
    `SELECT o.id AS organisationId, o.slug, o.name, o.kind, m.role,
            o.email_domain AS emailDomain, o.domain_verified_at AS domainVerifiedAt
       FROM org_member m
       JOIN organisation o ON o.id = m.organisation_id
      WHERE m.user_id = ? AND o.kind = 'corporate' AND o.deleted_at IS NULL
      ORDER BY o.name`,
  ).all(userId) as unknown as OrgMembership[];
}

/**
 * This user's membership of one organisation, by slug, or null.
 *
 * Returns null for both "no such organisation" and "not a member" — the
 * caller must not be able to tell the difference, or the slug space becomes
 * an enumeration oracle for which companies have accounts.
 */
export function getOrgMembershipBySlug(userId: number, slug: string): OrgMembership | null {
  // Restricted to kind='corporate'. org_member is currently empty for every
  // other kind, so this is latent rather than live — but getCorporateOrgBySlug
  // already restricts the platform-admin read path the same way, and without
  // this restriction here too, an org_member row against a public law-firm or
  // LPO listing (which isAuthorizedToRespond treats as how a firm answers its
  // own reviews) would confer invite/roster-management capabilities over that
  // public listing through the corporate tenant actions.
  const row = db().prepare(
    `SELECT o.id AS organisationId, o.slug, o.name, o.kind, m.role,
            o.email_domain AS emailDomain, o.domain_verified_at AS domainVerifiedAt
       FROM organisation o
       JOIN org_member m ON m.organisation_id = o.id AND m.user_id = ?
      WHERE o.slug = ? AND o.kind = 'corporate' AND o.deleted_at IS NULL`,
  ).get(userId, slug) as unknown as OrgMembership | undefined;
  return row ?? null;
}

/** The organisation itself, with no membership requirement. For a
 * platform_admin read path, which is read-only by design. */
export function getCorporateOrgBySlug(slug: string): OrgSummary | null {
  const row = db().prepare(
    `SELECT id, name, slug, kind, email_domain AS emailDomain, domain_verified_at AS domainVerifiedAt
       FROM organisation WHERE slug = ? AND kind = 'corporate' AND deleted_at IS NULL`,
  ).get(slug) as unknown as OrgSummary | undefined;
  return row ?? null;
}

export interface OrgMemberRow {
  userId: number; email: string; fullName: string; role: OrgRole;
  joinedAt: string | null; isOwner: boolean;
}

export function listOrgMembers(orgId: number): OrgMemberRow[] {
  return (db().prepare(
    `SELECT u.id AS userId, u.email, u.full_name AS fullName, m.role, m.joined_at AS joinedAt
       FROM org_member m JOIN app_user u ON u.id = m.user_id
      WHERE m.organisation_id = ?
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.full_name`,
  ).all(orgId) as Array<Record<string, string | number | null>>).map((r) => ({
    userId: Number(r.userId), email: String(r.email), fullName: String(r.fullName),
    role: String(r.role) as OrgRole, joinedAt: r.joinedAt ? String(r.joinedAt) : null,
    isOwner: r.role === 'owner',
  }));
}

function countOwners(orgId: number, excludeUserId?: number): number {
  const sql = `SELECT count(*) AS n FROM org_member
                WHERE organisation_id = ? AND role = 'owner'
                  ${excludeUserId ? 'AND user_id <> ?' : ''}`;
  const stmt = db().prepare(sql);
  const row = (excludeUserId ? stmt.get(orgId, excludeUserId) : stmt.get(orgId)) as { n: number };
  return Number(row.n);
}

// ---------------------------------------------------------------------------
// Roster changes
// ---------------------------------------------------------------------------

const ALL_ROLES: readonly OrgRole[] = Object.freeze(['owner', 'admin', 'member', 'billing', 'read_only'] as const);

/** Is the actor an owner of this organisation? Used to gate anything that
 * touches ownership itself — granting it, or changing an existing owner's
 * role — which `member.manage` alone must not be enough for. */
function actorIsOwner(orgId: number, actorUserId: number): boolean {
  const row = db().prepare(
    `SELECT role FROM org_member WHERE organisation_id = ? AND user_id = ?`,
  ).get(orgId, actorUserId) as { role: string } | undefined;
  return row?.role === 'owner';
}

export function setMemberRole(input: {
  orgId: number; targetUserId: number; role: OrgRole; actorUserId: number;
}): void {
  // `role` arrives from a form field cast at the type level, not validated
  // at runtime — a POST carrying `role=owner`, or any other string, must be
  // rejected here rather than trusted because TypeScript said it was safe.
  if (!ALL_ROLES.includes(input.role)) throw new CorporateError('INVALID_ROLE');

  transaction(() => {
    const h = db();
    const current = h.prepare(
      `SELECT role FROM org_member WHERE organisation_id = ? AND user_id = ?`,
    ).get(input.orgId, input.targetUserId) as { role: string } | undefined;
    if (!current) throw new CorporateError('NOT_A_MEMBER');
    if (current.role === input.role) return;

    /*
     * Ownership itself is owner-only to touch — granting it, or changing an
     * existing owner's role. `member.manage` is held by 'admin' too, and
     * without this an admin could mint a co-owner (including themselves) or
     * demote an owner they disagree with; neither is what that capability
     * is for.
     */
    if ((input.role === 'owner' || current.role === 'owner') && !actorIsOwner(input.orgId, input.actorUserId)) {
      throw new CorporateError('OWNER_ONLY');
    }

    // Demoting the last owner would leave the tenant with nobody who can
    // manage it — including nobody who can appoint a new owner.
    if (current.role === 'owner' && input.role !== 'owner' && countOwners(input.orgId, input.targetUserId) === 0) {
      throw new CorporateError('LAST_OWNER');
    }

    h.prepare(`UPDATE org_member SET role = ? WHERE organisation_id = ? AND user_id = ?`)
      .run(input.role, input.orgId, input.targetUserId);

    writeAudit({
      actorUserId: input.actorUserId,
      action: 'organisation.member_role_changed',
      subjectId: input.orgId,
      after: { targetUserId: input.targetUserId, from: current.role, to: input.role },
      reason: 'Member role changed',
    });
  });
}

export function removeMember(input: { orgId: number; targetUserId: number; actorUserId: number }): void {
  transaction(() => {
    const h = db();
    const current = h.prepare(
      `SELECT role FROM org_member WHERE organisation_id = ? AND user_id = ?`,
    ).get(input.orgId, input.targetUserId) as { role: string } | undefined;
    if (!current) throw new CorporateError('NOT_A_MEMBER');
    // Removing an owner is owner-only — see setMemberRole's identical rule.
    if (current.role === 'owner' && !actorIsOwner(input.orgId, input.actorUserId)) {
      throw new CorporateError('OWNER_ONLY');
    }
    if (current.role === 'owner' && countOwners(input.orgId, input.targetUserId) === 0) {
      throw new CorporateError('LAST_OWNER');
    }

    h.prepare(`DELETE FROM org_member WHERE organisation_id = ? AND user_id = ?`)
      .run(input.orgId, input.targetUserId);

    writeAudit({
      actorUserId: input.actorUserId,
      action: 'organisation.member_removed',
      subjectId: input.orgId,
      after: { targetUserId: input.targetUserId, role: current.role },
      reason: 'Member removed',
    });
  });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface OrgInviteRow {
  id: number; email: string; role: OrgRole; expiresAt: string;
  acceptedAt: string | null; revokedAt: string | null; createdAt: string;
}

export function listOrgInvites(orgId: number): OrgInviteRow[] {
  return db().prepare(
    `SELECT id, email, role, expires_at AS expiresAt, accepted_at AS acceptedAt,
            revoked_at AS revokedAt, created_at AS createdAt
       FROM org_invite WHERE organisation_id = ? ORDER BY created_at DESC`,
  ).all(orgId) as unknown as OrgInviteRow[];
}

/**
 * Create an invitation and return the raw token exactly once.
 *
 * There is no mailer in this build, so the caller is responsible for
 * getting the link to the invitee. The raw token is never stored — only its
 * SHA-256 — so it cannot be recovered afterwards: a lost invite is
 * re-issued, not looked up.
 */
export function createOrgInvite(input: {
  orgId: number; email: string; role: OrgRole; actorUserId: number; seatLimit: number;
}): { id: number; token: string; expiresAt: string } {
  const email = input.email.trim().toLowerCase();
  if (!(INVITABLE_ROLES as readonly string[]).includes(input.role)) {
    throw new CorporateError('ROLE_NOT_INVITABLE');
  }

  return transaction(() => {
    const h = db();

    // Seats count members plus invites that could still be accepted —
    // otherwise invitations are an unbounded account-creation primitive.
    const members = (h.prepare(`SELECT count(*) AS n FROM org_member WHERE organisation_id = ?`)
      .get(input.orgId) as { n: number }).n;
    const pending = (h.prepare(
      `SELECT count(*) AS n FROM org_invite
        WHERE organisation_id = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    ).get(input.orgId, now()) as { n: number }).n;
    if (Number(members) + Number(pending) >= input.seatLimit) throw new CorporateError('SEAT_LIMIT');

    const already = h.prepare(
      `SELECT 1 FROM org_member m JOIN app_user u ON u.id = m.user_id
        WHERE m.organisation_id = ? AND u.email = ?`,
    ).get(input.orgId, email);
    if (already) throw new CorporateError('ALREADY_A_MEMBER');

    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000)
      .toISOString().replace(/\.\d{3}Z$/, 'Z');
    const ts = now();

    let id: number;
    try {
      const info = h.prepare(
        `INSERT INTO org_invite (organisation_id, email, role, token_hash, invited_by_user_id,
                                 expires_at, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      ).run(input.orgId, email, input.role, hashToken(raw), input.actorUserId, expiresAt, ts);
      id = Number(info.lastInsertRowid);
    } catch (error) {
      // The partial unique index on (organisation_id, email) WHERE open.
      if (/UNIQUE/i.test((error as Error).message)) throw new CorporateError('INVITE_ALREADY_OPEN');
      throw error;
    }

    writeAudit({
      actorUserId: input.actorUserId,
      action: 'organisation.invite_created',
      subjectId: input.orgId,
      // The email is the point of the record; the token is not written anywhere.
      after: { inviteId: id, email, role: input.role },
      reason: 'Invitation created',
    });

    return { id, token: raw, expiresAt };
  });
}

export interface InvitePeek { organisationName: string; organisationSlug: string; email: string; role: OrgRole }

/**
 * What an invite link is for, without accepting it — so the accept page can
 * say "join Acme as an admin" before asking the person to sign in.
 *
 * Returns null for expired, revoked, accepted and non-existent alike.
 */
export function peekInvite(token: string): InvitePeek | null {
  const row = db().prepare(
    `SELECT o.name AS organisationName, o.slug AS organisationSlug, i.email, i.role
       FROM org_invite i JOIN organisation o ON o.id = i.organisation_id
      WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL
        AND i.expires_at > ? AND o.deleted_at IS NULL`,
  ).get(hashToken(token), now()) as unknown as InvitePeek | undefined;
  return row ?? null;
}

/**
 * Accept an invitation.
 *
 * The single UPDATE ... WHERE accepted_at IS NULL is the replay defence: two
 * concurrent accepts both run the statement, exactly one reports
 * `changes === 1`, and only that one goes on to insert the membership. A
 * read-then-write would let both through.
 *
 * `email_verified_at` is deliberately NOT set. There is no mailer, so the
 * link was not necessarily delivered by email at all, and holding it proves
 * nothing about controlling the address.
 */
export function acceptInvite(input: { token: string; userId: number }): { orgSlug: string; role: OrgRole } {
  return transaction(() => {
    const h = db();
    const ts = now();
    const tokenHash = hashToken(input.token);

    const invite = h.prepare(
      `SELECT id, organisation_id AS organisationId, role FROM org_invite WHERE token_hash = ?`,
    ).get(tokenHash) as { id: number; organisationId: number; role: string } | undefined;

    const claim = h.prepare(
      `UPDATE org_invite SET accepted_at = ?, accepted_user_id = ?
        WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    ).run(ts, input.userId, tokenHash, ts);

    // One generic failure for expired / revoked / already-used / unknown:
    // distinguishing them tells a token guesser which guesses were close.
    if (claim.changes !== 1 || !invite) throw new CorporateError('INVITE_INVALID');

    const org = h.prepare(`SELECT slug FROM organisation WHERE id = ? AND deleted_at IS NULL`)
      .get(invite.organisationId) as { slug: string } | undefined;
    if (!org) throw new CorporateError('INVITE_INVALID');

    // A second invite to someone who joined by another route is not an error.
    h.prepare(
      `INSERT INTO org_member (organisation_id, user_id, role, invited_by_user_id, joined_at, created_at)
       VALUES (?,?,?,NULL,?,?)
       ON CONFLICT (organisation_id, user_id) DO NOTHING`,
    ).run(invite.organisationId, input.userId, invite.role, ts, ts);

    writeAudit({
      actorUserId: input.userId,
      action: 'organisation.invite_accepted',
      subjectId: invite.organisationId,
      after: { inviteId: invite.id, userId: input.userId, role: invite.role },
      reason: 'Invitation accepted',
    });

    return { orgSlug: org.slug, role: invite.role as OrgRole };
  });
}

export function revokeInvite(input: { orgId: number; inviteId: number; actorUserId: number }): void {
  transaction(() => {
    const info = db().prepare(
      `UPDATE org_invite SET revoked_at = ?
        WHERE id = ? AND organisation_id = ? AND accepted_at IS NULL AND revoked_at IS NULL`,
    ).run(now(), input.inviteId, input.orgId);
    if (info.changes !== 1) throw new CorporateError('INVITE_INVALID');

    writeAudit({
      actorUserId: input.actorUserId,
      action: 'organisation.invite_revoked',
      subjectId: input.orgId,
      after: { inviteId: input.inviteId },
      reason: 'Invitation revoked',
    });
  });
}

// ---------------------------------------------------------------------------
// Domain claims
// ---------------------------------------------------------------------------

export interface DomainClaimRow {
  id: number; domain: string; method: string; challenge: string;
  verifiedAt: string | null; lastCheckedAt: string | null;
}

export function listDomainClaims(orgId: number): DomainClaimRow[] {
  return db().prepare(
    `SELECT id, domain, method, challenge, verified_at AS verifiedAt, last_checked_at AS lastCheckedAt
       FROM org_domain_claim WHERE organisation_id = ? ORDER BY created_at DESC`,
  ).all(orgId) as unknown as DomainClaimRow[];
}

/** Start a DNS TXT domain claim. The challenge is the value to publish. */
export function createDomainClaim(input: {
  orgId: number; domain: string; actorUserId: number;
}): DomainClaimRow {
  const domain = input.domain.trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) throw new CorporateError('DOMAIN_INVALID');

  const challenge = `caseadvo-domain-verification=${randomBytes(16).toString('hex')}`;
  const ts = now();

  const h = db();
  h.prepare(
    `INSERT INTO org_domain_claim (organisation_id, domain, method, challenge, created_by_user_id, created_at)
     VALUES (?,?, 'dns_txt', ?,?,?)
     ON CONFLICT (organisation_id, domain) DO UPDATE
       SET challenge = excluded.challenge, verified_at = NULL, last_checked_at = NULL`,
  ).run(input.orgId, domain, challenge, input.actorUserId, ts);

  writeAudit({
    actorUserId: input.actorUserId,
    action: 'organisation.domain_claim_started',
    subjectId: input.orgId,
    after: { domain },
    reason: 'Domain claim started',
  });

  // Re-selected rather than trusting `lastInsertRowid`: on the UPDATE branch
  // of ON CONFLICT DO UPDATE, SQLite does not perform an insert at all, so
  // that value is left over from whatever the connection's last real INSERT
  // was — possibly an unrelated row entirely. A caller who then passed the
  // wrong id into markDomainClaimVerified would fail with CLAIM_NOT_FOUND,
  // or worse, verify a different claim of the same organisation.
  const row = h.prepare(
    `SELECT id FROM org_domain_claim WHERE organisation_id = ? AND domain = ?`,
  ).get(input.orgId, domain) as { id: number };

  return {
    id: row.id, domain, method: 'dns_txt', challenge,
    verifiedAt: null, lastCheckedAt: null,
  };
}

/**
 * Copy a proven domain onto `organisation`, gating invitations by it.
 *
 * REFUSES kind='corporate'. reviews.ts treats a matching
 * organisation.email_domain plus domain_verified_at as grounds for the
 * 'verified_engagement' review basis. Setting those columns for a company
 * would let that company's own staff post trust-badged reviews of their own
 * company — the exact failure this table exists to avoid. Corporate tenants
 * use `org_domain_claim.verified_at` directly and never touch review trust.
 */
export function promoteVerifiedDomain(orgId: number, domain: string): void {
  const org = db().prepare(`SELECT kind FROM organisation WHERE id = ?`)
    .get(orgId) as { kind: string } | undefined;
  if (!org) throw new CorporateError('ORGANISATION_NOT_FOUND');
  if (org.kind === 'corporate') throw new CorporateError('CORPORATE_DOMAIN_NOT_PROMOTABLE');

  const ts = now();
  db().prepare(`UPDATE organisation SET email_domain = ?, domain_verified_at = ?, updated_at = ? WHERE id = ?`)
    .run(domain, ts, ts, orgId);
}

/** Mark a claim proven. Corporate tenants stop here — see
 * promoteVerifiedDomain for why this does not touch `organisation`. */
export function markDomainClaimVerified(input: { orgId: number; claimId: number; actorUserId: number }): void {
  const ts = now();
  const info = db().prepare(
    `UPDATE org_domain_claim SET verified_at = ?, last_checked_at = ?
      WHERE id = ? AND organisation_id = ?`,
  ).run(ts, ts, input.claimId, input.orgId);
  if (info.changes !== 1) throw new CorporateError('CLAIM_NOT_FOUND');

  writeAudit({
    actorUserId: input.actorUserId,
    action: 'organisation.domain_verified',
    subjectId: input.orgId,
    after: { claimId: input.claimId },
    reason: 'Domain claim verified',
  });
}

// ---------------------------------------------------------------------------
// Tenant-scoped reads
// ---------------------------------------------------------------------------

export interface OrgBookingRow {
  reference: string; professionalName: string; professionalSlug: string;
  clientName: string; startsAtUtc: string; mode: string; status: string;
}

/**
 * Bookings belonging to this organisation.
 *
 * Filters on organisation_id ONLY. Widening this to also match on the
 * client's email domain would surface any booking made from a company
 * address — including a personal matter an employee happened to book from
 * their work email, which is not the company's to read.
 */
export function listOrgBookings(orgId: number, limit = 50): OrgBookingRow[] {
  return db().prepare(
    `SELECT b.reference, p.display_name AS professionalName, p.slug AS professionalSlug,
            b.client_name AS clientName, b.starts_at_utc AS startsAtUtc, b.mode, b.status
       FROM booking b JOIN professional p ON p.id = b.professional_id
      WHERE b.organisation_id = ?
      ORDER BY b.starts_at_utc DESC
      LIMIT ?`,
  ).all(orgId, limit) as unknown as OrgBookingRow[];
}
