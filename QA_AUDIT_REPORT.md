# QA Audit Report — CaseADVO

**Scope:** Search results, advocate profile, booking drawer, navigation, footer
**Method:** Live interactive testing against the running dev server (`localhost:3000`) using the MCP browser toolset — DOM/computed-style assertions (`getBoundingClientRect`, `getComputedStyle`, `aria-*` attribute reads) plus visual screenshots, not screenshots alone. Static codebase/schema audit via `grep`/`sqlite3` against the real dev database. No Python Playwright script was written — the session already had an equivalent live browser attached to the running server, so a second automation layer would have added risk (a second source of truth to keep in sync) without adding coverage.
**Viewports tested:** 1440×900 (desktop), 768×1024 (tablet), 375×812 (mobile)
**Date:** 2026-09-04
**Auditor:** Claude (Sonnet 5), same session that shipped the audited code

## How to read this report

Every finding below was reproduced with a concrete assertion (a DOM read, a computed style, a URL, a rect) — not "looks off in a screenshot." Where a finding was fixed during this audit, the fix is described and was re-verified with the same kind of assertion, live, after the change. Nothing here is a guess.

---

## 1. Executive Summary

| Metric | Result |
|---|---|
| Critical (P0) defects found | 1 (fixed during this audit) |
| High (P1) defects found | 3 (documented, not yet fixed — see rationale per item) |
| Medium (P2) defects found | 2 (1 fixed, 1 documented) |
| Low/Enhancement (P3) | 2 |
| Horizontal overflow (any viewport) | None found |
| Broken navigation/footer links | None found |
| Core booking flow | **Was broken on search results** (P0, now fixed) — full `/book` page flow was never affected |

**Overall assessment:** The one defect capable of silently breaking a core conversion flow (booking, from the search results surface shipped this session) has been found, root-caused, fixed, and re-verified live. The remaining findings are real but non-blocking: a pre-existing accessibility gap shared by every modal-style drawer in the app (not introduced this session), two DB columns with working plumbing but no UI consumer, and minor polish items. Nothing found required a rollback or a design-level rethink — every fix was additive and localized.

---

## 2. Defect Severity Matrix

### 🔴 CRITICAL (P0) — 1 found, 1 fixed

| # | Defect | Status |
|---|---|---|
| P0-1 | Booking drawer backdrop/panel trapped inside search result card instead of covering the viewport | ✅ **Fixed** (`BookingDrawer.tsx` — React Portal to `document.body`) |

### 🟠 HIGH (P1) — 3 found

| # | Defect | Status |
|---|---|---|
| P1-1 | No focus trap / no focus-on-open in the shared `.drawer`/`.drawer-sheet` modal pattern | Documented — pre-existing, affects `FilterPanel` too, not a regression from this session's work |
| P1-2 | `professional.headline` column exists, is queried into `ProfessionalSummary.headline`, never rendered anywhere | Documented — 0/373 published professionals currently have a value, same situation `bio` was in before it was wired up this session |
| P1-3 | `detail.publicEmail` / `detail.publicPhone` selected in `getProfileDetail()`, never rendered | Documented — same 0/373-populated situation |

### 🟡 MEDIUM (P2) — 2 found, 1 fixed

| # | Defect | Status |
|---|---|---|
| P2-1 | Search result cards for non-bookable professionals reserved a dead 260px whitespace column on desktop | ✅ **Fixed** (`globals.css` — `:has(> :only-child)` collapses to one column) |
| P2-2 | Nav dropdown trigger buttons (`⌄`) have correct `aria-expanded` wiring but no `aria-haspopup` | Documented, not fixed |

### 🔵 LOW / ENHANCEMENT (P3) — 2 found

| # | Item |
|---|---|
| P3-1 | `gender` and `honorific` columns exist on `professional` but aren't exposed by the repository layer at all — likely intentional (gender in particular should probably stay unexposed without explicit consent), flagged only because the brief asked for a full schema-vs-UI map |
| P3-2 | The `#consultation` tab (added to the profile page's tab bar) points at a `position: sticky` element; correctly excluded from scroll-tracking already (see `ProfileTabs.tsx`'s `trackActive` flag) — noted here only as a "watch this" for anyone adding more sticky-sidebar anchors later |

---

## 3. Section-by-Section Deep Dive

| Section | Expected | Actual (before fix) | Actual (after fix) | Root Cause | Viewports Affected |
|---|---|---|---|---|---|
| **Booking Drawer** (search results) | Full-viewport dimmed backdrop; drawer as a right-side panel, full height | Backdrop rendered as an ~890×332px box near the card; drawer squeezed into the same small box | Backdrop covers full viewport (`>=1439×899` confirmed at 1440×900); drawer is a proper 420px-wide, full-height right panel, portaled to `<body>` | `.result-card.lift` sets `will-change: transform` for its hover animation, which creates a new CSS containing block for any `position: fixed` descendant — trapping the drawer inside the card's box instead of the viewport | Desktop (1440), Mobile (375) — reproduced identically on both; root cause is viewport-independent |
| **Booking Drawer** (Escape key) | Pressing Escape closes the drawer, restores body scroll | Worked correctly even before the P0 fix | Still works | `keydown` listener in `BookingDrawer.tsx`, unaffected by the portal change | All |
| **Booking Drawer** (focus management) | On open, focus moves into the dialog; Tab is constrained to dialog contents (ARIA Dialog pattern) | `document.activeElement` stays on `<body>` after open; Tab is not constrained | Unchanged (not fixed this audit) | The shared `.drawer`/`.drawer-sheet` pattern (`BookingDrawer.tsx`, and pre-existing `FilterPanel.tsx`) never calls `.focus()` on open and has no keydown-based Tab constraint | All — confirmed identically on `FilterPanel`'s own drawer, so this is systemic, not new |
| **Booking Drawer → BookingFlow date pre-select** | Clicking a specific day's chip should default the flow's Date step to that day | N/A (new feature, first verification) | Confirmed: clicked "Mon Sep 7" → Date step shows it with `class="day-cell is-on"` and `aria-pressed="true"` | `BookingFlow`'s `initialDate` prop, wired through `ResultBooking` → `AvailabilityStrip`'s `onSelectDay` | Desktop, confirmed functionally (not viewport-dependent) |
| **AvailabilityStrip / date matrix** | Day chips with slots are clickable; zero-slot days are inert; active state reflects the clicked day | Works as expected in both call sites (result card → drawer; profile sidebar → `/book` page link) | Unchanged | — | All |
| **Result Card — two-column body** | Profile facts left, availability + Book right; single column under 860px | Correct at all three viewports; grid collapses correctly at 768 and 375 | — | `.result-card-body` media query at 860px | Desktop / Tablet / Mobile — all correct |
| **Result Card — non-bookable state** | "Not accepting requests" chip shown; card doesn't reserve dead space for a column that isn't rendered | Chip shown correctly, but the 260px column track was reserved anyway, leaving visible empty whitespace on the right | Card now spans full width when there is no second column | `.result-card-body` always declared a 2-column grid at ≥860px regardless of child count | Desktop (≥860px only — the single-column mobile/tablet layout was never affected) |
| **Profile Hero** | Compact hero, name + Share button don't overlap on narrow screens | Confirmed no overlap at 375px (`name.right: 202`, `share.left: 269`) | — | — | Mobile, explicitly checked |
| **Profile — empty states** | No bio → no "About" tab/section (not a placeholder); no reviews → no rating-glance card (not a hollow box); not accepting consultations → clean "Not accepting requests" message, no broken layout | All three confirmed clean: `aboutTabPresent: false` with no bio, `ratingCardPresent: false` with no reviews, consultation card renders "Not accepting requests · Report an inaccuracy" only, no empty-looking `.card` elements found anywhere on the page (`emptyLookingCards: []`) | — | Correct by design — every conditional in `page.tsx` gates on the underlying data, not on a feature flag alone | Desktop, confirmed; layout mechanism is viewport-independent so tablet/mobile inherit the same correctness |
| **Profile — tab bar / scroll-spy** | Clicking a tab scrolls to the matching `id`; the underline tracks scroll position; the sidebar's `#consultation` tab never corrupts the tracker | Re-confirmed this audit: `#practice-areas`, `#fees`, etc. land within ~0.2px of viewport top; at the `#consultation` scroll position `aria-current` correctly still reads "Resources," not "Consultation" | — | `ProfileTabs.tsx`'s `trackActive: false` flag on the consultation tab, from the prior session turn that found and fixed this exact class of bug | Desktop; mechanism (scroll position, not layout) makes this viewport-independent |
| **Navigation dropdowns** | Clicking a nav item toggles `aria-expanded` and opens a panel without overlapping other content | Confirmed: `aria-expanded` toggles `false → true`, panel renders cleanly below the nav bar with no overlap | — | — | Desktop, explicitly checked |
| **Homepage search** | Typing a query and clicking Search navigates to `/search?q=...` | Initial `computer`-tool click at a stale screenshot coordinate appeared to do nothing — **false alarm**: a direct element click confirmed the button works correctly (`/search?q=property+dispute`) | — | N/A — not a real defect; noted for report-methodology transparency | Desktop, confirmed working |
| **Footer** | All links point to real routes, none empty/`#` | Confirmed: 31 links, zero with an empty or `#` href | — | — | Desktop, checked |
| **Horizontal overflow** | No page should scroll horizontally at any tested viewport | None found on homepage, `/search`, or `/advocates/[slug]` at 1440, 768, or 375 | — | — | All three, all three key pages |

---

## 4. Missing & Broken Features Checklist

Schema/repository fields that exist and are wired through to a TypeScript type, but have **no UI consumer**:

- [ ] `professional.headline` → `ProfessionalSummary.headline` — not rendered anywhere (0/373 professionals currently have a value; same situation `bio` was in before this session added an About section for it)
- [ ] `professional.public_email` → `ProfileDetail.publicEmail` — not rendered anywhere (0/373 populated)
- [ ] `professional.public_phone` → `ProfileDetail.publicPhone` — not rendered anywhere (0/373 populated)
- [ ] `professional.gender`, `professional.honorific` — not even exposed by the repository layer; likely intentional, flagged for completeness only

Nothing else in the `professional` table's ~35 columns was found unrendered — the profile page (hero, About, Practice areas, Courts, Enrolment, Professional address, Fees, Reviews, Matters, Resources, Related, provenance sidebar, verification ladder, languages, booking widget) accounts for the rest.

Broken interactive contracts found and their current state:

- [x] ~~Booking drawer opens but is visually confined to a small box instead of a proper full-screen modal~~ — **Fixed**
- [x] ~~Non-bookable result cards leave a dead whitespace column~~ — **Fixed**
- [ ] Modal focus management (booking drawer + filter drawer) — **not fixed**, see Action Plan §1

---

## 5. Prioritized Action Plan

### Already done (this audit)
1. ✅ `BookingDrawer.tsx` — render via `createPortal(..., document.body)` instead of inline JSX, so the drawer always escapes any ancestor's containing block regardless of which card/page mounts it in the future.
2. ✅ `globals.css` — `.result-card-body:has(> :only-child) { grid-template-columns: 1fr; }` so non-bookable cards don't reserve dead space.

### Recommended next (not done — needs a scoping decision, not a quick patch)

3. **Focus management for `.drawer-sheet` (P1-1).** Two sub-parts, both applicable to `BookingDrawer` *and* `FilterPanel` since they share the pattern:
   - On open: move focus to the drawer's first focusable element (or the drawer container itself via `tabindex="-1"` + `.focus()`), and on close, return focus to whatever triggered the open (the day chip / Filters button).
   - While open: trap Tab/Shift+Tab within the drawer's focusable elements (a small custom hook, or an existing dependency-free trap pattern — this codebase has no headless-UI library installed, so it should be hand-rolled to match the "no new dependency" pattern established this session).
   - Suggest doing this once, as a shared hook (`useFocusTrap` or similar) consumed by both `BookingDrawer` and `FilterPanel`, rather than fixing the two call sites separately — the two are currently identical copies of the same shell and should stay that way.

4. **Render `headline` (P1-2) and `publicEmail`/`publicPhone` (P1-3) when present.** Same pattern already established for `bio` this session: gate the section/line on the field actually being set, never show a placeholder. Low urgency in practice (nothing currently populates these), but the code path should exist before a professional claims a profile and fills them in — right now doing so would have no visible effect.

5. **`aria-haspopup` on nav dropdown triggers (P2-2).** One-line addition per trigger button in the header component; verify screen-reader announcement afterward.

### Not recommended for action
- P3-1 (`gender`/`honorific` unexposed) — leave as-is unless there's a product reason to collect/display gender, which raises its own consent questions beyond this audit's scope.

---

## 6. Verification Run (this audit)

```
npm run typecheck   → clean, both before and after the P0/P2 fixes
npm run test         → 104 assertions passing (59 + 45), before and after
```

Live interaction checks performed (all via direct DOM/JS assertions against the running app, not simulated):
- Booking drawer open/close, backdrop coverage, portal target, panel geometry — at 1440×900 and 375×812
- `initialDate` pre-selection — confirmed via `aria-pressed`/class on the actual date button, not just "listed first"
- Escape-key close — confirmed drawer removed from DOM, `body.style.overflow` restored
- Focus-on-open — confirmed absent, on both `BookingDrawer` and `FilterPanel`
- Empty-state rendering — profile with no bio, no reviews, and not-accepting-consultations, each checked independently
- Result card grid collapse — non-bookable card (1 column) vs. bookable card (2 columns), same page, same viewport
- Responsive collapse — `.result-card-body` and `.profile-layout` grid track values read directly at 1440 / 768 / 375
- Nav dropdown open state and layout
- Footer link href audit (31 links, 0 broken)
- Homepage search — confirmed functional after ruling out a false-positive from a stale click coordinate

---

*Report generated and code fixes applied in the same session that shipped the audited features (commits `803521b` through `80f149a`). Fix commit follows this report in the git log.*
