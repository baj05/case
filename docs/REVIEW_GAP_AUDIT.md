# REVIEW_GAP_AUDIT

Traced against the actual code, not assumed from a filename existing. Written before making any
change in this pass, so the "before" column stays honest even after the fixes below land.

| # | Question | Before this pass | Evidence |
|---|---|---|---|
| 1 | Does a review database model exist? | ✅ Yes, and thoroughly | `review`, `review_response`, `review_edit_history`, `review_vote`, `content_report` in `packages/db/sql/003_platform.sql` + `009_review_trust_engine.sql` + `011_review_organisation_support.sql` |
| 2 | Does an API exist? | ✅ Yes, as Next.js Server Actions (not REST) | `apps/web/app/actions.ts`: `submitReviewAction`, `submitOrganisationReviewAction`, `editReviewAction`, `withdrawReviewAction`, `respondToReviewAction`, `voteReviewHelpfulAction`, `reportReviewAction`, `moderateReviewAction`. This project has no separate `api/` REST layer anywhere — every mutation in the app goes through a Server Action, so a parallel `POST /reviews` route would be an inconsistent second pattern, not a gap |
| 3 | Does a review component exist? | ✅ Yes | `ReviewSection.tsx`, `ReviewForm.tsx`, `OrgReviewForm.tsx`, `ReviewActions.tsx`, `ModerateReviewForm.tsx` |
| 4 | Does the advocate profile display reviews? | ✅ Yes | `/advocates/[slug]` renders `<ReviewSection>` when `FEATURE_REVIEWS` is on |
| 5 | Does the navigation expose reviews? | ❌ **No — this was the real gap** | `Header.tsx`'s `NAV` array had four items, none of them Reviews. A first-time visitor had no way to discover the feature short of already being on an advocate profile and scrolling to it |
| 6 | Can a normal (signed-out) visitor submit a review? | ⚠️ By design, no | `submitReviewAction` requires `currentUser()` — a review needs an accountable author even when displayed anonymously (§9/§21 of the brief: "do not promise absolute anonymity," identity always retained internally) |
| 7 | Can an anonymous visitor submit a review? | ⚠️ Same as above — "anonymous" is a *display* choice, not a signed-out submission | This is deliberate, not a bug: allowing fully unauthenticated submission removes every fraud/abuse control at once |
| 8 | Can a verified user submit a review? | ✅ Yes | `createReview` checks the bound `booking`/`consultation_request` belongs to the author and is `completed` before allowing it |
| 9 | Can a lawyer respond? | ✅ Yes (currently gated to `platform_admin` in the UI, not to "the specific professional") | `respondToReview` has no ownership check baked in — the UI (`RespondToReviewForm`) only renders for `isAdmin`. No professional-side login currently links a claimed profile to an `app_user` account (see `BOSS_REQUIREMENTS_AUDIT.md`), so "the professional responds" isn't reachable by an actual professional yet, only by an admin acting on their behalf |
| 10 | Can users report reviews? | ✅ Yes | `reportReviewAction` → `reportReview` → `content_report`, and it force-moves a published review to `in_review` |
| 11 | Is there review moderation? | ✅ Yes | `/admin/reviews`, `listModerationQueue`, `moderateReview` |
| 12 | Is there review aggregation? | ✅ Yes | `getProfessionalReviewSummary`/`getOrganisationReviewSummary` — averages, star distribution, satisfaction distribution, recommend % |
| 13 | Is there satisfaction scoring? | ✅ Yes | `overall_satisfaction` rating + the five-level satisfaction distribution bars |
| 14 | Are reviews connected to advocates? | ✅ Yes | `review.professional_id` |
| 15 | Are reviews connected to firms? | ✅ Yes | `review.organisation_id` (added last pass, migration 011) |
| 16 | Are reviews connected to LPOs? | ✅ Yes | Same column — `organisation.kind = 'lpo'` |
| 17 | Is there dummy review data? | ✅ Yes, but modest | `packages/db/scripts/seed-review-demo.ts` — 10 advocates, 6 organisations, ~75 reviews. Expanded this pass (see below) |
| 18 | Is there an admin review queue? | ✅ Yes | `/admin/reviews` |

## The actual root cause of "not sufficiently visible"

Everything from Q1–Q18 above was already real and connected. The product-surface gap was
specifically: **no top-level navigation entry, no discovery hub, no homepage mention, and no
separate site-feedback ("Rate CaseADVO") system at all.** A user landing on the homepage had no
path to "Reviews" that didn't require already knowing an advocate's profile URL. That is a
genuine, valid gap — fixed in this pass, described in `REVIEW_SYSTEM_TEST_REPORT.md`.

## What this pass adds

1. `Reviews` in the main navigation (`Header.tsx`), linking to a new `/reviews` hub.
2. `/reviews` — hub page: hero, professional search, category cards (advocate/firm/LPO/verified/
   anonymous), "Write a Review" and "Rate CaseADVO" CTAs.
3. A homepage discovery section ("See what people are saying") linking to the hub.
4. A genuinely separate site-feedback system (`site_feedback` table, `/rate-us` page, admin view)
   — never mixed with advocate/firm/LPO reviews, per the brief's explicit instruction that these
   are two different products with two different datasets.
5. Expanded dummy data (see `REVIEW_SYSTEM_TEST_REPORT.md` for the new counts).
