/**
 * Professional records: upsert with provenance, entity resolution, publish
 * gate, search-document projection, and the queries the public site runs.
 */
import { db, now, flag, transaction } from '../client.ts';
import { slugify } from '../ids.ts';
import { fold, normaliseName, trigramSimilarity } from '@lexhall/core';
import type { ProfessionalKind } from '@lexhall/core';

export interface UpsertProfessionalInput {
  kind: ProfessionalKind;
  fullName: string;
  displayName: string;
  honorific?: string | null;
  bodyRole?: string | null;
  professionalBodyId?: number | null;
  countryId: number;
  jurisdictionId?: number | null;
  locationId?: number | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  publicOffice?: string | null;
  websiteUrl?: string | null;
  /** Personal contact — stored private, never published pre-claim. */
  privateEmail?: string | null;
  privatePhone?: string | null;
  privateResidence?: string | null;
  privateOffice?: string | null;
  photoUrl?: string | null;
  photoSourceUrl?: string | null;
  sourceId: number;
  /** Stable per-record id within the source, e.g. 'member:SBC05:surya-prakash-khatri'. */
  sourceRef: string;
  sourceUrl: string;
  sourceCapturedAt: string;
  enrolmentYear?: number | null;
}

export interface UpsertResult { id: number; created: boolean; changed: boolean; matchedBy: string }

/**
 * Insert or update one professional, resolving against existing records.
 *
 * Entity resolution, cheapest signal first:
 *   1. exact (source, source_url) — the same upstream page
 *   2. exact normalised name within the same professional body
 *   3. fuzzy normalised name (trigram >= 0.82) within the same body
 * Anything less certain creates a `suspected_duplicate` issue for a human
 * rather than silently merging two different advocates.
 */
export function upsertProfessional(input: UpsertProfessionalInput): UpsertResult {
  return transaction(() => {
    const h = db();
    const ts = now();
    const normalised = normaliseName(input.fullName);

    // 1. Same record from the same source. Keyed on source_ref, NOT source_url:
    //    one members page lists ~25 people and they must stay distinct.
    let existing = h.prepare(
      `SELECT id FROM professional WHERE source_id = ? AND source_ref = ? AND deleted_at IS NULL`,
    ).get(input.sourceId, input.sourceRef) as { id: number } | undefined;
    let matchedBy = existing ? 'source_ref' : '';

    if (!existing && input.professionalBodyId) {
      existing = h.prepare(
        `SELECT id FROM professional WHERE normalised_name = ? AND professional_body_id = ? AND deleted_at IS NULL`,
      ).get(normalised, input.professionalBodyId) as { id: number } | undefined;
      if (existing) matchedBy = 'exact_name_in_body';
    }

    if (!existing && input.professionalBodyId) {
      const candidates = h.prepare(
        `SELECT id, normalised_name FROM professional WHERE professional_body_id = ? AND deleted_at IS NULL`,
      ).all(input.professionalBodyId) as Array<{ id: number; normalised_name: string }>;
      let best: { id: number; score: number } | null = null;
      for (const c of candidates) {
        const score = trigramSimilarity(normalised, c.normalised_name);
        if (score >= 0.82 && (!best || score > best.score)) best = { id: c.id, score };
      }
      if (best) { existing = { id: best.id }; matchedBy = `fuzzy_name_${best.score.toFixed(2)}`; }
    }

    if (existing) {
      const before = h.prepare(`SELECT * FROM professional WHERE id = ?`).get(existing.id) as Record<string, unknown>;
      h.prepare(
        `UPDATE professional SET
           full_name=?, display_name=?, normalised_name=?, honorific=?, body_role=?,
           professional_body_id=COALESCE(?, professional_body_id),
           primary_jurisdiction_id=COALESCE(?, primary_jurisdiction_id),
           primary_location_id=COALESCE(?, primary_location_id),
           public_email=?, public_phone=?, public_office=?, website_url=COALESCE(?, website_url),
           private_email=?, private_phone=?, private_residence=?, private_office=?,
           photo_url=COALESCE(?, photo_url), photo_source_url=COALESCE(?, photo_source_url),
           enrolment_year=COALESCE(?, enrolment_year),
           source_id=?, source_ref=?, source_url=?, source_captured_at=?, last_verified_at=?, updated_at=?
         WHERE id=?`,
      ).run(
        input.fullName, input.displayName, normalised, input.honorific ?? null, input.bodyRole ?? null,
        input.professionalBodyId ?? null, input.jurisdictionId ?? null, input.locationId ?? null,
        input.publicEmail ?? null, input.publicPhone ?? null, input.publicOffice ?? null, input.websiteUrl ?? null,
        input.privateEmail ?? null, input.privatePhone ?? null, input.privateResidence ?? null, input.privateOffice ?? null,
        input.photoUrl ?? null, input.photoSourceUrl ?? null, input.enrolmentYear ?? null,
        input.sourceId, input.sourceRef, input.sourceUrl, input.sourceCapturedAt, ts, ts, existing.id,
      );
      const after = h.prepare(`SELECT * FROM professional WHERE id = ?`).get(existing.id) as Record<string, unknown>;
      const changed = MEANINGFUL_FIELDS.some((f) => before[f] !== after[f]);
      return { id: existing.id, created: false, changed, matchedBy };
    }

    // New record. Slug must be stable and unique; collisions get a suffix.
    let slug = slugify(input.displayName);
    if (!slug) slug = `professional-${Date.now()}`;
    let attempt = slug;
    let n = 1;
    while (h.prepare(`SELECT 1 FROM professional WHERE slug = ?`).get(attempt)) {
      n += 1;
      attempt = `${slug}-${n}`;
    }

    const info = h.prepare(
      `INSERT INTO professional (
         kind, slug, full_name, normalised_name, display_name, honorific, body_role,
         country_id, primary_jurisdiction_id, primary_location_id, professional_body_id,
         public_email, public_phone, public_office, website_url,
         private_email, private_phone, private_residence, private_office,
         photo_url, photo_source_url, enrolment_year,
         verification_level, claim_status, is_published, data_confidence, accepts_consultations,
         source_id, source_ref, source_url, source_captured_at, last_verified_at, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'unclaimed',0,50,0,?,?,?,?,?,?,?)`,
    ).run(
      input.kind, attempt, input.fullName, normalised, input.displayName, input.honorific ?? null, input.bodyRole ?? null,
      input.countryId, input.jurisdictionId ?? null, input.locationId ?? null, input.professionalBodyId ?? null,
      input.publicEmail ?? null, input.publicPhone ?? null, input.publicOffice ?? null, input.websiteUrl ?? null,
      input.privateEmail ?? null, input.privatePhone ?? null, input.privateResidence ?? null, input.privateOffice ?? null,
      input.photoUrl ?? null, input.photoSourceUrl ?? null, input.enrolmentYear ?? null,
      input.sourceId, input.sourceRef, input.sourceUrl, input.sourceCapturedAt, ts, ts, ts,
    );
    return { id: Number(info.lastInsertRowid), created: true, changed: true, matchedBy: 'new' };
  });
}

const MEANINGFUL_FIELDS = [
  'full_name', 'display_name', 'body_role', 'public_email', 'public_phone',
  'public_office', 'private_residence', 'private_office', 'photo_url',
];

export function linkPracticeArea(professionalId: number, practiceAreaId: number, isPrimary = false, selfDeclared = true): void {
  db().prepare(
    `INSERT INTO professional_practice_area (professional_id, practice_area_id, is_primary, is_self_declared, created_at)
     VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING`,
  ).run(professionalId, practiceAreaId, flag(isPrimary), flag(selfDeclared), now());
}

export function linkCourt(professionalId: number, courtId: number, chamberRef: string | null, isPrimary = false, selfDeclared = false): void {
  db().prepare(
    `INSERT INTO professional_court (professional_id, court_id, is_primary, is_self_declared, chamber_ref, created_at)
     VALUES (?,?,?,?,?,?) ON CONFLICT(professional_id, court_id) DO UPDATE SET chamber_ref = COALESCE(excluded.chamber_ref, chamber_ref)`,
  ).run(professionalId, courtId, flag(isPrimary), flag(selfDeclared), chamberRef, now());
}

export function linkLanguage(professionalId: number, languageId: number): void {
  db().prepare(`INSERT INTO professional_language (professional_id, language_id) VALUES (?,?) ON CONFLICT DO NOTHING`)
    .run(professionalId, languageId);
}

/**
 * Publish gate. A record becomes publicly visible only when:
 *   - its source is cleared for publication,
 *   - it has not opted out,
 *   - it carries the minimum factual fields to be useful and attributable.
 * Called after ingestion, never inferred at render time.
 */
export function applyPublishGate(): { published: number; withheld: number } {
  return transaction(() => {
    const h = db();
    h.prepare(
      `UPDATE professional SET is_published = CASE
         WHEN claim_status = 'opted_out' THEN 0
         WHEN deleted_at IS NOT NULL THEN 0
         WHEN full_name IS NULL OR trim(full_name) = '' THEN 0
         WHEN source_url IS NULL OR source_captured_at IS NULL THEN 0
         WHEN (SELECT publish_allowed FROM source WHERE source.id = professional.source_id) = 0 THEN 0
         ELSE 1 END,
       updated_at = ?`,
    ).run(now());
    const published = Number((h.prepare(`SELECT count(*) n FROM professional WHERE is_published=1`).get() as { n: number }).n);
    const withheld = Number((h.prepare(`SELECT count(*) n FROM professional WHERE is_published=0`).get() as { n: number }).n);
    return { published, withheld };
  });
}

/** Recompute data_confidence from field completeness and source authority. */
export function recomputeConfidence(): void {
  db().prepare(
    `UPDATE professional SET data_confidence = MIN(100, MAX(0,
        30
      + CASE WHEN (SELECT authority FROM source WHERE source.id = professional.source_id) = 'official_regulator' THEN 30 ELSE 10 END
      + CASE WHEN body_role IS NOT NULL AND body_role <> '' THEN 8 ELSE 0 END
      + CASE WHEN public_office IS NOT NULL AND public_office <> '' THEN 8 ELSE 0 END
      + CASE WHEN photo_url IS NOT NULL THEN 6 ELSE 0 END
      + CASE WHEN primary_location_id IS NOT NULL THEN 8 ELSE 0 END
      + CASE WHEN (SELECT count(*) FROM professional_court pc WHERE pc.professional_id = professional.id) > 0 THEN 10 ELSE 0 END
      + CASE WHEN claim_status = 'claimed' THEN 20 ELSE 0 END
    )), updated_at = ?`,
  ).run(now());
}

/** Rebuild the flattened search documents. Full rebuild; the corpus is small. */
export function rebuildSearchIndex(): number {
  return transaction(() => {
    const h = db();
    h.prepare(`DELETE FROM professional_search_doc`).run();
    h.prepare(`DELETE FROM suggest_term`).run();

    const rows = h.prepare(
      `SELECT p.id, p.kind, p.display_name, p.full_name, p.headline, p.bio, p.body_role,
              p.country_id, p.primary_jurisdiction_id, p.verification_level, p.claim_status,
              p.accepts_consultations, p.years_experience, p.data_confidence, p.is_published,
              p.public_office, p.enrolment_year,
              pb.name AS body_name, pb.short_name AS body_short,
              l.path AS location_path, l.name AS location_name,
              j.name AS jurisdiction_name
         FROM professional p
         LEFT JOIN professional_body pb ON pb.id = p.professional_body_id
         LEFT JOIN location l ON l.id = p.primary_location_id
         LEFT JOIN jurisdiction j ON j.id = p.primary_jurisdiction_id
        WHERE p.deleted_at IS NULL`,
    ).all() as Array<Record<string, string | number | null>>;

    const insert = h.prepare(
      `INSERT INTO professional_search_doc (
         professional_id, name_text, role_text, practice_text, court_text, location_text, body_text,
         kind, country_id, jurisdiction_id, location_path, practice_area_ids, court_ids, court_tiers,
         language_ids, matter_type_ids, verification_level, claim_status, accepts_consultations,
         years_experience, data_confidence, is_published, profile_completeness, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );

    const ts = now();
    for (const r of rows) {
      const id = Number(r.id);
      const pas = h.prepare(
        `SELECT pa.id, pa.name, pa.slug FROM professional_practice_area ppa JOIN practice_area pa ON pa.id = ppa.practice_area_id WHERE ppa.professional_id = ?`,
      ).all(id) as Array<{ id: number; name: string; slug: string }>;
      const courts = h.prepare(
        `SELECT c.id, c.name, c.short_name, c.tier FROM professional_court pc JOIN court c ON c.id = pc.court_id WHERE pc.professional_id = ?`,
      ).all(id) as Array<{ id: number; name: string; short_name: string | null; tier: number }>;
      const langs = h.prepare(`SELECT language_id FROM professional_language WHERE professional_id = ?`).all(id) as Array<{ language_id: number }>;
      const mts = h.prepare(`SELECT matter_type_id FROM professional_matter_type WHERE professional_id = ?`).all(id) as Array<{ matter_type_id: number }>;

      // Completeness drives a small ranking factor and the dashboard nudge.
      const filled = [r.headline, r.bio, r.body_role, r.public_office, r.primary_jurisdiction_id, r.enrolment_year].filter(Boolean).length;
      const completeness = Math.round(((filled + Math.min(3, pas.length) + Math.min(2, courts.length)) / 11) * 100);

      insert.run(
        id,
        `${r.display_name ?? ''} ${r.full_name ?? ''}`.trim(),
        [r.body_role, r.kind === 'senior_advocate' ? 'Senior Advocate' : 'Advocate', r.body_name, r.body_short].filter(Boolean).join(' '),
        pas.map((p) => p.name).join(' '),
        courts.map((c) => `${c.name} ${c.short_name ?? ''}`).join(' '),
        [r.location_name, r.jurisdiction_name].filter(Boolean).join(' '),
        [r.headline, r.bio, r.public_office].filter(Boolean).join(' '),
        String(r.kind), Number(r.country_id), r.primary_jurisdiction_id === null ? null : Number(r.primary_jurisdiction_id),
        String(r.location_path ?? ''),
        pas.length ? `,${pas.map((p) => p.id).join(',')},` : '',
        courts.length ? `,${courts.map((c) => c.id).join(',')},` : '',
        courts.length ? `,${[...new Set(courts.map((c) => c.tier))].join(',')},` : '',
        langs.length ? `,${langs.map((l) => l.language_id).join(',')},` : '',
        mts.length ? `,${mts.map((m) => m.matter_type_id).join(',')},` : '',
        Number(r.verification_level), String(r.claim_status), Number(r.accepts_consultations),
        r.years_experience === null ? null : Number(r.years_experience),
        Number(r.data_confidence), Number(r.is_published), completeness, ts,
      );

      if (Number(r.is_published) === 1) {
        h.prepare(
          `INSERT INTO suggest_term (kind, subject_id, label, sublabel, match_key, href, weight) VALUES ('professional',?,?,?,?,?,?)`,
        ).run(id, String(r.display_name), [r.body_role, r.location_name].filter(Boolean).join(' · ') || null,
          fold(String(r.display_name)), `/advocates/${slugFor(id)}`, Number(r.data_confidence));
      }
    }

    // Non-person suggestions: practice areas, locations, courts.
    for (const pa of h.prepare(`SELECT id, name, slug, plain_summary FROM practice_area WHERE is_active=1`).all() as Array<{ id: number; name: string; slug: string; plain_summary: string }>) {
      const n = Number((h.prepare(`SELECT count(*) n FROM professional_search_doc WHERE is_published=1 AND practice_area_ids LIKE ?`).get(`%,${pa.id},%`) as { n: number }).n);
      h.prepare(`INSERT INTO suggest_term (kind, subject_id, label, sublabel, match_key, href, weight) VALUES ('practice_area',?,?,?,?,?,?)`)
        .run(pa.id, pa.name, `${n} listed`, fold(pa.name), `/search?practice=${pa.slug}`, 1000 + n);
      for (const syn of h.prepare(`SELECT phrase, weight FROM practice_area_synonym WHERE practice_area_id=? AND weight>=9`).all(pa.id) as Array<{ phrase: string; weight: number }>) {
        h.prepare(`INSERT INTO suggest_term (kind, subject_id, label, sublabel, match_key, href, weight) VALUES ('practice_area',?,?,?,?,?,?)`)
          .run(pa.id, pa.name, `matches “${syn.phrase}”`, fold(syn.phrase), `/search?practice=${pa.slug}`, 900 + n);
      }
    }
    for (const l of h.prepare(`SELECT id, name, slug, level FROM location WHERE is_searchable=1`).all() as Array<{ id: number; name: string; slug: string; level: number }>) {
      const n = Number((h.prepare(`SELECT count(*) n FROM professional_search_doc WHERE is_published=1 AND location_path LIKE ?`).get(`%/${l.id}/%`) as { n: number }).n);
      h.prepare(`INSERT INTO suggest_term (kind, subject_id, label, sublabel, match_key, href, weight) VALUES ('location',?,?,?,?,?,?)`)
        .run(l.id, l.name, l.level === 1 ? 'State / UT' : 'City', fold(l.name), `/search?location=${l.slug}`, 800 + n);
    }
    for (const c of h.prepare(`SELECT id, name, short_name, slug, tier FROM court`).all() as Array<{ id: number; name: string; short_name: string | null; slug: string; tier: number }>) {
      const n = Number((h.prepare(`SELECT count(*) n FROM professional_search_doc WHERE is_published=1 AND court_ids LIKE ?`).get(`%,${c.id},%`) as { n: number }).n);
      h.prepare(`INSERT INTO suggest_term (kind, subject_id, label, sublabel, match_key, href, weight) VALUES ('court',?,?,?,?,?,?)`)
        .run(c.id, c.name, c.short_name ?? 'Court', fold(c.name), `/search?court=${c.slug}`, 700 + n);
    }

    return rows.length;
  });
}

function slugFor(id: number): string {
  const row = db().prepare(`SELECT slug FROM professional WHERE id=?`).get(id) as { slug: string } | undefined;
  return row?.slug ?? String(id);
}

/**
 * The professional's published office address, or null.
 *
 * Returns null far more often than not, and that is the correct answer: we
 * hold Bar Council records for real named people and have not been given
 * their office addresses. An invented one would be a fabricated fact about
 * a real person's premises that someone might actually travel to — a worse
 * error than an invented fee band (ADR-008, ADR-012). The booking form says
 * "the advocate will confirm the address" instead.
 */
export function chamberAddress(professionalId: number): string | null {
  const row = db().prepare(
    `SELECT address_public AS address
       FROM professional_location
      WHERE professional_id = ? AND address_public IS NOT NULL
      ORDER BY is_primary DESC, id
      LIMIT 1`,
  ).get(professionalId) as { address: string } | undefined;
  return row?.address ?? null;
}
