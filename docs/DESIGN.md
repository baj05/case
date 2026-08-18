---
name: Vibrant Authority
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#58423a'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#8b7168'
  outline-variant: '#dfc0b5'
  surface-tint: '#a73a05'
  primary: '#a73a05'
  on-primary: '#ffffff'
  primary-container: '#ff7a45'
  on-primary-container: '#672000'
  inverse-primary: '#ffb59a'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#006972'
  on-tertiary: '#ffffff'
  tertiary-container: '#00b2c2'
  on-tertiary-container: '#003f45'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#802900'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#8ff1ff'
  tertiary-fixed-dim: '#4fd8e9'
  on-tertiary-fixed: '#001f23'
  on-tertiary-fixed-variant: '#004f56'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  action-orange: '#FF7A45'
  growth-teal: '#14B8A6'
  electric-lime: '#D9F99D'
  trust-navy: '#0F172A'
  glass-surface: rgba(255, 255, 255, 0.7)
  glass-border: rgba(255, 255, 255, 0.4)
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 80px
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  section-gap: 120px
  container-padding: 32px
  gutter: 24px
  overlap-offset: -40px
---

## Brand & Style

This design system reimagines legal technology through a lens of high-energy innovation and cutting-edge performance. It departs from the static, muted tones of traditional legal software to embrace a "High-Growth Legal Tech" aesthetic that feels as fast and dynamic as the firms it serves.

The style is a sophisticated blend of **Glassmorphism** and **High-Contrast Bold**. It maintains institutional trust through rock-solid typographic scales and rigorous alignment, but injects momentum using vibrant color pops, translucent frosted surfaces, and fluid, overlapping layouts. The goal is to evoke a feeling of "Intellectual Velocity"—where complex data is not just managed, but activated.

Visual hallmarks include:
- **Depth through Translucency:** Utilizing backdrop blurs to maintain context and layering.
- **Kinetic Energy:** Overlapping image treatments and asymmetrical grid elements.
- **Impactful Presence:** Massive headline treatments that demand attention and project confidence.

## Colors

The palette transitions from traditional conservative navies to a high-energy spectrum led by **Action Orange (#FF7A45)** and **Growth Teal (#14B8A6)**. These are used as tactical "accelerants" to highlight key metrics, calls-to-action, and progress indicators.

**Trust Navy (#0F172A)** remains the anchor, providing a grounded foundation for text and structural elements to ensure the platform feels authoritative. **Electric Lime (#D9F99D)** is used sparingly for "status-ready" or "verified" states, providing a fresh alternative to standard success greens.

Color application follows a "Vibrant Accent" rule: 90% of the interface remains clean and airy, while the remaining 10% uses highly saturated gradients and solids to guide the user's eye toward critical path actions.

## Typography

Typography is used as a primary design element rather than just a vehicle for information. **Plus Jakarta Sans** provides a modern, welcoming, yet professional geometric structure for display and headline roles. Its generous x-height and open apertures ensure clarity even at massive scales.

**Hanken Grotesk** serves as the workhorse for body copy, offering a sharp, contemporary feel that balances the expressiveness of the headlines. For technical precision—such as case numbers, financial data, and timestamps—**JetBrains Mono** is employed to signal technical accuracy.

- **Contrast:** High contrast between massive headers and functional body text.
- **Interaction:** Headlines often use color-span highlights (Orange/Teal) to emphasize "Success" or "Priority" within legal contexts.

## Layout & Spacing

The layout philosophy moves away from rigid blocks toward a **Dynamic Fluid Grid**. It utilizes a 12-column system on desktop with generous 120px vertical gaps between major sections to allow the design to breathe and reduce cognitive load.

Key layout features:
- **Asymmetrical Overlaps:** Components often "break" their containers (e.g., a card overlapping an image) to create depth and a sense of movement.
- **Safe Zones:** Despite the expressive nature, a strict 32px margin is maintained at the edges of the viewport to ensure readability.
- **Breakpoints:**
  - **Mobile (<640px):** Single column, 20px margins, typography scales down to mobile-specific roles.
  - **Tablet (640px - 1024px):** 2-column flex, 24px gutters.
  - **Desktop (>1024px):** Full 12-column grid, asymmetrical layouts enabled.

## Elevation & Depth

This design system uses **Glassmorphism** and **Ambient Glows** to establish hierarchy. Surfaces are not just stacked; they occupy a 3D space.

- **Backdrop Blurs:** Secondary panels and modal overlays use a 20px blur with a 70% white tint, allowing background colors to bleed through softly.
- **Luminescent Shadows:** Instead of neutral grays, shadows for primary interactive elements use a low-opacity tint of the brand color (e.g., an orange glow for primary buttons).
- **Surface-to-Surface layering:** Use semi-transparent borders (1px white at 40% opacity) on glass cards to define edges against vibrant backgrounds without creating heavy visual noise.

## Shapes

The shape language is **Rounded (0.5rem)**. This provides a soft, tech-forward feel that balances the sharp "institutional" typography.

- **Standard Cards:** Use 1rem (`rounded-lg`) to create distinct, friendly modules.
- **Input Fields & Buttons:** Use 0.5rem to maintain a crisp, professional touchpoint.
- **Status Chips:** Full "pill" roundedness is reserved for non-interactive status badges and category tags.
- **Image Masks:** Images should utilize the `rounded-xl` (1.5rem) radius to feel like integral, polished parts of the UI.

## Components

### Buttons
- **Primary Action:** Solid Action Orange (#FF7A45) with White text. Uses a subtle orange drop-shadow.
- **Secondary Action:** Glass-effect background (White 70% + Blur) with Trust Navy text and a 1px border.
- **Micro-Actions:** Growth Teal icon-only buttons for fast navigation within data-dense views.

### Glass Cards
Cards are the primary container. They should feature a `backdrop-filter: blur(20px)` and a subtle 1px white border. Content inside cards should follow the 8px spacing unit for internal padding.

### Input Fields
Inputs utilize a light gray background (#F1F5F9) with no border in their default state. Upon focus, they transition to a 2px Trust Navy border with a faint teal glow, signaling active engagement.

### Dynamic Progress Bars
Progress indicators (e.g., case completion) use a segmented design with Action Orange for the active state and Trust Navy for the remaining track, emphasizing a sense of "filling up" and momentum.

### Section Headers
Headers should often include a "pre-header" in `label-mono` style (uppercase, JetBrains Mono) to provide technical context before the high-impact Plus Jakarta headline.