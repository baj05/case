# Implementation roadmap

Ordered by the priority model: broken → data integrity → security → compliance → journeys → responsive → a11y → performance → IA → polish.

## P0 — release blockers

| # | Item | Why it blocks | Unlocks |
|---|---|---|---|
| 1 | **Authentication** (sessions, Argon2id/scrypt, MFA) | Nothing role-scoped can exist without it | Items 2, and all of Phase 2 |
| 2 | **RBAC on `/admin`** + audit entry per action | The workbench is currently open | Safe operation |
| 3 | **Rate limiting** on search, suggest, claim, booking, Advo AI | Public endpoints unthrottled | Abuse resistance |
| 4 | **Legal sign-off** on the compliance matrix | Reviews, referrals and payment capture stay off until then | C-08 to C-12 |
| 5 | **Named Grievance Officer**, real privacy notice and terms | Statutory requirement; current pages are honest placeholders | Launch |

## P1 — correctness and coverage

| # | Item | Note |
|---|---|---|
| 6 | **Playwright E2E** for the five journeys | Highest-value test work; regressions currently silent |
| 7 | **CI**: install → lint → typecheck → test → build → Docker build → smoke | Fail on any |
| 8 | **Self-hosted Playwright renderer** for ingestion, then re-ingest | Recovers the ~40% of member detail the keyless reader truncates; clears 91 QC issues |
| 9 | **Per-council roll adapters** (24) | The only route to national coverage. The framework is pluggable; this is 24 adapters. |
| 10 | **Postgres migration** | FTS5 → `tsvector`, JS trigram → `pg_trgm`. Repository layer is the seam. |
| 11 | **axe-core in CI** on six routes | |
| 12 | **Responsive matrix** at all ten widths via Playwright viewports | Replaces the iframe method `X-Frame-Options` correctly blocked |

## P2 — Phase 2 product (all gated on auth)

Professional dashboard (today-first, not analytics-first) · matter workspace + timeline · secure messaging · notification centre · saved items and saved searches · search alerts · reviews **after** C-09 (moderation queue, right of reply, takedown, audit) · referrals **after** C-11 (fee-less by design, client consent before brief disclosure) · payment capture **after** C-12 (provider abstraction over the append-only ledger).

## P3 — Phase 3 platform

Corporate legal workspace · LPO marketplace and provider console · contract lifecycle SaaS · mediation and arbitration workspaces · judgment ingestion and full-text search · PF/ESI/labour compliance vertical · second launch country (`country.is_launched`).

## P4 — polish

Lighthouse budget in CI · visual regression screenshots · command palette (⌘K) for professional users · map view (lazy-loaded) · Hindi localisation · PWA.

## Deferred deliberately

Paid ranking (**never** — ADR-009, CHECK-constrained) · judge ratings (**never** — C-14, no column exists) · commission or lead fees (**never** — `platform_fee_minor` CHECK-constrained to 0).
