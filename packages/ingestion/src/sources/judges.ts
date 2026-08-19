/**
 * Judges ingestion.
 *
 * Source: Wikipedia's maintained, cited list of sitting Supreme Court judges,
 * via the public MediaWiki API. Facts (name, parent High Court, appointment
 * dates) are not copyrightable, but the source is attributed anyway — the whole
 * point of this platform is that every published fact is traceable.
 *
 * DELIBERATELY ABSENT, per the brief and COMPLIANCE_MATRIX C-14: no rating, no
 * score, no "judge analytics", no sentiment. Factual profiles only. Gamifying
 * the judiciary would be both wrong and a contempt risk.
 */
import { titleCaseName } from '@lexhall/core';

export const JUDGES_SOURCE = {
  code: 'wikipedia-supreme-court-judges',
  name: 'Wikipedia — sitting judges of the Supreme Court of India',
  publisher: 'Wikipedia contributors (CC BY-SA 4.0)',
  baseUrl: 'https://en.wikipedia.org',
  authority: 'government' as const,
  coverageNote:
    'Sitting judges of the Supreme Court of India: name, parent High Court and appointment details. '
    + 'A community-maintained list, cited but not an official register — labelled as such on every profile.',
  termsUrl: 'https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content',
  termsReviewNote:
    'Accessed through the documented public MediaWiki API. Content is CC BY-SA 4.0 and attributed. '
    + 'Only factual fields are ingested; no rating or evaluative data is derived, per COMPLIANCE_MATRIX C-14.',
  publishAllowed: true,
};

export interface JudgeRecord {
  fullName: string;
  displayName: string;
  designation: string | null;
  parentHighCourt: string | null;
  appointedOn: string | null;
  retiresOn: string | null;
  photoTitle: string | null;
  sourceUrl: string;
}

const API = 'https://en.wikipedia.org/w/api.php';
const PAGE = 'List of sitting judges of the Supreme Court of India';

/** Strip wiki markup down to plain text. */
function plain(v: string): string {
  return v
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')   // [[Target|Label]] -> Label
    .replace(/\[\[([^\]]*)\]\]/g, '$1')            // [[Label]] -> Label
    .replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<small>|<\/small>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/gi, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse the wikitext tables into judge records. */
export function parseJudges(wikitext: string, sourceUrl: string): JudgeRecord[] {
  const out: JudgeRecord[] = [];
  const seen = new Set<string>();

  // Rows are separated by |- and cells begin with a leading pipe.
  for (const block of wikitext.split(/\n\|-/)) {
    const cells = block
      .split(/\n\|(?!\})/)
      .slice(1)
      .map((c) => c.replace(/^\|/, ''));
    if (cells.length < 2) continue;

    // The photo cell contains a File: link; the name cell is the first cell
    // holding a wikilink that is NOT a file.
    let photoTitle: string | null = null;
    let nameCell: string | null = null;
    let nameIndex = -1;
    for (const [i, cell] of cells.entries()) {
      const fileMatch = /\[\[File:([^|\]]+)/i.exec(cell);
      if (fileMatch?.[1] && !photoTitle) { photoTitle = fileMatch[1].trim(); continue; }
      if (!nameCell && /\[\[[^\]]+\]\]/.test(cell) && !/\[\[File:/i.test(cell)) {
        nameCell = cell; nameIndex = i;
      }
    }
    if (!nameCell) continue;

    // "Surya Kant<br />(Chief Justice of India)" -> name + designation
    const nameText = plain(nameCell);
    const desigMatch = /\(([^)]*(?:Chief Justice|Justice)[^)]*)\)/i.exec(nameText);
    const designation = desigMatch?.[1]?.trim() ?? null;
    const bare = nameText.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    if (bare.length < 3 || bare.length > 80) continue;
    // Skip header-ish or non-person rows.
    if (/^(name|judge|portrait|image|sr\.?\s*no|s\.?\s*no)$/i.test(bare)) continue;

    const key = bare.toLowerCase().replace(/[^a-z]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);

    // Parent High Court: read the wikilink TARGET, not its label. The table
    // writes [[Punjab and Haryana High Court|Punjab and Haryana]], so the
    // visible text drops the words "High Court" entirely.
    let parentHighCourt: string | null = null;
    for (const [i, cell] of cells.entries()) {
      if (i === nameIndex) continue;
      const target = /\[\[([^|\]]*High Court[^|\]]*)/i.exec(cell)?.[1];
      if (target) { parentHighCourt = target.trim(); break; }
    }

    // Remaining cells for dates.
    const rest = cells.filter((_, i) => i !== nameIndex).map(plain);
    const dates = rest.filter((c) => /\b(19|20)\d{2}\b/.test(c));
    const appointedOn = dates[0] ?? null;
    const retiresOn = dates.find((d) => d !== appointedOn && /\b20[2-9]\d\b/.test(d)) ?? null;

    out.push({
      fullName: bare,
      displayName: titleCaseName(bare),
      designation,
      parentHighCourt,
      appointedOn,
      retiresOn,
      photoTitle,
      sourceUrl,
    });
  }
  return out;
}

export async function fetchJudges(): Promise<{ judges: JudgeRecord[]; sourceUrl: string }> {
  const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(PAGE.replace(/ /g, '_'))}`;
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'parse', page: PAGE, prop: 'wikitext', format: 'json', formatversion: '2',
  }).toString();
  const res = await fetch(u, {
    headers: { 'user-agent': 'LexhallBot/0.1 (+http://localhost:3000/bot)' },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const data = await res.json() as { parse?: { wikitext?: string } };
  const wikitext = data?.parse?.wikitext;
  if (!wikitext) throw new Error('no wikitext returned');
  return { judges: parseJudges(wikitext, sourceUrl), sourceUrl };
}
