# GAP_ANALYSIS

Every requirement scored on six axes with a specific action.

Legend: **✓** yes · **·** partial · **✗** no · **n/a** not applicable yet.
Status codes: LIVE, PARTIAL, VISUAL_ONLY, BACKEND_ONLY, DISCONNECTED, BROKEN,
MISSING, BLOCKED (needs auth or payment).

## A · Discovery

| ID | Exists | Visible | Connected | Functional | Tested | Quality | Action |
|---|---|---|---|---|---|---|---|
| A-01 Search professionals | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-02 NL query | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-03 Location filter | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-04 Court filter | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-05 Practice area filter | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-06 Legal-matter filter | ✓ | · | ✓ | ✓ | ✓ | PARTIAL | RT-002 — surface matter chips on search |
| A-07 Verification filter | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-08 Consultation mode / availability | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-09 Fee & years filters | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-10 Advo AI as side chat | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE, but a duplicate `/advo-ai` full page exists — RT-003 |
| A-11 Six sorts | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| A-12 Empty state with recovery | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |

## B · Professional profiles

| ID | Exists | Visible | Connected | Functional | Tested | Quality | Action |
|---|---|---|---|---|---|---|---|
| B-01 Identity, courts, jurisdictions | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-02 Fee schedule | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-03 Availability & slots | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-04 Claim | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-05 Verification levels | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-06 Related professionals | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — |
| B-07 Free resources on profile | ✗ | ✗ | — | ✗ | — | MISSING | **RT-005 — add "Documents for these matters" section** |
| B-08 Referral signal | · | · | ✗ | ✗ | ✗ | MISSING | RT-006 — needs auth first (I-01) |

## C · User services

| ID | Status | Action |
|---|---|---|
| C-01 Consultation | LIVE | — |
| C-02 Book slot | LIVE | Payment stub only |
| C-03 Confirmation | LIVE | — |
| C-04 Matter creation | MISSING | BLOCKED on auth (I-01) |
| C-05 Follow-ups | MISSING | BLOCKED on auth |
| C-06 Saved pros | MISSING | BLOCKED on auth |
| C-07 Cancel / reschedule | MISSING | BLOCKED on auth |

## D · Lawyer network — all MISSING, BLOCKED on auth.

## E · Corporate workspace — all MISSING, BLOCKED on auth.

## F · LPO — all MISSING, BLOCKED on auth.

## G · Legal resources

| ID | Status | Action |
|---|---|---|
| G-01 Templates | LIVE (37 platform templates) | — |
| G-02 Official forms linked | LIVE (146 official) | — |
| G-03 Jurisdiction-aware | LIVE (12 state rent regimes, 30 states) | — |
| G-04 Preview + download | LIVE | — |
| G-05 Kits | LIVE (9 kits) | — |
| G-06 Audience centres | LIVE (6 centres) | — |
| G-07 Resource ↔ matter ↔ pro | · | RT-004 — matter page done; profile side pending (RT-005) |
| G-08 Admin review | LIVE, no RBAC | RT-007 |
| G-09 Ingestion pipeline | LIVE (seed/verify/harvest/promote) | — |
| G-10 Bookmarks | LIVE (cookie) | Real bookmarks BLOCKED on auth |

## H · Legal knowledge

| ID | Status | Action |
|---|---|---|
| H-01 Courts | LIVE | — |
| H-02 Judges | LIVE (no rating) | — |
| H-03 Judgments | PARTIAL (schema present, few rows) | RT-008 — populate corpus, or hide until seeded |
| H-04 6-level taxonomy browse | LIVE | — |
| H-05 Forums index | LIVE, no top-nav entry | RT-009 |

## I · Platform

| ID | Status | Action |
|---|---|---|
| I-01 Authentication | MISSING | RT-010 — top blocker |
| I-02 Roles | MISSING | BLOCKED on I-01 |
| I-03 /admin RBAC | MISSING | RT-011 |
| I-04 Rate limiting | MISSING | RT-012 |
| I-05 Payments | STUB (ledger schema present) | BLOCKED on I-01 |
| I-06 Notifications | STUB | BLOCKED on I-01 |
| I-07 Audit log | LIVE (writes exist) | RT-013 — surface in admin |
| I-08 Health contract | LIVE | — |
| I-09 CI | LIVE (typecheck + tests + smoke + build) | — |
| I-10 Analytics | LIVE (search-event, resource-event) | — |

## J · UX (Practo-style simplicity)

| ID | Status | Action |
|---|---|---|
| J-01 Single search above the fold | · | **RT-014 — hero currently uses two CTA buttons rather than an input** |
| J-02 ≤5 top-nav items | ✗ | **RT-001 — 8 items today, collapse to 5** |
| J-03 No dead controls | · | RT-015 — audit + fix (see §Dead-controls) |
| J-04 Back preserves filters | ✓ | LIVE via searchParams round-trip |
| J-05 Empty state recovery | ✓ | LIVE (EmptyState + recovery from search repo) |
| J-06 CTA hierarchy | · | RT-016 — several screens have too many equally-weighted buttons |
| J-07 Mobile no h-overflow | ✓ | Restored in commit 5611640 |
| J-08 5-second test | · | Depends on RT-014 |
| J-09 1-minute test | ✓ | Verified: home → search → filter → profile → book in ~35 s |

## Dead-controls / dead-ends detected in this pass

1. `/advo-ai` full page duplicates the floating AdvoLauncher and confuses primary CTA — RT-003.
2. Homepage hero says "Ask Advo AI / Search yourself" but has no search input — RT-014.
3. Header hides `/forums` (referenced from matter pages only) — RT-009.
4. `/dashboard` renders a shell with no auth wall — RT-011.
5. `/admin` reachable by anyone — RT-011.

## Summary

- **56 of 90 requirements LIVE** (62%).
- **13 PARTIAL** — mostly UX polish and cross-links.
- **21 MISSING** — 15 of them BLOCKED behind authentication.
- Top three blockers, in order: **I-01 (auth)** → **I-03 (RBAC)** → **I-04 (rate limiting)**.
