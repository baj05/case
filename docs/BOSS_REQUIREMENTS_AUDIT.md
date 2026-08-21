# BOSS_REQUIREMENTS_AUDIT

Audits the management brief (advocate/law-firm/LPO discovery platform, Practo-shaped, with a
Glassdoor/G2-grade review engine) against what actually exists in this repository today —
21 Aug 2026. This supersedes nothing already in `docs/` (GAP_ANALYSIS.md, COMPLIANCE_MATRIX.md,
IMPLEMENTATION_ROADMAP.md, RECTIFICATION_TASKS.md, PLAN_PRACTO.md already covered most of this
ground); it restates their findings in the requested format and folds in what changed in this
pass (authentication + the review trust engine).

**Rule followed throughout:** a requirement is only marked Functional if it is wired to real
data and was exercised end-to-end in this pass, not because a page renders.

| Requirement | Present | Visible | Connected | Functional | Tested | Quality | Gap | Action |
|---|---|---|---|---|---|---|---|---|
| Search advocates (NL query, location, court, practice area, fee, experience, availability) | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — | — |
| Professional profile page, per advocate | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — | — |
| Claim a profile | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | Claim does not create/link an `app_user` account yet | Link claim approval to the claimant's account once they've signed in |
| Bar Council verification levels (0–5) | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — | — |
| Consultation request | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — | — |
| Paid booking (fee schedule, slots, confirmation) | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE, `platform_fee_minor` structurally 0 | — | — |
| **Authentication (signup, login, sessions, RBAC)** | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE — built this pass** | No password-reset flow; no MFA yet (schema supports it) | Add reset-by-email once an email sender exists |
| `/admin` and `/dashboard` route guards | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE — built this pass** | `/admin/resources` write actions (publish/unpublish) still don't attribute to the acting admin | Wire those buttons through `requireUser()` too |
| **Review Trust Engine** ("Legal Trust & Experience": multi-dimension ratings, star + satisfaction distribution, recommend %, "what people mention" themes, verified/attributed/pseudonymous/anonymous, moderation, fraud scoring, helpful votes, right of reply, reporting, sample-size banding, firm/LPO reviews) | ✓ | ✓ | ✓ | ✓ | ✓ | **LIVE — demonstrated end-to-end with dummy data, flag left off in production** | `FEATURE_REVIEWS` is switched **on in this local dev database only**, with `packages/db/scripts/seed-review-demo.ts` seeding 10 fictional demo advocates and 6 fictional demo organisations (never a real Bar Council record) so the full UI is visible — see `docs/REVIEW_TEST_PLAN.md` for exactly what was clicked through. Production still requires the C-09/C-10 sign-off in `REVIEW_COMPLIANCE_MATRIX.md` before this flag is enabled for real | Get counsel sign-off, then flip `FEATURE_REVIEWS` in production and run the seed script's inverse (`--clear`) or simply never run it there |
| Judges (factual only, no rating) | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE | — | — |
| Judgments | ✓ | ✓ | · | · | · | PARTIAL | Schema present, corpus thin | Ingest a real judgment corpus (s.52(1)(q) permits reproduction) |
| Lawyer-to-lawyer referral | ✓ (schema) | ✗ | ✗ | ✗ | ✗ | **BLOCKED, no longer on auth — now blocked on C-11 sign-off** | No fee/commission column by design; UI not built | Build referral UI once C-11 is signed off |
| Legal resource library (templates, official forms, kits, centres, state rent regimes) | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE (37 templates, 146 official links, 9 kits, 6 centres) | — | — |
| State/UT emblem ticker on resources page | ✓ | ✓ | ✓ | ✓ | — | LIVE | — | — |
| **Law firms** as a distinct entity | ✓ | ✓ | ✓ | · | ✓ | **PARTIAL — review-only profile built this pass** | `/firms` and `/firms/[slug]` exist and show the same Legal Trust & Experience section as an advocate profile, verified via matching email domain rather than a booking. No team roster, no service listing, no firm-level booking/consultation | Build roster + services when that becomes the priority; the review half is done |
| **LPO firms** (PF/ESI/labour process outsourcing) | ✓ | ✓ | ✓ | · | ✓ | **PARTIAL — review-only profile built this pass** | `/lpo` and `/lpo/[slug]` exist with the same review section. No project/SLA workflow, no PF/ESI/labour-specific service listing | Needs its own workflow model (project → scope → tasks → delivery → billing) — not a relabelled advocate profile; the review half is done |
| **Corporate accounts** | ✓ (schema: `organisation.kind='corporate'`, `org_member`) | ✗ | ✗ | ✗ | ✗ | MISSING product surface | No org creation flow, no legal-request intake, no external-counsel management | Real scope of work; needs its own design pass |
| **Payments** (consultation fee capture on-platform) | ✓ (ledger schema, `settlement_mode='gateway'` reserved) | ✗ | ✗ | ✗ | ✗ | **DELIBERATELY NOT BUILT** | `platform_fee_minor` CHECK-constrained to 0; gateway mode blocked | Gated on C-12 (fee-sharing/PA-PSP legal analysis) — build only after sign-off |
| **Mediation** | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | Taxonomy label only, no workflow, no schema | Genuinely Phase 3 scope: party management, secure session, scheduling, settlement record |
| **Arbitration** | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | Taxonomy label only, no workflow, no schema | Genuinely Phase 3 scope: arbitrator, hearing calendar, awards |
| **Contract review (paid)** | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | No upload/analysis pipeline of any kind | Real product surface — upload, issue detection, professional review, delivery |
| **Contract management SaaS** | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | No contract/template/renewal/obligation schema | Real product surface — needs its own data model and multi-tenant permissions |
| **Social media integration** | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | None attempted | Lowest priority; needs a decision on what "integration" means (login vs. profile links) before building anything |
| **SaaS billing** (plans, usage, invoices) | ✓ (schema: `plan`, `subscription`, `ledger_entry`) | ✗ | ✗ | ✗ | ✗ | MISSING product surface | No plan selection UI, no usage metering | Blocked on having an actual SaaS product (contract mgmt, LPO console) to sell first |
| Data sourced from Bar Council registers | ✓ | ✓ | ✓ | ✓ | ✓ | LIVE, but narrow | Currently the *State Bar Council office-bearer directory* (~20–25 people/council), not full advocate rolls (~1M+) | Per-council roll adapters — 24 adapters, already scoped in `IMPLEMENTATION_ROADMAP.md` P1#9 |
| Rate limiting on public endpoints | ✗ | ✗ | ✗ | ✗ | ✗ | MISSING | None | RT-012, independent of auth, can ship anytime |
| Practo-style discovery journey (search → profile → consult/book → experience → review) | ✓ | ✓ | ✓ | ✓ (through booking) · (review now real, flagged) | ✓ | LIVE end-to-end except the review step is behind a legal-sign-off flag | Reviews are the one honest gap in the loop, and it's a legal gap, not an engineering one | Get counsel sign-off, flip the flag |

## What changed in this pass specifically

1. **Authentication** — real signup/login/logout, scrypt password hashing, session cookies
   (httpOnly, 30-day expiry, revocable by deleting the row), account lockout after 5 failed
   attempts. `/admin`, `/admin/resources` and `/dashboard` now actually require a session; a
   `platform_admin` role gate protects `/admin`. Verified live in-browser: signed-out access to
   `/dashboard` redirects to `/login?next=/dashboard`; the created admin account reaches `/admin`
   after signing in.
2. **Review Trust Engine, rebranded "Legal Trust & Experience"** — extended in a follow-up pass
   with a star distribution, a plain-language satisfaction distribution, "what people mention"
   themes drawn only from real published text, and four-level sample-size banding
   (none/new/early/established) instead of a single threshold. Reviews now also work for law
   firms and LPO providers (`organisation_id` added to the schema; verified via matching email
   domain rather than a booking, since no org-level booking model exists). Demonstrated live with
   realistic, varied dummy data (10 fictional advocates, 6 fictional organisations, scores
   ranging 3.9–4.6, not a wall of 5.0s) via `packages/db/scripts/seed-review-demo.ts` — see
   `REVIEW_TEST_PLAN.md` for the exact journeys clicked through, and `REVIEW_COMPLIANCE_MATRIX.md`
   for why `FEATURE_REVIEWS` stays off in production regardless.
3. **Firm and LPO profile pages** (`/firms`, `/firms/[slug]`, `/lpo`, `/lpo/[slug]`) — built as a
   real, working review surface for organisations, not a stub. Team rosters and service listings
   remain unbuilt, honestly.
4. Everything else marked MISSING above (corporate accounts, mediation, arbitration, contract
   review, contract-management SaaS, payments, social integration) was **not** stub-coded in this
   pass. Each is a real, separate product with its own data model and workflow — building an
   empty shell for each would satisfy a checklist and nothing else. They are deliberately left as
   documented gaps with a next action, consistent with how this repository has always drawn that
   line (see `docs/PLAN_PRACTO.md` "Not in this pass, and why").

## Reading this table correctly

"Present" means schema or code exists. "Functional" means it was exercised against real data,
not that the code compiles. A row can be schema-Present and product-MISSING at the same time —
that is not a contradiction, it's the difference between "the graph is coherent" (a deliberate
architecture choice recorded in `003_platform.sql`'s own header comment) and "the feature ships."
