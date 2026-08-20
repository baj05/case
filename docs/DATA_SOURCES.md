# Data sources

Every published fact traces to a row in the `source` table: publisher, authority, robots status, terms-review note, and whether it is cleared for publication.

## Registered and ingested

| Source | Authority | What it actually contains | Records | robots |
|---|---|---|---|---|
| `bci-sbc-directory` — Bar Council of India | Official regulator | The 24 State Bar Councils **and each council's elected office-bearers** (~20–25 people each) | 373 advocates + 24 councils | Read; `/info/sbc*` permitted |
| `wikipedia-supreme-court-judges` | Community, cited | Sitting Supreme Court judges: name, designation, parent High Court, tenure | 47 judges | Documented public API |

## The correction that matters

The project brief stated: *"The database of all advocates is freely available on the Bar Council websites of every Bar Council of India."*

**Verified false for barcouncilofindia.org.** That site publishes the councils and their office-bearers. It does not publish the roll. So **373 is the honest ceiling from this source** — a real, verifiable corpus of senior office-holders, not national coverage.

## Where the actual rolls are, and why they are not ingested yet

| Source | Status | Blocker |
|---|---|---|
| Individual State Bar Council sites (24) | **Not ingested** | Each publishes its own roll in its own format on its own domain. Several sit behind search forms or bot protection. Requires one adapter per council — planned work, tracked in [IMPLEMENTATION_ROADMAP](IMPLEMENTATION_ROADMAP.md). |
| `probono-doj.in` (Dept. of Justice advocate list) | **Not ingested** | Returns **HTTP 403** to automated access. Respected as a decision, not worked around. |
| BCI internal API routes (`/server/api/*`) | **Deliberately not used** | Several are `Disallow`ed in robots.txt. Probing further would be unauthorised enumeration of a regulator's server. We render the permitted public page instead. |

## Crawl conduct

- `robots.txt` fetched, parsed and obeyed **before** any request, including `Crawl-delay`. A disallow is a stop, not an obstacle.
- One request at a time per host, ≥2 s apart, exponential backoff.
- Identifying User-Agent with a contact address; policy published at `/bot` with a copy-pasteable robots.txt block to slow or stop us.
- **4xx is respected.** No CAPTCHA solving, no auth bypass, no bot-detection evasion.
- Every raw response stored with a SHA-256 content hash, so unchanged pages are skipped and only real changes republish.

## Known extraction limitation

The Bar Council site is a client-rendered UmiJS SPA returning a 661-byte shell to a plain GET, so ingestion goes through a render step (ADR-005). The keyless reader truncates at ~8 KB, yielding **~15 of 25 members per council completely**. 91 records are flagged `incomplete_extraction` in the QC queue rather than presented as complete. Fix: a self-hosted Playwright renderer — a drop-in third strategy, since `RenderStrategy` is already pluggable.

## Data minimisation

The member pages publish **residential addresses, personal mobile numbers and personal email addresses**. These are ingested into `private_*` columns and **never published**. They serve exactly one purpose: scoring a profile claim (an email match is worth 55 points, phone 35). Chamber and office addresses — professional information — are published. The source being public does not make republishing every field proportionate. See [COMPLIANCE_MATRIX](COMPLIANCE_MATRIX.md) C-04 to C-07.
