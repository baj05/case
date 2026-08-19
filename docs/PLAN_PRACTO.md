# Plan: Practo-grade discovery, side chat bot, visual polish

Written 18 Aug 2026. Line by line, in dependency order. Each line is a thing I
will do, verify, and then say plainly whether it worked.

## Decisions taken up front

1. **Advo AI becomes side-only.** The floating panel stays and is the primary
   surface. `/advo-ai` is demoted to a thin explainer that opens the panel,
   because two competing chats is worse than one good one.
2. **Practo is the discovery model, not the visual model.** Practo's structure
   is what makes it work: a two-field hero search (what + where), category
   tiles, and listing cards where fee, experience and location are scannable in
   one pass. Its actual look is consumer-medical; the design stays in the
   DESIGN.md palette.
3. **Fonts get more serious.** Plus Jakarta Sans is friendly-geometric. Adding a
   restrained serif for display and pull-quotes gives the institutional register
   the brief asks for ("modern private chambers"), while keeping the sans for UI.

## Line by line

| # | Line item | Verify by |
|---|---|---|
| 1 | Study practo.com structure in the browser — hero, tiles, listing card, profile | Screenshot + note the transferable patterns |
| 2 | Dual-field hero search: "What legal help?" + "Where?", one submit, autocomplete on both | Type in each, confirm URL carries both params |
| 3 | Practice-area tile grid with icons in the Practo position (directly under hero) | Renders at 320 and 1440 without overflow |
| 4 | Rebuild the listing card on the Practo model: photo, name, designation, years, court, location, **fee**, verification, two actions | Fee and years visible without expanding anything |
| 5 | Add fee and experience filters + sort to search (fee low→high, high→low, years) | URL state round-trips; results actually reorder |
| 6 | "Available today" / "Accepting bookings" filter driven by real slot data | Zero false positives — must match generateSlots |
| 7 | Demote `/advo-ai` to an explainer; make the side panel the real surface | Panel opens from every page including the explainer |
| 8 | Add a serif display face; retune the type scale | Headings read institutional, not startup |
| 9 | Download background textures and section imagery, licensed and attributed | Appears at /credits with licence + author |
| 10 | Motion pass: scroll reveals, card lift, stagger on tiles, all behind `prefers-reduced-motion` | Reduced-motion off = static, verified in devtools |
| 11 | Responsive sweep at 320/375/390/414/768/834/1024/1280/1440/1920 | Scripted check for `scrollWidth > clientWidth` |
| 12 | Route sweep, tests, typecheck | All green, reported honestly |

## Not in this pass, and why

Authentication, and therefore the professional dashboard, corporate workspace,
LPO console, contract SaaS, mediation and arbitration. Reviews and referrals stay
compliance-gated. I will not claim these exist.
