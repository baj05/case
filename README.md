# Lexhall

A legal professional network and legal-operations platform. India launch market, jurisdiction-abstracted for
international expansion.

**Prototype.** Phase 1 (discovery) runs on live data ingested from official Bar Council registers. Phases 2 and 3
are specified with schema in place, not built. Read `docs/PROJECT_AUDIT.md` first — it states honestly what works,
what does not, and one significant correction to the project's founding assumption about data availability.

---

## Run it

Requires Node 20+ (developed on Node 26). No Docker, no database server, no API keys.

```bash
npm install
npm run ingest      # crawls the Bar Council of India register (~2 min, polite, rate-limited)
npm run dev         # http://localhost:3000
```

`npm run ingest` builds the database, seeds reference data, crawls all 24 State Bar Councils, downloads official
portraits and builds the search index. Re-running it is safe and incremental — unchanged records are skipped by
content hash.

```bash
npm test                     # 18 search-relevance and domain tests
npm run typecheck            # strict TypeScript across the workspace
npm run ingest -- --dry-run  # parse and report, write nothing
npm run ingest -- --councils SBC05,SBC12
node scripts/fetch-imagery.mjs   # refresh editorial imagery + attribution
```

## What to look at

| URL | Why |
|---|---|
| `/` | Hero search; corpus counts computed live from the database |
| `/search?q=advocate in jabalpur` | Plain-language routing, 27 results, ~13 ms |
| `/search?q=senior advocate delhi high court` | Court resolution + derived senior-advocate status |
| `/search?q=PF dispute in Delhi` | **Zero results, deliberately** — see audit §4 |
| `/advocates/ramesh-gupta` | Full provenance panel, verification ladder, real sourced chambers |
| `/advocates/ramesh-gupta/claim` | Claim flow with automatic match scoring |
| `/admin` | Ingestion runs, QC queue, claims, zero-result queries, feature flags with legal gates |
| `/how-it-works` | The actual ranking weights, published |
| `/data-sources` | What we ingest, what we withhold, and why |

Click **"Why"** on any search result to see its full score breakdown.

## Layout

```
apps/web              Next.js 16 App Router, React 19, strict TypeScript
packages/core         domain logic, taxonomy, classifier, ranking — no I/O, unit-tested
packages/db           SQL schema + repositories — the only place SQL exists
packages/ingestion    polite crawler, source adapters, pipeline, CLI
infrastructure/       Postgres production target (unused by the prototype)
docs/                 audit, compliance matrix, architecture, ADRs, roadmap, design system
```

## Documentation

- `docs/PROJECT_AUDIT.md` — current state, limitations, release blockers, two bugs found and fixed
- `docs/COMPLIANCE_MATRIX.md` — 21 features against BCI rules, the Advocates Act and the DPDP Act
- `docs/ARCHITECTURE.md` — request paths, ingestion pipeline, data separation, a11y, performance
- `docs/DECISIONS.md` — 12 ADRs with trade-offs and revisit triggers
- `docs/ROADMAP.md` — phases and their dependencies
- `docs/DESIGN.md` — the "Vibrant Authority" design system as supplied

## Principles this build holds to

**Nothing about a real person is invented.** No fabricated practice areas, enrolment numbers, ratings or reviews.
Where the register is silent, the profile says so.

**Every published fact is attributable.** Source, source URL, capture date and last-checked date on every record.

**Ranking cannot be bought.** The weights are published, contain no commercial factor, and the column that would
carry a paid boost is constrained to zero at the schema level.

**Personal contact data is not republished** merely because the source is public.

**Risky features ship switched off.** Reviews, payments and referrals are schema-complete and flag-gated pending
legal sign-off, with each gate recorded in the database and visible in `/admin`.
