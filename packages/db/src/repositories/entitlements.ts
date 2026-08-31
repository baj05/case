/**
 * What an organisation is entitled to.
 *
 * Deliberately constants, not a `plan` / `subscription` lookup.
 *
 * There is no payment path in this build: FEATURE_PAYMENTS is off and
 * bookings are `collect_offline`. A subscription check against a table
 * nobody can pay into would be theatre — worse, a `subscription` row in
 * state 'active' that no money ever passed through is a false audit signal,
 * and the sort of thing that later gets read as evidence a customer paid.
 *
 * The seam is here so that when a payment path exists, this is the one
 * function that changes and every caller keeps working. Until then the
 * limits are honest defaults, and `createOrgInvite` enforces the seat count
 * against this rather than against nothing.
 */

export interface OrgEntitlements {
  /** Members plus still-acceptable invitations. */
  seatLimit: number;
  /** Whether the org surface may be used at all. */
  documentBuilder: boolean;
  /** Reserved: routing a drafted document to an advocate for review. */
  documentReview: boolean;
}

const DEFAULT_SEAT_LIMIT = 25;

export function orgEntitlements(_orgId: number): OrgEntitlements {
  return {
    seatLimit: DEFAULT_SEAT_LIMIT,
    documentBuilder: true,
    // Off because there is nothing to charge for it with, and no reviewer
    // routing exists yet — not because of a plan tier.
    documentReview: false,
  };
}
