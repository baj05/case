# Test plan

## Present — 20 automated tests, all passing

`packages/core/test/intake.test.ts` — search relevance and domain logic, run with `npm test`.

| Group | Cases |
|---|---|
| Plain-language routing | PF dispute in Delhi · "employer hasn't deposited my PF" · "landlord isn't returning my deposit" · Jabalpur High Court (court must not be eaten by the city matcher) · Bombay→Mumbai · Bangalore→Bengaluru · city beats its state |
| Intent extraction | matter type separate from practice area · local-counsel intent · urgency escalation (arrest = emergency, deadline = urgent) · competitive alternatives without inventing them |
| Safety | nonsense query yields nulls, never a confident wrong answer |
| Text | honorific stripping for dedupe · initials preserved in title casing · trigram typo tolerance · FTS operator neutralisation |
| Ranking | weights sum to 100 · **no commercial factor present** · unclaimed-but-relevant profile not buried |
| Advo AI | option chips send machine value not label (regression for a real bug) · urgency grading: inference escalates, explicit answer corrects, custody outranks a deadline |

## Verified manually, end to end

| Journey | Verified |
|---|---|
| Search → filter → profile → book | Real slots, `Asia/Calcutta` explicit, quote snapshotted, **double-booking refused** (`SlotTakenError`), slot consumed 45→44, status transition + event log |
| Claim | Row created, `claim_status` → `claim_pending`, audit entry, match scorer **100/100** on a register-matching email+phone with readable signals |
| Advo AI | 6-turn conversation in the browser → shortlist of real advocates with real fees; all 4 sorts reorder correctly |
| Fee sorting | `fee_asc` → ₹1,500 then ₹2,400; `fee_desc` reverses; `experience_desc` → 18 yrs first |
| Filters | `near=Jabalpur` → 0 (correct); `feemax=₹1,000` → 0 (correct, both are above); `years=20` → 0 (correct, 8 and 18 yrs) |
| Routes | All 200, `/nope` → 404 |
| Health | `status: ok`, 373 professionals, 373 indexed |

## Missing — and this is the honest gap

**No Playwright, no Vitest/Jest, no CI, no visual regression, no axe, no Lighthouse, no load testing.** The 20 tests cover domain logic well and the journeys were driven by hand; there is no automated browser suite to catch a regression.

Priority order to close:

1. **Playwright E2E** — the five journeys above, scripted. Highest value: they are the ones a regression would break silently.
2. **CI pipeline** — install → lint → typecheck → test → build → Docker build → smoke. Fail on any.
3. **axe-core** in CI on the six main routes.
4. **Responsive matrix** at all ten widths (Playwright viewports — replaces the iframe method that `X-Frame-Options` correctly blocked).
5. **Visual regression** screenshots at 390 / 768 / 1440.
6. **Tenant isolation tests** — cannot be written until auth and tenants exist.
7. **Lighthouse budget** in CI.

## Test data policy

`npm run db:demo` marks every seeded row with an audit entry (`demo.configured`) and raises the `DEMO_DATA_SEEDED` flag, which the UI discloses. `--clear` reverts. No synthetic advocate is ever created — only real ingested records receive simulated configuration.
