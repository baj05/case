/**
 * Downloads the hotlinked ecourtsindia.com photo URLs the verified-advocate
 * ingest stored directly (a mistake — see next.config.ts's own comment:
 * "Anything remote would be an accident") and replaces them with the local
 * path, using the same downloadPhoto() helper the BCI pipeline already uses.
 * The bad URLs were already nulled out directly in the DB before this
 * script existed, so the original URLs are re-derived from the source CSVs
 * (still on disk) rather than read back from the professional row.
 *
 *   node scripts/download-verified-photos.ts <path-to-advocates_out>
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { db, now } from '@lexhall/db';
import { downloadPhoto } from '../../ingestion/src/photos.ts';

const outDir = process.argv[2];
if (!outDir || !existsSync(outDir)) {
  process.stderr.write('Usage: node scripts/download-verified-photos.ts <path-to-advocates_out>\n');
  process.exit(1);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let inQuotes = false; let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i += 1; continue; }
      field += c; i += 1; continue;
    }
    if (c === '"') { inQuotes = true; i += 1; continue; }
    if (c === ',') { row.push(field); field = ''; i += 1; continue; }
    if (c === '\r') { i += 1; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += c; i += 1;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
function readCsvObjects(path: string): Array<Record<string, string>> {
  if (!existsSync(path)) return [];
  const rows = parseCsvRows(readFileSync(path, 'utf-8'));
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i]!;
    if (r.length === 1 && r[0] === '') continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c += 1) obj[header[c]!] = r[c] ?? '';
    out.push(obj);
  }
  return out;
}

const profilesDir = join(outDir, 'profiles');
const urlByHandle = new Map<string, string>();
for (const handle of existsSync(profilesDir) ? readdirSync(profilesDir) : []) {
  const rows = readCsvObjects(join(profilesDir, handle, 'profile.csv'));
  const url = rows[0]?.profilePictureUrl?.trim();
  if (url) urlByHandle.set(handle, url);
}
const dirRows = readCsvObjects(join(outDir, 'advocates_directory.csv'));
for (const row of dirRows) {
  const handle = row.handle?.trim();
  const url = row.profilePictureUrl?.trim();
  if (handle && url && !urlByHandle.has(handle)) urlByHandle.set(handle, url);
}
process.stdout.write(`photo URLs recovered from source CSVs: ${urlByHandle.size}\n`);

const h = db();
const professionalRows = h.prepare(
  `SELECT p.id, p.source_ref FROM professional p JOIN source s ON s.id = p.source_id
    WHERE s.code = 'ecourtsindia-verified-directory' AND p.photo_url IS NULL AND p.deleted_at IS NULL`,
).all() as Array<{ id: number; source_ref: string }>;

const rows = professionalRows
  .map((r) => ({ id: r.id, url: urlByHandle.get(r.source_ref.replace(/^verified:/, '')) }))
  .filter((r): r is { id: number; url: string } => Boolean(r.url));

process.stdout.write(`photos to fetch: ${rows.length}\n`);

let downloaded = 0; let failed = 0;
const update = h.prepare(`UPDATE professional SET photo_url = ?, photo_source_url = ?, updated_at = ? WHERE id = ?`);

for (let i = 0; i < rows.length; i += 1) {
  const r = rows[i]!;
  const stored = await downloadPhoto(r.url);
  if (stored) {
    update.run(stored.publicPath, r.url, now(), r.id);
    downloaded += 1;
  } else {
    failed += 1;
  }
  if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${rows.length} (${downloaded} ok, ${failed} failed)\n`);
  await new Promise((res) => setTimeout(res, 150));
}

process.stdout.write(`done: ${downloaded} downloaded, ${failed} failed (left with no photo)\n`);
