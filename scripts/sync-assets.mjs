/**
 * Copy local assets into the web app's public folder, normalised.
 *
 * Keeps hand-supplied imagery out of `public/` in source control terms while
 * still making it available to Next's image optimiser. Re-runnable.
 */
import { readdirSync, mkdirSync, copyFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets');
const DEST = join(ROOT, 'apps', 'web', 'public', 'img', 'local');

const KINDS = ['hero', 'figures', 'backgrounds'];
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

mkdirSync(DEST, { recursive: true });
const manifest = { hero: [], figures: [], backgrounds: [] };
let copied = 0;

for (const kind of KINDS) {
  const dir = join(SRC, kind);
  if (!existsSync(dir)) continue;
  mkdirSync(join(DEST, kind), { recursive: true });
  for (const file of readdirSync(dir)) {
    const ext = extname(file).toLowerCase();
    if (!ALLOWED.has(ext)) continue;
    const from = join(dir, file);
    if (!statSync(from).isFile()) continue;
    const to = join(DEST, kind, file);
    copyFileSync(from, to);
    manifest[kind].push({
      file: `/img/local/${kind}/${file}`,
      name: basename(file, ext),
      bytes: statSync(to).size,
    });
    copied += 1;
    console.log(`  ${kind}/${file}  ${(statSync(to).size / 1024).toFixed(0)}kB`);
  }
}

writeFileSync(join(DEST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${copied} asset(s) synced to apps/web/public/img/local`);
if (manifest.hero.length === 0) {
  console.log('No hero figure found. Drop a transparent PNG into assets/hero/advocate.png');
  console.log('The hero falls back to a licensed court photograph until you do.');
}
