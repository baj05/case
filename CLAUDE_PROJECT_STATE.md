# Project state

Compact working memory. Update instead of rediscovering.

## Architecture
Next.js 16.3.1 · React 19 · TS strict · npm workspaces
`apps/web` (24 pages + 3 API) · `packages/core` (domain, no I/O) · `packages/db` (**all** SQL) · `packages/ingestion` (crawler)
SQLite via `node:sqlite`, 62 tables, 6 migrations. Postgres is the production target (ADR-002); repository layer is the seam.
Docker: multi-stage, non-root, self-initialising entrypoint, health-gated.

## Data
373 advocates (Bar Council of India — office-bearers, **not** the full roll) · 47 Supreme Court judges (Wikipedia API) · 24 councils · 60 courts · 24 practice areas · 127 fee rows · 200 availability rules
20 real profiles carry **demo** fees/availability, audit-marked and disclosed in the UI; `npm run db:demo -- --clear` reverts.

## Works
Plain-language search (7.6–21 ms) · explainable ranking (no commercial factor) · dual-field search · fee/experience/availability filters + price sort · profile with full provenance · claim flow with match scoring · 6-step booking with real slots, timezone, contention refusal · Advo AI side chat bot · judges list · admin workbench · DPDP request flow · health probe · clean-state Docker.

## Does not exist
**Authentication** — and therefore: professional dashboard, corporate workspace, LPO console, matter workspace, messaging, notifications, tenant isolation.
Compliance-gated: reviews (C-09), referrals (C-11), payment capture (C-12).
Phase 3: contract SaaS, mediation, arbitration, judgment full-text search.

## Key decisions
ADR-001 single `professional` table · ADR-002 SQLite→Postgres · ADR-005 pluggable render strategy · ADR-006 deterministic classifier, never an LLM in the routing path · ADR-009 paid ranking CHECK-constrained to 0 · ADR-010 contrast deviation from DESIGN.md · C-14 judges have no rating column.

## Known issues (priority order)
1. `/admin` unauthenticated — **top release blocker**
2. No rate limiting
3. 91 records `incomplete_extraction` — keyless renderer truncates at ~8 KB; needs self-hosted Playwright
4. Containerised live ingest fails — external renderer rate-limits; use `db:import` from a snapshot
5. No browser-level E2E (Playwright), no axe, no Lighthouse
6. Widths 390/414/834/1024/1280/1920 not individually measured

## Commands
`npm run setup` · `dev` · `test` · `typecheck` · `smoke` · `ingest` · `ingest:judges` · `db:demo` · `db:export|import|verify`
`docker compose build web && docker compose up -d web` → :3100

## Test status
20 unit ✓ · 48 smoke assertions ✓ (container + dev) · typecheck ✓ · 27 routes build ✓ · FK 0 · integrity ok
