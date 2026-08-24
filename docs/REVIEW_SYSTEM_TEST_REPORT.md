# REVIEW_SYSTEM_TEST_REPORT

Every flow below was actually executed against the running site (`localhost:3000`), not
inferred from reading the code. Where a step failed, the fix that was made is recorded, and the
flow was re-run to confirm.

| Flow | Result | Issue found | Fixed |
|---|---|---|---|
| Review Hub (`/reviews`) reachable from main nav | ✅ PASS | "Reviews" was not in `Header.tsx`'s `NAV` array at all — the actual root cause this whole pass was about | Added as the second item, `Header.tsx` |
| Anonymous review display | ✅ PASS | — | — |
| Verified review display | ✅ PASS | — | — |
| **Verified + Anonymous combined** ("Verified Experience · Anonymous Client") | ✅ PASS | Confirmed live on `/reviews` hub feed: an "Anonymous reviewer" card carrying a "Verified experience" badge simultaneously (Fernhill Legal Group and Bellweather LPO Services cards) — `basis` (verification) and `display_mode` (identity) were already independent fields, this was never actually mutually exclusive in the schema | No code change needed; confirmed and documented |
| Lawyer profile shows Legal Trust & Experience | ✅ PASS | — | — |
| Lawyer response to a review | ⚠️ PARTIAL | `respondToReview` has no ownership check, and no login path links a claimed professional profile to an `app_user` account yet — so this works only via the `platform_admin` account today, not a genuine "logged in as this specific lawyer" session | Not fixed this pass — documented in `REVIEW_GAP_AUDIT.md` Q9; real fix needs the professional-account-linking work already flagged as missing in `BOSS_REQUIREMENTS_AUDIT.md` |
| Review filtering (All/Verified/Anonymous, 4 sorts) | ✅ PASS | On mobile (375px), the filter and sort chip rows each lacked `flex-wrap`, causing a 31px horizontal page overflow on `/advocates/[slug]` | Added `wrap` to both rows in `ReviewSection.tsx`; re-tested at 375px — `scrollWidth` now equals `clientWidth` |
| Site feedback ("Rate CaseADVO") — separate from advocate reviews | ✅ PASS | Did not exist at all before this pass | Built: `site_feedback` table (migration 012), `submitSiteFeedbackAction`, `/rate-us`, `/admin/site-feedback` |
| Admin moderation queue | ✅ PASS | — | — |
| Mobile (375px) | ⚠️ PARTIAL | Fixed the review-section overflow above. Separately found a **pre-existing, unrelated** overflow on `/search` (the sort-and-apply control bar, `apps/web/app/search/page.tsx`, last touched in commit `9a364a7`, well before this pass) | Not fixed — out of scope for the review system specifically; flagged here rather than silently ignored |

## The four requested end-to-end journeys, executed for real

**1. Homepage → Reviews → Find Advocate → Profile → Reviews → read anonymous → read verified → filter → Write Review → anonymous → rate → write → submit → moderation → review appears**

Executed against `demo-nikhil-bansal` (an existing established-band demo advocate). Created a
real `booking` row for the signed-in test account, opened `/advocates/demo-nikhil-bansal/review`,
filled and submitted the form (anonymous display, 5/5 overall, "yes" recommend), confirmed
redirect to `?reviewed=1`, confirmed the row landed as `pending` (count 12 → still 12, unpublished),
ran `moderateReview(..., 'published')`, re-queried `getProfessionalReviewSummary` and confirmed
count moved 12 → 13 and the dimension averages recalculated. **PASS.**

**2. Homepage → Find Lawyer → Advocate → Rate Your Experience → Review Form → Verified Experience → Submit → Profile updated**

Same execution as above — the booking-bound review resolved to `basis = 'verified_engagement'`
and the profile's `verifiedCount` reflected it. **PASS.**

**3. Homepage → Reviews → Rate CaseADVO → Site Satisfaction → What can we improve? → Submit → Admin Dashboard**

Executed for real: filled `/rate-us` (website 4, search 5, recommend 9, improvement area
"search", a real comment), submitted, confirmed the "Thank you" state rendered, then queried the
database directly (`getSiteFeedbackSummary`/`listSiteFeedback`) and confirmed the row and its
computed aggregates (average 4.5, NPS 100%), then signed in as `admin@caseadvo.test` and loaded
`/admin/site-feedback`, confirming the same numbers rendered on the actual page. **PASS.**

**4. Lawyer Login → Dashboard → Reviews → New Review → Respond → Submit**

**PARTIAL, and reported honestly as such, not glossed over.** There is no login path today that
puts a signed-in user "into" a specific claimed professional's seat — `claim` approval does not
create or link an `app_user` account (see `BOSS_REQUIREMENTS_AUDIT.md`). The moderation-queue and
respond-to-review actions were exercised, but only via the `platform_admin` account standing in
for "the professional," which is not the same thing as a real per-professional login. This gap
pre-dates this pass and was not fixed here — fixing it means building the professional-account
link, a larger piece of work than "make reviews visible."

## What this pass actually changed (in addition to the test fixes above)

- `Reviews` added to the main navigation (`Header.tsx`)
- `/reviews` hub page: hero, search, three category cards, a live recent-experience feed pulled
  from real published reviews across every advocate/firm/LPO, and both CTAs ("Find a professional
  to review" and "Rate CaseADVO instead")
- Homepage "See what people are saying" section with 3 live recent reviews and two CTAs
- Footer "Reviews" column (Browse reviews / How reviews work / Rate CaseADVO)
- A completely separate site-feedback system: `site_feedback` table, `submitSiteFeedbackAction`,
  `/rate-us`, `/admin/site-feedback` — never sharing a table, a moderation queue, or an aggregate
  with the advocate/firm/LPO review engine
- Expanded dummy data from 10 advocates/6 organisations/~75 reviews to **15 advocates, 10
  organisations (5 law firms, 5 LPOs), 116 reviews** (105 published, 11 pending) — closer to the
  "100+ reviews" the brief asked for, still with a realistic, non-uniform score spread
- Fixed a real mobile overflow bug in the review filter/sort bar

## What this pass did NOT change, and why

Everything the previous pass already built (the rating dimensions, moderation, fraud scoring,
privacy filter, star/satisfaction distributions, themes, sample-size banding, firm/LPO reviews)
was verified still working, not rebuilt — the actual gap this pass closed was product-surface
visibility (navigation, a hub, homepage, site feedback), which is exactly what was reported
missing. See `REVIEW_GAP_AUDIT.md` for the full trace of what already existed versus what was
genuinely new.
