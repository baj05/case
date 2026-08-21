/**
 * Law firms, chambers and LPO providers — `organisation`, distinct from an
 * individual `professional`. This repository is intentionally minimal: it
 * exists to give the review engine (organisations.ts's counterpart in
 * reviews.ts) a real profile to attach to, not to be a full firm/LPO
 * product (team rosters, service listings, billing) — see
 * docs/BOSS_REQUIREMENTS_AUDIT.md for what's still missing there.
 */
import { db } from '../client.ts';

export interface OrganisationSummary {
  id: number; kind: string; name: string; slug: string;
  emailDomain: string | null; domainVerifiedAt: string | null; verificationLevel: number;
}

export function listOrganisations(kind?: 'law_firm' | 'chamber' | 'lpo'): OrganisationSummary[] {
  const h = db();
  const sql = `SELECT id, kind, name, slug, email_domain AS emailDomain, domain_verified_at AS domainVerifiedAt,
                      verification_level AS verificationLevel
                 FROM organisation
                WHERE deleted_at IS NULL ${kind ? 'AND kind = ?' : ''}
                ORDER BY name`;
  return (kind ? h.prepare(sql).all(kind) : h.prepare(sql).all()) as unknown as OrganisationSummary[];
}

export function getOrganisationBySlug(slug: string): OrganisationSummary | null {
  const row = db().prepare(
    `SELECT id, kind, name, slug, email_domain AS emailDomain, domain_verified_at AS domainVerifiedAt,
            verification_level AS verificationLevel
       FROM organisation WHERE slug = ? AND deleted_at IS NULL`,
  ).get(slug) as unknown as OrganisationSummary | undefined;
  return row ?? null;
}
