# eCourts Data Research — Crawl & Compliance Report

**Date:** 2026-08-24
**Requested target:** `https://ecourtsindia.com/`
**Outcome:** requested target **not crawled**. Equivalent (and more authoritative) data sourced from the official government publisher instead.

---

## 1. Compliance gate — requested target

Checked before any crawling, per the standing rule that robots/ToS review precedes collection.

### `ecourtsindia.com/robots.txt`

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: ClaudeBot
Disallow: /
```

(GPTBot, CCBot, Google-Extended, Bytespider, Applebot-Extended, Amazonbot and meta-externalagent are likewise `Disallow: /`.)

**Findings:**

| Check | Result |
|---|---|
| Our agent named in robots.txt | **Yes — `ClaudeBot`, `Disallow: /`, whole site** |
| AI collection signal | `ai-train=no`, `use=reference` |
| Programmatic access | **HTTP 403** (Cloudflare blocks non-browser requests) |
| Declared legal basis | robots.txt header asserts access is conditional on honouring content signals, and claims an express reservation of rights under Art. 4, EU Directive 2019/790 |

**Decision: do not crawl.** The prohibition is explicit, names our agent, and is backed by an active technical block. Switching transport (Firecrawl, a headless browser, or a browser extension) would not change who is collecting or what the operator refused — it would only route around the refusal, which the project's own compliance rule forbids.

### Two further considerations

1. **`ecourtsindia.com` is a private aggregator, not the government publisher.** The underlying records originate from NIC's eCourts/NJDG systems. Copying the aggregator would take their compiled database — a database-rights question entirely separate from robots.
2. **Scale implies personal data.** The site advertises ~71 crore litigants and ~13.6 crore orders. Those are records naming real people in live proceedings. Bulk import would carry serious DPDP Act 2023 exposure regardless of the robots position, and was out of scope on that basis alone.

---

## 2. Alternative sources assessed

| Source | Status | robots.txt | Used |
|---|---|---|---|
| `njdg.ecourts.gov.in/njdg_v3/` — NJDG District Courts | 200 | none present | **Yes** |
| `njdg.ecourts.gov.in/hcnjdg_v2/` — NJDG High Courts | 200 | none present | **Yes** |
| `ecourts.gov.in` | 200 | none present | Mapped only |
| `www.sci.gov.in` — Supreme Court | 200 | only `/wp-admin/` disallowed | Not yet |
| `scdg.sci.gov.in` — SC NJDG | — | — | Failed (proxy tunnel error), retry candidate |
| `judgments.ecourts.gov.in` | connection failure | — | Not reached |
| `api.data.gov.in` | 400 without key | portal disallows crawling; **API is the sanctioned route** | Needs API key |

Publisher for all of the above: **National Informatics Centre (NIC), Ministry of Electronics & IT, Government of India.**

---

## 3. What was collected

**Aggregate statistics only.** No case records, no party or litigant names, no advocate-to-case linkage.

- District Courts: total/civil/criminal pendency, five age bands, institution & disposal flow, cases listed today, filings by women and by senior citizens
- High Courts: same pendency and age structure, plus 10 case-type splits and 4 recorded delay reasons
- Registry of all 25 High Courts
- 36 states/UTs covered by the district grid

Extract: [`../structured/judicial-statistics.json`](../structured/judicial-statistics.json) — 37 statistic rows + 25 courts.

### Headline figures (retrieved 2026-08-24)

| | District Courts | High Courts |
|---|---|---|
| Pending | 5,10,70,663 | 64,78,459 |
| — civil | 1,12,74,334 | 45,12,720 |
| — criminal | 3,97,96,329 | 19,65,739 |
| Pending > 1 year | 62.09% | 72.54% |
| Filed last month | 29,21,317 | 2,58,469 |
| Disposed last month | 23,98,026 | 2,47,430 |

---

## 4. Implementation

```
NJDG (live)  →  reviewed JSON extract  →  ingest script  →  judicial_statistic  →  /judicial-data
                (checked into git)        (npm run db:judicial)
```

Crawling and importing are **separate steps by design**: the extract is reviewable and diffable before it reaches the database, and a rebuild never depends on a third-party site being up.

- `packages/db/sql/015_judicial_statistics.sql` — `judicial_statistic` + `high_court`, both FK'd to `source`
- `packages/db/scripts/ingest-judicial-statistics.ts` — idempotent; `--clear` supported
- `packages/db/src/repositories/judicial.ts` — reads newest `data_version` only, never mixes generations
- `apps/web/app/judicial-data/page.tsx` — attributed throughout

**Provenance is enforced structurally, not by convention:** `source_id` and `retrieved_at` are `NOT NULL` on every row, and both NJDG endpoints are registered in `source` with `authority='government'` and `robots_checked_at` recorded. The page states plainly that these are government figures CaseADVO has not independently verified.

---

## 5. Known limitations

1. **National totals only.** Per-state, per-district and per-High-Court drilldowns exist behind form POSTs and a CAPTCHA on NJDG; not attempted.
2. **Point-in-time.** A single snapshot (`2026-08-24.1`). The schema versions rows so repeat ingests accumulate rather than overwrite, but no scheduler is wired up.
3. **SC NJDG missing.** `scdg.sci.gov.in` failed with a proxy tunnel error — worth a retry; Supreme Court figures are absent until then.
4. **No case-level data, deliberately.** Advocate→case→judge→order graphs would need case-level records; that requires its own privacy and licensing review, not an extension of this work.
5. **`data.gov.in` needs an API key.** Its portal disallows crawling; the API is the sanctioned route and is unblocked by registration, not by scraping.

---

## 6. If the aggregator's specific dataset is still wanted

The only legitimate route is permission: contact eCourtsIndia for an API, data licence, or partnership. Their robots.txt is a refusal of automated collection, not of commercial dealing — a licence would make everything originally requested available and properly sourced.
