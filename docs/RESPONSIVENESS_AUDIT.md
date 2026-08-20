# Responsiveness audit

Strategy: fluid first. `clamp()` type, `auto-fit` grids, `minmax(0, 1fr)` tracks, container-relative units. Breakpoints only where the interaction genuinely changes.

## Measured

| Width | Document overflow | Notes |
|---|---|---|
| 320 | **none** (320/320) | Dual search stacks; float cards go static; result-card actions wrap |
| 375 | none | |
| 768 | **none** (768/768) | Float cards pulled inside (fix R1); dual search still side-by-side (stack breakpoint is 720) |
| 1440 | **none** (1440/1440) | Filter rail appears at 900+ |

Method: measured `documentElement.scrollWidth` vs `clientWidth` in the live browser, plus an element sweep for anything extending past the viewport.

## Defects found and fixed

| # | Defect | Detection | Fix |
|---|---|---|---|
| R1 | `.float-card.float-br` extended past the viewport at 768 and was **clipped** by `.wash { overflow-x: clip }` — a live data card partly invisible, with **no scrollbar** to reveal it | Element-level right-edge sweep. A plain `scrollWidth` check would have passed. | Pull float cards inside between 721–1080 px |
| R2 | 288 px overflow at every width | `.wash::before` at `inset: -10% -20%` — exactly 20% of viewport | `overflow-x: clip` (contains without creating a scroll container or breaking sticky descendants) |
| R3 | `.skip-link` at `left: -9999px` extended the scrollable area | Same sweep | `transform: translateY(-120%)` reveal |
| R4 | 33 px overflow from ResultCard actions | Element sweep | `row wrap` on the action group |
| R5 | Courts table (min-width 480) blew out the grid at 320 | Offender trace | `minmax(0, 1fr)` tracks + `.scroll-x { min-width: 0 }` |

## Mobile is not a shrunk desktop

| Desktop | Mobile |
|---|---|
| Inline filter rail (sticky, 280 px) | Bottom sheet with count + "Show N results" |
| Full pill navigation | Compact header + full-screen drawer, scroll locked |
| Two-field search side by side | Stacked fields, full-width submit |
| Float cards overlapping the hero image | Static cards in flow below it |
| Advo AI side panel (880 px, bottom-right) | Full-width bottom sheet, 92vh |
| Wide tables | Self-scrolling containers with visible affordance |

## Known gap

Widths 390, 414, 834, 1024, 1280, 1920 were **not individually measured** in the final pass. The iframe-based sweep that would have covered all ten was blocked by our own `X-Frame-Options: DENY` — the security header working correctly, the test method at fault. Representative widths (320 / 375 / 768 / 1440) were measured directly and the layout is fluid between them, but a Playwright matrix is the correct fix and is listed in [IMPLEMENTATION_ROADMAP](IMPLEMENTATION_ROADMAP.md).
