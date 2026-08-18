# Architecture

## Shape

```
apps/web                  Next.js 16 App Router, React 19, TypeScript strict
  app/                    routes (20), server actions, API
  components/             design-system components
  lib/                    server-only data access, brand, formatting
packages/core             domain types, taxonomy, geography, intake classifier, ranking  (no I/O)
packages/db               schema (SQL), client, repositories                              (all SQL lives here)
packages/ingestion        polite HTTP, source adapters, pipeline, CLI
infrastructure/postgres    production migration target (not used by the prototype)
docs/                     this
```

Dependency direction is strictly one-way: `web → db → core`, and `ingestion → db → core`. `core` imports nothing
from the others and performs no I/O, which is why its logic is unit-testable without a database.

## Request path for a search

```
GET /search?q=advocate+in+jabalpur
  │
  ├─ loadIntakeVocabulary()          practice areas + synonyms, locations + aliases, courts, matter types
  ├─ classifyIntake(q, vocab)        → practice area, location, court, matter type, urgency, interpretation
  │                                    deterministic; ~0.2 ms
  ├─ FTS5 MATCH over professional_fts   bm25 weighted: name 8, practice 5, role 3, court 3, location 2, body 1
  ├─ structured filter pass          practice_area_ids / court_ids / location_path LIKE, on the denormalised doc
  ├─ rank() per candidate            8 weighted factors summing to 100, each with a human-readable reason
  ├─ hydrateSummaries(pageIds)       one projection shared by cards, profile hero and related lists
  └─ recordSearchEvent()             query + parse + result count. Never a matter description.
```

Explicit filters always beat inferred ones: a user's click is stronger evidence than our reading of their sentence.

## Ingestion pipeline

```
source registry (DB row: robots status, rate limit, publish_allowed, terms note)
  → robots.txt fetch + parse + enforce
  → render (http | reader | [playwright])
  → parse to typed records
  → raw_record  (immutable, sha256 content hash → change detection)
  → normalise   (name folding, honorific stripping, title casing)
  → entity resolution:  source_ref → exact normalised name in body → trigram ≥ 0.82 → else new
  → upsert professional  (+ enrolment, court links, languages)
  → QC issues            (missing_name, incomplete_extraction, suspected_duplicate, unmapped_location)
  → publish gate         (source cleared ∧ not opted out ∧ minimum fields ∧ attributable)
  → confidence score     (source authority + field completeness + claim status)
  → search index rebuild
```

Raw records are immutable and retained, which is what made it possible to fix the court-resolution bug and
**reprocess 373 records without re-crawling the source** (`packages/ingestion/relink.ts`).

## Verification ladder

| Level | Label | What was actually checked |
|---|---|---|
| 0 | Listed from public record | Sourced from an official register, unconfirmed by the professional |
| 1 | Contact confirmed | Working email confirmed |
| 2 | Identity checked | Government photo ID reviewed |
| 3 | Bar enrolment verified | Enrolment confirmed against the issuing Council |
| 4 | Enhanced verification | Enrolment, standing and practice details confirmed |
| 5 | Organisation verified | Verified authorised representative |

Every badge renders icon + text (never colour alone) and states what was checked. `professional.verification_level`
is never set without an append-only `verification` row recording method, outcome and evidence reference.

## Public / private data separation

Five zones, enforced structurally rather than by convention:

| Zone | Example | Reachable from a public page? |
|---|---|---|
| Public professional | name, role, chamber address, Bar Council | yes |
| Private professional | residential address, personal mobile/email | **no** — omitted from `PUBLIC_COLUMNS` |
| Client data | requester name, email | no |
| Matter data | enquiry summary, matter brief | **no** — excluded from every index by construction |
| Audit | audit_log, claim match signals | admin only |

`packages/db/src/repositories/profile.ts` selects one explicit `PUBLIC_COLUMNS` list. A private column cannot
reach a page through a wildcard select, because there is no wildcard select.

## Security posture (prototype vs target)

| Control | Prototype | Target |
|---|---|---|
| Server-side authorisation | Actions re-check target eligibility | Full RBAC per route |
| Auth | **none** | Sessions + MFA |
| Admin access | **open — blocker** | `platform_admin` + audit per action |
| Input validation | Server-side in every action | + schema validation at the API contract |
| SQL injection | Parameterised everywhere, no string interpolation | same |
| Tenant isolation | Schema supports it; unused | Enforced + automated isolation tests |
| Headers | nosniff, DENY frame, Referrer-Policy, Permissions-Policy | + CSP, HSTS |
| Audit | Claims, opt-outs, verification | All sensitive actions |

## Accessibility

Targets WCAG 2.2 AA. Implemented: 44 px minimum targets (2.5.8), visible focus on every interactive element
(2.4.11), ARIA 1.2 combobox for autocomplete with full keyboard support, status never conveyed by colour alone
(1.4.1), zoom to 500 % permitted (1.4.4), `prefers-reduced-motion` honoured, semantic landmarks, skip link, form
errors associated via `aria-describedby` and announced with `role="alert"`.

## Performance

Fluid `clamp()` type and `auto-fit` grids mean no layout breaks 320 → 1920 px without breakpoint gymnastics. Fonts
are self-hosted by `next/font` (three families, six weights, zero runtime third-party requests). Advocate
portraits are downloaded at ingestion and served from our own origin. Wide tables scroll inside their own
container; the page body never scrolls horizontally. Measured search latency 12–25 ms.
