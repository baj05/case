/**
 * Fetch high-resolution legal imagery from Wikimedia Commons.
 *
 * Why Commons rather than a stock library: no API key, genuinely high
 * resolution, an explicit licence and author per file, and — most importantly —
 * it has photographs of the actual courts this platform indexes. A real High
 * Court is a better hero for a legal directory than a stock model in a suit,
 * and it carries no risk of implying that an identifiable person endorses us.
 *
 * Output: apps/web/public/img/courts/<slug>.jpg  +  credits appended to
 *         apps/web/public/img/editorial/credits.json
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'web', 'public', 'img', 'courts');
const CREDITS = join(ROOT, 'apps', 'web', 'public', 'img', 'editorial', 'credits.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'LexhallImageFetch/0.1 (legal-directory prototype; contact data-correction@lexhall.example)';

/** slug -> [search term, preferred filename fragment] */
const WANTED = [
  ['hero-supreme-court',  'Supreme Court of India building',   'front view'],
  ['court-bombay-hc',     'Bombay High Court building',        'Bombay High Court'],
  ['court-calcutta-hc',   'Calcutta High Court building',      'Calcutta High Court'],
  ['court-madras-hc',     'Madras High Court building',        'High Court'],
  ['court-delhi-hc',      'Delhi High Court building India',   'Delhi High Court'],
  ['court-mp-hc',         'Madhya Pradesh High Court Jabalpur','High Court'],
  ['court-karnataka-hc',  'Karnataka High Court Bangalore',    'High Court'],
  ['court-punjab-hc',     'Punjab and Haryana High Court',     'High Court'],
  ['interior-law-library','law library books shelves reading room', 'library'],
  ['interior-chamber',    'library reading room interior desk', 'reading room'],
];

/** Licences that permit reuse with attribution. Excludes non-free tags. */
const OK_LICENCE = /^(CC BY|CC BY-SA|CC0|Public domain|PD|FAL)/i;

async function search(term) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`, gsrnamespace: '6', gsrlimit: '20',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2000',
  });
  const res = await fetch(u, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const data = await res.json();
  return Object.values(data?.query?.pages ?? {})
    .map((p) => {
      const ii = (p.imageinfo ?? [])[0];
      if (!ii) return null;
      const m = ii.extmetadata ?? {};
      const strip = (v) => (v ?? '').replace(/<[^>]+>/g, '').trim();
      return {
        title: p.title.replace(/^File:/, ''),
        width: ii.width, height: ii.height,
        thumb: ii.thumburl, page: ii.descriptionurl,
        licence: strip(m.LicenseShortName?.value) || 'unknown',
        artist: strip(m.Artist?.value).slice(0, 80) || 'Unknown',
      };
    })
    .filter(Boolean)
    // Landscape, large, reusable licence.
    .filter((x) => x.width >= 1800 && OK_LICENCE.test(x.licence));
}

mkdirSync(OUT, { recursive: true });
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : [];
let ok = 0, failed = 0;

for (const [slug, term, prefer] of WANTED) {
  const dest = join(OUT, `${slug}.jpg`);
  if (existsSync(dest)) { console.log(`· ${slug} (cached)`); continue; }
  try {
    const hits = await search(term);
    if (hits.length === 0) { console.warn(`✗ ${slug}: no usable result`); failed++; continue; }
    // Prefer a filename that actually names the subject, then the largest.
    const scored = hits
      .map((h) => ({ h, score: (h.title.toLowerCase().includes(prefer.toLowerCase()) ? 1000 : 0) + Math.min(h.width, 4000) / 100 }))
      .sort((a, b) => b.score - a.score);
    const pick = scored[0].h;

    const img = await fetch(pick.thumb, { headers: { 'user-agent': UA } });
    if (!img.ok) throw new Error(`download HTTP ${img.status}`);
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.byteLength < 20000) throw new Error('suspiciously small');
    writeFileSync(dest, buf);

    credits.push({
      slug, file: `/img/courts/${slug}.jpg`, title: pick.title,
      creator: pick.artist, creatorUrl: null,
      licence: pick.licence, licenceUrl: null,
      source: 'Wikimedia Commons', sourcePage: pick.page, bytes: buf.byteLength,
    });
    console.log(`✓ ${slug.padEnd(20)} ${(buf.byteLength / 1024).toFixed(0).padStart(4)}kB  ${pick.width}x${pick.height}  ${pick.licence.padEnd(13)} ${pick.title.slice(0, 44)}`);
    ok++;
  } catch (error) {
    console.warn(`✗ ${slug}: ${error.message}`);
    failed++;
  }
  await new Promise((r) => setTimeout(r, 400));
}

writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
console.log(`\n${ok} downloaded, ${failed} failed. Attribution appended to credits.json`);
