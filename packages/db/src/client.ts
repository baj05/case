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

/** Recreate the schema from ./sql/*.sql in filename order. Destroys all data. */
export function applySchema(target?: DatabaseSync): void {
  const handle = target ?? db();
  const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error(`No .sql files found in ${SQL_DIR}`);

  // Foreign keys must be off while we drop, or ordering becomes a puzzle.
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

  for (const file of files) {
    const sql = readFileSync(join(SQL_DIR, file), 'utf8');
    try {
      handle.exec(sql);
    } catch (error) {
      throw new Error(`Failed applying ${file}: ${(error as Error).message}`);
    }
  }
  handle.exec('PRAGMA foreign_keys = ON;');
}

/** ISO-8601 UTC, second precision. The single source of timestamp format. */
export function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function isoDate(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Run a function inside a transaction, rolling back on any throw. */
export function transaction<T>(fn: () => T, target?: DatabaseSync): T {
  const handle = target ?? db();
  handle.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    handle.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      handle.exec('ROLLBACK');
    } catch {
      /* already rolled back */
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
