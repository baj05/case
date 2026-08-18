# Project audit

**Date:** 18 August 2026 · **Assessed by:** build session 1 · **Status:** Phase 1 discovery slice running on live data

---

## 1. Current state

The repository was **empty** at the start of this session — three WhatsApp voice notes and, added mid-session, a
`for inspiration/` folder of six screenshots and a `DESIGN.md` design system. There was no prior code, so this is a
greenfield build, not a refactor. Nothing was overwritten.

What now exists and runs:

| Layer | State |
|---|---|
| Monorepo (`apps/web`, `packages/{core,db,ingestion}`) | Working, npm workspaces |
| Database — 56 tables, FTS5 index | Working, SQLite via `node:sqlite` |
| Reference data — 36 states/UTs, 68 cities, 60 courts (25 High Courts), 24 practice areas, 14 matter types, 13 languages | Seeded |
| Ingestion pipeline — robots-aware crawler, raw store, dedupe, entity resolution, provenance, QC queue | **Working, run against live barcouncilofindia.org** |
| Advocate corpus | **373 real records from all 24 State Bar Councils** |
| Search — plain-language classifier, FTS5 + trigram, explainable ranking | Working, 12–25 ms |
| Public site — 20 routes | Working |
| Claim flow, consultation request, DPDP request | Working (real DB writes) |
| Admin data workbench | Working (**not access-controlled — blocker, see §5**) |
| Tests | 18 passing (`npm test`) |

---

## 2. The data-source finding that changes the plan

The brief states: *"The database of all advocates is freely available on the Bar Council websites of every Bar
Council of India."*

**This is not correct, and it materially affects scope.** Verified directly against the source:

- `barcouncilofindia.org/info/sbc` publishes the **24 State Bar Councils** — institutional records. ✅ ingested.
- `barcouncilofindia.org/info/sbc-members/SBC{01..24}` publishes each council's **elected office-bearers**,
  roughly 20–25 people each (~600 total). ✅ ingested, 373 captured.
- The **roll of enrolled advocates** — well over a million people — is **not on the BCI site at all**. Each State
  Bar Council publishes its own roll, in its own format, on its own domain. Several sit behind search forms or
  bot protection. `probono-doj.in` (a Government of India list) returns HTTP 403 to automated access.

So the ~373 records here are a genuine, verifiable seed corpus of senior office-holders — **not national
coverage**. Reaching national coverage means writing one ingestion adapter per State Bar Council. The framework
for that is built (adapters are pluggable, registered as data rows); the 24 adapters are the work.

A second finding: those member pages publish **residential addresses, personal mobile numbers and personal
email addresses**. Republishing those was judged disproportionate even though the source is public. They are
ingested into `private_*` columns, used only to score profile claims, and never rendered. Chamber and office
addresses — professional information — are published.

---

## 3. Known limitations

| # | Limitation | Impact | Fix |
|---|---|---|---|
| L1 | The BCI site is a client-rendered SPA; the render service used (`r.jina.ai`) truncates at ~8 KB, so ~15 of 25 members per council extract completely | 46 records hold name + photo only, all flagged `incomplete_extraction` in the QC queue | Self-hosted Playwright renderer. Adapter already has a pluggable `RenderStrategy`. |
| L2 | 3 councils (Assam, Manipur, Meghalaya, Odisha, Tripura) returned 0 members on this run | Missing coverage | Same as L1 |
| L3 | No ingested advocate has declared practice areas | Practice-area search returns 0 results — see §4 | Claim flow (built) or per-council roll adapters |
| L4 | Only 16 court associations across 373 records | Thin court filtering | Only 15 records publish a chamber address; more comes with L1 |
| L5 | Admin route unauthenticated | **Release blocker** | RBAC + session auth |
| L6 | No authentication anywhere | Dashboard cannot exist; claims are unowned | Phase 2 |
| L7 | SQLite, single file | Not production-scalable | Postgres; repository layer is the seam |

---

## 4. Why practice-area search returns nothing (deliberate)

Searching *"PF dispute in Delhi"* returns **0 results** with recovery suggestions. This is correct behaviour, not
a defect. The classifier resolves the query properly (Provident Fund + Delhi — see the interpretation line), but
no ingested record has a practice area, because **the Bar Council register does not state specialisation and
inferring it would be fabrication**. Guessing that a Delhi advocate "probably does labour law" would produce a
confident, plausible, unfounded claim about a real named person.

Practice areas therefore appear only when a professional claims their profile and states them. The claim flow is
built and functional. This is a product constraint honestly surfaced, per brief §96 and §140.

---

## 5. Release blockers

1. **Authenticate and authorise `/admin`** (L5). Every panel needs the `platform_admin` role plus an audit entry per action.
2. **Legal sign-off on the compliance matrix** — `docs/COMPLIANCE_MATRIX.md`. Reviews, payments and referrals ship switched off pending it.
3. **Named Grievance Officer** with published contact details.
4. **Real privacy notice and terms** — current pages are honest placeholders, marked as such.
5. **Migrate to Postgres** before any real traffic.
6. **Re-ingest with a full browser renderer** so records are complete before they are marketed as a directory.

---

## 6. Two bugs found and fixed during this session

Recorded because both were the kind that ship silently:

**Entity resolution collapsed 296 records into 16.** `upsertProfessional` resolved records by `(source_id,
source_url)`, but every member of a council shares one members-page URL, so all 25 Delhi advocates merged into a
single row. Fixed by adding `professional.source_ref` — a stable per-record identifier — with a unique index.

**Court linking fabricated associations.** `resolveCourtsFromOffice` matched a court's **seat**, so any address
containing "NEW DELHI" matched every Delhi-seated tribunal: one advocate was linked to the Supreme Court, NCLT,
NCLAT, NGT and TDSAT at once, all sharing one pasted chamber number. Fixed to match only court names and
recognised aliases, never seats, and to bind each chamber reference to the court it was written beside. Links
fell from ~358 fabricated to 16 accurate. Reprocessed from stored raw records without re-crawling.

The second is the more instructive: it produced *more* data, which looked like success.
