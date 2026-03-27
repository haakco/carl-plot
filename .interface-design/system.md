# Design System

## Direction

Personality: Precision & Density
Foundation: Cool (slate) — dark mode default for domain coloring contrast
Depth: Borders-only (no shadows — clean, technical feel)

## Intent

**Who:** University students taking a first or second course in complex analysis. They open this on laptops (often Chromebooks) or iPads. They are not programmers.

**What they do:** Build intuition about how poles and zeros shape complex functions. Drag singularities, see domain coloring respond in real time, read the formula.

**How it should feel:** A precision instrument that feels alive. Cold like a terminal, but responsive like a musical instrument. Dense with information but not cluttered. Closer to Shadertoy or Desmos than to a textbook applet.

## Domain Exploration

**Domain concepts:** Complex plane, poles, zeros, phase, modulus, contour lines, branch cuts, conformal mapping, residues, unit circle, Riemann surface

**Color world:** The rainbow phase wheel (hue = argument), black at zeros, white at poles, cyan for negative reals, red for positive reals. Slate/charcoal for chrome. The domain coloring IS the color palette — UI must not compete.

**Signature:** The domain coloring canvas itself — a shimmering, alive color field that responds to every drag. The pole (x) and zero (o) markers from control theory. The live KaTeX formula that mirrors the visual.

**Defaults rejected:**
1. Dashboard card grid layout — this is a single-canvas instrument, not a metrics page
2. Bright accent-heavy sidebar — UI chrome must recede behind the coloring
3. Tutorial wizard / onboarding modal — the preloaded example IS the tutorial

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32

### Colors
--foreground: slate-900 (light) / slate-50 (dark)
--secondary: slate-600 (light) / slate-400 (dark)
--muted: slate-400 (light) / slate-500 (dark)
--faint: slate-200 (light) / slate-800 (dark)
--border: rgba(0, 0, 0, 0.08) (light) / rgba(255, 255, 255, 0.08) (dark)

#### Semantic — Pole/Zero Accents
--pole-color: oklch(0.65 0.18 25) — warm red-orange for poles (x markers)
--pole-bg: oklch(0.65 0.18 25 / 0.12) — subtle pole background
--zero-color: oklch(0.65 0.15 195) — cool blue-teal for zeros (o markers)
--zero-bg: oklch(0.65 0.15 195 / 0.12) — subtle zero background

#### Surface Elevation (dark mode primary)
Level 0: slate-950 — app canvas / base
Level 1: slate-900 — panels, toolbox rail (same visual plane, border-separated)
Level 2: slate-850 — dropdowns, popovers (floating)
Level 3: slate-800 — nested overlays (rare)

### Radius
Scale: 4px, 6px, 8px (sharp, technical)

### Typography
UI font: IBM Plex Sans (purposeful technical sans — NOT system-ui)
Data font: IBM Plex Mono with `font-variant-numeric: tabular-nums`
Scale: 12, 13 (labels/UI default), 14 (base), 16, 18
Weights: 400 (body), 500 (labels/UI), 600 (headings)

Coordinate readout, probe values, and placed-list values: monospace (IBM Plex Mono)

## Patterns

### Button
- Height: 32px (compact)
- Padding: 8px 12px
- Radius: 4px
- Font: 13px, 500 weight
- Border: 1px solid (faint)
- Usage: Toolbox actions, view toggles

### Panel / Rail Section
- Border: 0.5px solid var(--border)
- Padding: 12px
- Radius: 6px
- No shadow
- Sections separated by spacing + subtle rules, not stacked cards

### Pole Marker
- Shape: x (cross), 12px, 2px stroke
- Color: var(--pole-color)
- Selected: 16px + highlight ring
- Hit target: 44px minimum

### Zero Marker
- Shape: o (circle), 12px, 2px stroke
- Color: var(--zero-color)
- Selected: 16px + highlight ring
- Hit target: 44px minimum

### Coordinate Readout
- Font: IBM Plex Mono, 13px, tabular-nums
- Background: semi-transparent slate-900/80
- Padding: 4px 8px
- Radius: 4px
- Position: bottom-right of canvas

### Formula Bar
- Height: 48px fixed, expandable to 80px
- Background: one level above base (Level 1)
- Border-top: 0.5px solid var(--border)
- KaTeX rendered inline, left-aligned
- Controls right-aligned: form toggle, copy button

### Toolbox Rail
- Width: 200px fixed (docked)
- Collapsible to icon strip
- Border-right: 0.5px solid var(--border)
- Sections: Create > Placed > Examples > Controls

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Borders-only depth | Mathematical instrument — density and clarity over lift | 2026-03-27 |
| Dark mode default | Domain coloring contrast is dramatically better on dark backgrounds | 2026-03-27 |
| IBM Plex Sans + Mono | Technical character, distinct from system-ui defaults, excellent monospace companion for data | 2026-03-27 |
| OKLCH for semantic colors | Perceptually uniform — pole red and zero blue at matched visual weight | 2026-03-27 |
| 4px spacing base | Precision tool requires tight, dense layout — not generous spacing | 2026-03-27 |
| No shadows anywhere | Borders-only commitment — shadows would fight the domain coloring visual | 2026-03-27 |
| Canvas owns 70%+ width | The visualization IS the product — UI chrome must not compete | 2026-03-27 |
| Pole = red/orange, Zero = blue/teal | Matches control systems convention and provides clear semantic distinction | 2026-03-27 |
