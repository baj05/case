/**
 * Profile reads.
 *
 * `hydrateSummaries` is the single projection used by search results, related
 * professionals and the profile hero, so a card and a page can never disagree
 * about what is verified.
 *
 * Note what is NOT selected: private_email, private_phone, private_residence,
 * private_office. Those exist for claim matching and admin verification and
 * must never travel to a public surface.
 */
import { db } from '../client.ts';
import type { ProfessionalSummary, ProfessionalKind, ClaimStatus } from '@lexhall/core';

const PUBLIC_COLUMNS = `
  p.id, p.slug, p.kind, p.display_name, p.headline, p.body_role, p.photo_url,
  p.verification_level, p.claim_status, p.accepts_consultations,
  p.enrolment_year, p.years_experience, p.last_verified_at,
  pb.name AS body_name, pb.short_name AS body_short,
  l.name AS location_name, j.name AS jurisdiction_name,
  s.name AS source_name, p.source_url, s.authority AS source_authority
`;

const PUBLIC_JOINS = `
  FROM professional p
  LEFT JOIN professional_body pb ON pb.id = p.professional_body_id
  LEFT JOIN location l ON l.id = p.primary_location_id
  LEFT JOIN jurisdiction j ON j.id = p.primary_jurisdiction_id
  LEFT JOIN source s ON s.id = p.source_id
`;

interface RawSummary {
  id: number; slug: string; kind: string; display_name: string; headline: string | null;
  body_role: string | null; photo_url: string | null; verification_level: number;
  claim_status: string; accepts_consultations: number; enrolment_year: number | null;
  years_experience: number | null; last_verified_at: string | null;
  body_name: string | null; body_short: string | null; location_name: string | null;
  jurisdiction_name: string | null; source_name: string | null; source_url: string | null;
  source_authority: string | null;
}

function toSummary(r: RawSummary): ProfessionalSummary {
  const h = db();
  return {
    id: r.id, slug: r.slug, kind: r.kind as ProfessionalKind, displayName: r.display_name,
    headline: r.headline, bodyRole: r.body_role, photoUrl: r.photo_url,
    verificationLevel: r.verification_level, claimStatus: r.claim_status as ClaimStatus,
    acceptsConsultations: r.accepts_consultations === 1,
    enrolmentYear: r.enrolment_year, yearsExperience: r.years_experience,
    professionalBodyName: r.body_name, professionalBodyShort: r.body_short,
    locationName: r.location_name, jurisdictionName: r.jurisdiction_name,
    practiceAreas: h.prepare(
      `SELECT pa.id, pa.name, pa.slug, ppa.is_primary AS isPrimary
         FROM professional_practice_area ppa JOIN practice_area pa ON pa.id = ppa.practice_area_id
        WHERE ppa.professional_id = ? ORDER BY ppa.is_primary DESC, pa.sort_order`,
    ).all(r.id).map((x) => {
      const row = x as { id: number; name: string; slug: string; isPrimary: number };
      return { id: row.id, name: row.name, slug: row.slug, isPrimary: row.isPrimary === 1 };
    }),
    courts: h.prepare(
      `SELECT c.id, c.name, c.short_name AS shortName, c.tier
         FROM professional_court pc JOIN court c ON c.id = pc.court_id
        WHERE pc.professional_id = ? ORDER BY c.tier, c.name`,
    ).all(r.id) as Array<{ id: number; name: string; shortName: string | null; tier: number }>,
    languages: (h.prepare(
      `SELECT lg.name FROM professional_language pl JOIN language lg ON lg.id = pl.language_id
        WHERE pl.professional_id = ? ORDER BY lg.sort_order`,
    ).all(r.id) as Array<{ name: string }>).map((x) => x.name),
    lastVerifiedAt: r.last_verified_at,
    sourceName: r.source_name, sourceUrl: r.source_url, sourceAuthority: r.source_authority,
  };
}

/** Batch hydration preserving the caller's ordering. */
export function hydrateSummaries(ids: number[]): ProfessionalSummary[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db().prepare(
    `SELECT ${PUBLIC_COLUMNS} ${PUBLIC_JOINS}
      WHERE p.id IN (${placeholders}) AND p.deleted_at IS NULL AND p.is_published = 1`,
  ).all(...ids) as unknown as RawSummary[];
  const byId = new Map(rows.map((r) => [r.id, toSummary(r)]));
  return ids.map((id) => byId.get(id)).filter((x): x is ProfessionalSummary => Boolean(x));
}

export function getProfessionalBySlug(slug: string): ProfessionalSummary | null {
  const row = db().prepare(
    `SELECT ${PUBLIC_COLUMNS} ${PUBLIC_JOINS} WHERE p.slug = ? AND p.deleted_at IS NULL AND p.is_published = 1`,
  ).get(slug) as unknown as RawSummary | undefined;
  return row ? toSummary(row) : null;
}

/** Extra detail shown only on the full profile page. */
export function getProfileDetail(slug: string) {
  const h = db();
  const row = h.prepare(
    `SELECT p.id, p.public_email, p.public_phone, p.public_office, p.website_url, p.bio,
            p.source_captured_at, p.data_confidence, p.claimed_at, p.created_at, p.updated_at,
            pb.id AS bodyId, pb.name AS bodyName, pb.website_url AS bodyWebsite, pb.code AS bodyCode,
            s.name AS sourceName, s.publisher AS sourcePublisher, s.authority AS sourceAuthority
       FROM professional p
       LEFT JOIN professional_body pb ON pb.id = p.professional_body_id
       LEFT JOIN source s ON s.id = p.source_id
      WHERE p.slug = ? AND p.deleted_at IS NULL AND p.is_published = 1`,
  ).get(slug) as Record<string, string | number | null> | undefined;
  if (!row) return null;

  const id = Number(row.id);
  return {
    publicEmail: row.public_email as string | null,
    publicPhone: row.public_phone as string | null,
    publicOffice: row.public_office as string | null,
    websiteUrl: row.website_url as string | null,
    bio: row.bio as string | null,
    sourceCapturedAt: row.source_captured_at as string | null,
    dataConfidence: Number(row.data_confidence ?? 0),
    claimedAt: row.claimed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    body: row.bodyId ? { id: Number(row.bodyId), name: String(row.bodyName), website: row.bodyWebsite as string | null, code: String(row.bodyCode) } : null,
    source: { name: row.sourceName as string | null, publisher: row.sourcePublisher as string | null, authority: row.sourceAuthority as string | null },
    enrolments: h.prepare(
      `SELECT e.enrolment_number AS enrolmentNumber, e.enrolled_on AS enrolledOn, e.standing,
              e.evidence_basis AS evidenceBasis, e.source_url AS sourceUrl, e.last_verified_at AS lastVerifiedAt,
              pb.name AS bodyName
         FROM enrolment e LEFT JOIN professional_body pb ON pb.id = e.professional_body_id
        WHERE e.professional_id = ?`,
    ).all(id) as Array<{ enrolmentNumber: string | null; enrolledOn: string | null; standing: string; evidenceBasis: string; sourceUrl: string | null; lastVerifiedAt: string | null; bodyName: string | null }>,
    chambers: h.prepare(
      `SELECT c.name AS courtName, c.short_name AS courtShort, c.slug AS courtSlug, c.tier, pc.chamber_ref AS chamberRef
         FROM professional_court pc JOIN court c ON c.id = pc.court_id
        WHERE pc.professional_id = ? ORDER BY c.tier, c.name`,
    ).all(id) as Array<{ courtName: string; courtShort: string | null; courtSlug: string; tier: number; chamberRef: string | null }>,
    verifications: h.prepare(
      `SELECT level, method, outcome, evidence_note AS evidenceNote, created_at AS createdAt
         FROM verification WHERE professional_id = ? ORDER BY created_at DESC`,
    ).all(id) as Array<{ level: number; method: string; outcome: string; evidenceNote: string | null; createdAt: string }>,
    education: h.prepare(
      `SELECT institution, qualification, field, start_year AS startYear, end_year AS endYear, evidence_basis AS evidenceBasis
         FROM education WHERE professional_id = ? ORDER BY COALESCE(end_year, start_year) DESC`,
    ).all(id) as Array<{ institution: string; qualification: string; field: string | null; startYear: number | null; endYear: number | null; evidenceBasis: string }>,
    legalMatters: h.prepare(
      `SELECT m.id, m.code, m.name, m.slug, pa.slug AS practiceAreaSlug, d.slug AS domainSlug
         FROM professional_legal_matter plm
         JOIN legal_matter m ON m.id = plm.legal_matter_id
         JOIN practice_area pa ON pa.id = m.practice_area_id
         LEFT JOIN legal_domain d ON d.id = pa.legal_domain_id
        WHERE plm.professional_id = ? AND m.is_active = 1
        ORDER BY d.sort_order, pa.sort_order, m.name`,
    ).all(id) as Array<{ id: number; code: string; name: string; slug: string; practiceAreaSlug: string; domainSlug: string | null }>,
        experience: h.prepare(
      `SELECT organisation_name AS organisationName, role, start_year AS startYear, end_year AS endYear,
              is_current AS isCurrent, summary, evidence_basis AS evidenceBasis
         FROM experience WHERE professional_id = ? ORDER BY is_current DESC, COALESCE(end_year, start_year) DESC`,
    ).all(id) as Array<{ organisationName: string; role: string; startYear: number | null; endYear: number | null; isCurrent: number; summary: string | null; evidenceBasis: string }>,
  };
}

/**
 * Related professionals: same professional body, then same location, then same
 * practice area. Never framed as a recommendation or endorsement (spec §95).
 */
export function relatedProfessionals(professionalId: number, limit = 6): ProfessionalSummary[] {
  const ids = (db().prepare(
    `SELECT p.id,
            CASE
              WHEN p.professional_body_id = (SELECT professional_body_id FROM professional WHERE id = ?) THEN 3
              WHEN p.primary_location_id = (SELECT primary_location_id FROM professional WHERE id = ?) THEN 2
              ELSE 1 END AS affinity
       FROM professional p
      WHERE p.id <> ? AND p.is_published = 1 AND p.deleted_at IS NULL
        AND (p.professional_body_id = (SELECT professional_body_id FROM professional WHERE id = ?)
             OR p.primary_location_id = (SELECT primary_location_id FROM professional WHERE id = ?))
      ORDER BY affinity DESC, p.data_confidence DESC, p.display_name
      LIMIT ?`,
  ).all(professionalId, professionalId, professionalId, professionalId, professionalId, limit) as Array<{ id: number }>).map((r) => r.id);
  return hydrateSummaries(ids);
}

/** Corpus counts for the homepage. Real numbers, computed live. */
export function corpusStats() {
  const h = db();
  const one = (sql: string, ...p: Array<string | number>) => Number((h.prepare(sql).get(...p) as { n: number }).n);
  return {
    professionals: one(`SELECT count(*) n FROM professional WHERE is_published=1 AND deleted_at IS NULL`),
    withheld: one(`SELECT count(*) n FROM professional WHERE is_published=0 AND deleted_at IS NULL`),
    claimed: one(`SELECT count(*) n FROM professional WHERE claim_status='claimed'`),
    bodies: one(`SELECT count(*) n FROM professional_body WHERE deleted_at IS NULL`),
    courts: one(`SELECT count(*) n FROM court`),
    highCourts: one(`SELECT count(*) n FROM court WHERE tier=2 AND is_bench=0`),
    practiceAreas: one(`SELECT count(*) n FROM practice_area WHERE is_active=1`),
    locations: one(`SELECT count(*) n FROM location WHERE is_searchable=1`),
    states: one(`SELECT count(*) n FROM location WHERE level=1`),
    lastIngestAt: (h.prepare(`SELECT max(finished_at) v FROM ingestion_run WHERE status IN ('succeeded','partial')`).get() as { v: string | null } | undefined)?.v ?? null,
  };
}
