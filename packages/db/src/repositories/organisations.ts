/**
 * Law firms, chambers and LPO providers — `organisation`, distinct from an
 * individual `professional`. This repository is intentionally minimal: it
 * exists to give the review engine (organisations.ts's counterpart in
 * reviews.ts) a real profile to attach to, not to be a full firm/LPO
 * product (team rosters, service listings, billing) — see
 * docs/BOSS_REQUIREMENTS_AUDIT.md for what's still missing there.
 */
import { db } from '../client.ts';

/**
 * Every kind the `organisation` table can hold. 'corporate' is a client
 * company that signs up to use the platform — NOT a listed legal service
 * provider, and never a review subject. 'platform' is CaseADVO itself.
 */
export type OrganisationKind = 'law_firm' | 'chamber' | 'lpo' | 'corporate' | 'platform';

/**
 * The kinds that are publicly listed and reviewable. Frozen and shared at
 * module level rather than built per call: `getOrganisation` in
 * apps/web/lib/data.ts wraps the lookup in React `cache()`, which keys on
 * argument identity, so a fresh `['law_firm', ...]` literal per call would
 * miss the cache every time.
 */
export const REVIEWABLE_ORG_KINDS: readonly OrganisationKind[] =
  Object.freeze(['law_firm', 'chamber', 'lpo'] as const);

export interface OrganisationSummary {
  id: number; kind: string; name: string; slug: string;
  emailDomain: string | null; domainVerifiedAt: string | null; verificationLevel: number;
}

const COLUMNS = `id, kind, name, slug, email_domain AS emailDomain,
                 domain_verified_at AS domainVerifiedAt, verification_level AS verificationLevel`;

export function listOrganisations(kind?: OrganisationKind): OrganisationSummary[] {
  const h = db();
  const sql = `SELECT ${COLUMNS}
                 FROM organisation
                WHERE deleted_at IS NULL ${kind ? 'AND kind = ?' : ''}
                ORDER BY name`;
  return (kind ? h.prepare(sql).all(kind) : h.prepare(sql).all()) as unknown as OrganisationSummary[];
}

/**
 * Resolve an organisation by slug, optionally restricted to certain kinds.
 *
 * `kinds` is not cosmetic. Slugs live in ONE namespace across every kind, so
 * once corporate tenants exist a caller that resolves a slug without
 * restricting kind will happily hand back a private client company where it
 * expected a law firm. Public firm/LPO routes and the review write path must
 * always pass `REVIEWABLE_ORG_KINDS`.
 */
export function getOrganisationBySlug(
  slug: string,
  kinds?: readonly OrganisationKind[],
): OrganisationSummary | null {
  const filter = kinds && kinds.length > 0
    ? ` AND kind IN (${kinds.map(() => '?').join(',')})`
    : '';
  const row = db().prepare(
    `SELECT ${COLUMNS} FROM organisation WHERE slug = ? AND deleted_at IS NULL${filter}`,
  ).get(slug, ...(kinds ?? [])) as unknown as OrganisationSummary | undefined;
  return row ?? null;
}
