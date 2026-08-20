# Accessibility audit

Target WCAG 2.2 AA.

## Implemented

| Criterion | Implementation |
|---|---|
| 1.4.1 Use of Colour | Status **never** colour-only. Verification badges render icon + text ("✓ Bar enrolment verified"); evidence chips state their basis in words. |
| 1.4.3 Contrast | Palette re-derived against AA. The one failing pairing in the supplied design spec (white on `#FF7A45`, 2.6:1) was corrected to `#a73a05`+white (6.5:1) and `#ff7a45`+`#672000` (5.4:1). |
| 1.4.4 Resize Text | `maximumScale: 5`; zoom never blocked. Fluid `clamp()` type. |
| 2.1.1 Keyboard | All interactive elements reachable. Combobox implements ARIA 1.2: ↑↓ move, Enter selects, Escape closes. |
| 2.4.1 Bypass Blocks | Skip link (transform-based, so it does not distort layout). |
| 2.4.3 Focus Order | Semantic DOM order; no positive tabindex anywhere. |
| 2.4.11 Focus Appearance | 3 px `:focus-visible` outline with offset, globally, never removed. |
| 2.5.8 Target Size | 44 px minimum on buttons, inputs, filter options, slot cells. |
| 3.3.1/3.3.2 Error Identification | Errors associated via `aria-describedby`, announced with `role="alert"`, plus a form-level summary. Labels and hints on every field. |
| 4.1.3 Status Messages | `role="status"` on result counts and success states; `aria-live` on the Advo AI log. |
| 2.3.3 Animation from Interactions | All motion inside `prefers-reduced-motion: no-preference`. |
| Landmarks | `<header>`/`<main id="main">`/`<footer>`, `<nav aria-label>`, `<table><caption class="sr-only">`, breadcrumbs with `aria-current="page"`. |
| Dialogs | `role="dialog" aria-modal="true"`, Escape closes, body scroll locked. |
| Images | Decorative images `alt=""`; advocate portraits carry meaningful alt naming the source. Monogram fallback is `aria-hidden` with the name in adjacent text. |

## Verified by hand

Keyboard-drove the Advo AI combobox (arrow/Enter/Escape), the booking stepper, and the filter sheet. Confirmed focus visibility on dark and light surfaces.

## Not yet done

| Gap | Priority |
|---|---|
| No automated `axe` run in CI | P1 — the single highest-value addition |
| No screen-reader pass (VoiceOver/NVDA) | P1 |
| Booking calendar lacks full arrow-key grid navigation (slots are buttons in a grid, individually reachable but not 2-D navigable) | P2 |
| Colour contrast not machine-verified across every state combination | P2 |
| No skip-to-results link on the search page | P3 |
