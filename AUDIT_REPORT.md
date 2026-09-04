# 🧪 Website QA & UX Audit Report

**Application:** CaseADVO (Next.js 16 / App Router)
**Method:** Python Playwright (chromium, headless), automated pass + manual/interactive re-verification of every automated finding
**Viewports:** Desktop 1920×1080, Mobile 375×812
**Baseline:** [screenshots/baseline_fullpage.png](./screenshots/baseline_fullpage.png)

> **A note on methodology, read before the findings below.** The automated Playwright pass produced 19 raw findings. Rather than report them verbatim, each one was individually re-investigated — by viewing the actual saved screenshot, re-running a targeted diagnostic, querying the database directly, or manually reproducing the exact user action through an interactive browser — before being classified as a **confirmed defect** or a **false positive caused by the test script itself**. This is why the counts below are lower than the raw automated output: 17 of 19 raw findings were script artifacts (transient-overlay screenshot timing, an unguarded null check in the tab-loop helper, and test-data reuse across signup iterations causing a legitimate "duplicate e‑mail" rejection to be misread as a bug), not real product defects. Only genuinely reproduced issues are listed as findings.

## 1. Executive Summary

- **Total Sections Audited:** 10 — Homepage, Navigation, Homepage Search Form, Search Results, Search Filters, Advocate Profile (incl. Profile Tabs & Booking Drawer), Signup Form, Login Form, Review Submission Form, Site Feedback Form (`/rate-us`)
- **Total Functional Issues:** 0 confirmed (2 raw automated findings investigated and refuted — see §2 Signup Form)
- **Total Visual/Layout Faults:** 1 confirmed, **fixed during this audit** (Search Results mobile horizontal overflow)

Overall the application is stable across both tested viewports. The one confirmed, reproducible defect (page-level horizontal scroll on `/search` at 375px) has already been root-caused, fixed, and re-verified in this same pass. No broken links, no unhandled XSS input, no modal/drawer close-mechanism failures, and no authentication/validation defects were found once test-script artifacts were separated from real behavior.

## 2. Section-by-Section Audit Breakdown

### Section: Homepage
- **Status:** 🟢 Passed
- **Elements Tested:** full-page screenshot at both viewports, `document.scrollWidth` vs `window.innerWidth` overflow check, browser console error capture, footer link status checks (`page.request.get()` against every footer `<a href>`)
- **Identified Issues:** None.

### Section: Navigation (mega-menu triggers + mobile drawer)
- **Status:** 🟢 Passed
- **Elements Tested:** All 5 desktop mega-menu triggers (`Find a lawyer`, `Legal matters`, `Resources & guides`, `Reviews`, `Corporate Suite`) and the mobile "Menu"/"Close" hamburger trigger; `aria-expanded` state toggling; click-to-open and click-outside/Escape-to-close behavior.
- **Identified Issues:** None confirmed. The automated pass logged 12 raw "did not expand" / "click failed" findings against these triggers. Investigation showed all 12 were script artifacts, not site defects:
  1. **Screenshot timing false positive** — the script's `shot()` helper always takes a `full_page=True` capture, which forces a reflow/scroll that closes hover- and click-triggered overlays before the pixel data is captured. Opening [screenshots/nav-dropdown-0-fail-desktop-1920x1080.png](./screenshots/nav-dropdown-0-fail-desktop-1920x1080.png) confirms this directly — it shows the plain, closed homepage, not a failed-to-open menu.
  2. **Mobile trigger targeted at desktop viewport** — "Nav trigger 5" is the `hide-desktop` mobile hamburger button; attempting to click it during the desktop-viewport pass correctly fails because the element is legitimately not visible at that breakpoint (this is expected CSS behavior, not a bug).
  3. Direct interactive re-verification (reading live `aria-expanded` state before/after click, independent of screenshot timing) confirmed all mega-menu triggers open, close, and report correct ARIA state.
  - **Type:** N/A — false positive, documented for transparency.

### Section: Homepage Search Form
- **Status:** 🟢 Passed
- **Elements Tested:** query + location free-text fields with valid input, boundary-length strings, `<script>alert(1)</script>` XSS payload, and empty submission.
- **Identified Issues:** None. All inputs are safely handled; no unescaped script execution observed.

### Section: Search Results
- **Status:** 🔴 Failed → Fixed
- **Elements Tested:** result-card rendering, sort/apply form, pagination, empty-state recovery links, mobile layout overflow check, `BookingDrawer` open/backdrop/Escape-close from a result card.

#### Identified Issues:
1. **Mobile horizontal page overflow on `/search`**
   - **Type:** Visual
   - **Description:** At the 375×812 mobile viewport, the page's `document.documentElement.scrollWidth` (381px) exceeded `window.innerWidth` (375px), producing a 6px page-level horizontal scrollbar.
   - **Steps to Reproduce:** Load `http://localhost:3000/search?location=delhi` at a 375px-wide viewport and compare `document.documentElement.scrollWidth` to `window.innerWidth`.
   - **Root cause:** The Sort/Apply form in [apps/web/app/search/page.tsx:193](apps/web/app/search/page.tsx#L193) used `className="row gap-2"`. The shared `.row` utility class (`apps/web/app/globals.css`) is `display:flex; align-items:center` with **no `flex-wrap`**, so the `<select id="sort">` and the `Apply` button were forced onto one unwrapped row wider than the 375px viewport. A precise diagnostic that excluded elements inside intentional `overflow-x:auto` containers (e.g. the `AvailabilityStrip` day-chip scroller, which is a deliberate horizontal-scroll region and was correctly *not* a page-overflow contributor) isolated exactly two true offending elements: the `<form class="row gap-2">` and its child `<button class="btn btn-secondary btn-sm">`.
   - **Fix applied:** Added the codebase's existing `wrap` modifier class — `className="row wrap gap-2"` — matching the convention already used by every other multi-element `.row` on this page. See [apps/web/app/search/page.tsx:193](apps/web/app/search/page.tsx#L193).
   - **Verification:** Re-ran the identical `scrollWidth`-vs-`innerWidth` diagnostic post-fix: `{'scrollWidth': 375, 'innerWidth': 375}` — zero overflow, confirmed fixed.
   - **Evidence:** ![Mobile horizontal overflow, pre-fix](./screenshots/search-results-horizontal-overflow-mobile-375x812.png)

### Section: Search Filters (drawer)
- **Status:** 🟢 Passed
- **Elements Tested:** "Filters" button open, filter-option toggling, drawer backdrop click-to-close.
- **Identified Issues:** None confirmed. The automated pass logged 2 "Filters interaction threw" timeouts; the Playwright call log for both shows the target element was correctly resolved but was mid-animation/temporarily obscured by the drawer's own backdrop during the script's rapid-fire sequential clicking — a script actionability-timing issue, not a site defect. The same Filters button and drawer close-on-backdrop-click were independently exercised and confirmed working via direct interactive testing.

### Section: Advocate Profile
- **Status:** 🟢 Passed
- **Elements Tested:** full-page screenshot at both viewports, overflow check, Profile Tabs (`#about`, `#practice-areas`, `#fees`, `#reviews`) scroll-spy, `Share` action, `About` section render.
- **Identified Issues:** None confirmed. The automated pass logged 2 "Tab click loop threw: 'top'" findings. Root cause identified precisely: the script's own helper called `target.bounding_box()["top"]` without null-guarding — Playwright's `bounding_box()` can legitimately return `None` for an element that is momentarily not stable/visible, and the script then throws on the subsequent dict index. This is a bug in the test script, not the site. Profile Tabs scroll-spy correctness (accurate `aria-current` tracking at multiple scroll depths) was independently confirmed via direct interactive testing.

### Section: Booking Drawer
- **Status:** 🟢 Passed
- **Elements Tested:** open from a result card and from a profile page, full-viewport backdrop coverage, close via the drawer's `Close` button, close via backdrop click, close via `Escape`.
- **Identified Issues:** None. (The drawer's containing-block/portal defect found in the prior audit phase remains fixed and was re-confirmed stable in this pass — see [screenshots/booking-drawer-open-ok-desktop-1920x1080.png](./screenshots/booking-drawer-open-ok-desktop-1920x1080.png) and [screenshots/booking-drawer-open-ok-mobile-375x812.png](./screenshots/booking-drawer-open-ok-mobile-375x812.png).)

### Section: Signup Form
- **Status:** 🟢 Passed
- **Elements Tested:** `fullName`, `email`, `password` fields with empty submission, `<script>alert(1)</script>` XSS payload, invalid email format, too-short password, and genuinely-fresh valid data.
- **Identified Issues:** None confirmed. The automated pass flagged the `fullName=valid` and `password=valid` cases as validation mismatches ("expected no error, got an error"). Investigation via a direct database query (`SELECT id, email, full_name, created_at FROM app_user WHERE email LIKE '%qa-audit%'`) showed the true cause: the script reused the same test e‑mail address (`qa-audit-test@example.com`) across multiple loop iterations. The first submission with that address correctly succeeded; a later iteration reusing it correctly received a duplicate-email validation error, which the script's binary pass/fail check couldn't distinguish from "no error was expected here." Manual re-verification with a genuinely unique e‑mail (`qa-audit-fresh-<timestamp>@example.com`), a valid full name, and a valid password succeeded cleanly: the account was created, the user was signed in, and the app redirected to `/dashboard`. This fully exonerates the signup form.
  - Separately, the `<script>alert(1)</script>` XSS payload submitted as a `fullName` was correctly rejected by client/server validation as an invalid name (see the `form_matrix` in §3) — no unescaped script execution was observed anywhere the value could have rendered.

### Section: Login Form
- **Status:** 🟢 Passed
- **Elements Tested:** wrong-credentials submission.
- **Identified Issues:** None. An incorrect email/password combination correctly surfaces a validation/error message and does not sign the user in.

### Section: Review Submission Form
- **Status:** 🟢 Passed
- **Elements Tested:** unauthenticated access to the review submission flow.
- **Identified Issues:** None. An unauthenticated visitor is correctly redirected rather than being able to submit a review.

### Section: Site Feedback Form (`/rate-us`)
- **Status:** 🟢 Passed
- **Elements Tested:** feedback textarea with `<script>alert(1)</script>` XSS payload.
- **Identified Issues:** None. The payload is safely handled — no unescaped script execution observed.

## 3. Form & Input Validation Matrix

| Section | Input Field | Input Value | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| Signup | fullName | *(empty)* | Validation error shown | Error shown | ✅ OK |
| Signup | fullName | `<script>alert(1)</script>` | Validation error shown | Error shown | ✅ OK |
| Signup | fullName | `Test User` (fresh, unique email) | Accepted / navigated | Accepted, signed in, redirected to `/dashboard` | ✅ OK *(automated run mis-flagged this — see §2 Signup Form)* |
| Signup | email | `not-an-email` | Validation error shown | Error shown | ✅ OK |
| Signup | email | `qa-audit-test@example.com` (2nd use, duplicate) | Validation error shown | Error shown (duplicate email) | ✅ OK |
| Signup | password | `abc` | Validation error shown | Error shown | ✅ OK |
| Signup | password | `ValidPass123!` (fresh, unique email) | Accepted / navigated | Accepted, signed in, redirected to `/dashboard` | ✅ OK *(automated run mis-flagged this — see §2 Signup Form)* |
| Login | email + password | wrong credentials | Error message shown | Error shown | ✅ OK |
| Review submission | *(session)* | unauthenticated | Redirect / blocked | Redirected | ✅ OK |
| Rate Us | feedback textarea | `<script>alert(1)</script>` | Escaped / rejected / accepted safely | Safe — no execution | ✅ OK |
| Homepage search | query / location | XSS, boundary-length, empty | Safe handling | Safe | ✅ OK |

## 4. Recommended Fixes

1. **✅ Done — Search Results mobile overflow.** `apps/web/app/search/page.tsx:193` — added the `wrap` modifier to the Sort/Apply form's `.row` class. Verified fixed (0px overflow at 375px viewport). Not yet committed to git as of this report — see repository status.
2. **No other confirmed product defects to fix.** The remaining raw automated findings were all traced to flaws in the audit script itself (full-page screenshot timing against transient overlays, an unguarded `bounding_box()` null case, and test-email reuse across signup iterations) rather than the application. No site code changes are recommended for these.
3. **Test-hygiene note for future automated passes:** if this Playwright script is reused, (a) capture viewport-only screenshots (not `full_page=True`) for transient overlay states, (b) null-guard `bounding_box()` before indexing, and (c) generate a unique email per test iteration rather than reusing literals — these three changes would have prevented all 17 false positives in this pass without changing what gets tested.
