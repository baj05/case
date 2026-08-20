#!/usr/bin/env node
/**
 * Export / import a verified database snapshot.
 *
 * Why this exists: crawling a regulator's site on every deployment is both
 * impolite and unreliable — the render service the BCI adapter depends on is
 * keyless and rate-limits (ADR-005). Production seeds a container from a
 * snapshot that was ingested and reviewed once, and re-crawls on a schedule.
 *
 *   node scripts/db-snapshot.mjs export            -> data/snapshot.db
 *   node scripts/db-snapshot.mjs import <file>     -> DATABASE_PATH
 *   node scripts/db-snapshot.mjs verify <file>     -> integrity + row counts
 */
import { copyFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [cmd, arg] = process.argv.slice(2);
const live = resolve(process.env.DATABASE_PATH ?? './data/lexhall.db');
const snap = resolve(arg ?? './data/snapshot.db');

function counts(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const one = (t) => {
    try { return Number(db.prepare(`SELECT count(*) n FROM ${t}`).get().n); } catch { return -1; }
  };
  const out = {
    professional: one('professional'), judge: one('judge'),
    fee_schedule: one('fee_schedule'), availability_rule: one('availability_rule'),
    court: one('court'), practice_area: one('practice_area'),
    professional_search_doc: one('professional_search_doc'),
    migrations: one('schema_migration'),
  };
  const fk = db.prepare('PRAGMA foreign_key_check').all().length;
  const integrity = db.prepare('PRAGMA integrity_check').get();
  db.close();
  return { ...out, fkViolations: fk, integrity: Object.values(integrity)[0] };
}

if (cmd === 'export') {
  if (!existsSync(live)) { console.error(`no database at ${live}`); process.exit(1); }
  mkdirSync(dirname(snap), { recursive: true });
  // Checkpoint WAL into the main file first, or the snapshot loses recent writes.
  const db = new DatabaseSync(live);
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.close();
  for (const side of ['-wal', '-shm']) {
    try { rmSync(`${snap}${side}`, { force: true }); } catch { /* nothing to remove */ }
  }
  copyFileSync(live, snap);
  console.log(`exported ${live} -> ${snap} (${(statSync(snap).size / 1048576).toFixed(1)} MB)`);
  console.log(JSON.stringify(counts(snap)));
} else if (cmd === 'import') {
  if (!existsSync(snap)) { console.error(`no snapshot at ${snap}`); process.exit(1); }
  const before = existsSync(live) ? counts(live) : null;
  if (before && before.professional > 0) {
    console.error(`refusing to overwrite a populated database (${before.professional} professionals).`);
    console.error('Delete it deliberately first if that is what you intend.');
    process.exit(1);
  }
  mkdirSync(dirname(live), { recursive: true });
  // Remove any stale write-ahead log first. A -wal/-shm pair left over from a
  // DIFFERENT database is inconsistent with the incoming file, and SQLite
  // rightly refuses to open the result. Copying the main file alone silently
  // produces an unopenable database.
  for (const side of ['-wal', '-shm']) {
    try { rmSync(`${live}${side}`, { force: true }); } catch { /* nothing to remove */ }
  }
  copyFileSync(snap, live);
  console.log(`imported ${snap} -> ${live} (stale WAL removed)`);
  console.log(JSON.stringify(counts(live)));
} else if (cmd === 'verify') {
  if (!existsSync(snap)) { console.error(`no file at ${snap}`); process.exit(1); }
  console.log(JSON.stringify(counts(snap), null, 1));
} else {
  console.error('usage: db-snapshot.mjs export|import|verify [file]');
  process.exit(1);
}
