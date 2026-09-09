import 'server-only';
import { redirect } from 'next/navigation';
import { getOrgMembershipBySlug, getCorporateOrgBySlug, orgEntitlements } from '@lexhall/db';
import type { OrgRole, OrgMembership, OrgEntitlements } from '@lexhall/db';
import { currentUser, requireUser } from './auth';
import { getFlags } from './data';
import type { ActionResult } from '@/components/Forms';

/**
 * Tenant access control for the corporate surface.
 *
 * THE ORG IS ALWAYS IN THE URL — `/corporate/o/[slug]/…` — and never in the
 * session. A session-held "current organisation" produces confused-deputy
 * bugs (a form submitted in one tab acts on the org another tab switched
 * to), and it breaks the `cache()` wrappers in lib/data.ts, which memoise on
 * arguments and cannot see a cookie. Every org-scoped fetcher therefore
 * takes `orgId` as an argument.
 */

export type Capability =
  | 'org.read'
  | 'org.settings'
  | 'member.invite'
  | 'member.manage'
  | 'billing.manage'
  | 'booking.create'
  | 'booking.manage';

/**
 * A capability MAP, not a linear rank.
 *
 * `billing` and `read_only` are not points on a scale with `member` — they
 * are sideways. A rank comparison (`billing > member`) would silently grant
 * a billing contact everything a member can do, including creating bookings
 * in the company's name. Spelling out each role's set is longer and correct.
 */
const CAPABILITIES: Record<OrgRole, readonly Capability[]> = {
  owner: ['org.read', 'org.settings', 'member.invite', 'member.manage', 'billing.manage', 'booking.create', 'booking.manage'],
  admin: ['org.read', 'org.settings', 'member.invite', 'member.manage', 'booking.create', 'booking.manage'],
  member: ['org.read', 'booking.create'],
  billing: ['org.read', 'billing.manage'],
  read_only: ['org.read'],
};

export function can(role: OrgRole, capability: Capability): boolean {
  return CAPABILITIES[role]?.includes(capability) ?? false;
}

export interface OrgContext {
  membership: OrgMembership;
  entitlements: OrgEntitlements;
  /** True when access is by platform_admin rather than real membership.
   * Read-only — see requireOrgMember. */
  viaPlatformAdmin: boolean;
}

/**
 * Resolve org context without redirecting. Never throws.
 *
 * Returns null for signed-out, no-such-org and not-a-member alike, so a
 * caller cannot use it to discover which slugs exist.
 */
export async function currentOrgContext(slug: string): Promise<OrgContext | null> {
  const user = await currentUser();
  if (!user) return null;

  const membership = getOrgMembershipBySlug(user.id, slug);
  if (membership) {
    return { membership, entitlements: orgEntitlements(membership.organisationId), viaPlatformAdmin: false };
  }

  // A platform admin may READ a tenant, and nothing more. See below.
  if (user.platformRole === 'platform_admin') {
    const org = getCorporateOrgBySlug(slug);
    if (!org) return null;
    return {
      membership: {
        organisationId: org.id, slug: org.slug, name: org.name, kind: org.kind,
        role: 'read_only', emailDomain: org.emailDomain, domainVerifiedAt: org.domainVerifiedAt,
        industry: org.industry, about: org.about,
      },
      entitlements: orgEntitlements(org.id),
      viaPlatformAdmin: true,
    };
  }

  return null;
}

/**
 * Route guard for org-scoped Server Components.
 *
 * Signed out → /login with the destination preserved, exactly as
 * requireUser does. Signed in but not entitled → `/`, with no explanation:
 * a non-member should not be able to learn that a given company has an
 * account here.
 *
 * INTENTIONAL DIVERGENCE FROM requireUser: a `platform_admin` is NOT given
 * write access here. requireUser treats platform_admin as satisfying any
 * role, which is right for platform surfaces. It is wrong for tenant data —
 * an administrator silently editing a customer's member roster is a
 * different class of act, and belongs in an explicit, audited admin route
 * rather than falling out of a permission check.
 */
export async function requireOrgMember(
  slug: string,
  capability: Capability = 'org.read',
  redirectTo?: string,
): Promise<OrgContext> {
  await requireUser(undefined, redirectTo ?? `/corporate/o/${slug}`);
  const ctx = await currentOrgContext(slug);
  if (!ctx) redirect('/');
  if (ctx.viaPlatformAdmin && capability !== 'org.read') redirect('/');
  if (!can(ctx.membership.role, capability)) redirect('/');
  return ctx;
}

/**
 * The Server Action counterpart. Returns an ActionResult instead of
 * redirecting, because an action's job is to hand a message back to the
 * form it came from.
 *
 * Every org-scoped action must start with this. A page-level guard is not a
 * security boundary for a Server Action: actions are addressable directly,
 * without the page that renders them ever being loaded.
 */
export async function orgActionContext(
  slug: string,
  capability: Capability,
): Promise<{ ctx: OrgContext } | { error: ActionResult }> {
  // Every corporate page checks FEATURE_CORPORATE before rendering; the
  // Server Actions behind them did not, so with the flag off a direct POST
  // to e.g. inviteMemberAction still worked for a feature the UI reported
  // as not existing at all. Checked first, and with the same generic
  // message as everything else here — a flag being off should look
  // identical to not having permission, not like a distinct error.
  if (!getFlags().FEATURE_CORPORATE) {
    return { error: { ok: false, message: 'You do not have permission to do that.' } };
  }

  const ctx = await currentOrgContext(slug);
  // One message for signed-out, non-member and insufficient-capability, so
  // the response cannot be used to probe membership or the slug space.
  if (!ctx || ctx.viaPlatformAdmin || !can(ctx.membership.role, capability)) {
    return { error: { ok: false, message: 'You do not have permission to do that.' } };
  }
  return { ctx };
}
