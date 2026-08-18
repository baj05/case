/**
 * Ingestion pipeline.
 *
 *   source -> render -> parse -> raw store (hashed) -> normalise -> resolve
 *   -> upsert -> link (courts, enrolment) -> QC issues -> publish gate
 *   -> confidence -> search index
 *
 * Reusable across sources: adding a State Bar Council roll means writing an
 * adapter that yields MemberRecord-shaped rows, not touching this file.
 */
import { db, now, transaction, toJson } from '@lexhall/db';
import {
  registerSource, recordRobotsCheck, startRun, finishRun, storeRaw, markRawState,
  logIssue, upsertProfessional, linkCourt, linkLanguage, applyPublishGate,
  recomputeConfidence, rebuildSearchIndex, seedReferenceData, type RunTotals,
} from '@lexhall/db';
import { fold, INDIA_COURTS } from '@lexhall/core';
import { checkRobots, type RenderStrategy } from './http.ts';
import { BCI_SOURCE, fetchCouncilDirectory, fetchCouncilMembers, type CouncilRecord, type MemberRecord } from './sources/bci.ts';
import { downloadPhoto } from './photos.ts';

export interface IngestOptions {
  dryRun: boolean;
  strategy: RenderStrategy;
  councils?: string[];        // limit to specific SBC codes
  attempts: number;
  downloadPhotos: boolean;
  onProgress?: (message: string) => void;
}

export interface IngestReport {
  runId: number | null;
  councilsSeen: number;
  councilsStored: number;
  totals: RunTotals;
  incompleteRecords: number;
  photosStored: number;
  publishGate: { published: number; withheld: number } | null;
  indexed: number;
  warnings: string[];
}

/** Map a council's covered regions to a jurisdiction + location in our data. */
function resolveCouncilPlace(council: CouncilRecord): { jurisdictionId: number | null; locationId: number | null } {
  const h = db();
  // Prefer an explicit region name match; fall back to a city named in the
  // postal address (e.g. "HIGH COURT CAMPUS JABALPUR").
  for (const region of council.regions) {
    const row = h.prepare(
      `SELECT l.id AS locationId, l.jurisdiction_id AS jurisdictionId FROM location l
        WHERE l.level = 1 AND lower(l.name) = lower(?) LIMIT 1`,
    ).get(region.trim()) as { locationId: number; jurisdictionId: number | null } | undefined;
    if (row) return { jurisdictionId: row.jurisdictionId, locationId: row.locationId };
  }
  if (council.address) {
    const folded = fold(council.address);
    const cities = h.prepare(`SELECT id, name, jurisdiction_id FROM location WHERE level = 4`).all() as Array<{ id: number; name: string; jurisdiction_id: number | null }>;
    // Longest name first, so "New Delhi" wins over "Delhi".
    for (const c of cities.sort((a, b) => b.name.length - a.name.length)) {
      if (folded.includes(fold(c.name))) return { jurisdictionId: c.jurisdiction_id, locationId: c.id };
    }
  }
  return { jurisdictionId: null, locationId: null };
}

/**
 * Resolve courts from the chamber/office address the register publishes.
 *
 * Two rules learned the hard way:
 *
 *  1. NEVER match on a court's seat. Half the tribunals in the country sit in
 *     New Delhi, so matching "NEW DELHI" in an address against `court.seat`
 *     linked one Delhi advocate to the Supreme Court, NCLT, NCLAT, NGT and
 *     TDSAT simultaneously. That is fabricated data. Only an explicit court
 *     name or its recognised short name counts as evidence.
 *
 *  2. A chamber number belongs to the court it was written next to. Attaching
 *     the first chamber found to every matched court asserts something the
 *     source never said, so each chamber is bound to the nearest preceding
 *     court mention.
 */
export function resolveCourtsFromOffice(office: string | null): Array<{ courtId: number; chamberRef: string | null }> {
  if (!office) return [];
  const h = db();
  const folded = fold(office);

  const courts = h.prepare(`SELECT id, name, short_name FROM court`).all() as Array<{
    id: number; name: string; short_name: string | null;
  }>;

  // Registers write court names their own way — "HIGH COURT OF DELHI" rather
  // than "Delhi High Court" — so the seed's recognised name variants are part
  // of the evidence. Seats deliberately are NOT (see rule 1 above).
  const aliasFor = new Map<string, string[]>();
  for (const seed of INDIA_COURTS) aliasFor.set(seed.name, seed.aliases ?? []);

  // Locate every chamber reference with its position in the text.
  const chamberMatches = [...office.matchAll(/CH(?:AMBER)?\.?\s*NO\.?\s*[A-Z]?-?\s*[\d/,& -]*\d[A-Z]?/gi)]
    .map((m) => ({ ref: m[0].replace(/\s+/g, ' ').trim().replace(/[,\s]+$/, ''), index: m.index ?? 0 }));

  const hits: Array<{ courtId: number; chamberRef: string | null; at: number }> = [];

  for (const c of courts) {
    // Only real court identifiers, and long enough that a substring hit is
    // meaningful. "CAT" or "AFT" would match inside unrelated words.
    const identifiers = [c.name, c.short_name, ...(aliasFor.get(c.name) ?? [])]
      .filter((v): v is string => Boolean(v) && v.trim().length >= 8)
      // Longest first, so "Madhya Pradesh High Court, Indore Bench" is
      // preferred over the parent court when both appear.
      .sort((a, b) => b.length - a.length);

    for (const ident of identifiers) {
      const needle = fold(ident);
      const at = folded.indexOf(needle);
      if (at === -1) continue;

      // Bind the chamber reference that sits closest before this court mention
      // (addresses read "CH. NO. 237, BLOCK-1, HIGH COURT OF DELHI"), else the
      // nearest one after it.
      const ratio = office.length / Math.max(1, folded.length);
      const approxAt = Math.round(at * ratio);
      const before = chamberMatches.filter((m) => m.index <= approxAt).pop();
      const after = chamberMatches.find((m) => m.index > approxAt);
      const chosen = before ?? after ?? null;

      hits.push({ courtId: c.id, chamberRef: chosen?.ref ?? null, at });
      break;
    }
  }

  // Keep the longest-name match per court and de-duplicate.
  return [...new Map(hits.sort((a, b) => a.at - b.at).map((x) => [x.courtId, { courtId: x.courtId, chamberRef: x.chamberRef }])).values()];
}

export async function ingestBci(options: IngestOptions): Promise<IngestReport> {
  const log = options.onProgress ?? (() => {});
  const warnings: string[] = [];
  const totals: RunTotals = { pagesFetched: 0, recordsSeen: 0, created: 0, updated: 0, unchanged: 0, failed: 0 };
  let incompleteRecords = 0;
  let photosStored = 0;

  // Reference data must exist before we can resolve places and courts.
  seedReferenceData();

  const sourceId = registerSource(BCI_SOURCE);

  // Robots first, always, and record the outcome for the audit trail.
  const robots = await checkRobots(BCI_SOURCE.baseUrl);
  const robotsOk = robots === 'unavailable' ? false : true;
  recordRobotsCheck(sourceId, robotsOk);
  if (robots === 'unavailable') {
    warnings.push('robots.txt could not be read; proceeding only because the target paths are the published public register. Re-check before scaling.');
  }
  log(`robots.txt: ${robots === 'unavailable' ? 'unavailable' : 'read and applied'}`);

  const runId = startRun(sourceId, 'manual', options.dryRun);
  const countryId = Number((db().prepare(`SELECT id FROM country WHERE iso2='IN'`).get() as { id: number }).id);

  let councilsStored = 0;
  try {
    // ---- 1. council directory --------------------------------------------
    const { councils, via } = await fetchCouncilDirectory(options.strategy);
    totals.pagesFetched += 1;
    log(`directory: ${councils.length} State Bar Councils (via ${via})`);
    if (councils.length === 0) throw new Error('directory parsed zero councils — the page structure may have changed');

    const councilIdByCode = new Map<string, number>();
    for (const council of councils) {
      const place = resolveCouncilPlace(council);
      const raw = storeRaw({
        sourceId, runId, sourceRef: `council:${council.externalCode}`,
        sourceUrl: council.sourceUrl, payload: council,
      });

      if (!options.dryRun) {
        const ts = now();
        const code = `IN-${council.externalCode}`;
        db().prepare(
          `INSERT INTO professional_body (country_id, jurisdiction_id, parent_id, code, external_code, name,
             short_name, kind, covers_regions, address, phones, website_url, source_id, source_url,
             source_captured_at, last_verified_at, created_at, updated_at)
           VALUES (?,?,NULL,?,?,?,?,'state_bar_council',?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(code) DO UPDATE SET
             name=excluded.name, covers_regions=excluded.covers_regions, address=excluded.address,
             phones=excluded.phones, website_url=excluded.website_url, jurisdiction_id=excluded.jurisdiction_id,
             source_captured_at=excluded.source_captured_at, last_verified_at=excluded.last_verified_at,
             updated_at=excluded.updated_at`,
        ).run(countryId, place.jurisdictionId, code, council.externalCode, council.name,
          council.name.replace(/^BAR COUNCIL OF\s+/i, '').trim() || null,
          toJson(council.regions), council.address, toJson(council.phones), council.websiteUrl,
          sourceId, council.sourceUrl, ts, ts, ts, ts);
        const bodyId = Number((db().prepare(`SELECT id FROM professional_body WHERE code=?`).get(code) as { id: number }).id);
        councilIdByCode.set(council.externalCode, bodyId);
        markRawState(raw.rawId, 'linked');
        councilsStored += 1;
      }

      if (!place.jurisdictionId) {
        logIssue({ runId, rawRecordId: raw.rawId, code: 'unmapped_location', severity: 'warning',
          detail: `Could not map ${council.name} (${council.regions.join(', ') || 'no regions listed'}) to a jurisdiction.` });
      }
    }

    // ---- 2. members per council ------------------------------------------
    const targets = options.councils?.length
      ? councils.filter((c) => options.councils?.includes(c.externalCode))
      : councils;

    const englishId = (db().prepare(`SELECT id FROM language WHERE iso639='en'`).get() as { id: number } | undefined)?.id ?? null;

    for (const council of targets) {
      let members: MemberRecord[] = [];
      let incomplete: MemberRecord[] = [];
      try {
        const res = await fetchCouncilMembers(council.externalCode, options.strategy, options.attempts);
        members = res.members;
        incomplete = res.incomplete;
        totals.pagesFetched += 1;
      } catch (error) {
        totals.failed += 1;
        const message = (error as Error).message;
        warnings.push(`${council.externalCode}: ${message}`);
        logIssue({ runId, code: 'fetch_failed', severity: 'error', detail: `${council.name}: ${message}` });
        log(`  ${council.externalCode} ${council.name}: FETCH FAILED (${message})`);
        continue;
      }

      incompleteRecords += incomplete.length;
      log(`  ${council.externalCode} ${council.name.slice(0, 38).padEnd(38)} ${String(members.length).padStart(3)} members${incomplete.length ? `, ${incomplete.length} partial` : ''}`);

      const bodyId = councilIdByCode.get(council.externalCode) ?? null;
      const place = resolveCouncilPlace(council);

      for (const member of members) {
        totals.recordsSeen += 1;
        const rawRef = `member:${council.externalCode}:${fold(member.fullName).replace(/\s+/g, '-')}`;
        const raw = storeRaw({
          sourceId, runId, sourceRef: rawRef,
          sourceUrl: member.sourceUrl, payload: member,
        });

        if (!member.fullName || member.fullName.length < 3) {
          totals.failed += 1;
          markRawState(raw.rawId, 'rejected', 'missing or unusable name');
          logIssue({ runId, rawRecordId: raw.rawId, code: 'missing_name', severity: 'error', detail: 'Record had no usable name.' });
          continue;
        }

        if (!raw.changed && !options.dryRun) { totals.unchanged += 1; continue; }
        if (options.dryRun) { totals.created += 1; continue; }

        // Photograph: store locally, keep the original URL as provenance.
        let photoPath: string | null = null;
        if (options.downloadPhotos && member.photoUrl) {
          const stored = await downloadPhoto(member.photoUrl);
          if (stored) { photoPath = stored.publicPath; if (stored.bytes > 0) photosStored += 1; }
        }

        try {
          const result = upsertProfessional({
            kind: member.isSeniorAdvocate ? 'senior_advocate' : 'advocate',
            fullName: member.fullName,
            displayName: member.displayName,
            honorific: member.honorific,
            bodyRole: member.role ? `${member.role.replace(/^HON'?BLE\s+/i, '').trim()}, ${council.name.replace(/^BAR COUNCIL OF\s+/i, 'Bar Council of ')}` : null,
            professionalBodyId: bodyId,
            countryId,
            jurisdictionId: place.jurisdictionId,
            locationId: place.locationId,
            // Office/chamber detail is professional information: publishable.
            publicOffice: member.office,
            // Personal contact detail: retained privately for claim matching only.
            privateEmail: member.emails[0] ?? null,
            privatePhone: member.phones[0] ?? null,
            privateResidence: member.residence,
            privateOffice: member.office,
            photoUrl: photoPath,
            photoSourceUrl: member.photoUrl,
            sourceId,
            sourceRef: rawRef,
            sourceUrl: member.sourceUrl,
            sourceCapturedAt: now(),
          });

          if (result.created) totals.created += 1; else if (result.changed) totals.updated += 1; else totals.unchanged += 1;
          markRawState(raw.rawId, 'linked');

          // Enrolment: we know the issuing body from the source, but NOT the
          // enrolment number. Recording 'unknown' standing is honest; inventing
          // a number would not be.
          if (bodyId) {
            // No ON CONFLICT here: the unique index on (body, number) is
            // PARTIAL (only where the number is present), so it matches no
            // constraint for a NULL number and SQLite would raise. An explicit
            // existence check is both correct and clearer.
            const already = db().prepare(
              `SELECT 1 FROM enrolment WHERE professional_id = ? AND professional_body_id = ?
                 AND enrolment_number IS NULL LIMIT 1`,
            ).get(result.id, bodyId);
            if (!already) {
              db().prepare(
                `INSERT INTO enrolment (professional_id, professional_body_id, enrolment_number, standing,
                   evidence_basis, source_url, last_verified_at, created_at, updated_at)
                 VALUES (?,?,NULL,'unknown','source_document',?,?,?,?)`,
              ).run(result.id, bodyId, member.sourceUrl, now(), now(), now());
            }
          }

          // Courts, derived from the chamber address the source publishes.
          for (const hit of resolveCourtsFromOffice(member.office)) {
            linkCourt(result.id, hit.courtId, hit.chamberRef, false, false);
          }
          if (englishId) linkLanguage(result.id, englishId);

          if (result.matchedBy.startsWith('fuzzy_name')) {
            logIssue({ runId, rawRecordId: raw.rawId, professionalId: result.id, code: 'suspected_duplicate',
              severity: 'warning', detail: `Matched an existing record by name similarity (${result.matchedBy}). Confirm these are the same person.` });
          }
          if (!member.role && !member.office && !member.residence && member.emails.length === 0) {
            logIssue({ runId, rawRecordId: raw.rawId, professionalId: result.id, code: 'incomplete_extraction',
              severity: 'warning', detail: 'Only name and photograph were extracted. The rendered page omitted this member\'s detail block; re-ingest with a full browser renderer.' });
          }
          // NOTE: practice areas are deliberately NOT set. The source does not
          // state them, and inferring an advocate's specialisation would be
          // fabrication. They appear once the profile is claimed. Spec §96.
        } catch (error) {
          totals.failed += 1;
          markRawState(raw.rawId, 'rejected', (error as Error).message);
          logIssue({ runId, rawRecordId: raw.rawId, code: 'parse_failed', severity: 'error', detail: (error as Error).message });
        }
      }
    }

    // ---- 3. post-processing ----------------------------------------------
    let publishGate: IngestReport['publishGate'] = null;
    let indexed = 0;
    if (!options.dryRun) {
      recomputeConfidence();
      publishGate = applyPublishGate();
      indexed = rebuildSearchIndex();
      log(`publish gate: ${publishGate.published} published, ${publishGate.withheld} withheld`);
      log(`search index: ${indexed} documents`);
    }

    finishRun(runId, options.dryRun ? 'dry_run' : totals.failed > 0 ? 'partial' : 'succeeded', totals,
      warnings.length ? warnings.slice(0, 5).join(' | ') : undefined,
      `strategy=${options.strategy} attempts=${options.attempts} incomplete=${incompleteRecords}`);

    return { runId, councilsSeen: councils.length, councilsStored, totals, incompleteRecords, photosStored, publishGate, indexed, warnings };
  } catch (error) {
    finishRun(runId, 'failed', totals, (error as Error).message);
    throw error;
  }
}
