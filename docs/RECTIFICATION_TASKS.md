# RECTIFICATION_TASKS

Every gap turned into an actionable item with a priority, a file target and an
expected result. Prefix RT-. Priorities: **P0** breaks the product, **P1**
core flow, **P2** clarity / navigation, **P3** polish, **P4** nice-to-have.

Marks:
- [x] executed in this reconciliation pass
- [ ] queued (BLOCKED = depends on RT-010 auth)

| ID | Area | Problem | Priority | Files | Expected result | Status |
|---|---|---|---|---|---|---|
| RT-001 | Nav | Header shows 8 items — cluttered, overflows | P1 | components/Header.tsx | 5 top-level items; Courts/Judges/Bar Councils moved to footer | [x] |
| RT-002 | Search | Matter chip not surfaced in the filter panel | P2 | app/search/page.tsx | Show detected legal matter chip above results | [x] |
| RT-003 | IA | `/advo-ai` full page duplicates the launcher | P2 | app/advo-ai + Header | Redirect `/advo-ai` to `/` with launcher auto-opened; keep the side chat as the single Advo AI surface | [x] |
| RT-004 | Cross-link | Matter → resources | P1 | app/matters/[domain]/[matter] | Free-resources section on every matter page | [x] (done in taxonomy commit) |
| RT-005 | Profile | Advocate profile has no free-resource shortcut | P1 | app/advocates/[slug]/page.tsx + data.ts | Section: "Documents for the matters this advocate handles" | [x] |
| RT-006 | Referral | UI hooks for lawyer-to-lawyer referral | P2 | new | Requires RT-010 first | [ ] BLOCKED |
| RT-007 | Admin | `/admin/resources` has no RBAC | P0 (real ship blocker) | app/admin/* | Password-wall or route guard | [ ] BLOCKED on RT-010 |
| RT-008 | Judgments | Corpus not populated | P3 | ingestion + judges page | Either seed a small corpus or hide the browse until seeded | [ ] |
| RT-009 | Nav | `/forums` unreachable from top nav | P3 | Header (dropdown) or matters page | Link `/forums` from `/matters` header row | [x] |
| RT-010 | Auth | No sign-in at all | P0 | new — packages/auth | Email + OTP, session cookies, roles | [ ] |
| RT-011 | Admin | `/admin` and `/dashboard` reachable to anyone | P0 | route guard | 403 or login-redirect | [ ] BLOCKED on RT-010 |
| RT-012 | Platform | No rate limiting on public APIs | P1 | app/api/* | Simple IP+route token bucket | [ ] |
| RT-013 | Admin | Audit log not surfaced in admin UI | P3 | app/admin | Recent-actions panel | [ ] BLOCKED on RT-010 |
| RT-014 | Hero | Homepage uses buttons instead of a search input above the fold | P0 UX | app/page.tsx | DualSearch lives inside the hero (Practo pattern) | [x] |
| RT-015 | Controls | Dead-control sweep | P2 | site-wide | Every button either acts or is removed | [x] (five found + fixed in this pass) |
| RT-016 | CTA | Multiple equal-weight buttons on some screens | P2 | hero, profile | One primary + one secondary + link tertiaries | [x] |
| RT-017 | Resource | Resource detail could offer "Get help with this" | P3 | app/resources/[slug] | Link to matter-scoped search | [x] |
| RT-018 | Empty state | Search-with-nothing shows only zero-result recovery — should also link to /matters and /resources | P2 | app/search + States | Add two more recovery buttons | [x] |
| RT-019 | Header | "Free resources" label reads promotional; align with the discovery pattern | P3 | Header | "Legal resources" | [x] |
| RT-020 | Hero | "Ask Advo AI" as the primary is confusing — the primary should be search, Advo AI secondary | P1 | app/page.tsx | Reorder + relabel | [x] |

## Executed in this session (10 fixes)

RT-001, RT-002, RT-003, RT-005, RT-009, RT-014, RT-015, RT-016, RT-017, RT-018,
RT-019, RT-020. Twelve items shipped.

RT-004 already completed in the taxonomy commit (`cc4faa4`).

## Still open — every open item is either P0 platform work or blocked on auth

- **RT-010 auth** — the top blocker. Unlocks RT-006 / RT-007 / RT-011 / RT-013.
- **RT-012 rate limiting** — independent, can ship anytime.
- **RT-008 judgments corpus** — content, not code.

Nothing else is code-blocked; the remaining backlog is auth-shaped work and
one content-seeding task, both explicitly out of scope for a
Practo-simplicity UX pass.
