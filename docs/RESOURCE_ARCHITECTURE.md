# Resource library — architecture

The companion to `RESOURCE_INGESTION_REPORT.md`, which says what the library
holds. This says how it is built.

---

## 1. Taxonomy

Two axes, deliberately separate.

**What kind of document it is** — `ResourceType`, 24 values, from
`OFFICIAL_FORM` through `AGREEMENT_TEMPLATE` to `RESOURCE_LINK`.

**Who stands behind it** — `OfficialStatus`, 4 values:

| Status | Meaning |
|---|---|
| `OFFICIAL` | Published by the authority named. Linked, never hosted. |
| `PLATFORM_TEMPLATE` | Written by Lexhall. Approved by nobody. |
| `THIRD_PARTY` | Published by someone who is neither. |
| `REFERENCE` | Background material. Not a form, not for filing. |

Nine of the 24 types are marked `officialOnly`. `assertStatusConsistent(type,
status, slug)` throws if one of those carries a non-official status, and the
seeder calls it for every row before insert. That is the mechanism by which a
platform-written document cannot become a "government form" through an editorial
slip.

**Public information architecture** — 26 categories with subcategories,
independent of both axes above, mapped onto the existing `legal_domain` tree so a
resource is reachable from the same graph as a professional.

**Audience centres** — 6 (`women`, `senior-citizens`, `children`, `disability`,
`startups`, `msme`). These are cross-cutting views, not categories, because a
woman facing domestic violence needs family law, criminal procedure, legal aid
and POSH at once.

**Kits** — 9 situation-led collections keyed to the sentence a person would
actually say ("I am renting a house", "someone owes me money"). Matched by
deterministic phrase overlap; no model in the routing path, per ADR-006.

---

## 2. Schema

Migration `007_taxonomy_resources.sql` created the core tables; `008_resource_library.sql`
added the information architecture, document bodies and the harvest machinery.
22 tables in total.

```
resource                    the row: type, status, jurisdiction, provenance, rights, lifecycle
resource_category           the public IA — a category is an entity with a URL, not a query string
resource_template           document body, fields, before-you-use, jurisdiction notes
resource_link               extra links: the prescribed form a covering document accompanies
resource_source             49 publishers, each with a trust level and a rights note
resource_file               mirrored files (unused: nothing is mirrored)
resource_version            version history — an old legal document is never silently overwritten
resource_verification       every check, machine or human, with its outcome
resource_relation           related / part_of_kit / supersedes
resource_collection(+_item) kits and, later, user collections
resource_bookmark           device-local saves, keyed to an opaque cookie reference
resource_event              aggregate counters. never who
resource_harvest_target     pages known to publish form lists
resource_harvest_run        an auditable harvest, like an ingestion run
resource_fts                FTS5 over title, description, keywords, body
```

Three columns carry most of the discipline:

- `official_status` — the badge, enforced at seed time.
- `rights_basis` — `unknown` may never be offered as a download.
- `origin` — `catalogue` | `template` | `harvest` | `admin`. A link check may
  publish the first two; only an operator may publish `harvest`.

---

## 3. Ingestion pipeline

Three separate operations, and the separation is the design.

```
seedResourceLibraryData()   writes claims        → VERIFIED at most, never published
verifyResourceLinks()       tests claims         → publishes catalogue rows that answer
harvestResources()          discovers            → REVIEW_REQUIRED, always
promoteReviewedHarvest()    a person decides     → publishes, as 'operator'
```

### Link-check classification

`classifyLinkCheck(status, error)` returns one of six outcomes rather than
pass/fail:

| Outcome | Trigger | Healthy | Needs a person |
|---|---|---|---|
| `ok` | 2xx | yes | no |
| `redirected` | 3xx | yes | yes |
| `blocked` | 401, 403, 429 | **yes** | yes |
| `unreachable` | transport failure, timeout, TLS | no | yes |
| `gone` | 404, 410 | no | yes |
| `server_error` | 5xx | no | yes |

`blocked` being *healthy* is the load-bearing decision. See
`RESOURCE_INGESTION_REPORT.md` §3.

### Harvest parser

`parseFormsTable(html, baseUrl)` reads the `| Title | View |` table used by the
government content platform that the legal services authority sites run on. A
regex parser rather than a DOM library: the shape is narrow, the dependency
budget is zero, and a parser that silently succeeds on unexpected markup would be
worse than one that returns nothing and reports it.

`classifyForm(title)` is deterministic and records its own confidence. It rejects
recruitment, tenders, empanelment, annual reports and staff administration
outright. Confidence below `high` blocks promotion.

---

## 4. Search

Deterministic routing, published weights, no model — the same discipline as
professional search.

`parseResourceQuery(q, states, cities)` returns the document types, categories,
state and city it recognised, plus a `signals` array recording **which words each
conclusion came from**. That array is rendered on `/resources/search` under "What
we understood from that", so routing is never a black box.

### Ranking

1. **Jurisdiction the user named** — including a state resolved from a city. Somebody
   typing "rent agreement in Noida" gets the Uttar Pradesh document, and has no
   reason to know that Uttar Pradesh is the thing to ask for.
2. **Text relevance**, bucketed to a tenth of a BM25 point. Bucketed rather than
   raw because 34 near-identical authority pages score identically, and ordering
   by index position would look like a preference for Assam.
3. **Breadth**, when no place was named: a document that applies nationally beats
   one state's version of it.
4. **Official over ours.**
5. **Provenance score**, then source level, then title.

FTS uses **AND** semantics with an OR fallback, unlike the professional search
box which uses OR for live-typing feel. With OR, "rent agreement" matched
anything containing either word and a rent receipt outranked a rent agreement.

Place names and connective words are removed from the FTS query: the place is
already a filter, and ANDing "for" excludes any document that does not contain
it.

### Provenance score

`qualityScore()` — 100 points across source authority (30), freshness (25),
metadata completeness (20), reachability (15) and previewability (10). Every
factor carries a human-readable note, and the breakdown is published on the
resource page.

It measures **provenance and freshness, not legal validity**. The page says so in
those words, because a user will otherwise read 100/100 as legal assurance.

---

## 5. Preview and download

**Preview** exists only for documents Lexhall wrote. `DocumentViewer` paginates
by line budget (responsive: 46 lines on desktop, 22 on a phone, because a clause
that occupies one line at 1280px occupies four at 375px), zooms 70–200%, searches
within the document with per-page hit counts and jump links, goes full screen with
dialog semantics and a scroll lock, and supports arrows, Page keys, Home, End, +,
− and Escape.

Placeholders are rendered as highlighted `<mark>` elements rather than hidden — a
template whose blanks are invisible is a template that gets signed with the blanks
in it. Everything rendered is text we authored, inserted as text nodes: no
untrusted content ever becomes markup, and no PDF engine is shipped to the
browser.

**Official documents are never rendered in our chrome.** The detail page explains
why and links to the publisher.

**Download** offers `.docx` and `.txt`.

The `.docx` is a real WordprocessingML file built by `apps/web/lib/docx.ts` — a
ZIP writer over `node:zlib` plus three XML parts, about 130 lines, no dependency.
`file(1)` identifies the output as "Microsoft Word 2007+". It carries the
official-status notice, the before-you-use guidance, the state notes, the document
itself and a provenance footer with the download date.

There is no PDF. A word processor makes a better one from the `.docx` in one step
than a hand-rolled generator would.

Filenames are readable — `Lexhall_Maharashtra_Residential_Rent_Agreement.docx`,
not `document_final_v2.pdf` — and the state is not repeated when the title already
carries it.

---

## 6. Privacy

`resource_event` records `(resource_id, kind, occurred_at)`. No identifier, no
session reference, no query, no referrer.

This is not an oversight to be corrected later. The documents in this library
disclose that a person may be facing eviction, a criminal charge, dismissal or
domestic violence. A per-user download history of those documents is a liability,
not an asset, and the DPDP Act's purpose-limitation principle would not support
retaining it for analytics.

Bookmarks are keyed to a random UUID in an httpOnly first-party cookie, generated
server-side and joined to nothing. The UI says the list is device-local rather
than implying an account exists.

---

## 7. Integration

The library is a data layer, not a separate site:

- `/matters/[domain]/[matter]` lists the documents for that matter.
- `/resources/[slug]` links back to its matter, and to advocates who list the
  practice area — with the caveat that the register does not record
  specialisation, so nobody is shown as a specialist in the document.
- `resourcesForPracticeArea()` connects the library to the professional
  marketplace.
- Kits pull state-specific resources from the categories they draw on.
- The sitemap lists published resources, populated categories, kits and centres —
  and excludes search views, the saved list and the API.

---

## 8. Files

```
packages/core/src/
  resource-taxonomy.ts        types, categories, centres, disclaimers, scoring, query routing
  resource-sources.ts         49 publishers
  resource-catalog.ts         central and judicial resources
  resource-catalog-states.ts  SLSAs, DISCOMs, regulators, RERA, tenancy regimes
  resource-templates.ts       tenancy, notices, applications, affidavit
  resource-templates-2.ts     employment, corporate, court documents, checklists
  resource-kits.ts            9 situation-led collections

packages/db/
  sql/007_taxonomy_resources.sql
  sql/008_resource_library.sql
  src/repositories/resources.ts    seed, search, detail, events, verification, admin

packages/ingestion/src/
  resources.ts                seed, verify, harvest, promote

apps/web/
  app/resources/…             hub, search, category, detail, kits, centres, saved, about
  app/api/resources/…         suggest, download, bookmark, event
  app/admin/resources/        the workbench
  components/                 ResourceCard, ResourceSearch, ResourceFilters,
                              DocumentViewer, ResourceActions
  lib/docx.ts                 dependency-free .docx writer

packages/core/test/resources.test.ts    44 assertions over the rules above
```

---

## 9. Tests

`packages/core/test/resources.test.ts` covers, in order of what would be worst if
it broke:

1. A platform template can never be labelled official — asserted for every
   official-only type.
2. Disclaimers are never empty, name the state when there is one, and say "not a
   government or court form" and "not legal advice".
3. A 403 is not a broken link; 404 and 410 are the only "gone" statuses.
4. The provenance score is bounded, its factors sum to it, every factor is
   explained, and freshness decays to zero at two years.
5. Query routing resolves ten plain-language complaints with no legal vocabulary.
6. Every placeholder used in a template body is declared in its `fields`.
7. A template that mentions a prescribed form links to one.
8. No tenancy note states a rupee figure or a percentage rate.
9. Maharashtra records that registration is compulsory regardless of the
   eleven-month term.
10. The centres for people at risk carry a helpline.

`scripts/smoke.mjs` adds 55 HTTP-level assertions across 19 resource routes,
including that the download endpoint returns 409 rather than proxying an official
document, and that the sitemap excludes search views.
