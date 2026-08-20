# Research log

Decision · reason · source · impact. Primary sources only.

| # | Question | Finding | Source | Impact |
|---|---|---|---|---|
| R1 | Does the BCI publish the roll of all advocates? | **No.** It publishes the 24 State Bar Councils and each council's elected office-bearers (~25 each). The rolls are per-council, on 24 separate sites. | barcouncilofindia.org `/info/sbc`, `/info/sbc-members/SBC05`, fetched and parsed | Corrected a founding project assumption. Corpus ceiling 373, not "all advocates". |
| R2 | May we crawl those paths? | `robots.txt` disallows only `/admin`, `/user`, `/profile`, `/dashboard`, `/institute`, `/request`, `/verification`. The `/info/*` paths are permitted. | `barcouncilofindia.org/robots.txt` | Ingestion proceeds on `/info/*` only; the disallowed internal API routes are deliberately untouched. |
| R3 | Is there a government-wide advocate list? | `probono-doj.in` returns **HTTP 403** to automated access. | Direct request | Respected as a decision. Recorded, not circumvented. |
| R4 | Why does a plain GET return 661 bytes? | The site is a client-rendered UmiJS SPA. | Response inspection + bundle grep | Ingestion needs a render step → `RenderStrategy` abstraction (ADR-005). |
| R5 | Where can judges data come from? | Wikipedia maintains a cited list of sitting Supreme Court judges, reachable through the documented MediaWiki API. | `en.wikipedia.org/w/api.php` | 47 judges ingested with source URL. Labelled community-maintained, not an official register. |
| R6 | Where can high-resolution, licensed imagery come from without an API key? | Wikimedia Commons — real resolution, explicit licence and author per file, and photographs of the actual courts the platform indexes. | `commons.wikimedia.org/w/api.php` | 8 court images + 3 textures, all attributed at `/credits`. Openverse used for editorial (Flickr-backed, capped at 1024 px). |
| R7 | Which Next.js version is free of the current advisories? | The advisory range extends to `16.3.0-preview.10`; **16.3.1** is clear. | `npm audit`, GitHub advisories | Upgraded 15.5.7 → 16.3.1. 27 high advisories → 0. |
| R8 | Can the prototype avoid a database server? | Node 22+ ships `node:sqlite` with FTS5. Node 26 also runs TypeScript natively. | Verified locally: SQLite 3.53.0, FTS5 present, TS strip working | Zero-dependency, zero-native-build local stack (ADR-002). No build step for CLIs. |
| R9 | Is white-on-`#FF7A45` accessible? | 2.6:1 — fails AA. The supplied spec's own Material roles already provide compliant pairings. | WCAG 2.2 contrast ratios | ADR-010: `#a73a05`+white (6.5:1) for solids, `#ff7a45`+`#672000` (5.4:1) for surfaces. |
| R10 | What does Practo's discovery model actually do? | Two-field search (location + query) pinned under the nav; category tiles; listing cards where fee, experience and location are scannable in one pass. | practo.com, inspected in-browser | Adopted the structure (dual search, fact strip), not the consumer-medical visual language. |
| R11 | Which UI-kit assets may be used? | The user holds an Envato subscription licence for the Countesia and Consulting Advisor kits. | User statement | Kit layouts replicated. Kit *photography* not shipped — the extractable regions were 141×158 px. |

## Compliance research

Consolidated in [COMPLIANCE_MATRIX](COMPLIANCE_MATRIX.md) — 21 features against BCI Rules (incl. Rule 36 solicitation), the Advocates Act 1961, and the DPDP Act 2023, each with verdict, controls and the flag that gates it. Six open questions are listed there for counsel; they are not engineering decisions.
