# REVIEW_TEST_PLAN

What's actually been tested, how, and what's still manual-only or untested. No claim of
coverage that wasn't run.

## Automated — `node scripts/test-review-trust-engine.mjs` (31 assertions, run via `npm test`)

Runs against a real, disposable SQLite database built fresh from the actual migration files
(never the live `data/lexhall.db`) — real repository functions, no mocks.

| Area | What's checked |
|---|---|
| Auth | User creation, wrong-password rejection, correct-password acceptance, session round-trip |
| Eligibility | A completed booking surfaces as reviewable; a non-existent interaction is rejected |
| One-per-experience | A second review on the same booking is rejected (both by the DB constraint and application logic) |
| Fraud scoring | A single short review stays `pending` (not silently published); 4 low-effort reviews from one account in one day auto-flag the 4th |
| Privacy filter | A review containing a phone number and a case-number-like string routes to `in_review`, overriding the fraud tier |
| Moderation | Publish moves a review out of the pending queue; a published review no longer appears in `pending` |
| Sample-size banding | 1 review → `insufficientSample: true`; 10 published reviews → `band: 'established'` with a full dimension breakdown |
| Distributions | Star distribution percentages sum to 100; satisfaction distribution has exactly 5 levels |
| Themes | A phrase repeated across ≥3 reviews is surfaced as a theme |
| Recommend % | Excludes "maybe" from the denominator (confirmed a value strictly between 0 and 100 when "maybe" responses exist) |
| Display masking | Pseudonymous mode shows first name + last initial, never the full name |
| Interaction features | Helpful vote is counted; a professional's published response is attached to the review |
| Edit history | Editing a review writes the prior text to `review_edit_history` before changing the live row; a previously-published review returns to `pending` after edit |
| Reporting | A report on a published review sends it to `in_review` |
| Withdraw | Only the original author can withdraw their own review |
| Organisation reviews | A reviewer whose account email domain matches the organisation's verified domain gets `basis = 'verified_engagement'`; a non-matching reviewer gets `unverified`; the public listing shows the correct `verified` flag and correctly masks an anonymous reviewer's name |

## Manual — verified live in the browser this session

| Journey | Steps | Result |
|---|---|---|
| Guard | Signed-out request to `/dashboard` | Redirected to `/login?next=/dashboard` |
| Login | Real credentials via the actual form | Redirected to `/dashboard`, session cookie set (httpOnly — confirmed invisible to `document.cookie`) |
| Admin access | Same session, navigate to `/admin` | Loads (not redirected) — `platform_admin` role check passes |
| Review submission (advocate) | Signed in, completed booking, `/advocates/[slug]/review` → fill form → submit | Redirected to `/advocates/[slug]?reviewed=1`; row confirmed in `pending` queue with correct `basis` |
| Moderation | `/admin/reviews` → Publish | Review disappears from `pending`, appears on the public profile |
| Public display | `/advocates/[slug]#reviews` | Sample-size protection, pseudonymous masking, verified badge all rendered correctly |
| Established-band profile | `/advocates/demo-meera-kapoor` (13 published reviews) | Full "Legal Trust & Experience" section: 4.2/5, "Very good experience", 100% recommend, dimension breakdown, star + satisfaction distribution bars, "what people mention" theme chips |
| New-band profile | `/advocates/demo-aditya-rao` (1 review) | "New profile — 1 experience shared so far, too few yet for a reliable score" — no numeric average shown |
| None-band profile | `/advocates/demo-simran-kaur` (0 reviews) | "No experiences shared yet — be the first to share yours" — never "0.0 ★" |
| Firm profile | `/firms/demo-northbridge-legal-chambers` | Same review section renders for an organisation; verified vs. unverified badges correctly differ by reviewer's email domain |
| Search integration | `/search?q=Meera Kapoor` | Result card shows "Client rated · 4.2 · 13 experiences" alongside experience/fee/availability — confirmed via DOM read after the streaming skeleton resolved |
| Moderation queue realism | `/admin/reviews?status=pending` | 7 real, varied pending reviews shown with reviewer type, basis, and low-risk tag — not all identical boilerplate |

## Not tested this pass

- **Playwright/E2E automation** of the above journeys — everything above was driven manually
  through the Browser tool this session, not captured as a repeatable Playwright spec. Writing
  that spec is real, scoped follow-up work, not done here.
- **Responsive breakpoints** (320/375/768/1024/1440) for the new review UI specifically — the
  page inherits the site's existing responsive card/grid classes, but the star/satisfaction
  distribution bars and theme chips were not individually checked at each width.
- **Accessibility** of the rating radio inputs and distribution bars — no screen-reader pass was
  done on the new components specifically.
- **Load/pagination behaviour** beyond 20 reviews — `listReviewsForProfessional`/`Organisation`
  accept `limit`/`offset`, but no profile in the demo dataset has more than 20 published reviews,
  so "load more" was never exercised against real pagination.
- **Lawyer dashboard "new review" / "respond" journey** as a signed-in professional distinct from
  a `platform_admin` — the demo walkthrough used the bootstrap admin account for both moderation
  and (where shown) responses, because no flow currently links a claimed professional profile to
  an `app_user` account (see `docs/BOSS_REQUIREMENTS_AUDIT.md`).
- **Multi-account concurrent voting/reporting** (race conditions on `review_vote`'s unique
  constraint) — plausible correctness by construction (an `ON CONFLICT` upsert), not stress-tested.
