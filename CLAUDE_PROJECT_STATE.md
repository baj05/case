# Project state

Compact working memory. Update instead of rediscovering.

## Architecture
Next.js 16.3.1 · React 19 · TS strict · npm workspaces
`apps/web` (33 pages + 7 API) · `packages/core` (domain, no I/O) · `packages/db` (**all** SQL) · `packages/ingestion` (crawler)
SQLite via `node:sqlite`, 84 tables, 8 migrations. Postgres is the production target (ADR-002); repository layer is the seam.
Docker: multi-stage, non-root, self-initialising entrypoint, health-gated.

## Data
373 advocates (Bar Council of India — office-bearers, **not** the full roll) · 47 Supreme Court judges (Wikipedia API) · 24 councils · 60 courts · 24 practice areas · 127 fee rows · 200 availability rules
20 real profiles carry **demo** fees/availability, audit-marked and disclosed in the UI; `npm run db:demo -- --clear` reverts.
**Resource library**: 183 published (146 official link-only, 37 Lexhall templates incl. 12 state tenancy variants) · 49 sources · 30 states · 86 authorities · 26 categories · 9 kits · 6 centres · 34 harvest targets · 35 held at REVIEW_REQUIRED. Nothing government-published is rehosted.

## Works
Resource library: NL search with published signals (city→state resolution, AND-FTS, score-bucketed ranking) · state-aware rent agreements · dependency-free .docx export · in-browser paginated viewer (zoom, in-doc search, fullscreen, keyboard) · robots-obeying harvest of 34 SLSA form pages · link verification that classifies 403 as *blocked*, not broken · operator-gated publication of scraped rows · aggregate-only analytics · sitemap/robots/schema.org.
Plain-language search (7.6–21 ms) · explainable ranking (no commercial factor) · dual-field search · fee/experience/availability filters + price sort · profile with full provenance · claim flow with match scoring · 6-step booking with real slots, timezone, contention refusal · Advo AI side chat bot · judges list · admin workbench · DPDP request flow · health probe · clean-state Docker.

## Does not exist
**Authentication** — and therefore: professional dashboard, corporate workspace, LPO console, matter workspace, messaging, notifications, tenant isolation.
Compliance-gated: reviews (C-09), referrals (C-11), payment capture (C-12).
Phase 3: contract SaaS, mediation, arbitration, judgment full-text search.

## Key decisions
ADR-R1 official vs platform status enforced at seed time (`assertStatusConsistent` throws) · ADR-R2 link-only for every government document, no permission sought so none rehosted · ADR-R3 a link check may publish a hand-authored catalogue row but **never** a harvested one · ADR-R4 provenance score ≠ legal validity, and the UI says so · ADR-R5 resource analytics carry no identity.
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
`resources` · `resources:verify` · `resources:harvest` · `resources:harvest:dry` · `resources:publish` · `resources:refresh`
npm eats bare `--flags` after `--`, hence named scripts rather than `npm run ingest -- --resources`.
`docker compose build web && docker compose up -d web` → :3100

## Test status
64 unit ✓ (20 search/domain + 44 resource) · 172 smoke assertions ✓ · typecheck ✓ · 39 routes build ✓ · FK 0 · integrity ok
Resource pipeline verified live: 285 verification records, 62 documents harvested from 34 authorities, 41 promoted after review, 20 held back.
