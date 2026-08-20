# Handoff — Legal Resource Library

**Session date:** 20 Aug 2026 · **Branch:** `main` (UNCOMMITTED — see §6)

## 1. The prompt

Build a complete Legal Resource Library into the existing CaseADVO platform: free
downloadable/previewable legal resources (rent agreements, applications, notices,
affidavits, court documents, government forms), searchable, categorised,
jurisdiction-aware, with ingestion from real internet sources, preview, download,
admin, SEO and marketplace integration. ~115 numbered requirements.

## 2. What was built (all new unless marked M = modified)

### packages/core/src/
| File | What |
|---|---|
| `resource-taxonomy.ts` | 24 resource types, 4 official-status values, 26 categories, 6 audience centres, disclaimers, provenance scoring, link classification, NL query router |
| `resource-sources.ts` | 49 official publishers (was partially started before this session) |
| `resource-catalog.ts` | Central/judicial/regulator resources — every URL fetched during authoring |
| `resource-catalog-states.ts` | 34 SLSAs, 10 DISCOMs, 3 electricity regulators, 6 RERAs, 12 state tenancy regimes |
| `resource-templates.ts` | Tenancy, notices, applications, affidavit (partially started before) |
| `resource-templates-2.ts` | Employment, corporate, court documents, checklists |
| `resource-kits.ts` | 9 situation-led collections ("I am renting a house") |
| `index.ts` **M** | exports the above |

### packages/db/
- `sql/008_resource_library.sql` — categories, template bodies, links, harvest targets/runs, new `resource` columns (22 resource tables total)
- `src/repositories/resources.ts` — seed, search, detail, facets, kits, centres, events, bookmarks, verification, admin dashboard
- `src/repositories/index.ts` **M**

### packages/ingestion/
- `src/resources.ts` — 4 separate ops: seed / verify (link-check) / harvest (robots-obeying scrape of SLSA form pages) / promote (operator publish)
- `cli.ts` **M** — `--resources`, `--verify-resources`, `--harvest-resources`, `--publish-reviewed`
- `src/index.ts` **M**

### apps/web/
- `app/resources/page.tsx` — hub
- `app/resources/search/page.tsx` — search + facets
- `app/resources/[slug]/page.tsx` — detail (preview, provenance, state notes, disclaimer)
- `app/resources/category/[slug]/page.tsx`
- `app/resources/kits/[slug]/page.tsx` — state-aware
- `app/resources/centres/[slug]/page.tsx`
- `app/resources/saved/page.tsx`
- `app/resources/about/page.tsx` — how it works + known gaps
- `app/admin/resources/page.tsx` — review queue, link state, harvest runs
- `app/api/resources/suggest|[slug]/download|[slug]/bookmark|[slug]/event`
- `app/sitemap.ts`, `app/robots.ts`
- `components/ResourceCard|ResourceSearch|ResourceFilters|DocumentViewer|ResourceActions.tsx`
- `lib/docx.ts` — real .docx writer, no dependency (ZIP over `node:zlib`)
- `lib/data.ts` **M**, `components/Header.tsx` **M** (nav), `components/Footer.tsx` **M**,
  `app/globals.css` **M** (viewer CSS + utilities), `app/admin/page.tsx` **M** (link),
  `app/matters/[domain]/[matter]/page.tsx` **M** (resources per matter)

### tests / docs / infra
- `packages/core/test/resources.test.ts` — 44 assertions
- `scripts/smoke.mjs` **M** — +55 assertions over 19 resource routes
- `docs/RESOURCE_INGESTION_REPORT.md`, `docs/RESOURCE_ARCHITECTURE.md`
- `README.md` **M**, `CLAUDE_PROJECT_STATE.md` **M**, `package.json` **M** (scripts), `docker-entrypoint.sh` **M** (seeds taxonomy + library on boot)

## 3. Data actually in the DB now

183 published (146 official link-only, 37 CaseADVO templates incl. 12 state rent
agreements) · 35 held at REVIEW_REQUIRED · 49 sources · 30 states · 86
authorities · 285 verification records · 62 documents harvested from 34
authorities, 41 promoted after review, 20 held back.

## 4. Two design rules that must not be broken

1. **Official vs platform-written never blurs.** `assertStatusConsistent()`
   throws at seed time. No government document is rehosted — download of an
   official resource returns **409** with the publisher URL.
2. **State questions get state answers.** City → state resolution; Maharashtra
   registration note; a test forbids rupee figures / % rates in state notes.

## 5. Bugs found and fixed this session

- Verification pass was auto-publishing **scraped** rows (violates spec §63).
  Reverted 61 rows; `applyLinkCheck` now refuses `origin='harvest'`.
- Search discarded text relevance → "rent agreement for Maharashtra" returned the
  Maharashtra electricity regulator first. Fixed: BM25 rank into ORDER BY, AND
  semantics, place/stopword stripping, score bucketing.
- Fresh Docker container had an empty library → entrypoint now seeds it.
- Mobile: search input wrapped to 3 rows and clipped placeholder; texture painted
  a hard-edged patch. Both fixed.
- Title duplicated the state ("… — Maharashtra — Maharashtra"); accordion
  headings said "note 1..4"; rapid viewer page clicks lost a step.

## 6. STATUS: NOT COMMITTED

41 new files + 16 modified in the working tree. On `main`, so:

```bash
git checkout -b resource-library && git add -A && git commit
```

## 7. Commands

```bash
npm run resources          # seed catalogue + templates + kits (no network)
npm run resources:verify   # fetch every URL; THIS is what publishes official entries
npm run resources:harvest  # read publisher form pages (robots.txt obeyed)
npm run resources:publish  # operator step: promote reviewed harvest rows
npm run ci                 # typecheck + 64 tests + build
npm run smoke              # 172 assertions (needs a running server)
```

Note: npm swallows bare `--flags` after `--`, hence named scripts.

## 8. Verified

64 unit ✓ · 172 smoke ✓ (local) · 164/164 ✓ (Docker container) · typecheck ✓ ·
39 routes build ✓ · browser-checked at 375px and desktop · .docx validated
(`file` → "Microsoft Word 2007+").

## 9. Known gaps (documented publicly at /resources/about)

5 sources refuse automated checks (sci.gov.in, mca.gov.in, gst.gov.in — healthy
in a browser, classified `blocked` not `broken`); 11 unreachable from this network
(EPFO, ESIC, 4 state authorities); no regional-language files; no local judgment
corpus; 10 electricity licensees not all; saved lists are cookie-scoped (no auth
in this build); no PDF export (docx + txt only); no OCR/malware scan because
nothing is mirrored.
