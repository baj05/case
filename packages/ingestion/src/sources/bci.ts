/**
 * Bar Council of India — State Bar Council directory and council membership.
 *
 * WHAT THIS SOURCE ACTUALLY CONTAINS (important, and contrary to a common
 * assumption): barcouncilofindia.org publishes the 24 State Bar Councils and,
 * for each, its ELECTED OFFICE-BEARERS — roughly 20-25 people per council. It
 * is NOT the roll of enrolled advocates. The full rolls (well over a million
 * advocates) live on each State Bar Council's own site, in 24 different
 * formats, several behind search forms or captchas.
 *
 * Consequence for the product: this adapter yields a few hundred verifiable,
 * high-profile records — a genuine and legally clean seed corpus — and the
 * per-council roll adapters are the scale-out work. See docs/PROJECT_AUDIT.md
 * §Data-source reality and docs/ROADMAP.md.
 *
 * DATA MINIMISATION: these pages publish residential addresses, personal
 * mobile numbers and personal email addresses. We ingest them into private_*
 * columns because they are the strongest signal for verifying a profile claim,
 * and we do NOT publish them. Office/chamber addresses are published, being
 * professional rather than personal. COMPLIANCE_MATRIX C-07.
 */
import { renderPage, type RenderStrategy } from '../http.ts';
import { titleCaseName } from '@lexhall/core';

export const BCI_SOURCE = {
  code: 'bci-sbc-directory',
  name: 'Bar Council of India — State Bar Council directory',
  publisher: 'Bar Council of India',
  baseUrl: 'https://www.barcouncilofindia.org',
  authority: 'official_regulator' as const,
  coverageNote:
    'The 24 State Bar Councils and their elected office-bearers. NOT the roll of enrolled advocates — '
    + 'state rolls are published separately by each State Bar Council.',
  termsUrl: 'https://www.barcouncilofindia.org/',
  termsReviewNote:
    'robots.txt (checked at ingestion time) permits /info/sbc and /info/sbc-members/*; it disallows '
    + '/admin, /user, /profile, /dashboard, /institute, /request and /verification, none of which are '
    + 'requested. Content is an official public register published by a statutory regulator. '
    + 'Personal contact fields are withheld from publication under data minimisation.',
  publishAllowed: true,
};

export interface CouncilRecord {
  externalCode: string;      // 'SBC05'
  name: string;              // 'BAR COUNCIL OF DELHI'
  regions: string[];
  address: string | null;
  phones: string[];
  websiteUrl: string | null;
  membersUrl: string;
  sourceUrl: string;
}

export interface MemberRecord {
  councilExternalCode: string;
  fullName: string;
  displayName: string;
  honorific: string | null;
  role: string | null;
  isSeniorAdvocate: boolean;
  photoUrl: string | null;
  residence: string | null;
  office: string | null;
  /** Court chamber references extracted from the office text. */
  chamberHints: string[];
  emails: string[];
  phones: string[];
  sourceUrl: string;
}

const DIRECTORY_PATH = '/info/sbc';
const MEMBERS_PATH = '/info/sbc-members';

/**
 * Parse the State Bar Council directory out of rendered markdown.
 *
 * Deliberately delimiter-agnostic. Different render backends emit this table
 * differently — a real markdown table with pipes, or a flattened stream of
 * lines — so the parser anchors on the council name in bold and the
 * `sbc-members/SBCnn` link rather than on table structure.
 */
export function parseCouncilDirectory(markdown: string, baseUrl: string): CouncilRecord[] {
  const flat = markdown.replace(/<br\s*\/?>/gi, ' \n ').replace(/\|/g, ' ');

  // Council names are the only bold, all-caps, multi-word runs on this page.
  const nameRe = /\*\*\s*([A-Z][A-Z&.,()' -]{8,})\s*\*\*/g;
  const marks: Array<{ name: string; start: number; end: number }> = [];
  let nm: RegExpExecArray | null;
  while ((nm = nameRe.exec(flat)) !== null) {
    const name = (nm[1] ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 8) continue;
    marks.push({ name, start: nm.index, end: nameRe.lastIndex });
  }

  const out: CouncilRecord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < marks.length; i += 1) {
    const mark = marks[i];
    if (!mark) continue;
    const next = marks[i + 1];
    const chunk = flat.slice(mark.end, next ? next.start : flat.length);

    const codeMatch = /sbc-members\/(SBC\d+)/i.exec(chunk);
    if (!codeMatch?.[1]) continue;
    const externalCode = codeMatch[1].toUpperCase();
    if (seen.has(externalCode)) continue;
    seen.add(externalCode);

    // Everything before "THE SECRETARY"/"THE REGISTRAR" is the covered region
    // list; everything after is the postal address.
    const officeSplit = /THE\s+(?:SECRETARY|REGISTRAR)\s*,?/i.exec(chunk);
    const regionText = (officeSplit ? chunk.slice(0, officeSplit.index) : chunk.split('\n')[0] ?? '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/\s+/g, ' ').trim();
    const regions = regionText
      .split(/[,&]| AND /i)
      .map((r) => r.replace(/\s+/g, ' ').trim())
      .filter((r) => r.length > 2 && !/^\d+$/.test(r));

    let addressText = officeSplit ? chunk.slice(officeSplit.index) : chunk;
    // Strip links, emoji markers and the "View Members" affordance.
    addressText = addressText
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/View\s+Members/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const address = addressText.length > 8 ? addressText : null;

    const phones = [...new Set(
      [...chunk.matchAll(/(?<!\d)(\+?\d[\d\s-]{8,}\d)(?!\d)/g)]
        .map((x) => (x[1] ?? '').replace(/[\s-]/g, ''))
        .filter((v) => v.length >= 10 && v.length <= 15),
    )];

    // The council's own site, not the barcouncilofindia.org members link.
    const urls = [...chunk.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((x) => x[1] ?? '');
    const websiteUrl = urls.find((u) => u && !/barcouncilofindia\.org/i.test(u)) ?? null;

    out.push({
      externalCode,
      name: mark.name,
      regions,
      address,
      phones,
      websiteUrl,
      membersUrl: `${baseUrl}${MEMBERS_PATH}/${externalCode}`,
      sourceUrl: `${baseUrl}${DIRECTORY_PATH}`,
    });
  }
  return out;
}

const ROLE_MARKERS = [
  'CHAIRMAN', 'VICE-CHAIRMAN', 'VICE CHAIRMAN', 'CO-CHAIRMAN', 'SECRETARY',
  'MEMBER', 'REPRESENTATIVE', 'TREASURER', 'EXECUTIVE COMMITTEE', 'ADVOCATE',
];

/**
 * Parse a council members page.
 *
 * Each member block in the rendered output begins with their photograph, whose
 * alt text is their name — a reliable record delimiter that does not depend on
 * heading levels or CSS classes.
 */
export function parseCouncilMembers(markdown: string, councilExternalCode: string, sourceUrl: string): MemberRecord[] {
  const out: MemberRecord[] = [];

  // Split on the member photo. Handles both "![NAME](url)" and the reader's
  // "![Image 3: NAME](url)" variant.
  const blockRe = /!\[(?:Image\s+\d+:\s*)?([^\]]*?)\]\((https?:\/\/[^)\s]+)\)/g;
  const marks: Array<{ name: string; photo: string; index: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(markdown)) !== null) {
    const alt = (m[1] ?? '').trim();
    const url = m[2] ?? '';
    // Site chrome (logo, icons) has no person-like alt text.
    if (!alt || alt.length < 3) continue;
    if (/logo|icon|banner|emblem|flag/i.test(alt)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    marks.push({ name: alt, photo: url, index: m.index, end: blockRe.lastIndex });
  }

  for (let i = 0; i < marks.length; i += 1) {
    const mark = marks[i];
    if (!mark) continue;
    const next = marks[i + 1];
    const block = markdown.slice(mark.end, next ? next.index : Math.min(markdown.length, mark.end + 2000));

    const rawName = mark.name.replace(/\s+/g, ' ').trim();
    const honorific = /^(SH\.?|SHRI|SMT\.?|MS\.?|MR\.?|DR\.?|PROF\.?)\s/i.exec(rawName)?.[1] ?? null;
    const bareName = honorific ? rawName.slice(honorific.length).trim() : rawName;
    if (bareName.length < 3) continue;

    // Role is the first line after the name that looks like an office.
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let role: string | null = null;
    for (const line of lines.slice(0, 6)) {
      const plain = line.replace(/[*_]/g, '').replace(/’/g, "'").trim();
      if (!plain || plain.toUpperCase() === rawName.toUpperCase()) continue;
      if (ROLE_MARKERS.some((marker) => plain.toUpperCase().includes(marker))) { role = plain; break; }
    }

    const section = (label: string): string | null => {
      const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*:?\\s*([\\s\\S]*?)(?=\\*\\*[A-Za-z]+:\\*\\*|\\[|$)`, 'i');
      const hit = re.exec(block);
      const value = hit?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
      return value.length > 3 ? value : null;
    };

    const emails = [...new Set([...block.matchAll(/mailto:([^\s)]+)/gi)].map((x) => (x[1] ?? '').toLowerCase()))];
    const phones = [...new Set(
      [...block.matchAll(/tel:\s*([+\d][\d\s()-]{5,})/gi)].map((x) => (x[1] ?? '').replace(/[\s()-]/g, '')),
    )];

    const office = section('Office');
    const chamberHints = office
      ? [...office.matchAll(/(?:CH(?:AMBER)?\.?\s*NO\.?\s*[A-Z]?-?\s*[\d/,& -]+[A-Z]?)/gi)].map((x) => x[0].replace(/\s+/g, ' ').trim())
      : [];

    out.push({
      councilExternalCode,
      fullName: bareName,
      displayName: titleCaseName(bareName),
      honorific,
      role,
      isSeniorAdvocate: /SENIOR\s+ADVOCATE/i.test(block) || /SENIOR\s+ADVOCATE/i.test(role ?? ''),
      photoUrl: mark.photo,
      residence: section('Residence'),
      office,
      chamberHints: [...new Set(chamberHints)],
      emails,
      phones,
      sourceUrl,
    });
  }

  return out;
}

export async function fetchCouncilDirectory(strategy: RenderStrategy): Promise<{ councils: CouncilRecord[]; via: string }> {
  const url = `${BCI_SOURCE.baseUrl}${DIRECTORY_PATH}`;
  const { text, via } = await renderPage(url, strategy);
  return { councils: parseCouncilDirectory(text, BCI_SOURCE.baseUrl), via };
}

/** How many fields a record actually populated — used to pick the best of
 *  several render attempts. */
function richness(m: MemberRecord): number {
  return [m.role, m.residence, m.office, m.photoUrl].filter(Boolean).length
    + m.emails.length + m.phones.length + m.chamberHints.length;
}

/**
 * Merge members across render attempts, keeping the richest version of each
 * person. Client-rendered pages sometimes drop a block mid-render; retrying
 * and unioning recovers those records instead of persisting a half-empty row.
 */
export function mergeMembers(batches: MemberRecord[][]): MemberRecord[] {
  const byKey = new Map<string, MemberRecord>();
  for (const batch of batches) {
    for (const m of batch) {
      const key = m.fullName.toUpperCase().replace(/[^A-Z]/g, '');
      const existing = byKey.get(key);
      if (!existing) { byKey.set(key, m); continue; }
      // Field-wise union, so two partial renders can complete each other.
      byKey.set(key, {
        ...existing,
        role: existing.role ?? m.role,
        residence: existing.residence ?? m.residence,
        office: existing.office ?? m.office,
        photoUrl: existing.photoUrl ?? m.photoUrl,
        isSeniorAdvocate: existing.isSeniorAdvocate || m.isSeniorAdvocate,
        emails: [...new Set([...existing.emails, ...m.emails])],
        phones: [...new Set([...existing.phones, ...m.phones])],
        chamberHints: [...new Set([...existing.chamberHints, ...m.chamberHints])],
      });
    }
  }
  return [...byKey.values()].sort((a, b) => richness(b) - richness(a));
}

export async function fetchCouncilMembers(
  externalCode: string,
  strategy: RenderStrategy,
  attempts = 2,
): Promise<{ members: MemberRecord[]; via: string; sourceUrl: string; incomplete: MemberRecord[] }> {
  const sourceUrl = `${BCI_SOURCE.baseUrl}${MEMBERS_PATH}/${externalCode}`;
  const batches: MemberRecord[][] = [];
  let via = '';
  let lastError: Error | null = null;

  for (let i = 0; i < Math.max(1, attempts); i += 1) {
    // Space retries out. Back-to-back requests get throttled and return a
    // partially-rendered page, which would defeat the point of retrying.
    if (i > 0) await new Promise((r) => setTimeout(r, 4000 + i * 2000));
    try {
      const res = await renderPage(sourceUrl, strategy);
      via = res.via;
      const parsed = parseCouncilMembers(res.text, externalCode, sourceUrl);
      batches.push(parsed);
      // Stop early once a render looks complete, to avoid needless load on the
      // source.
      const partial = parsed.filter((m) => !m.role && !m.office && !m.residence && m.emails.length === 0);
      if (parsed.length > 0 && partial.length === 0) break;
    } catch (error) {
      lastError = error as Error;
    }
  }
  if (batches.length === 0) throw lastError ?? new Error(`could not render ${sourceUrl}`);

  const members = mergeMembers(batches);
  // A member with a name and photo but no role or contact detail is a partial
  // extraction, not a complete record. Surfaced for review rather than hidden.
  const incomplete = members.filter((m) => !m.role && !m.office && !m.residence && m.emails.length === 0);
  return { members, via, sourceUrl, incomplete };
}
