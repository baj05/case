/**
 * Post-ingest cleanup for the eCourtsIndia public-scrape source
 * (ingest-ecourts-scrape.ts).
 *
 * The case-listing advocate fields sometimes hold a government-office role
 * ("APP", "AG Meghalaya", "Court Inspector"), a law-firm name ("Hall Mark
 * Associates"), or a fragment of order text ("Govt Pleader takes notice for
 * respondents") instead of, or alongside, a person's name. Rather than a
 * blunt keyword denylist (which would also delete real people like "Mohsin
 * Qadri AAG" or "PP Sharma" who DO have a name attached), this strips a
 * defined set of role/connector/placeholder tokens from each normalised name
 * and soft-deletes only the records where NOTHING resembling a real name
 * survives that strip. A record that still has a residual token is kept —
 * erring toward keeping a possibly-messy-but-real name over discarding one.
 *
 *   node scripts/clean-ecourts-scrape.ts           # report only
 *   node scripts/clean-ecourts-scrape.ts --apply   # soft-delete matches
 */
import { db, now, transaction, recomputeConfidence, applyPublishGate, rebuildSearchIndex } from '@lexhall/db';

const apply = process.argv.includes('--apply');
const h = db();

// Role abbreviations and their expansions, procedural connector words, and
// literal placeholder values seen in the actual scraped data (verified
// against this database's own contents before writing this list — not
// guessed). Every token here is either a government-office designation, a
// grammatical connector, or a "no value" placeholder — never a plausible
// personal-name fragment.
const STOPWORDS = new Set([
  // government law-officer role abbreviations
  'pp', 'app', 'adpo', 'agp', 'asg', 'dsg', 'ag', 'aag', 'spp', 'dgp', 'gp',
  'sc', 'po',
  // spelled-out roles
  'prosecutor', 'pleader', 'counsel', 'inspector', 'manager', 'branch',
  'standing', 'legal', 'aid', 'defence', 'defense', 'central', 'govt',
  'government', 'solicitor', 'general', 'public', 'assistant', 'additional',
  'addl', 'deputy', 'dy', 'senior', 'sr', 'junior', 'jr', 'ld', 'in', 'charge',
  'incharge', 'officer', 'officerpo', 'appo', 'pocso',
  // procedural / connector words from order-text fragments
  'for', 'to', 'of', 'and', 'the', 'with', 'notice', 'copy', 'served',
  'waives', 'accepts', 'takes', 'memo', 'required', 'respondents',
  'respondent', 'petitioner', 'petitioners', 'union', 'state', 'r', 'rr',
  'non', 'through', 'no', 'nos', 'v', 'vs',
  // literal "no value" placeholders
  'nil', 'nill', 'none', 'na', 'unknown', 'self', 'uoi', 'party', 'caveator',
  'person',
  // state/UT names — a role token followed only by a jurisdiction name
  // ("AG Meghalaya", "GP for Home") is a post-holder title, not a person.
  'andaman', 'nicobar', 'islands', 'andhra', 'pradesh', 'arunachal', 'assam',
  'bihar', 'chhattisgarh', 'chandigarh', 'dadra', 'nagar', 'haveli', 'daman',
  'diu', 'delhi', 'goa', 'gujarat', 'haryana', 'himachal', 'jammu', 'kashmir',
  'jharkhand', 'karnataka', 'kerala', 'ladakh', 'lakshadweep', 'madhya',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha',
  'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil', 'nadu', 'telangana',
  'tripura', 'uttar', 'uttarakhand', 'bengal', 'kavaratti', 'minicoy',
  'androth', 'amini', 'pithora',
  // government department/portfolio words seen as "<role> for <department>"
  'revenue', 'home', 'education', 'panchayat', 'raj', 'civil', 'supplies',
  'welfare', 'social', 'rural', 'dev', 'development', 'appeals',
  'acquisition', 'land', 'mines', 'endowments', 'services', 'forests',
  'energy', 'finance', 'planning', 'labour', 'prohibition', 'excise',
  'administration', 'roads', 'arbitration', 'animal', 'husbandary',
  'husbandry', 'mcpl', 'admn', 'urban', 'writ', 'cell', 'i', 'ii', 'iii', 'iv',
]);

function residualTokenCount(normalisedName: string): number {
  const tokens = normalisedName.split(' ').filter(Boolean);
  return tokens.filter((t) => !STOPWORDS.has(t) && !/^\d+$/.test(t) && t.length > 1).length;
}

const rows = h.prepare(
  `SELECT p.id, p.normalised_name, p.display_name, p.source_mention_count
     FROM professional p JOIN source s ON s.id = p.source_id
    WHERE s.code = 'ecourtsindia-public-scrape' AND p.deleted_at IS NULL`,
).all() as Array<{ id: number; normalised_name: string; display_name: string; source_mention_count: number | null }>;

const toDelete = rows.filter((r) => residualTokenCount(r.normalised_name) === 0);
const totalMentions = toDelete.reduce((sum, r) => sum + (r.source_mention_count ?? 0), 0);

process.stdout.write(`scanned: ${rows.length}\n`);
process.stdout.write(`no residual name after stripping role/connector/placeholder tokens: ${toDelete.length} (${totalMentions} total mentions)\n\n`);
process.stdout.write('sample of what would be removed:\n');
for (const r of toDelete.slice(0, 30)) process.stdout.write(`  "${r.display_name}" (${r.source_mention_count} mentions)\n`);

if (!apply) {
  process.stdout.write('\n(report only — pass --apply to soft-delete these)\n');
  process.exit(0);
}

const ts = now();
transaction(() => {
  const stmt = h.prepare(`UPDATE professional SET deleted_at = ?, is_published = 0, updated_at = ? WHERE id = ?`);
  for (const r of toDelete) stmt.run(ts, ts, r.id);
});
process.stdout.write(`\nsoft-deleted ${toDelete.length} records.\n`);

recomputeConfidence();
const gate = applyPublishGate();
const indexed = rebuildSearchIndex();
process.stdout.write(`publish gate: ${gate.published} published, ${gate.withheld} withheld\n`);
process.stdout.write(`search index: ${indexed} documents\n`);
