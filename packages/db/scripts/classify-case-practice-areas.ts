/**
 * Classifies advocates into this platform's existing practice_area taxonomy
 * using their REAL case categories (professional_case_category, computed by
 * ingest-verified-advocates.ts from actual case rows) — not a new,
 * parallel taxonomy. Links are evidence-based (is_self_declared=false),
 * distinct from a claimed profile's own self-declared practice areas, and
 * one advocate can match several areas, same as a real practice.
 *
 * Reuses the SAME practice_area_synonym vocabulary that already powers the
 * search bar's free-text classification (368 real phrases, most useful:
 * statute names like "bnss", "138 ni act", "mact"), rather than building a
 * second, disconnected keyword list. A small supplementary list below adds
 * only the statute patterns actually observed in the scraped case data that
 * the existing vocabulary doesn't yet cover (checked against
 * practice_area_synonym directly before writing this — see the commit).
 *
 *   node scripts/classify-case-practice-areas.ts
 */
import { db, now, transaction, recomputeConfidence, applyPublishGate, rebuildSearchIndex } from '@lexhall/db';
import { fold } from '@lexhall/core';

const h = db();
const ts = now();

// slug -> extra phrases not already in practice_area_synonym, confirmed by
// querying it directly (see commit message). Kept local to this script
// rather than added to the shared taxonomy, since these are statute
// patterns for classifying case history, not query intent.
const SUPPLEMENTARY: Record<string, string[]> = {
  criminal: ['ndps', 'pocso', 'atrocities act', 'sc st act', 'anticipatory bail', 'bail application',
    'code of criminal procedure', 'indian penal code', 'criminal procedure code', 'criminal complaint',
    'criminal appeal', 'criminal revision', 'sessions case', 'excise act'],
  family: ['hindu marriage act', 'domestic violence act', 'protection of women'],
  'motor-accident-vehicles': ['motor vehicles act', 'motor vehicle act', 'claims tribunal'],
  'banking-finance': ['negotiable instruments act'],
  'property-real-estate': ['land acquisition', 'rent control', 'tenancy'],
  'civil-litigation': ['civil procedure code', 'civil suit', 'civil appeal', 'civil revision'],
  'constitutional-writs': ['writ petition', 'habeas corpus', 'mandamus', 'public interest litigation'],
  'administrative-service': ['service matter', 'seniority', 'recruitment', 'regularization', 'regularisation'],
  'intellectual-property': ['trademark', 'copyright', 'patent infringement'],
  tax: ['income tax', 'gst act', 'customs act', 'sales tax'],
  arbitration: ['arbitration petition', 'arbitration appeal'],
};

interface Synonym { practiceAreaId: number; phrase: string; weight: number }
const synonyms: Synonym[] = (h.prepare(
  `SELECT practice_area_id AS practiceAreaId, phrase, weight FROM practice_area_synonym`,
).all() as Array<{ practiceAreaId: number; phrase: string; weight: number }>);

const slugToId = new Map<string, number>();
for (const row of h.prepare(`SELECT id, slug FROM practice_area`).all() as Array<{ id: number; slug: string }>) {
  slugToId.set(row.slug, row.id);
}
for (const [slug, phrases] of Object.entries(SUPPLEMENTARY)) {
  const id = slugToId.get(slug);
  if (!id) { process.stderr.write(`warning: unknown practice_area slug "${slug}", skipping its supplementary phrases\n`); continue; }
  for (const phrase of phrases) synonyms.push({ practiceAreaId: id, phrase: fold(phrase), weight: 8 });
}

/** Score one category label against the vocabulary: sum of weights for
 * every phrase found at a word boundary, per practice area. Padded,
 * space-bounded matching (not a raw substring test) so short acronyms like
 * "cpc"/"ipc"/"bns" only match as standalone tokens, never embedded inside
 * an unrelated longer word. */
function classify(label: string): Map<number, number> {
  const folded = ` ${fold(label)} `;
  const scores = new Map<number, number>();
  for (const syn of synonyms) {
    if (folded.includes(` ${syn.phrase} `)) {
      scores.set(syn.practiceAreaId, (scores.get(syn.practiceAreaId) ?? 0) + syn.weight);
    }
  }
  return scores;
}

const advocates = h.prepare(
  `SELECT DISTINCT professional_id FROM professional_case_category`,
).all() as Array<{ professional_id: number }>;

process.stdout.write(`advocates with case categories: ${advocates.length}\n`);

let linked = 0; let advocatesMatched = 0;
const insertLink = h.prepare(
  `INSERT INTO professional_practice_area (professional_id, practice_area_id, is_primary, is_self_declared, created_at)
   VALUES (?,?,?,0,?) ON CONFLICT DO NOTHING`,
);

transaction(() => {
  for (const { professional_id: professionalId } of advocates) {
    const categories = h.prepare(
      `SELECT category_label AS label, case_count AS count FROM professional_case_category WHERE professional_id = ?`,
    ).all(professionalId) as Array<{ label: string; count: number }>;

    const totalScore = new Map<number, number>();
    for (const c of categories) {
      const scores = classify(c.label);
      for (const [paId, score] of scores) totalScore.set(paId, (totalScore.get(paId) ?? 0) + score * c.count);
    }
    if (totalScore.size === 0) continue;

    // Cap at 4 practice areas per advocate (a real practice has a few focus
    // areas, not a scattershot list) — highest-scoring first.
    const ranked = [...totalScore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    ranked.forEach(([paId], idx) => insertLink.run(professionalId, paId, idx === 0 ? 1 : 0, ts));
    linked += ranked.length;
    advocatesMatched += 1;
  }
});

process.stdout.write(`advocates matched to at least one practice area: ${advocatesMatched}\n`);
process.stdout.write(`practice-area links created: ${linked}\n`);

recomputeConfidence();
const gate = applyPublishGate();
const indexed = rebuildSearchIndex();
process.stdout.write(`publish gate: ${gate.published} published, ${gate.withheld} withheld\n`);
process.stdout.write(`search index: ${indexed} documents\n`);
