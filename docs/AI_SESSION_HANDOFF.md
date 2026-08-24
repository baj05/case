# AI Session Handoff — CaseADVO

**What this file is:** a chronological, prompt-by-prompt log of everything asked for and everything built on this project, written so that a *brand-new* AI session (no memory of any of this) can read it top to bottom and pick up exactly where the last one left off — without the user having to re-explain anything.

**Last updated:** 2026-08-24
**Covers:** 2026-08-18 (project start) → 2026-08-24 (this entry)

---

## 0. Rules for whichever AI reads this next

These are not suggestions — treat them as load-bearing:

1. **Every entry below ends with a "📌 Continuity Note."** That block is compulsory — every single prompt/output pair in this log has one, no exceptions. If you (the next AI) add new entries to this file later, you must add a Continuity Note to each one too. It's the part of the entry that's actually useful to a future reader — the raw prompt/output is the record, the note is the *meaning*.
2. **This file is a memory aid, not ground truth.** Before acting on anything below — a file path, a function name, a flag, a "this is still broken" — verify it against the actual current code. Things drift. A memory that says X exists is a claim that it existed *when this was written*, not proof it exists now.
3. **Fidelity gradient — read this before trusting any given entry's "User Prompt" field:**
   - Entries dated **2026-08-24 13:53 onward** are **verbatim** — copied exactly from the real conversation, typos and all.
   - Entries dated **2026-08-21 17:46 → 18:52** are **near-verbatim**, reconstructed from a detailed session summary that itself preserved several prompts word-for-word (marked where it does).
   - Entries dated **2026-08-18 → 2026-08-21 16:38** have **no retained prompt text at all** — only the git commit history survives. Their "User Prompt" field is honestly marked `[not retained]` and the entry is built from the commit message + a reconstructed guess at intent. Do not quote these as if they were the user's real words.
4. **Don't re-do finished work.** Check the "Current State" section (§1) and the git log before assuming something is still open.
5. **The user's writing style is dense, run-on, and typo-heavy, with commands stacked in one paragraph.** Read slowly and parse into a checklist before acting — this has repeatedly caused missed sub-requirements when skimmed. Ask a clarifying question via a real question tool when a requirement is genuinely ambiguous (this has happened, e.g., over public contact info on reviews, over a pasted logo image with no file path) — the user answers these directly and appreciates being asked rather than guessed at.
6. **The user gets sharp and direct when a change isn't visible on the Docker container (`localhost:3100`), even if it works on the dev server (`localhost:3000`).** Testing on `:3000` alone is not "done." See §1 for the exact redeploy sequence — run it before declaring anything finished.

---

## 1. Current State (as of 2026-08-24 16:44, commit `4847cfd`)

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · `node:sqlite` · npm workspaces (`apps/web`, `packages/db`, `packages/core`, `packages/ingestion`).

**Brand:** CaseADVO (renamed from "Lexhall" on 2026-08-20, commit `da2067b`). Single source of truth: `apps/web/lib/brand.ts`.

**Run it:**
```bash
npm run dev              # localhost:3000
npm run -s typecheck
npm run -s test           # core unit tests + scripts/test-review-trust-engine.mjs (48 assertions as of this writing)
npm run -s ci             # typecheck && test && build
```

**Docker (separate database from the dev server — always redeploy after a code change, this has been a recurring friction point):**
```bash
docker build -t lexhall/web:local .
docker rm -f lexhall-web
docker run -d --name lexhall-web -p 3100:3000 \
  -v lawfirmproto_lexhall_data:/app/data \
  -e DATABASE_PATH=/app/data/lexhall.db \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  lexhall/web:local
curl -s http://localhost:3100/api/health   # confirm before declaring anything "live"
```
The container's data volume (`lawfirmproto_lexhall_data`) is entirely separate from local `data/lexhall.db`. Migrations auto-apply on container boot via `docker-entrypoint.sh`. If you re-seed inside the container after a volume already has data, use `--clear` on the seed script first or you'll hit `UNIQUE constraint failed`.

**Database migrations:** additive, numbered SQL files in `packages/db/sql/`, applied by `applySchema()`. Latest as of this entry: `014_review_avatar.sql`.

**Feature flags:** `FEATURE_REVIEWS` gates the whole review system in production (off by default — see `docs/COMPLIANCE_MATRIX.md` rows C-09/C-10, needs legal sign-off before going live for real).

**Review system** (the majority of recent work — see §2 Phase 3 onward): a full Review Trust Engine with verified/anonymous/pseudonymous display modes, fraud/privacy scoring, sample-size-banded aggregates, theme extraction from real review text (never AI-generated), organisation (firm/LPO) reviews, a `/reviews` discovery hub, a separate "Rate CaseADVO" platform-feedback system, tweet-style review cards with avatars (10 presets + real upload, client-compressed to a JPEG data URL), and an admin "Reported reviews" queue with a hard-delete action. Core logic lives in `packages/db/src/repositories/reviews.ts` (~900 lines — flagged as a refactor candidate, not yet split).

**Brand assets:** real CaseADVO logo (three navy circles — scales of justice, gavel, shield) wired in as of commit `1c40a5c`. Favicon/PWA assets live under `apps/web/public/brand/`; `apps/web/app/favicon.ico` for the Next.js browser-root convention. Header shows the real emblem (`.wordmark-logo` class); **the footer still shows the old placeholder "C" mark** — the real emblem's navy ink is unreadable against the footer's dark-navy background, and no light/inverted variant of the logo has been provided yet. This is the single most visible unfinished cosmetic item.

**Known, deliberately-not-yet-fixed architecture items** (found by an audit on 2026-08-24, real but non-urgent — see Phase 5 below):
- 6 files import `@lexhall/db` functions directly instead of going through the `apps/web/lib/data.ts` server-only boundary (`ResultCard.tsx`, `advocates/[slug]/page.tsx`, `advocates/[slug]/book/page.tsx`, `bookings/[reference]/page.tsx`, `requests/[reference]/page.tsx`, `api/advo/route.ts`).
- `packages/db/src/repositories/reviews.ts` does five distinct jobs (fraud scoring, write/CRUD, moderation, display formatting, read/aggregation) in one file — a real candidate for a 4-way split.

---

## 2. Chronological Log

### Phase 0 — Platform bootstrap
**Date:** 2026-08-18
**User Prompt:** `[not retained — no session summary survives from this far back, only the git history]`
**Output Produced:**
- `f6c5cbb` — "Lexhall: Phase 1 legal discovery platform on live Bar Council data" — the original platform build: real Bar Council advocate data ingestion, initial homepage, search.
- `f4ec9a8` — homepage redesigned in a "reference-kit" composition language.

**📌 Continuity Note:** This is the literal starting commit of the project. Original brand name was "Lexhall" (renamed to CaseADVO two days later, see Phase 1). If asked "what was this project originally called," the answer is Lexhall — the rename was cosmetic, git history and some internal doc titles (`docs/ARCHITECTURE.md` etc. — check before assuming) may still say Lexhall in places.

---

### Phase 1 — Rapid redesign + rebrand
**Date:** 2026-08-19 → 2026-08-20
**User Prompt:** `[not retained]`
**Output Produced:** A dense run of same-day iterations, in order: fees + 6-step booking flow + "Advo AI" chat bot (`ea0fb39`); a Practo-style discovery model with a side-docked chat bot and judges data (`2a1cc21`); colour-block advocate rows and a local asset pipeline (`73ed3c1`); fee sorting and serif display type (`bef9cc9`); a full forensic-recovery pass adding Docker, a real health-check contract, missing DB indexes, CI, and 12 audit docs under `docs/` (`3927fd8`); the six-level legal-matter taxonomy (`cc4faa4`); the 183-entry Legal Resource Library (`32bdb51`); a header-overflow fix (`5611640`); a reconciliation/gap-analysis pass (`9a364a7`); **the brand rename from Lexhall to CaseADVO** (`da2067b`); then a long homepage-hero iteration cycle — centered composition, hero cutout fixes, featured-advocate cards rebuilt at least 6 times chasing an exact reference layout (marquee → static 3-card → illustrative cutouts → exact 4-layer reference architecture → final clipping fix) spanning commits `16e1760` through `d629d8e`.

**📌 Continuity Note:** The advocate-card layout went through ~8 rebuild iterations in one session (`9db5a3d` through `d629d8e`) chasing a specific visual reference the user had in mind — a strong signal that this user iterates fast on visual/design work and will ask for another pass rather than settle for "close enough." Expect the same pattern on any future visual request: don't over-invest in the first attempt being final. `docs/DECISIONS.md` and `docs/GAP_ANALYSIS.md` from this phase are worth reading if picking up design work — they record *why* certain visual choices were made, which this log doesn't repeat.

---

### Phase 2 — Resources, ticker, Review Trust Engine
**Date:** 2026-08-21
**User Prompt:** `[not retained for the resources/ticker work; see below for the Review Trust Engine prompt, which is near-verbatim]`
**Output Produced:**
- State-wise Registration & Stamps (IGR) sources, verified against real government URLs (`20e8661`); complete state-wise document coverage plus a state-emblem ticker on the Resources page (`162fa68`) — then three consecutive rebuilds of that same ticker chasing a full-bleed marquee effect with counter-moving bands (`1250f3f`, `874f138`, `2757f1e`); an advocate-card overflow/proportion fix (`89ad51a`).
- **Authentication (RT-010) and a full Review Trust Engine, gated per the compliance matrix** (`64d8fdc`) — this is the architectural foundation for everything review-related in this log. Built: `review` table referencing exactly one of `professional_id`/`organisation_id`; `basis` (verified_consultation / verified_engagement / unverified) computed from a real completed booking or a matching verified email domain — **never conflated between the two**, since a booking is much stronger evidence than a domain match; `display_mode` (attributed / pseudonymous / anonymous); fraud scoring (`assessFraudRisk` — velocity, duplicate text, short-body, unverified-basis penalties) and privacy-leak detection (phone/email/case-number regex, forces human review regardless of fraud tier), both admin-only; a `moderation_status` state machine (pending → auto_flagged/in_review → published/rejected/withdrawn); one-review-per-interaction enforcement via partial unique SQL indexes.
- Reviews rebranded as **"Legal Trust & Experience"**, extended to firms/LPO organisations, live demo data seeded (`3b725b8`).

**📌 Continuity Note:** The verified-badge distinction (booking-verified vs. domain-verified) is a design decision the user cares about getting right — it shows up again and again in later QA passes as something that must never be blurred into one generic "Verified" label. If you touch review display code, grep for `verifiedVia` and preserve the `'booking' | 'domain'` distinction; collapsing it has been treated as a real bug, not a style nit, every time it's come up.

---

### Phase 3 — Reviews hub, full QA pass
**Date:** 2026-08-24, 13:53 → 14:27
**User Prompt:** `[not retained verbatim — reconstructed from a session summary that describes, but does not quote, these two requests: (1) a large ~78-section spec asking for a real Reviews hub reachable from main navigation, a proper multi-step "write a review" flow, verified/anonymous distinction, and a separate "Rate CaseADVO" site-feedback feature, explicitly modeled loosely on G2 and Practo's review pages without cloning them; (2) a request to run /code-review, /web-design-guidelines, and general manual QA against the result.]`
**Output Produced:**
- `4debc95` — Reviews hub at `/reviews`, main-nav visibility for "Reviews," and the separate site-feedback system at `/rate-us`.
- A full QA pass found and fixed **7 real bugs**: a routing mismatch between firms/LPO base paths, a fraud-check duplicate-text query that used the wrong ID column for organisation reviews (checked `professional_id` where an org's numeric ID would never match), a missing one-review-per-author cap for organisation reviews (professional reviews had this via interaction-FK uniqueness; orgs have no interaction concept so needed an explicit `ALREADY_REVIEWED` check), the verified-badge conflation problem, hardcoded `revalidatePath` calls that didn't resolve firm-vs-LPO correctly, and a triplicated form component. Fixed in `2088154`; full QA report committed in `5d14331` (see `docs/FULL_QA_REPORT.md`).

**📌 Continuity Note:** This QA pass is the direct ancestor of the "reuse discipline" applied in every phase since — e.g., `apps/web/lib/avatars.ts` was extracted as a shared helper *specifically* to avoid re-introducing the triplication bug this pass had just fixed. If you're about to copy-paste a helper across two review-related files, that's the anti-pattern this codebase has already been burned by twice (see Phase 5's architecture audit for a third instance — a rating-extractor function duplicated three times in `actions.ts` — that wasn't caught until later).

---

### Phase 4 — Tweet-style avatars, reported-reviews admin queue
**Date:** 2026-08-24, ~14:30 → 16:29 (session resumed mid-phase after a context compaction; verbatim from here on)

#### 4a. The big request
**User Prompt** *(verbatim, typos preserved — this is exactly what was sent, including a decorative unrelated screenshot attached with no accompanying instruction)*:
> [Image: an Elon Musk tweet screenshot — decorative only, not acted on]
> "firm check the working , do manual desting using chrome browser  write a review check it post it and all then if it is working then  go on this next step , but first fix it ,  then male the review like this  to show on pages  like tweet  on there profile  , the  review can be be both anonymous  or  a profile based  just basic details name image (give 10 11 dp options or upload ) just it  optional contact and email   make it premium and  more like a better website  lets do it  and make the changes to show every where   then check do manual testing to see it is working make a anonymous  review and a basic review  then check if it is showing or not   see this.  https://www.g2.com/review   and this  https://www.glassdoor.co.in/Reviews/index.htm.   if you under stand what i told say yes and if needed ask me further questions"

Parsed into a checklist: (1) manually test the *existing* review flow in a real browser before building anything new; (2) redesign review display to feel like a continuous social-feed "tweet," not a boxed testimonial; (3) build reviewer identity: anonymous OR name+photo, photo = one of ~10-11 presets or a real upload; (4) apply everywhere reviews show; (5) manually test again with one anonymous + one named review; (6) G2/Glassdoor as quality-bar references only, not to be cloned.

Two points needed clarification before building, asked via a real question tool (not guessed):
- *"You said reviews can optionally show a contact email/phone publicly — what did you actually mean?"* → **User answered: "Drop public contact info (Recommended)."** This is now a hard rule — no review display anywhere shows public email/phone, only name + photo.
- *"A real photo upload needs file storage, which doesn't exist in this stack — what should I actually build?"* → **User answered: "Presets + real upload."** Built both: 10 preset SVG avatars, and a real upload path via client-side canvas compression into a JPEG data URL (there's no S3/blob store, so this was the only viable option without adding infrastructure).

**Output Produced:**
- Migration `014_review_avatar.sql` (adds `review.avatar_url`).
- 10 preset avatar SVGs + an `anonymous.svg` (masked-eyes icon) + `default.svg` fallback, all under `apps/web/public/img/avatars/`.
- `apps/web/components/AvatarPicker.tsx` — preset grid + upload button, client-side compresses any uploaded image to a size-capped JPEG data URL (deliberately never accepts raw SVG uploads — an SVG can embed `<script>`, a real XSS vector that was caught and designed around before it shipped).
- `apps/web/lib/avatars.ts` — the shared `avatarSrc(displayMode, avatarUrl)` resolver, used by every read site.
- Server-side `sanitizeAvatarUrl()` in `packages/db/src/repositories/reviews.ts` re-validates the exact same preset-path-or-JPEG-data-URL shape, in case a malicious client bypasses the UI and posts a raw value directly.
- Rewrote review card markup into a `.review-post` tweet-style card (avatar + name/anonymous label + verified badge + body + actions) — rolled out to `ReviewSection.tsx` (advocate/firm/LPO profiles), `app/reviews/page.tsx` (the hub feed), and `app/admin/reviews/page.tsx` (moderation queue).
- Manually verified end-to-end in a real browser (not just code review): created two fresh test accounts with real completed bookings, submitted one anonymous review (confirmed no avatar picker appears, confirmed it publishes with the masked icon and no `avatar_url` in the row) and one named review with a chosen preset avatar (confirmed it publishes with that exact avatar), on **both** `localhost:3000` and, after a Docker rebuild+redeploy, `localhost:3100`.
- Test suite grew from 37 to 44 assertions (anonymous-never-carries-avatar, preset round-trips, malformed/oversized avatar values silently dropped).

#### 4b. Follow-up: keep the test data, add a delete-reported-reviews feature
**User Prompt** *(verbatim)*: in response to a question about whether to delete the manual-test accounts/reviews created during the browser testing above —
> "keep the test accounts for , and add a area in  admin account to remove them , if someone, report the review it will be reviewed and can be  deleted so addd section in the admin account so it will do that  ,"

**Output Produced:**
- Kept the manual-test accounts and reviews (no cleanup).
- New `listReportedReviews()` (joins open `content_report` rows against their review) and `deleteReview()` (soft-delete via `deleted_at`, closes the report) in `reviews.ts`.
- New admin "Reported" tab at `/admin/reviews?status=reported`, showing the reporter's reason/detail alongside a `DeleteReviewForm.tsx` hard-removal action (with a `window.confirm` guard — this is a destructive action, gated accordingly).
- End-to-end verified through the real UI: reported a live review, confirmed it appeared in the Reported tab with the right reason/detail, deleted it, confirmed it vanished from both the profile page and the reported queue, on both `:3000` and (after another rebuild+redeploy) `:3100`.
- Committed as `2ec2c74`.

**📌 Continuity Note:** The pattern in 4a — parse a dense run-on paragraph into an explicit checklist, ask before guessing on anything with real privacy/infrastructure tradeoffs, then verify live on **both** environments before calling it done — is the template to follow for any future large ask from this user. Note also: this user reads "add a section to do X" literally — when they said "add a section in admin account so it will do that," the expectation was a real, working, verified feature, not a stub or a TODO.

---

### Phase 5 — Post-hoc audit: authorization bug, CSS regressions
**Date:** 2026-08-24, ~16:00 → 16:29
**User Prompt** *(verbatim)*:
> "see if al the changes are implemented and are shown on website so do it   ae live or not see all of it asap do it as i said     check for all the /improve-codebase-architecture /codebase-design    and check for each section page  , the spacing   , margins and all  fix them if [...] this is the logo of caseAdvo  the 3 circles attached image"
(A CaseADVO logo image was attached alongside this text — see Phase 6 for what happened to it.)

Note: `/improve-codebase-architecture` and `/codebase-design` are **not real skills or slash commands** in this environment — confirmed by checking the available-skills list, nothing matched. Rather than guess at what they meant, the equivalent work was done directly: a background architecture-health-check agent and a background spacing/margin-audit agent were run in parallel over the codebase, and the user was told plainly that those two command names don't exist here.

**Output Produced (bugs the audits actually found and got fixed, not just reported):**
- **Real security bug**: `respondToReviewAction` only checked that a caller was signed in, not that they were the actual claimed professional (or a member of the reviewed organisation) — any authenticated user could have posted a fake "response from the professional" on *any* review. Fixed with a new `isAuthorizedToRespond(reviewId, userId)` check (professional: `claimed_by_user_id` match; organisation: `org_member` row exists) gating the action. Covered by 4 new test assertions.
- `.chip-coral` was used in two places in the admin UI but was never defined in `globals.css` — those chips silently rendered unstyled. Swapped to the existing `chip-error` token instead of inventing a new color.
- `.gap-5` was used across several files (including the brand-new review cards) but was missing from the CSS spacing scale (`.gap-1/2/3/4/6/8` existed, `.gap-5` didn't) — those elements were rendering with **zero gap**, not the intended ~20px. Added it to the scale.
- A doubled margin on the `AvatarPicker`'s divider (a `margin: '0 4px'` stacking on top of a parent `gap-2`), and a misleading (but not actually broken) indentation level in the admin moderation queue — both fixed.
- Also deduplicated a rating-extractor function that had been copy-pasted three times across `actions.ts` (flagged by the architecture audit as the third instance of the exact anti-pattern Phase 3's QA had already fixed twice).
- Re-verified live on both `:3000` and `:3100` after a Docker rebuild. Committed as `c579784`.
- Logo image: **asked the user how to get the actual file** (a pasted chat image can't be saved to disk directly) — offered "save it and give me the path" / "recreate as a fresh SVG" / "skip for now." **User chose "skip for now."** (Superseded three prompts later — see Phase 6.)

**📌 Continuity Note:** Two of these bugs (`.chip-coral`, `.gap-5`) existed because CSS utility classes were used *by name* without confirming they were actually defined in `globals.css` — an easy mistake in a token-based system where the class naming looks like it should obviously exist. Before using any `.gap-N` or `.chip-X` class in this codebase, grep `globals.css` for the literal class first. The authorization bug is the more important lesson: a client-side UI gate (`{isAdmin && <RespondToReviewForm/>}`) is **not** a substitute for a server-side check in the Server Action itself — Next.js Server Actions are callable directly by anyone with the encoded action reference, bypassing whatever the UI chose to render.

---

### Phase 6 — Real logo integration
**Date:** 2026-08-24, ~16:35 → 16:44
**User Prompt** *(verbatim)*:
> `@"/Users/apple/Downloads/favicon.zip" @"/Users/apple/Downloads/favicon/"`
> "here you have it , logo favicon  images , add this  in the folder also  , added both zip file and folder for this "
> "and restructure the folder in a better way so  , and do the rest work"

**Output Produced:**
- Inspected the provided RealFaviconGenerator export (`favicon.ico`, `favicon.svg`, `favicon-96x96.png`, `apple-touch-icon.png`, two `web-app-manifest-*.png` sizes, `site.webmanifest`) — confirmed it's the full CaseADVO lockup (wordmark + three-circle emblem), not emblem-only.
- **Restructured**: created a single `apps/web/public/brand/` folder (previously there was no favicon/logo asset organization at all) holding the SVG/PNG/manifest set, renamed the verbose `web-app-manifest-*` files to `icon-192.png`/`icon-512.png`, updated `site.webmanifest`'s icon paths to match; `favicon.ico` placed at `apps/web/app/favicon.ico` per Next.js's special-file convention (this is the one file that must live there, not in `public/`).
- Wired `icons` + `manifest` into `layout.tsx` metadata — verified via the actual generated `<link>` tags and a 200 on every asset URL.
- Cropped the header-usable emblem out of the 512×512 source using a connected-component flood-fill (Python/PIL/scipy, run via Bash) to strip only the *outer* white background while preserving the white line-art *inside* the navy circles (naive "make white pixels transparent" would have erased the icon glyphs too, since they're white-on-navy).
- Replaced the header's placeholder "C" letter mark with the real emblem (`apps/web/components/Header.tsx`, new `.wordmark-logo` CSS class with no background plate, since the real emblem doesn't need one).
- **Deliberately left the footer's mark untouched** — its background is dark navy, same family as the emblem's ink; the real logo would be nearly invisible there and no light/inverted variant was provided. Flagged to the user rather than shipping something that looks broken.
- Verified live, full CI clean, committed as `1c40a5c`.

**📌 Continuity Note:** The user's own logo image (a screenshot pasted into an earlier chat turn — see Phase 5) could **not** be used directly; a pasted chat image has no filesystem path available to tools. It took the user actually saving files to `~/Downloads` and referencing them by path before real integration was possible. If a future request involves "use this image" and only an inline pasted image is provided (no `@path` reference), you likely need to ask the user to save it and give you a path, same as happened here — don't assume you can extract it yourself.

---

### Phase 7 — Data snapshot commit
**Date:** 2026-08-24, 16:44
**User Prompt** *(verbatim)*: "Commit the working tree changes with a sensible message."
**Output Produced:** The only working-tree diff at that point was `data/lexhall.db` + its `-shm`/`-wal` sidecars (the dev database, carrying migration 014 plus all the manual-test data from Phase 4). Committed as `4847cfd` with a message describing what state the snapshot captures, rather than a generic "update data" message.

**📌 Continuity Note:** This repo's convention (observed, not written down anywhere) is that `data/lexhall.db*` gets committed *separately* from code changes, usually only when explicitly asked — code-change commits in this log (`2ec2c74`, `c579784`, `1c40a5c`) all deliberately excluded the DB files even though they were also modified at the time, to keep the diff reviewable. Don't bundle DB binary diffs into a feature commit unless asked to.

---

### Phase 8 — This document
**Date:** 2026-08-24, 16:5x (this entry)
**User Prompt** *(verbatim)*:
> "make a markdown file of all the inputs and outs , what i have given you for prompt and what you have  produced created   make it so much informative so when i send it  or open i a new account for ai it will work like magic as if"
> "and alos add the date of teh prompt , for what section after understand the prompt sequence wise  , so it has an idea  so"
> "and add a condition where  it is compulsory  to  add after each prompt input output   ,"
> "start from the start the very starting"

**Output Produced:** This file — `docs/AI_SESSION_HANDOFF.md`. Structured as: rules for the next reader (§0), a current-state snapshot (§1), then the full chronological log (§2) from the actual first commit (2026-08-18) through this entry, every entry carrying a date, a Section/Phase heading, the prompt (verbatim where retained, honestly marked where not), the output, and a mandatory Continuity Note.

**📌 Continuity Note:** Two honesty constraints shaped this file and matter if it's ever extended: (1) prompts from before a context-compaction boundary partway through Phase 4 are **not available verbatim** — only a summary of them survived, and this file says so plainly rather than fabricating quotes; (2) git commit history (dates, messages) is the one fully reliable backbone across the *entire* project timeline and was used to anchor every phase, verbatim or not. If you (the next AI) add to this file, keep both constraints: never invent a quote you don't actually have, and keep dating every entry against the real commit log so the sequence stays trustworthy.
