/**
 * Fetch editorial imagery from Openverse, filtered to commercially-licensed
 * works, and record attribution for every file.
 *
 * Why Openverse and not Unsplash/Pexels: it needs no API key, and it returns
 * the licence and creator for each result, so we can render a real credits
 * page. Shipping images we cannot attribute would contradict the whole
 * provenance posture of this platform.
 *
 * Output: apps/web/public/img/editorial/<slug>.jpg
 *         apps/web/public/img/editorial/credits.json
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'img', 'editorial');
const API = 'https://api.openverse.org/v1/images/';

/** slug -> search query. Deliberately avoids the gavel trope: gavels are not
 *  used in Indian courts and signal a US-template product. */
const WANTED = {
  'hero-chambers':        'law library books shelves',
  'court-building':       'court building architecture',
  'law-books':            'law books legal texts',
  'documents-signing':    'signing document pen paper',
  'meeting-office':       'business meeting office table',
  'city-delhi':           'delhi india architecture',
  'city-mumbai':          'mumbai india skyline',
  'pa-labour':            'factory workers industrial',
  'pa-corporate':         'office building glass corporate',
  'pa-family':            'family home together',
  'pa-property':          'apartment building housing',
  'pa-criminal':          'police station india',
  'pa-tax':               'calculator accounting documents',
  'pa-ip':                'design sketch drawing studio',
  'pa-tech':              'server data centre network',
  'pa-arbitration':       'conference room table chairs',
  'pa-consumer':          'shop retail counter',
  'pa-banking':           'bank building finance',
};

const credits = [];

async function searchOne(slug, query) {
  const url = new URL(API);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', '8');
  // Commercial-use + modification permitted, so we can crop and ship it.
  url.searchParams.set('license_type', 'commercial');
  url.searchParams.set('mature', 'false');
  url.searchParams.set('extension', 'jpg');

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`search ${slug}: HTTP ${res.status}`);
  const data = await res.json();

  // Prefer a reasonably large landscape image.
  const candidates = (data.results ?? []).filter(
    (r) => r.url && (r.width ?? 0) >= 1200 && (r.width ?? 0) >= (r.height ?? 0),
  );
  return candidates[0] ?? (data.results ?? [])[0] ?? null;
}

async function download(slug, hit) {
  const dest = join(OUT, `${slug}.jpg`);
  const res = await fetch(hit.url, { headers: { 'user-agent': 'CaseADVOImageFetch/0.1' } });
  if (!res.ok) throw new Error(`download ${slug}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 8000) throw new Error(`download ${slug}: suspiciously small`);
  writeFileSync(dest, buf);
  credits.push({
    slug,
    file: `/img/editorial/${slug}.jpg`,
    title: hit.title ?? null,
    creator: hit.creator ?? 'Unknown',
    creatorUrl: hit.creator_url ?? null,
    licence: hit.license ? `${String(hit.license).toUpperCase()} ${hit.license_version ?? ''}`.trim() : 'unknown',
    licenceUrl: hit.license_url ?? null,
    source: hit.source ?? null,
    sourcePage: hit.foreign_landing_url ?? null,
    bytes: buf.byteLength,
  });
  return buf.byteLength;
}

let ok = 0;
let failed = 0;
for (const [slug, query] of Object.entries(WANTED)) {
  if (existsSync(join(OUT, `${slug}.jpg`))) {
    process.stdout.write(`· ${slug} (cached)\n`);
    continue;
  }
  try {
    const hit = await searchOne(slug, query);
    if (!hit) { console.warn(`✗ ${slug}: no result`); failed += 1; continue; }
    const bytes = await download(slug, hit);
    console.log(`✓ ${slug.padEnd(20)} ${(bytes / 1024).toFixed(0)}kB  ${hit.license?.toUpperCase() ?? '?'}  ${hit.creator ?? ''}`);
    ok += 1;
  } catch (error) {
    console.warn(`✗ ${slug}: ${error.message}`);
    failed += 1;
  }
  // Be a polite client.
  await new Promise((r) => setTimeout(r, 350));
}

writeFileSync(join(OUT, 'credits.json'), `${JSON.stringify(credits, null, 2)}\n`);
console.log(`\n${ok} downloaded, ${failed} failed. Attribution written to credits.json`);
