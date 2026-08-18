#!/usr/bin/env node
/**
 * Re-derive court links from stored raw records, without re-crawling.
 *
 * This is the point of keeping immutable raw payloads: when the normalisation
 * logic is wrong, we can correct it and reprocess history rather than hammering
 * the source again.
 */
import { db, transaction, applyPublishGate, recomputeConfidence, rebuildSearchIndex, linkCourt } from '@lexhall/db';

// Reuse the pipeline's resolver by re-importing the module's internals via a
// tiny re-implementation would drift; instead expose it through a dry-run hook.
const { rows } = { rows: db().prepare(
  `SELECT r.id, r.payload, p.id AS professional_id
     FROM raw_record r
     JOIN professional p ON p.source_id = r.source_id AND p.source_ref = r.source_ref
    WHERE r.state = 'linked' AND r.source_ref LIKE 'member:%'`,
).all() as Array<{ id: number; payload: string; professional_id: number }> };

console.log(`reprocessing ${rows.length} raw member records`);

// Import the resolver from the pipeline module.
const { resolveCourtsFromOffice: resolve } = await import('./src/pipeline.ts');

let cleared = 0;
let linked = 0;
transaction(() => {
  db().prepare(`DELETE FROM professional_court WHERE is_self_declared = 0`).run();
  cleared = 1;
});

for (const row of rows) {
  let payload: { office?: string | null };
  try { payload = JSON.parse(row.payload); } catch { continue; }
  for (const hit of resolve(payload.office ?? null)) {
    linkCourt(row.professional_id, hit.courtId, hit.chamberRef, false, false);
    linked += 1;
  }
}

recomputeConfidence();
const gate = applyPublishGate();
const indexed = rebuildSearchIndex();
console.log(`cleared sourced court links: ${cleared ? 'yes' : 'no'}`);
console.log(`re-linked: ${linked}`);
console.log(`published: ${gate.published}, indexed: ${indexed}`);
