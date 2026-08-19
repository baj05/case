/**
 * Database client.
 *
 * The prototype uses Node's built-in `node:sqlite` so the whole platform runs
 * from the project folder with no server, no Docker and no native build step.
 * Every SQL statement in the codebase lives in this package; `apps/web` only
 * ever calls repository functions. That boundary is what makes the Postgres
 * migration in `infrastructure/postgres/` a contained piece of work rather
 * than a rewrite. See docs/DECISIONS.md ADR-002.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = resolve(HERE, '..', 'sql');
const REPO_ROOT = resolve(HERE, '..', '..', '..');

export type SqlValue = string | number | bigint | null | Uint8Array;
export type Row = Record<string, SqlValue>;

/** Resolve the database file, honouring DATABASE_PATH from the environment. */
export function databaseFile(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  const path = configured && configured.length > 0 ? configured : './data/lexhall.db';
  const absolute = resolve(REPO_ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  return absolute;
}

let singleton: DatabaseSync | null = null;

/**
 * Open (or reuse) the connection.
 *
 * Next.js dev mode re-evaluates modules on hot reload, which would otherwise
 * leak a file handle per reload, so the handle is cached on globalThis.
 */
export function db(): DatabaseSync {
  if (singleton) return singleton;

  const globalKey = '__lexhall_db__' as const;
  const cached = (globalThis as Record<string, unknown>)[globalKey];
  if (cached) {
    singleton = cached as DatabaseSync;
    return singleton;
  }

  const file = databaseFile();
  const handle = new DatabaseSync(file);

  // WAL lets the web app read while the ingestion CLI writes.
  handle.exec('PRAGMA journal_mode = WAL;');
  handle.exec('PRAGMA foreign_keys = ON;');
  handle.exec('PRAGMA busy_timeout = 5000;');
  // Trades a small durability window for a large write-speed gain. Acceptable
  // for a prototype; production Postgres has different guarantees.
  handle.exec('PRAGMA synchronous = NORMAL;');

  singleton = handle;
  (globalThis as Record<string, unknown>)[globalKey] = handle;
  return handle;
}

/**
 * Apply the schema.
 *
 * Two modes, because "drop everything and re-run" destroys ingested data and
 * re-crawling a regulator's site to recover from a schema change is neither
 * fast nor polite:
 *
 *   applySchema()                  additive — applies only .sql files not yet
 *                                  recorded in schema_migration
 *   applySchema({ fresh: true })   destructive — drops and rebuilds from zero
 *
 * Files are applied in filename order, which is why they are numbered.
 */
export function applySchema(options?: { fresh?: boolean; target?: DatabaseSync }): { applied: string[]; skipped: string[] } {
  const handle = options?.target ?? db();
  const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error(`No .sql files found in ${SQL_DIR}`);

  if (options?.fresh) {
    // Foreign keys must be off while dropping, or ordering becomes a puzzle.
    handle.exec('PRAGMA foreign_keys = OFF;');
    for (const row of handle
      .prepare(
        `SELECT name, type FROM sqlite_master
         WHERE name NOT LIKE 'sqlite_%' AND type IN ('table','view','trigger','index')`,
      )
      .all() as Array<{ name: string; type: string }>) {
      // FTS5 shadow tables disappear with their virtual table; dropping them
      // directly errors, so skip anything the parent already removed.
      try {
        handle.exec(`DROP ${row.type === 'index' ? 'INDEX' : row.type.toUpperCase()} IF EXISTS "${row.name}"`);
      } catch {
        /* shadow table already gone */
      }
    }
    handle.exec('PRAGMA foreign_keys = ON;');
  }

  handle.exec(
    `CREATE TABLE IF NOT EXISTS schema_migration (
       filename TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
  );

  const done = new Set(
    (handle.prepare(`SELECT filename FROM schema_migration`).all() as Array<{ filename: string }>).map((r) => r.filename),
  );

  // Adopt a pre-existing schema. A database created before the ledger existed
  // has the tables but no record of them, so re-applying file 001 would fail on
  // "table already exists". Each file's first CREATE TABLE acts as a sentinel:
  // if that table is present, the file is already applied.
  if (done.size === 0) {
    for (const file of files) {
      const sql = readFileSync(join(SQL_DIR, file), 'utf8');
      const sentinel = /CREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)/i.exec(sql)?.[1];
      if (!sentinel) continue;
      const exists = handle
        .prepare(`SELECT count(*) AS n FROM sqlite_master WHERE type IN ('table','view') AND name = ?`)
        .get(sentinel) as { n: number };
      if (exists.n > 0) {
        handle.prepare(`INSERT OR IGNORE INTO schema_migration (filename, applied_at) VALUES (?,?)`)
          .run(file, new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'));
        done.add(file);
      }
    }
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    if (done.has(file)) { skipped.push(file); continue; }
    const sql = readFileSync(join(SQL_DIR, file), 'utf8');
    try {
      handle.exec(sql);
      handle.prepare(`INSERT INTO schema_migration (filename, applied_at) VALUES (?,?)`)
        .run(file, new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'));
      applied.push(file);
    } catch (error) {
      throw new Error(`Failed applying ${file}: ${(error as Error).message}`);
    }
  }
  return { applied, skipped };
}

/** ISO-8601 UTC, second precision. The single source of timestamp format. */
export function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function isoDate(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Run a function inside a transaction, rolling back on any throw.
 *
 * RE-ENTRANT. Repository functions compose freely — a seeder may wrap several
 * helpers that each open their own transaction — and SQLite rejects a nested
 * BEGIN. Inner calls therefore use a SAVEPOINT, so a failure in an inner block
 * unwinds just that block while the outermost call still controls the real
 * commit. Without this, composing two transactional helpers is a runtime error.
 */
let txDepth = 0;

export function transaction<T>(fn: () => T, target?: DatabaseSync): T {
  const handle = target ?? db();
  const depth = txDepth;
  const savepoint = `lexhall_sp_${depth}`;

  if (depth === 0) handle.exec('BEGIN IMMEDIATE');
  else handle.exec(`SAVEPOINT ${savepoint}`);
  txDepth = depth + 1;

  try {
    const result = fn();
    txDepth = depth;
    if (depth === 0) handle.exec('COMMIT');
    else handle.exec(`RELEASE ${savepoint}`);
    return result;
  } catch (error) {
    txDepth = depth;
    try {
      if (depth === 0) handle.exec('ROLLBACK');
      else handle.exec(`ROLLBACK TO ${savepoint}`);
    } catch {
      /* already unwound */
    }
    throw error;
  }
}

/** JSON column helpers. SQLite stores JSON as TEXT; these are the only casts. */
export function toJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export function fromJson<T>(value: SqlValue | undefined, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** SQLite has no boolean type; 0/1 integers are the convention here. */
export function bool(value: SqlValue | undefined): boolean {
  return value === 1 || value === '1' || value === 1n;
}

export function flag(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

/** True when the database file exists and has been initialised. */
export function isInitialised(): boolean {
  const file = databaseFile();
  if (!existsSync(file)) return false;
  try {
    const row = db()
      .prepare(`SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='professional'`)
      .get() as { n: number } | undefined;
    return (row?.n ?? 0) > 0;
  } catch {
    return false;
  }
}
