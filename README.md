# CaseADVO

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
npm run ingest              # crawls the Bar Council of India register (~2 min, polite, rate-limited)
npm run resources           # seeds the resource library: catalogue, templates, kits
npm run resources:verify    # fetches every source URL and records the outcome
npm run dev                 # http://localhost:3000
```

The resource library needs those two extra steps because publication is gated on
verification: `resources` writes the catalogue, and `resources:verify` is what
actually publishes the entries whose source URL answers. Nothing is published on
a URL nobody could open. To go further and read the form lists that state
authorities publish themselves:

```bash
npm run resources:harvest   # reads publisher form pages, robots.txt obeyed per host
npm run resources:publish   # promotes the reviewed rows a person is willing to stand behind
```

### Or with Docker

```bash
docker compose build web
docker compose up -d web            # http://localhost:3100
```

A fresh container applies its migrations and seeds reference data on boot, then
reports `degraded` until it has a corpus — an empty instance cannot pretend to be
healthy. Populate it either by crawling:

```bash
docker compose run --rm ingest
```

or, preferably, from a reviewed snapshot — crawling on every deploy is impolite
and the render service rate-limits:

```bash
npm run db:export                   # data/snapshot.db from your local database
npm run db:verify data/snapshot.db  # integrity + row counts
```

### Verify it

```bash
npm run typecheck   # strict TypeScript across the workspace
npm test            # 20 domain and search-relevance tests
npm run smoke       # 48 content assertions across 17 routes (needs a running server)
npm run ci          # typecheck + test + build
curl -s localhost:3100/api/health | python3 -m json.tool
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
| `/resources` | The resource library: 183 free documents, official and platform-written, never confused |
| `/resources/search?q=rent+agreement+in+Noida` | Noida resolves to Uttar Pradesh, and the UP tenancy document leads |
| `/resources/rent-agreement-maharashtra` | The state rule *before* the document — Maharashtra registration is compulsory whatever the term |
| `/resources/nalsa-legal-aid-eligibility` | An official resource: no preview, and the page explains why |
| `/resources/kits/renting-a-home` | A situation, not a category |
| `/resources/about` | What the library will not do, and its known gaps |
| `/admin/resources` | Review queue, link state, harvest runs |

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
- `docs/RESOURCE_INGESTION_REPORT.md` — what the resource library holds, where each document came from, what was rejected and why
- `docs/RESOURCE_ARCHITECTURE.md` — the taxonomy, schema, pipeline, ranking and preview architecture behind it

## Principles this build holds to

**Nothing about a real person is invented.** No fabricated practice areas, enrolment numbers, ratings or reviews.
Where the register is silent, the profile says so.

**Every published fact is attributable.** Source, source URL, capture date and last-checked date on every record.

**Ranking cannot be bought.** The weights are published, contain no commercial factor, and the column that would
carry a paid boost is constrained to zero at the schema level.

**Personal contact data is not republished** merely because the source is public.

**A document never claims an authority it does not have.** The resource library
distinguishes an official form from something CaseADVO wrote, on every card and
every page, and the seeder throws rather than accept a row whose declared type and
publisher contradict each other. No government document is rehosted: the library
links to the authority's own copy, so the version you get is the current one.

**Risky features ship switched off.** Reviews, payments and referrals are schema-complete and flag-gated pending
legal sign-off, with each gate recorded in the database and visible in `/admin`.
