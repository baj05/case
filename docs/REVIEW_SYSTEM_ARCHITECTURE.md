# REVIEW_SYSTEM_ARCHITECTURE

The Review Trust Engine's actual shape in this codebase — files, tables, and how data flows
through them. Companion to `REVIEW_SCORING_METHODOLOGY.md` (the math) and
`REVIEW_COMPLIANCE_MATRIX.md` (the legal gating).

## Files

| Layer | File | Responsibility |
|---|---|---|
| Schema | `packages/db/sql/003_platform.sql` | Original `review`/`review_response`/`content_report` tables — verified-interaction binding, moderation states, right of reply |
| Schema | `packages/db/sql/009_review_trust_engine.sql` | `would_recommend`, `overall_satisfaction`, `reviewer_type`, `experience_category`, `review_edit_history`, `review_vote`, one-review-per-experience partial unique indexes |
| Schema | `packages/db/sql/010_review_booking_link.sql` | Links `review` to the real, live `booking` table (fee-based bookings), not only the enquiry-only `consultation_request` |
| Schema | `packages/db/sql/011_review_organisation_support.sql` | Rebuilds `review` so `professional_id` is nullable and `organisation_id` is added — a review attaches to exactly one of the two (`CHECK` constraint) |
| Data access | `packages/db/src/repositories/reviews.ts` | Every read/write: `createReview`, `createOrganisationReview`, `editReview`, `withdrawReview`, `respondToReview`, `voteHelpful`, `reportReview`, `listModerationQueue`, `moderateReview`, `listReviewsForProfessional`/`listReviewsForOrganisation`, `getProfessionalReviewSummary`/`getOrganisationReviewSummary` |
| Data access | `packages/db/src/repositories/organisations.ts` | Minimal firm/LPO listing and lookup by slug |
| Data access | `packages/db/src/repositories/auth.ts` | Scrypt password hashing, session issuance/lookup, account lockout — the review engine requires an authenticated `author_user_id` for every review |
| App boundary | `apps/web/lib/data.ts` | Server-only cached wrappers (`getReviewSummary`, `getReviews`, `getOrgReviewSummary`, `getOrgReviews`, `getModerationQueue`, `getEligibleExperiences`) |
| App boundary | `apps/web/lib/auth.ts` | Session cookie read/write, `currentUser()`, `requireUser()` route guard |
| Server actions | `apps/web/app/actions.ts` | `submitReviewAction`, `submitOrganisationReviewAction`, `editReviewAction`, `withdrawReviewAction`, `respondToReviewAction`, `voteReviewHelpfulAction`, `reportReviewAction`, `moderateReviewAction` — every one re-derives the actor from the session cookie, never from a hidden form field |
| UI | `apps/web/components/ReviewSection.tsx` | The "Legal Trust & Experience" display — shared by advocate and organisation profiles |
| UI | `apps/web/components/ReviewForm.tsx` / `OrgReviewForm.tsx` | Submission forms (advocate flow is eligibility-gated to a real completed interaction; organisation flow is open to any signed-in user, with verification computed server-side from email domain) |
| UI | `apps/web/components/ReviewActions.tsx` / `ModerateReviewForm.tsx` | Helpful vote, report, respond, and the admin publish/reject/send-to-review controls |
| Routes | `/advocates/[slug]`, `/advocates/[slug]/review`, `/firms`, `/firms/[slug]`, `/firms/[slug]/review`, `/lpo`, `/lpo/[slug]`, `/lpo/[slug]/review`, `/admin/reviews`, `/trust/reviews` | The actual pages a user reaches |

## Entity relationships

```
app_user ──< session
   │
   ├──< booking ─────────┐
   ├──< consultation_request ┤
   ├──< appointment ─────┤
   ├──< matter_participant ┤    (exactly one of these per review)
   │                      ▼
   └──< review ───────────┴──> professional   (nullable — exactly one of these two)
          │                └──> organisation
          ├──< review_edit_history   (every edit's prior text, retained)
          ├──< review_vote           (helpful / not helpful, one per user)
          ├──< review_response ──> app_user (the professional's reply)
          └──< content_report        (reports, generic across review/professional/etc.)
```

## Request flow — submitting a review (advocate)

1. `GET /advocates/[slug]/review` → `requireUser()` redirects to `/login` if signed out →
   `getEligibleExperiences(userId, professionalId)` queries `booking`/`consultation_request` for
   completed interactions with no existing review by this user → renders `ReviewForm` with those
   choices (or an honest "no verified experience found" notice if there are none).
2. Form submits to `submitReviewAction` (a Next.js Server Action, not a client-side fetch to a
   hand-rolled API route) → re-validates the actor from the session cookie → calls `createReview`.
3. `createReview` re-checks ownership and completion status of the bound interaction inside a
   transaction, computes `basis`, runs `assessFraudRisk` and `detectPrivacyRisk`, inserts the row
   with `moderation_status` set by that assessment (`pending` / `auto_flagged` / `in_review`), and
   returns.
4. Nothing is visible on the public profile yet — `listReviewsForProfessional` only ever selects
   `moderation_status = 'published'`.

## Request flow — moderation

1. `GET /admin/reviews?status=pending` → `requireUser('platform_admin')` → `listModerationQueue`
   joins `professional`/`organisation` and `app_user`, decodes the internal `trust_signals` JSON.
2. Admin clicks Publish/Reject/Send to human review → `moderateReviewAction` (Server Action) →
   `moderateReview` updates `moderation_status`, `moderated_by_user_id`, `moderated_at` and revalidates
   the page.
3. Only now does the review become selectable by `listReviewsForProfessional`/`Organisation`.

## Why organisations needed a schema rebuild, not just a new column

SQLite has no `ALTER TABLE ... ALTER COLUMN` to relax a `NOT NULL` constraint. Migration 011
creates `review_new` with the relaxed shape, copies every row, drops the old table, and renames —
inside a single migration file, applied additively like every other migration (the runner in
`packages/db/src/client.ts` tracks applied files in `schema_migration` and never re-runs one). At
the time this ran, the live `review` table had zero rows (reviews are still flag-gated for
production), so this was a safe, empty-table rebuild — the same technique on a populated table
would need a maintenance window and a backup, which is a real operational note for whoever
eventually runs this migration against a database with production review data in it.

## Deliberately out of scope for this pass

- No booking/consultation model exists for organisations, so a firm/LPO review can only be
  "verified" via matching email domain — a weaker signal than a completed-booking check, and the
  UI must never blur that distinction (see `REVIEW_COMPLIANCE_MATRIX.md` R-controls table).
- No team-roster or service-listing page for firms/LPOs — `OrganisationProfile` shows only the
  review section, which is exactly the scope this pass targeted.
- No notification system (§37/§40/§41 of the brief) — a review submitted, published or responded
  to does not currently trigger an email or in-app alert to anyone.
