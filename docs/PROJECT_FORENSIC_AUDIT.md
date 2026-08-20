# Forensic audit

**Date** 18 Aug 2026 · **Method** repository scan, live run, browser drive-through, DB integrity queries, Docker build
**Verdict** The Phase-1 discovery slice and Phase-2 booking layer are real and working. The gaps are authentication and everything gated behind it.

Cross-references: [ARCHITECTURE](ARCHITECTURE.md) · [DATABASE_AUDIT](DATABASE_AUDIT.md) · [SECURITY_AUDIT](SECURITY_AUDIT.md) · [COMPLIANCE_MATRIX](COMPLIANCE_MATRIX.md) · [DECISIONS](DECISIONS.md)

## Current state, measured not assumed

| Layer | State | Evidence |
|---|---|---|
| Framework | Next.js 16.3.1, React 19, TS strict, npm workspaces | `npm audit` → 0 vulnerabilities |
| Routes | 24 page routes + 3 API routes | route enumeration script, all 200 / 404 correct |
| Database | 62 tables, SQLite via `node:sqlite`, 6 migrations | `pragma foreign_key_check` → **0 violations** |
| Corpus | 373 advocates, 47 judges, 24 Bar Councils, 60 courts | live counts |
| Fees / booking | 127 fee rows, 200 availability rules, slot generation + contention | end-to-end verified |
| Search | FTS5 + trigram, **7.6–21 ms** across 5 sampled queries | latency sampling |
| Tests | 20 passing, 0 failing | `npm test` |
| Docker | Multi-stage image, non-root, healthcheck | `docker compose build` |

## Problems found and fixed in this pass

| # | Problem | Severity | Root cause | Fix |
|---|---|---|---|---|
| F1 | No containerisation at all | P0 | Removed earlier at the user's request for a local-only prototype | Multi-stage `Dockerfile`, `docker-compose.yml`, `.dockerignore`, non-root runtime, volume for the corpus |
| F2 | No health endpoint; a container with an empty DB would pass a naive 200-check | P0 | Missing | `/api/health` reports database reachability **and corpus size**, returning `degraded` when unseeded and 503 when the DB is unreachable |
| F3 | 3 tables (`review_response`, `saved_search`, `subscription`) had a foreign key with **no supporting index** — every lookup a full scan | P1 | Oversight in schema part 3 | `006_index_fixes.sql`, plus 4 hot-path composites; `ANALYZE` run |
| F4 | `.float-card.float-br` overflowed and was **clipped** at 768 px, silently hiding a live data card with no scrollbar to reveal it | P1 | `right: -5%` breakout vs `.wash { overflow-x: clip }` | Pull float cards inside between 721–1080 px |

## Problems found in earlier passes, recorded here for completeness

| # | Problem | Root cause | Fix |
|---|---|---|---|
| E1 | 296 ingested members collapsed into **16** records | Entity resolution keyed on `source_url`, but 25 advocates share one members page | Added `professional.source_ref` + unique index |
| E2 | Court linking **fabricated** associations — one advocate linked to Supreme Court, NCLT, NCLAT, NGT, TDSAT at once | Matched on court `seat`; every "NEW DELHI" address hit every Delhi-seated tribunal | Name/alias matching only, positional chamber binding; 358 fabricated links → 16 accurate |
| E3 | Advo AI silently discarded **every** structured answer | Option chips sent the label (`"10+ years"`), `Number()` → NaN | Send value, display label; regression test added |
| E4 | `transaction()` not re-entrant | Composed helpers each opened a transaction | Savepoints |
| E5 | `applySchema()` could only drop-and-recreate | Would have destroyed 373 records to add one table | Additive migrations + adopt-existing-schema |
| E6 | Whole page fell back to a serif | Font tokens on `:root` referenced a variable next/font defines on `body` | Tokens moved to `body` with in-`var()` fallbacks |
| E7 | 288 px horizontal overflow at every width | `1fr` grid tracks floor at min-content; a 480 px table blew the grid out | `minmax(0, 1fr)` + `overflow-x: clip` |

## Confirmed clean

- **No dead internal links.** Scripted crawl of every `href` against the route table: 0 unresolved.
- **No placeholders.** Repo-wide scan for `TODO|FIXME|lorem|coming soon|dummy`: only a legitimate `'todo'` stepper state string.
- **No orphan rows** on any hot path (`fee_schedule`, `availability_rule`, `professional_search_doc`, provenance).
- **No published record without provenance** — 0 rows with `is_published=1` and a null source.
- **No unused dependencies.**
- **No private data in the search index** (verified by query, not by inspection).

## Gaps — what is genuinely not built

**P0 — authentication.** Nothing else in this list can be built without it. `/admin` is consequently unauthenticated: the top release blocker.

**Blocked on auth:** professional dashboard, corporate workspace, LPO console, matter workspace, messaging, notifications centre, saved items, tenant isolation.

**Compliance-gated (schema complete, flag off):** reviews (C-09), anonymous reviews (C-10), referrals (C-11), payment capture (C-12).

**Phase 3:** contract lifecycle SaaS, mediation, arbitration, judgment full-text search.

**Data ceiling:** 373 advocates is the honest maximum from the Bar Council of India source — it publishes the 24 councils and their elected office-bearers, **not** the roll. See [DATA_SOURCES](DATA_SOURCES.md).
