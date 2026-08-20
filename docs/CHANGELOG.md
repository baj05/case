# Changelog

## Unreleased — forensic recovery pass (18 Aug 2026)

**Added**
- `Dockerfile` (multi-stage, non-root, no compiler in runtime), `docker-compose.yml`, `.dockerignore`
- `docker-entrypoint.sh` — applies migrations and seeds reference data on boot, so a fresh container is *degraded*, not *broken*
- `/api/health` — liveness **and** readiness: reports database reachability and corpus size, so an unseeded instance cannot masquerade as healthy
- `scripts/db-snapshot.mjs` + `db:export` / `db:import` / `db:verify` — seed a container from a reviewed snapshot instead of crawling on every deploy
- `scripts/smoke.mjs` + `npm run smoke` — 48 content-level assertions across 17 routes, no browser needed
- `.github/workflows/ci.yml` — audit → typecheck → test → migrate → integrity → build → smoke, plus a separate clean-state Docker job
- `006_index_fixes.sql` — 10 indexes
- 12 audit and reference documents under `docs/`

**Fixed**
- 3 tables (`review_response`, `saved_search`, `subscription`) had a foreign key with **no supporting index** — every lookup a full scan
- `.float-card.float-br` overflowed and was **clipped** at 768 px, silently hiding a live data card with no scrollbar to reveal it
- `db-snapshot import` left stale `-wal`/`-shm` from a *different* database, producing an unopenable file — the container reported `error` until fixed
- Docker liveness probe rejected `degraded`, so a correctly-booted empty container was marked unhealthy and could never be seeded
- 4 assertions in the smoke suite used `has('A') || has('B')`, which ORs two *functions* — the first is always truthy, so only the first string was ever checked

**Verified**
- Clean-state Docker: volume removed → build → boot → 6 migrations → reference seed → **healthy in 12 s**
- Container with a seeded snapshot: `status: ok`, 373 professionals, 373 indexed, every route correct
- `pragma foreign_key_check` → 0 violations; `integrity_check` → ok
- 0 orphan rows on any hot path; 0 published records without provenance
- 20 unit tests, 48 smoke assertions, strict typecheck, 27 routes built
- Search latency 7.6–21.2 ms across 5 representative queries

## Earlier

See [PROJECT_FORENSIC_AUDIT](PROJECT_FORENSIC_AUDIT.md) §"Problems found in earlier passes" for the seven defects fixed before this pass — including entity resolution collapsing 296 records into 16, and court linking fabricating tribunal associations.
