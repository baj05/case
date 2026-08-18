# Postgres — production target (NOT used by the prototype)

The prototype runs on SQLite via Node's built-in `node:sqlite`, so it needs no
Docker, no daemon and no native compilation. See `docs/DECISIONS.md` ADR-002.

The files here are the production migration target. The swap seam is the
repository layer in `packages/db/src/repositories/` — those functions are the
only place SQL lives, so porting means reimplementing them against `pg` and
swapping one factory. Nothing in `apps/web` imports SQL directly.

Dialect differences the repository layer already isolates:
| Concern        | SQLite (prototype)          | Postgres (production)              |
|----------------|-----------------------------|------------------------------------|
| Full text      | FTS5 virtual table          | `tsvector` + GIN + `lexhall_en`    |
| Fuzzy match    | JS trigram scorer           | `pg_trgm` + GiST                   |
| JSON columns   | `TEXT` + JSON.parse         | `jsonb`                            |
| Timestamps     | ISO-8601 `TEXT` (UTC)       | `timestamptz`                      |
| Generated keys | `INTEGER PRIMARY KEY`       | `bigint GENERATED ALWAYS`          |
