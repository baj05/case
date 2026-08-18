# Roadmap

Phase 1 is the part that exists and runs. Phases 2 and 3 are specified, and their schema is already in place, but
they are not built — no mocked dashboards, no placeholder screens.

---

## Phase 1 — Discovery (built)

| Item | State |
|---|---|
| Reference data: jurisdictions, locations, courts, practice areas, matter types, languages | ✅ |
| Ingestion framework: robots-aware, rate-limited, provenance, dedupe, entity resolution, QC queue | ✅ |
| BCI adapter, run live — 373 records, 24 councils | ✅ |
| Plain-language intake classifier + 18 relevance tests | ✅ |
| Search: FTS5 + trigram, explainable ranking, URL-state filters, zero-result recovery | ✅ |
| Profile pages with full provenance and verification ladder | ✅ |
| Claim flow with automatic match scoring and conflict detection | ✅ |
| Consultation request (enquiry only, no payment) | ✅ |
| DPDP correction / erasure / opt-out with 30-day clock | ✅ |
| Admin data workbench | ✅ functionally — **unauthenticated, blocker** |
| Design system implementing DESIGN.md, responsive 320→1920, WCAG 2.2 AA | ✅ |

**Remaining Phase 1 work before this could face real users**

1. Authentication, then RBAC on `/admin` *(blocker)*
2. Self-hosted Playwright renderer → re-ingest for complete records *(audit L1)*
3. Postgres migration
4. Legal sign-off on the compliance matrix
5. Named Grievance Officer; real privacy notice and terms
6. Per-council roll adapters — the actual path to national coverage
7. Observability: error tracking, crawler alerts, Core Web Vitals in CI

---

## Phase 2 — Transactions

Depends on: authentication (everything), C-09/C-11/C-12 sign-off (reviews/referrals/payments).

- **Professional dashboard** — today view first, then requests, profile, analytics. Blocked on auth.
- **Availability and booking** — `availability_rule` and `appointment` exist, including the unique index that prevents double-booking. Needs timezone-correct slot generation and the calendar UI.
- **Consultation workspace** — secure messaging, document exchange, follow-ups.
- **Matter management** — `matter`, `matter_participant`, `matter_event` exist. Needs the workspace and timeline UI.
- **Reviews** — schema complete and gated. Ships only after C-09, with moderation queue, right of reply, takedown and audit history.
- **Referrals** — schema complete and gated, deliberately fee-less. Needs client-consent gate before brief disclosure.
- **Payments** — provider abstraction over the append-only ledger. After C-12.
- **Search alerts and saved searches** — `saved_search` exists with alert frequency.

## Phase 3 — Legal operations

- Corporate workspace: legal requests, external counsel management, approvals, reporting
- LPO marketplace and provider dashboard: work queues, SLAs, QA, billing
- Contract lifecycle management as multi-tenant SaaS: repository, clause library, approvals, e-sign, renewal alerts
- Mediation and arbitration workspaces (requires Mediation Act 2023 conformance review)
- Judgment database with a court-source ingestion adapter
- PF / ESI / labour compliance vertical — the wedge from the original brief, once labour-law professionals are actually on the platform
- International: enable a second `country.is_launched`

---

## Sequencing logic

Discovery before transactions, because a marketplace with no supply is not a marketplace. Claims before practice
areas, because practice areas can only come from the professional. Auth before dashboards, because a dashboard
without auth is a mockup. Compliance sign-off before reviews and payments, because those are the two features that
can generate legal liability from day one.

The dependency worth stating plainly: **almost everything in Phase 2 is gated on authentication**, which is the
single highest-leverage next piece of work.
