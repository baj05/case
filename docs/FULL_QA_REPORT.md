# FULL_QA_REPORT

A full manual test + automated review pass across everything built this session (the Review
Trust Engine, "Legal Trust & Experience" rebrand, Reviews Hub, "Rate CaseADVO" platform feedback),
run against the live site at `localhost:3000`, with every real bug found actually fixed, not just
listed. Requested tools and what happened with each are below.

## What was run

| Requested | Ran? | Result |
|---|---|---|
| `/code-review` | ✅ | 8 parallel finder angles (correctness ×3, reuse, simplification, efficiency, altitude, CLAUDE.md conventions) over `HEAD~2..HEAD`, each independently verified. 10 findings reported — see below. |
| `/web-design-guidelines` | ✅ | Fetched the current Vercel Web Interface Guidelines checklist, applied to every new file this session. 1 real violation found and fixed (missing `<label>`); a couple of minor style nits noted, not fixed. |
| `/ultrareview` | ❌ N/A | **This skill does not exist** — checked directly (`Unknown skill: ultrareview`). Not a typo I could resolve; flagging rather than silently skipping. |
| `/skill-improver` | ❌ N/A | This skill improves Claude Code `SKILL.md` skill-definition files. This repository has none (`find . -iname "SKILL.md"` returns nothing) — it's a web app, not a skills package. Not applicable, not run. |
| `/webapp-testing` | ✅ (via equivalent tooling) | The skill's own instructions are a Python-Playwright pattern; this session already had an equivalent Chromium-driven browser (MCP `Claude_Browser`) attached to the running dev server, so the same reconnaissance-then-action testing was done directly with that instead of spinning up a redundant second automation stack. Same outcome: screenshots, DOM inspection, real clicks/submits, console/network checks. |
| Manual testing of all site changes | ✅ | Every route from this session and the one before it, both desktop and 375px mobile, console errors, and four real user journeys executed live (not just described) — see below. |

## Bugs found and fixed (7)

All confirmed independently by 2–3 of the 8 review agents, then verified by me clicking through
the actual broken and then fixed behavior in the browser, plus 6 new automated test assertions.

| # | Bug | Where | Impact |
|---|---|---|---|
| 1 | `/reviews` hub's recent-experience feed linked every organisation review to `/firms/<slug>`, even LPO providers | `packages/db/src/repositories/reviews.ts` (`listRecentReviewsAcrossPlatform`) | Clicking through to any LPO's review from the hub feed **404'd** |
| 2 | Admin moderation queue hardcoded the same `/advocates/<slug>` link for every review | `apps/web/app/admin/reviews/page.tsx` | A moderator clicking a firm/LPO review in the queue **404'd** |
| 3 | The fraud duplicate-text check queried `professional_id` for organisation reviews too | `packages/db/src/repositories/reviews.ts` (`assessFraudRisk`) | Copy-pasted spam text against a law firm would **never trip** the duplicate-text signal; could also false-positive against an unrelated advocate sharing the same numeric id |
| 4 | Organisation reviews had **no cap at all** on reviews-per-author | `packages/db/src/repositories/reviews.ts` (`createOrganisationReview`) | One account could submit unlimited reviews for the same firm, each counted separately in every published aggregate |
| 5 | The "Verified experience" badge was identical whether verification came from a completed booking or just a matching email domain | `apps/web/components/ReviewSection.tsx` | Misrepresents how strong the verification actually is — the code's own comment said this must not happen, and it was still happening |
| 6 | `revalidatePath` in edit/withdraw/respond/vote/report actions hardcoded `/advocates/<slug>` | `apps/web/app/actions.ts` | Currently masked by `force-dynamic`, but a latent bug that resurfaces the moment any review page stops being force-dynamic |
| 7 | `RatingRadios` (5-star row) independently copy-pasted into 3 separate form components | `ReviewForm.tsx` / `OrgReviewForm.tsx` / `SiteFeedbackForm.tsx` | Maintenance risk — a future fix to the rating control could miss 2 of 3 copies |

**Also fixed** (design-guidelines pass): the `/reviews` hub's search input had no `<label>` or
`aria-label` — a screen-reader user couldn't tell what it was for. Added a visually-hidden label.

## Real findings identified but deliberately left unfixed (3)

Lower severity than the correctness bugs above, and each is either a larger refactor or a
performance optimization rather than a broken behavior — reported honestly rather than either
silently dropped or padded into fake "fixes":

- **`apps/web/app/firms/page.tsx` and `apps/web/app/lpo/page.tsx`** duplicate identical listing-card
  markup (unlike the `[slug]` pages one level down, which correctly share `OrganisationProfile`).
- **`apps/web/app/firms/[slug]/review/page.tsx` and `apps/web/app/lpo/[slug]/review/page.tsx`** are
  byte-for-byte duplicate page bodies, differing only in a `basePath` string.
- **`ResultCard.tsx`, `firms/page.tsx`, `lpo/page.tsx`** each call a per-row review-summary query in
  a loop (N+1) with no batched alternative — real, but requires a new
  `getReviewSummariesFor(ids[])` function, a larger change than a QA-pass fix.

## Manual test results

**Every route resolves** (checked via direct HTTP fetch against the running server):

```
200  /  /search  /reviews  /rate-us  /trust/reviews  /firms  /lpo
200  /firms/demo-northbridge-legal-chambers  /lpo/demo-bellweather-lpo-services
200  /advocates/demo-meera-kapoor  /advocates/demo-simran-kaur  /advocates/demo-aditya-rao
200  /login  /signup  /resources  /matters  /judges  /courts  /bar-councils
200  /for-professionals  /how-it-works  /data-sources  /credits  /legal/privacy  /legal/terms
307  /dashboard  /admin  /admin/reviews  /admin/site-feedback   (correct — auth redirect when signed out)
```

**Mobile (375px)** — checked `scrollWidth === clientWidth` (no horizontal overflow) on: homepage,
`/reviews`, `/rate-us`, an advocate profile (established band, full Legal Trust & Experience UI),
an LPO profile, admin reviews, admin site-feedback. All clean. The mobile nav drawer correctly
lists "Reviews" as its second item.

**One pre-existing, unrelated mobile bug was found and left unfixed**: `/search`'s sort-and-apply
control bar overflows at 375px. Last touched in commit `9a364a7`, well before this session — out
of scope for a review-system QA pass, flagged rather than silently ignored.

**Console errors**: none on any page checked.

**Live journeys actually executed** (not just read from code):

1. **Search → advocate card shows review badge → advocate profile → Legal Trust & Experience
   section** — confirmed "Client rated · 4.1 · 12 experiences" on the search card, full
   distribution/theme UI on the profile.
2. **`/reviews` hub → recent-experience feed → click through to an LPO review's subject** —
   confirmed it now lands on `/lpo/demo-bellweather-lpo-services` (previously would have 404'd at
   `/firms/...`).
3. **`/rate-us` → fill and submit real feedback → confirm in `/admin/site-feedback`** — submitted
   real ratings (website 4, search 5, recommend 9, comment about court-filter gaps), confirmed the
   row and its computed aggregates (4.5 average, 100% NPS on 1 response) appeared correctly on the
   actual admin page after signing in.
4. **Verified-badge distinction, live**: an LPO's reviews show **"Verified — company domain"**;
   an advocate's reviews show **"Verified experience"** — confirmed by reading the actual rendered
   chip text on both page types after the fix.

## What this report does NOT claim

- It does not claim full accessibility compliance — only the specific guideline checklist items
  were checked against the files touched this session, not a full WCAG audit.
- It does not claim the 3 unfixed findings are unimportant forever, only that they're lower
  priority than the 7 correctness bugs and were reported rather than silently fixed or dropped.
- It does not claim Docker/production parity — the Docker daemon was not running during this pass;
  everything above was verified against the local dev server only.
