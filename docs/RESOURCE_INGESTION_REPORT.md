# Resource library — ingestion report

Generated from the live database on 20 August 2026. Every figure below is a query
against `data/lexhall.db`, not an estimate.

Reproduce it with:

```bash
npm run resources           # seed the catalogue, templates and harvest targets
npm run resources:verify    # fetch every source URL and classify the outcome
npm run resources:harvest    # read publisher form pages
npm run resources:publish   # promote reviewed harvest rows
```

---

## 1. What the library holds

| | Count |
|---|---|
| Resources published | **183** |
| Official (published by the authority named) | 146 |
| CaseADVO templates | 37 |
| Held at REVIEW_REQUIRED (not public) | 35 |
| Awaiting first link check | 1 |
| States and union territories covered | 30 |
| Distinct authorities named | 86 |
| Documents that genuinely apply nationally | 81 |
| Source register entries | 49 |
| Harvest targets configured | 34 |
| Verification records written | 285 |
| Attached official links | 30 |
| Template bodies stored | 37 |
| Kits | 9 |
| Database tables in the library | 22 |

### By origin

| Origin | Rows | What it means |
|---|---|---|
| `catalogue` | 121 | Written by hand. A person chose the URL, opened it, and described the document. |
| `harvest` | 61 | Discovered by the pipeline reading a publisher's own forms page. |
| `template` | 37 | Authored by CaseADVO — 25 base templates plus 12 state tenancy variants. |

### By document type (published only)

| Type | Count |
|---|---|
| Official form | 66 |
| Official portal | 43 |
| Agreement template | 18 |
| Official guide | 12 |
| Tribunal form | 8 |
| Regulations | 7 |
| Application template | 6 |
| Template | 5 |
| Government document | 4 |
| Notice template | 4 |
| Checklist | 3 |
| Circular | 2 |
| Report | 2 |
| Affidavit template | 1 |
| FAQ | 1 |
| Judgment | 1 |

### By source level

| Level | Meaning | Count |
|---|---|---|
| 1 | Government or court — the issuing authority itself | 47 |
| 2 | Statutory or regulatory authority | 28 |
| 3 | Legal services authority | 71 |
| 6 | CaseADVO-authored | 37 |

No resource is published at level 4 or 5. Nothing in the library comes from a
commercial legal-content publisher.

### Coverage by category

| Category | Published |
|---|---|
| Legal aid | 75 |
| Property & rent | 26 |
| Electricity & utilities | 16 |
| Corporate & startup | 8 |
| Employment & labour | 6 |
| Government portals | 5 |
| PF, ESI & social security | 5 |
| Consumer | 5 |
| Tax & GST | 4 |
| Banking & finance | 4 |
| Right to information | 3 |
| Rights & protection | 3 |
| Cyber & data | 3 |
| Legal notices, IP, insurance, criminal, court documents, applications, agreements, mediation & arbitration | 2 each |
| Motor & transport, statutes & judgments, legal guides, affidavits | 1 each |

Twenty-six categories exist in the taxonomy; 25 hold at least one document. The
distribution is deliberately uneven and the site says so: `/resources` lists the
empty categories under a disclosure rather than padding them.

---

## 2. Sources checked

49 publishers are in the register. All are Indian government bodies, courts,
tribunals, regulators, statutory bodies or legal services authorities, plus one
research institution (PRS Legislative Research, recorded at level 3 and labelled
as an institution rather than a government source).

Central and judicial: India Code, e-Gazette, Supreme Court of India, eCourts,
eFiling, NJDG, NALSA, Department of Justice, Legislative Department.

Labour and social security: EPFO, ESIC, Ministry of Labour and Employment, Chief
Labour Commissioner (Central).

Tax: Income Tax Department, GST Network, CBIC, CESTAT.

Consumer and utilities: National Consumer Helpline, e-Daakhil, NCDRC, Department
of Consumer Affairs, CERC, TRAI, state electricity regulators, distribution
licensees.

Corporate, securities, competition: MCA, NCLT, NCLAT, SEBI, RBI, CCI, MSME,
NSWS, IRDAI.

Citizen services and rights: RTI Online, CIC, cybercrime portal, CERT-In,
Passport Seva, Parivahan, ECI, NCW, NHRC, SHe-Box, CPGRAMS, NCRB, MHA.

IP: Intellectual Property India, Copyright Office.

Tribunals: NGT, CAT, DRT, TDSAT.

State: 34 State and Union Territory Legal Services Authorities, 10 electricity
distribution licensees, 3 state electricity regulatory commissions, 6 state RERA
authorities.

---

## 3. Verification results

Every source URL was fetched. 285 verification records exist. The current state
of the library:

| Outcome | Count | Treatment |
|---|---|---|
| Reachable | 203 | Verified; published if it was waiting on this |
| Blocked to automated checks | 5 | Flagged for a person. **Not** treated as broken |
| Unreachable | 11 | Flagged. Could be the source, could be our network |
| Not found (404/410) | 0 | Would be unpublished and flagged |
| Server error | 0 | Would be flagged as probably temporary |

### The 403 problem, and why it is a design decision rather than a bug

A number of Indian government sites refuse automated clients outright. During
authoring, the following returned 403 to our checker while being demonstrably
healthy in a browser and through an independent retrieval service:

`sci.gov.in`, `indiacode.nic.in`, `mca.gov.in`, `gst.gov.in`, `labour.gov.in`,
`msme.gov.in`, `eci.gov.in`, `india.gov.in`, `doj.gov.in`, `legislative.gov.in`.

A checker that classifies those as broken would empty the library of precisely
the sources that matter most. `classifyLinkCheck` therefore returns `blocked`,
`LINK_OUTCOME_META.blocked.healthy` is `true`, and `needsHuman` is `true`. The
resource stays as it was and appears in the admin review queue. This is
documented on the public `/resources/about` page, not only here.

### Unreachable from this network

The following either failed TLS negotiation or did not answer at all from the
authoring network. Each is seeded and held at REVIEW_REQUIRED rather than
published on a URL nobody could open:

`epfindia.gov.in`, `esic.gov.in`, `itat.gov.in`, `cci.gov.in`,
`copyright.gov.in`, `egazette.gov.in`, `samadhaan.msme.gov.in`,
`ipindia.gov.in/pages/trade-marks/...`, and the Bihar, Jharkhand, Odisha and
Andaman & Nicobar legal services authority sites.

Several of these are near-certainly reachable from within India. The library does
not assume that; it records what it observed.

---

## 4. Harvest results

One harvest run, reading the "Download Forms" page of all 34 State and Union
Territory Legal Services Authorities.

| | |
|---|---|
| Targets attempted | 34 |
| Documents discovered | 62 |
| Inserted at REVIEW_REQUIRED | 61 |
| Duplicates suppressed by source URL | 0 |
| Rejected by the classifier | 1 |
| Transport errors | 4 |
| Skipped for robots.txt | 0 |
| Promoted to PUBLISHED after review | **41** |
| Held back | 20 |

### What was rejected, and why

The classifier rejects recruitment notices, tenders, empanelment advertisements,
annual reports, internal staff administration and anything that is not a document
a member of the public would file. One document was rejected on this run.

### What was held back

20 of the 61 harvested documents were **not** published:

| Reason | Count |
|---|---|
| Classifier confidence `medium` | 13 |
| Classifier confidence `low` | 7 |

Examples held back: `chandigarh-application-form-for-grant-in-aid-during-the-financial-year`
(a grant application, not a legal-aid form), `gujarat-english-form` and
`gujarat-gujarati-form` (titles that say nothing about content),
`maharashtra-forms-brouchures`, and three Meghalaya panel-lawyer administration
formats.

`promoteReviewedHarvest` refuses to publish anything whose classification was
below `high` confidence, whose last link check did not succeed, or whose rights
basis is unresolved. Those refusals are the point of the step.

### A bug this pipeline caught in itself

The first verification pass published the harvested rows automatically: a
successful link check moved them from `REVIEW_REQUIRED` to `PUBLISHED`, which is
exactly what §63 of the specification forbids. The 61 rows were reverted and
`applyLinkCheck` now refuses to publish anything whose `origin` is `harvest`. A
fetch proves a file exists at an address; it does not prove the file is the
document its link text claimed, nor that it is current. Only
`promoteReviewedHarvest` can publish scraped content, and it writes a
`resource_verification` row with `checked_by = 'operator'` so the audit trail
distinguishes a machine check from a human decision.

---

## 5. Rights and licensing

| Rights basis | Count | Downloadable from CaseADVO |
|---|---|---|
| `link_only` | 182 | No — opens at the publisher |
| `platform_owned` | 37 | Yes |
| `unknown` | 0 | Never |

**No government document is hosted by CaseADVO.** Permission to rehost has not
been sought from any publisher, so every official resource stores metadata and
links to the authority's own copy. Two consequences, both stated on the public
pages:

- The user always reaches the current version. A mirrored form is stale the
  moment the authority revises it, and the user has no way to tell.
- There is no preview for an official form. `/api/resources/[slug]/download`
  returns **409** for one, with an explanation and the publisher's URL, rather
  than proxying somebody else's document under our own domain.

`mirror_permitted` is `0` for all 49 sources. Changing it for any source requires
recording the basis in `rights_note`.

---

## 6. Scraping conduct

- `robots.txt` is fetched, parsed and obeyed per host before any request
  (`packages/ingestion/src/http.ts`). A disallow is a stop signal: `politeGet`
  throws `RobotsDisallowed` rather than proceeding, and the harvest records
  `last_outcome = 'robots_disallowed'` for that target.
- Requests to a host are spaced by `INGEST_RATE_LIMIT_MS` (2000 ms default).
- The User-Agent identifies the crawler and carries a contact route.
- A 403 is treated as a stop signal, never as something to route around.
- No CAPTCHA was solved, no authentication was bypassed, no access control was
  circumvented, and no rate limit was evaded.
- Only pages the publisher advertises publicly as form listings were read.

---

## 7. Duplicate detection

Duplicates are suppressed on `source_url` before insert, and
`resource_file.content_hash` carries a unique index for the mirrored case (unused
today, because nothing is mirrored). The admin dashboard reports rows sharing a
source URL as duplicate candidates. Currently **0**.

---

## 8. Requires manual verification

| Category | Count | Action |
|---|---|---|
| Held at REVIEW_REQUIRED | 35 | 15 catalogue entries on unconfirmed URLs, 20 low-confidence harvest rows |
| Blocked to automated checks | 5 | A person must open them in a browser |
| Unreachable from this network | 11 | Re-check from an Indian network before deciding |

These appear in `/admin/resources` and in the "Known gaps" section of
`/resources/about`. They are not hidden.

---

## 9. Known limitations

1. **Regional languages.** Where an authority publishes a Hindi or regional
   version, the library links to the page rather than the specific language file.
   `resource.language` exists and is populated with `en` throughout.
2. **No local corpus of judgments or statutes.** Coverage is by link to the
   official search interfaces. Full-text judgment search is separate work.
3. **No OCR.** Nothing is mirrored, so there is no scanned document to OCR.
   `resource_file.text_source` exists for when that changes.
4. **No malware scanning.** Again, nothing is downloaded and stored, so there is
   nothing to scan. The schema carries `scan_status` for the mirrored case.
5. **Harvest parser covers one platform.** `s3waas_forms_table` reads the
   government content platform the legal services authorities run on. Eight of
   the 34 target pages returned 200 with zero rows — they use a different layout,
   and the pipeline reports that rather than guessing.
6. **Saved lists are device-local.** There is no authentication in this build, so
   a bookmark is keyed to an opaque cookie reference. The UI says so.
7. **No PDF generation.** Templates download as `.docx` (a real WordprocessingML
   file assembled without a dependency) and `.txt`. A word processor makes a
   better PDF from the `.docx` in one step than a hand-rolled generator would.
8. **Relevance for near-identical documents.** 34 legal services authorities
   publish pages that score identically in BM25. Scores are bucketed to a tenth
   of a point so genuine ties tie, and then break on breadth of applicability and
   source level — but "legal aid application" still returns a state authority
   before the national guide.
9. **Electricity coverage is 10 licensees, not all of them.** India has far more
   distribution companies. Where a state has no verified licensee entry, the
   electricity kit says so instead of showing another state's.

---

## 10. What was deliberately not done

- **No third-party legal content was scraped.** The register contains no
  commercial legal-content site. Not because they lack useful material, but
  because their material is copyrighted and the rights position would be
  `unknown`, which this library refuses to publish.
- **No document was mirrored.** See §5.
- **No fabricated official format.** Where a prescribed form exists, the entry
  links to it and any CaseADVO document is presented as a covering document.
  `assertStatusConsistent` throws at seed time on a type/status mismatch, so an
  editorial mistake cannot put a false official label into the database.
- **No fee, rate or deposit cap is stated in a state note.** Those change by
  notification. A test asserts that no tenancy note contains a rupee figure or a
  percentage rate, because a library that states one will be wrong within a year
  and somebody will rely on it.
