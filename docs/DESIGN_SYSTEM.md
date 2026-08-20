# Design system

Implements [DESIGN.md](DESIGN.md) ("Vibrant Authority"). Single source of truth: `apps/web/app/globals.css`. No component hardcodes a colour, radius or spacing value.

## Tokens

**Colour** — Material role tokens: `surface` / `surface-*` (6 levels), `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `primary` / `on-primary` / `primary-container` / `on-primary-container`, `secondary`, `tertiary`, `error`, plus brand accents `action-orange`, `growth-teal`, `electric-lime`, `trust-navy`, and glass surfaces. Full dark-mode redefinition; every pairing re-checked at AA.

**Type scale** — fluid `clamp()`, so no breakpoint gymnastics: `t-display-xl` → `t-display-lg` → `t-headline-lg` → `t-headline-md` → `t-title` → `t-body-lg` → `t-body` → `t-body-sm` → `t-label-mono` → `t-caption`. Four families (see [ASSET_MANIFEST](ASSET_MANIFEST.md)).

**Spacing** — 8 px unit; gutter 24, container padding 32, section gap fluid `clamp(48px, 8vw, 120px)`. Utilities `gap-1|2|3|4|6|8` map to multiples of the unit. No arbitrary 17/23/37 px values.

**Radius** — `sm .25rem` · `default .5rem` · `md .75rem` · `lg 1rem` · `xl 1.5rem` · `full`. Inputs/buttons `.5rem`, cards `1rem`, images `1.5rem`, status chips pill.

**Elevation** — 5 shadows plus a brand-tinted `--shadow-primary`. Used sparingly; borders and surface contrast carry most separation.

**Motion** — `--t-fast 120ms` / `--t 200ms` / `--t-slow 320ms`, one easing curve. Everything inside `prefers-reduced-motion: no-preference`.

## The one documented deviation

DESIGN.md's component note specifies white text on Action Orange `#FF7A45` — **2.6:1, fails AA**. Its own Material roles already resolve this, so: solid buttons use `--primary #a73a05` with white (6.5:1); orange surfaces use `--primary-container #ff7a45` with `--on-primary-container #672000` (5.4:1). Same palette, AA clean. ADR-010.

## Components

`Button` (6 variants × 8 states incl. loading, no double-submit) · `DualSearch` (two-field, ARIA combobox) · `SearchInput` · `FilterPanel` (desktop rail / mobile sheet) · `ResultCard` (+ fact strip) · `MatchScore` (explainable) · `VerificationBadge` · `KindChip` / `ClaimChip` / `EvidenceChip` · `Avatar` (photo or monogram) · `BookingFlow` (5-step stepper) · `AdvoChat` + `AdvoLauncher` · `Forms` (`Field`, `SubmitButton`, `FormError`, `FormSuccess`) · `Skeleton` / `EmptyState` / `ErrorState` / `Notice` · `Header` / `Footer`.

One component per job. No `Button2`, no `MobileProfileCard` — responsive behaviour lives inside the component.

## Layout primitives

`.container` (max 1280, fluid padding) · `.section` / `.section-tight` · `.stack` / `.row` / `.wrap` · `.grid-auto` / `.grid-auto-lg` (auto-fit, `minmax(min(N, 100%), 1fr)`) · `.scroll-x` (self-scrolling wide content) · `.search-layout` / `.profile-layout` / `.consult-layout` / `.advo-layout`.

**Load-bearing detail:** every grid track is `minmax(0, 1fr)`, never `1fr`. A `1fr` track floors at min-content, so one wide table blows the whole grid out — the cause of defect E7.

## Reference-kit layer

From the purchased Envato kits, restyled for legal: `.wash` (iridescent glow, `overflow-x: clip`) · `.photo-stage` + `.float-card` (glass data cards breaking the image edge) · `.seg-bar` (segmented progress showing real coverage) · `.cat-grid` (collage tiles) · `.step-card` (4 tints) · `.plan` (featured dark variant) · `.acc` (accordion) · `.stepper` (booking) · `.fact-strip` (Practo listing model) · `.textured` (paper grain at 5.5%).
