# Complex Function Explorer — Complete Build Specification

You are building a **web-based interactive complex function explorer** — an educational tool for students learning complex analysis. The app lets users drag poles and zeros onto a complex plane, see real-time GPU-accelerated domain coloring of the resulting function, toggle a 3D magnitude surface view, and read a live-updating LaTeX formula showing the constructed function. Think of it as "Desmos for complex analysis."

This document is the complete specification. Read it fully before planning or writing any code.

---

## Table of Contents

1. [Product Vision & Audience](#1-product-vision--audience)
2. [Core Features](#2-core-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [UI Layout & Design System](#5-ui-layout--design-system)
6. [Domain Coloring — Theory & GPU Implementation](#6-domain-coloring--theory--gpu-implementation)
7. [3D Magnitude Surface](#7-3d-magnitude-surface)
8. [Interaction Design — Poles & Zeros](#8-interaction-design--poles--zeros)
9. [Formula Display & Expression System](#9-formula-display--expression-system)
10. [State Management Architecture](#10-state-management-architecture)
11. [Performance Budget & Degradation Strategy](#11-performance-budget--degradation-strategy)
12. [Project Structure](#12-project-structure)
13. [Build, Lint & Quality Gates](#13-build-lint--quality-gates)
14. [Accessibility](#14-accessibility)
15. [Phased Implementation Plan](#15-phased-implementation-plan)
16. [Design Validation Checklist](#16-design-validation-checklist)
17. [Reference Implementations & Resources](#17-reference-implementations--resources)

---

## 1. Product Vision & Audience

### Who is this for?

University students taking a first or second course in complex analysis. They open this tool on laptops (often Chromebooks or budget Windows machines with Intel integrated GPUs), sometimes iPads. They are not programmers — the interface must be immediately graspable without instruction.

### What must they accomplish?

- **Build intuition** about how poles and zeros shape a complex function's behavior
- **See** the relationship between a function's algebraic form and its visual structure (domain coloring)
- **Explore** by dragging singularities around and watching the coloring update in real time
- **Switch views** between 2D domain coloring and 3D magnitude surface to understand |f(z)| as a landscape

### What should this feel like?

**A precision instrument that feels alive.** Cold like a terminal, but responsive like a musical instrument — every drag produces an immediate, beautiful visual response. Dense with information but not cluttered. The aesthetic is closer to Shadertoy or Desmos than to a textbook applet.

---

## 2. Core Features

### MVP (Phase 1)

1. **Domain coloring canvas** — Full GPU-accelerated rendering via WebGL2 fragment shaders. Enhanced domain coloring with modulus contours, phase contours, and optional grid lines
2. **Pole/zero toolbox** — Draggable pole (×) and zero (○) elements in a sidebar panel. Drag onto the complex plane to place. Drag to reposition. Click to select, Delete/Backspace to remove
3. **Live formula bar** — KaTeX-rendered formula showing f(z) in factored form, updating on every interaction frame
4. **Pan/zoom** — Mouse wheel zoom (centered on cursor), click-drag to pan the complex plane. Pinch-to-zoom on touch devices
5. **Coordinate readout** — Persistent display of cursor position as (Re, Im) on the complex plane
6. **Command palette** — Cmd+K opens palette with: reset view, clear all poles/zeros, toggle contour lines, toggle grid, switch to 3D view, preset functions (identity, 1/z, z², sin(z))

### MVP+ (Phase 2)

7. **3D magnitude surface** — Toggle view showing |f(z)| as a height field over the complex plane, colored by arg(f(z)). Orbit camera controls
8. **Expression input** — Text field where users can type arbitrary complex expressions (parsed by math.js, compiled to GLSL at runtime). The pole/zero toolbox and expression input are two modes for defining the function
9. **Preset gallery** — Curated set of interesting functions with thumbnails: Möbius transformations, Joukowski airfoil, Riemann zeta (approximation), rational functions with interesting pole/zero configurations
10. **URL state** — Encode current function + viewport in URL hash for sharing
11. **Dark/light mode** — With SSR-safe ThemeProvider, defaulting to dark (better for domain coloring contrast)

### Future (Phase 3+)

12. Nyquist plot overlay
13. Animated parameter sweeps
14. Conformal mapping grid visualization
15. Export as image/SVG
16. Tutorial/guided exploration mode

---

## 3. Technology Stack

### Core Framework

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Runtime | Node.js | **24.x** | Project standard runtime. Use Node 24 locally, in CI, and in deployment/dev tooling for consistency with the rest of HaakCo |
| Package manager | pnpm | **10.x** | Project standard package manager. Use pnpm for install, scripts, lockfile, and workspace/tooling consistency |
| Build | Vite | 8.x | Rolldown-based bundler (10-30x faster builds), native ESM, plugin ecosystem. Fall back to Vite 7 if Vike compatibility issues arise |
| Routing | Vike | latest | SPA mode for this app (no SSR needed — single interactive page). File-based routing if multi-page later |
| UI Framework | React | 19.x | Hooks, concurrent features, R3F compatibility |
| Language | TypeScript | 5.9+ | Strict mode. Use `tsgo` for fast type checking |
| Type checking | tsgo (fallback: tsc) | latest | ~7s vs ~60s with tsc. tsgo is experimental — fall back to tsc if unavailable |

### Rendering & GPU

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| 2D domain coloring | **Raw WebGL2** | Single fullscreen quad + fragment shader. No scene graph overhead. 95.6% browser coverage vs WebGPU's 82.7%. Every existing domain coloring tool uses WebGL |
| 3D magnitude surface | **react-three-fiber** v9.5+ with Three.js | Scene graph management, OrbitControls, lighting, shaderMaterial from drei. Supports React 19 |
| Shader bundling | **vite-plugin-glsl** | `#include` directives for modular GLSL, HMR for shader dev, minification in production |

**Why not WebGPU?** For an educational tool, the 13% browser coverage gap matters — students on older iPads, Linux lab machines, and school-managed browsers. Domain coloring is a single-draw-call fragment-shader workload where both APIs deliver identical GPU performance. If WebGPU migration is needed later, Three.js r171+ supports automatic WebGL2 fallback via TSL.

### UI & Styling

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Styling | Tailwind CSS 4 | Token-based design system, utility-first |
| Components | shadcn/ui + Radix | Accessible primitives, keyboard navigation |
| Icons | Lucide React | Named imports only (no wildcard). Consistent with shadcn |
| Toasts | Sonner | Consistent with shadcn feedback patterns |
| Command palette | cmdk + react-hotkeys-hook | Required UX pattern for keyboard-first navigation |

### Interaction & Math

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Drag/gesture | @use-gesture/react | Canvas-aware drag/pinch/zoom, same ecosystem as R3F |
| 2D pan/zoom | d3-zoom | Battle-tested transform management with zoom-to-cursor |
| Math rendering | KaTeX v0.16+ | Synchronous rendering (no reflow), 60fps-viable formula updates. ~25KB gzipped |
| Expression parsing | math.js | Full complex number support, AST access via `math.parse()`, `node.toTex()` for LaTeX output |
| Complex arithmetic (JS) | complex.js | Lightweight (~10KB), for UI-side calculations outside the shader |

### State Management

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Global state | @tanstack/store + @tanstack/react-store | `store.state` readable outside React (GPU render loop). Framework-agnostic core. No provider wrapping |
| Undo/redo | Custom history middleware on TanStack Store | State history stack for pole/zero manipulations via `store.subscribe()` snapshots |

### Quality & DX

| Layer | Technology |
|-------|-----------|
| Runtime/package standard | Node 24 + pnpm |
| Linting | Biome (formatting + linting) + jscpd (duplication) |
| Testing | Vitest + React Testing Library (unit/integration), Playwright (e2e) |
| API mocking | MSW |
| Bundle analysis | bundlemon + Vite visualizer |

### Environment Standard

- **Runtime:** Node.js 24.x only
- **Package manager:** pnpm only
- **Lockfile:** commit `pnpm-lock.yaml`; do not introduce `package-lock.json`, `yarn.lock`, or Bun lockfiles
- **Script execution:** all local and CI commands should run through `pnpm`
- **Version pinning:** use `.nvmrc`, `.node-version`, or equivalent project metadata to lock Node 24 in development environments

---

## 4. Architecture Overview

### The Critical Principle: Decouple GPU from React

React owns the DOM — the toolbar, formula bar, control panels, command palette. The WebGL2 renderer runs in its own `requestAnimationFrame` loop, entirely outside React's reconciliation cycle. Communication flows through TanStack Store and refs:

```
React Component Tree                    Imperative WebGL Layer
┌──────────────────────────┐            ┌──────────────────────────────┐
│ App                      │            │ DomainColoringRenderer       │
│  ├─ Toolbar              │            │  - canvas ref                │
│  │  ├─ PoleZeroToolbox   │──store───→│  - compileShader()           │
│  │  ├─ ViewControls      │            │  - updateUniforms()          │
│  ├─ FormulaBar (KaTeX)   │            │  - render() @ 60fps via rAF │
│  ├─ CoordinateReadout    │            │  - handleResize()            │
│  ├─ Canvas (ref)  ───────│──ref─────→ │  - handleContextLoss()       │
│  ├─ CommandMenu (cmdk)   │            └──────────────────────────────┘
│  ├─ ThreeSurfaceView     │            ┌──────────────────────────────┐
│  │  (react-three-fiber)  │            │ Three.js WebGLRenderer       │
│  │  ├─ SurfaceMesh       │            │  (managed by R3F)            │
│  │  ├─ OrbitControls     │            └──────────────────────────────┘
└──────────────────────────┘
```

### Rules

- **Never pass WebGL objects as React state.** Use `useRef` for the renderer instance, shader programs, uniform locations, and mutable GPU state
- **Never trigger React re-renders from the render loop.** The rAF loop reads from `explorerStore.state` each frame — TanStack Store's vanilla API, no hooks, no subscriptions
- **React UI components** subscribe to TanStack Store via `useStore(explorerStore, s => s.poles)` from `@tanstack/react-store` — these re-render only when their specific slice changes
- **Uniform updates** (pole/zero positions during drag) cost one `gl.uniform2fv()` call per frame — effectively free
- **Shader recompilation** happens only on structural function changes (switching from rational to exponential, or editing the expression text field). Never during drag operations

---

## 5. UI Layout & Design System

### Design Direction

**Precision & Density** — tight, technical, monochrome. This is a developer/math tool where information density matters.

```
Direction: Precision & Density
Foundation: Cool (slate) — dark mode default for domain coloring contrast
Depth: Borders-only (no shadows — clean, technical feel)
Spacing base: 4px (scale: 4, 8, 12, 16, 24, 32)
Radius: 4px, 6px, 8px (sharp, technical)
Typography:
  - UI/chrome font: **IBM Plex Sans** or **Geist** class of typeface; final implementation should choose one purposeful technical sans, not default `system-ui`
  - Data/coordinates: dedicated monospace with `tabular-nums`
  - Scale: 12–18px
  - Weights: 400/500/600
  - Labels/UI default: 13px, 500 weight
  - Coordinates, probe values, and placed-list values must use the monospace family consistently
Button: 32px height, 8px 12px padding, 4px radius
Card/Panel: 0.5px border rgba(0,0,0,0.08), 12px padding, 6px radius, no shadow
```

### Layout Structure

The app is a single full-viewport page with this structure:

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Bar: App title | View toggle (2D/3D) | Settings | Cmd+K    │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Toolbox   │                                                    │
│  Panel     │           Main Canvas                              │
│  ────────  │           (WebGL2 domain coloring                  │
│  ┌──┐ ┌──┐│            OR react-three-fiber 3D surface)        │
│  │×○│ │×●││                                                    │
│  └──┘ └──┘│           Coordinate readout overlay (bottom-right) │
│  Poles  Z. │                                                    │
│            │                                                    │
│  ────────  │                                                    │
│  Placed:   │                                                    │
│  × 1+2i   │                                                    │
│  × 1-2i   │                                                    │
│  ○ 0+0i   │                                                    │
│            │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│ Formula Bar: f(z) = z · ────────── | [Factored ▾] [Copy LaTeX] │
│                         (z-(1+2i))(z-(1-2i))                   │
└─────────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

The workspace is intentionally not democratic. Users must know what matters first without reading instructions.

**Primary / secondary / tertiary order**

1. **Main canvas** — the visual field is the product. It must dominate the viewport and remain visually calm enough that poles, zeros, contours, and singular behavior are the loudest elements.
2. **Current interaction target** — whichever object or mode the user is actively manipulating (selected pole/zero, hover probe, drag ghost, or active view toggle) becomes the temporary focal point through contrast and motion.
3. **Formula bar** — the algebraic expression is the explanatory mirror of the canvas, not the lead actor. It should be continuously visible but visually quieter than the field.
4. **Toolbox panel** — the toolbox is setup and control, not content. It should stay legible and available without competing with the canvas.
5. **Top bar utilities** — app title, settings, and command access are tertiary chrome.

**Hierarchy rules**

- The canvas owns at least 70% of desktop width in the default 2D workspace.
- At rest, no more than one persistent accent color may compete with domain coloring; poles and zeros provide the semantic accents.
- Only one region may use strong selection styling at a time.
- If a control is not needed during active drag, it should visually recede during drag rather than compete for attention.

### Screen Modes & Structural Layout

The app has three distinct workspace modes. They share a visual language, but each mode has a different structural priority.

```
MODE A: 2D Explore (default)
Top bar      -> global controls
Left panel   -> create/manage poles and zeros
Main field   -> domain coloring canvas
Bottom bar   -> formula + representation controls
Overlay      -> coordinate/probe readout

MODE B: 3D Surface
Top bar      -> view controls + camera reset
Left panel   -> same source-of-truth list, slightly compressed
Main field   -> 3D surface canvas
Bottom bar   -> formula remains visible, but secondary
Overlay      -> reduced to essentials to avoid obscuring the surface

MODE C: Expression Mode
Top bar      -> same global controls
Left panel   -> expression presets, examples, parse status
Main field   -> same 2D/3D visualization canvas
Bottom bar   -> formula becomes editable source, not just output
Overlay      -> parse/error feedback stays near the input source, not floating on canvas
```

### First-Run Structure

First use must answer three questions in under 10 seconds:

1. What am I looking at?
2. What can I do first?
3. What happens when I do it?

**Default first-run sequence**

1. User lands in **2D Explore** mode with a **simple preloaded example** already visible on the plane.
2. The default example should be mathematically legible at a glance: one zero at the origin and one pole on the positive real axis, or an equally simple alternative that clearly shows color rotation and singular behavior.
3. The left panel includes a compact **Examples** section with 3-5 curated starter states such as Identity, Single Pole, Single Zero, Conjugate Pair, and Lightly Damped Pair.
4. A visible **Start from empty** action clears the workspace and switches the user into free exploration mode.
5. The pole and zero prototype cards remain visibly draggable, with a short inline cue explaining that users can drag new singularities onto the field.
6. On first drag or first example load, the onboarding cue collapses and the workspace shifts into normal expert mode.

This keeps the first-run experience legible, gives immediate visual payoff, and still preserves an obvious path into blank-canvas exploration without adding a heavyweight tutorial layer.

### Toolbox Panel (Left Sidebar)

- **Role**: This is an **instrument rail**, not a generic app sidebar. It should feel like a compact tray of mathematical tools beside the field, with minimal card treatment and strong vertical rhythm.
- **Width**: 200px fixed in the default docked layout, with collapsible sections and a full-rail collapse state
- **Section order**:
  1. **Create** — draggable prototype tools
  2. **Placed** — live poles and zeros currently in the function
  3. **Examples** — small curated starter states
  4. **Controls** — gain and mode-specific controls
- **Docked vs floating behavior**:
  - The **docked rail** is the default and the canonical layout used for onboarding, responsive behavior, and screenshots/docs
  - Users may switch the rail into a **floating tool panel** mode for maximum canvas space
  - The floating panel behaves like a lightweight studio palette: draggable, pinnable, and dismissible without losing state
  - Switching between docked and floating modes must preserve open sections, selection state, and current scroll position
- **Collapsibility**:
  - Each section is individually collapsible
  - The entire rail can collapse to an icon strip when the user wants more canvas space
  - Collapse/expand must preserve the current workspace state and selection
- **Visual treatment**:
  - Avoid stacked dashboard cards or repeated boxed sections
  - Separate sections primarily with spacing, labels, and subtle rules rather than heavy containers
  - Examples must read as a tertiary strip, not as promotional content
- **Top section**: Two draggable prototype elements:
  - **Pole** (×): rendered as a small card with an × icon and label "Pole". Red/orange accent color
  - **Zero** (○): rendered as a small card with a ○ icon and label "Zero". Blue/teal accent color
  - Drag FROM these cards onto the canvas to place a new pole/zero
- **Middle section**: "Placed" list showing all current poles and zeros
  - Each row: icon (×/○) + complex coordinate in monospace + delete button (X)
  - Click a row to select and highlight on canvas
  - Drag a row to reorder (cosmetic only)
  - Conjugate pairs grouped visually with a bracket or subtle background
- **Bottom section**: Gain slider (K multiplier for the transfer function)
- **Semantic colors**: poles use `--destructive` variants (red family), zeros use `--accent` variants (blue/teal family)

### Floating Tool Panel Rules

If the user chooses the floating panel mode, it must behave like a deliberate creative-tool palette rather than a random detached card.

- Default placement: top-left of the canvas with safe margins from viewport edges
- Size: same content model as the docked rail, but slightly narrower if needed to reduce field obstruction
- Movement: draggable by a dedicated header area, not by the entire body
- Layering: one elevation level above the canvas overlays, below modal/popover UI
- Obstruction management: a one-click "snap back to dock" action must always be visible
- Responsive rule: floating mode is desktop-only; tablet/mobile fall back to docked/collapsed behavior

### Responsive Behavior

Responsive design for this product is not "stack everything." Each viewport keeps the field as the primary surface, but the control model changes intentionally.

**Desktop**

- Docked instrument rail is the default
- Optional floating panel is available
- Formula bar remains persistently visible at the bottom

**Tablet**

- The canvas remains the persistent base layer
- Tools move into a **slide-in instrument drawer** or collapsible edge palette
- The drawer may cover part of the field temporarily, but should never permanently reduce the field to a narrow column
- The formula bar remains visible in a compact form, expanding on demand for long formulas
- 3D view and examples remain available, but secondary controls should be grouped more aggressively than on desktop

**Mobile**

- Default to 2D view only unless performance/headroom clearly supports 3D
- Controls use bottom-sheet or edge-drawer patterns rather than persistent side chrome
- The field stays visible behind control layers whenever possible
- Probe information simplifies to the most important values first

### What Already Exists

This repo does not yet contain a production UI or reusable component vocabulary for this app. The plan should therefore reuse **design decisions**, not existing implementation.

- **Design direction already established in this plan:** Precision & Density, slate foundation, borders-only depth, compact controls, monospace data treatment
- **Interaction patterns already established in this plan:** docked instrument rail, optional floating panel, curated examples, persistent formula bar, 2D/3D shared workspace model
- **External design guidance to align with:** HaakCo UI design principles favor subtle layering, explicit hierarchy, and non-generic tool interfaces over dashboard-card defaults

### Not In Scope

The following were considered during design review and are intentionally deferred to keep the first implementation coherent:

- **Heavy tutorial mode or multi-step onboarding flow** — first-run cues and curated examples are sufficient for v1
- **A separate lecturer-only product shell** — presentation behavior is a display profile, not a parallel interface
- **Floating-panel support on tablet/mobile** — desktop only for now to avoid overlap and touch-management complexity
- **Full mobile parity with the desktop toolset** — mobile should remain useful, but desktop/tablet carry the full instrument experience
- **Decorative marketing-style visual treatments** — no hero-like chrome, ornamental gradients, or dashboard-card mosaics

### Formula Bar (Bottom)

- **Height**: 48px fixed, expandable to 80px for complex formulas
- **Left**: KaTeX-rendered formula, updating live during drag at 60fps
- **Right**: Toggle between factored form `K·∏(z-zᵢ)/∏(z-pⱼ)` and expanded polynomial form
- **Right**: "Copy LaTeX" button copies the formula as LaTeX string to clipboard
- **Background**: slightly elevated surface (one level above base)

### Coordinate Readout

- **Position**: overlaid on bottom-right of canvas, semi-transparent background
- **Content**: `z = X.XX + Y.YYi` in monospace, updating on mousemove
- **Additional**: show `f(z) = A.AA + B.BBi` and `|f(z)| = R.RR, arg(f(z)) = θ.θθ°` when hovering

### Top Bar

- **Left**: App name/logo
- **Center**: View toggle — segmented control with "2D" and "3D" options
- **Right**: Settings gear (opens panel for: toggle contour lines, toggle grid, toggle modulus shading, contour density slider, color scheme picker), Cmd+K hint badge

### State Coverage

Every UI section must have these states implemented before presenting:

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Domain coloring canvas | Skeleton gradient | Gray plane with grid (no function) | "WebGL not supported" with fallback message | Live domain coloring at target frame rate | Keep last good frame visible while showing a non-blocking recovery banner |
| Pole/zero list | N/A | "Drag a pole or zero onto the plane to begin" with arrow pointing to toolbox | N/A | List reflects current singularities and selection state | Reordering unavailable or selection lost -> list stays readable with action-specific message |
| Formula bar | "f(z) = ..." placeholder | "f(z) = 1" (identity, no poles/zeros) | Red-highlighted parse error with message | Rendered KaTeX formula matches current state | Last valid formula remains visible while inline error explains the new invalid edit |
| 3D surface view | Wireframe loading skeleton | Flat plane at z=1 | "WebGL context lost — click to restore" | Responsive orbitable surface view | If 3D fails, return to 2D with explanation and one-click retry |
| Expression input | N/A | Placeholder: "Type an expression, e.g. z^2 + 1/z" | Inline error below input with the compilation error | Parsed expression drives the current view | Invalid draft stays local while the last working expression continues rendering |

### Partial Failure Principles

This product must fail like an instrument, not like a web form. A subsystem failure should preserve orientation whenever possible.

- **Keep the last trustworthy visual state** on screen until a replacement is ready.
- **Localize the failure message** near the control that caused it. Do not replace the whole workspace unless the whole workspace is actually unusable.
- **Explain capability limits plainly**: "3D view needs more graphics support; 2D is still available" is better than a raw WebGL error.
- **Always offer a next action**: retry, return to 2D, reset example, or edit the expression.
- **Do not destroy user work** when a mode fails. Current poles, zeros, viewport, and formula state survive failed transitions.

### User Journey & Emotional Arc

The default experience is **student-first**, but the product must also support **presentation-safe teaching** without becoming a separate product.

| Step | User Does | User Feels | Plan Must Support |
|------|-----------|------------|-------------------|
| 1 | Lands on the page | Curious but slightly intimidated | Immediate visual payoff via the preloaded example; no blank dead zone |
| 2 | Scans the workspace | Orienting | Clear hierarchy: canvas first, example controls second, formula third |
| 3 | Drags a pole or zero | Agency | Instant field response with no modal interruption |
| 4 | Reads the formula and probe | Understanding forming | Algebra and geometry remain visibly linked |
| 5 | Loads another example | Confidence | Easy recovery path; examples feel like invitations, not menu clutter |
| 6 | Switches to 3D or expression mode | Experimentation | Mode change preserves context and explains what changed |
| 7 | Shares or reopens a state | Trust | The same function and viewport reliably return |

**Time-horizon requirements**

- **First 5 seconds:** the user should understand that this is a live math surface they can manipulate.
- **First 5 minutes:** the user should experience at least one self-caused "aha" moment where a visual change maps to a formula change.
- **Long-term relationship:** the tool should feel dependable enough for repeated study sessions and calm enough for classroom use.

### Lecturer-Friendly Presentation Pattern

The default UI remains optimized for personal exploration, but the plan must include a lightweight presentation-safe mode for Carl or any lecturer using it in front of a room.

**Presentation mode requirements**

- Increase formula and coordinate-readout legibility without changing the underlying interaction model.
- Collapse secondary chrome so the projected canvas stays dominant.
- Promote examples/presets and reset actions so a lecturer can move between teaching moments quickly.
- Suppress fragile hover-only dependencies where possible; projected use favors click/toggle clarity over subtle hover details.
- Preserve the same underlying state model as student mode; presentation mode is a display/control profile, not a separate app branch.

---

## 6. Domain Coloring — Theory & GPU Implementation

### Mathematical Foundation

Domain coloring visualizes a complex function f: ℂ → ℂ by mapping the **output** w = f(z) to a color at each pixel representing input z:

- **Hue** ← `arg(f(z))`: phase angle maps to the color wheel
  - 0 (positive real) → red
  - π/2 (positive imaginary) → yellow-green  
  - π (negative real) → cyan
  - -π/2 (negative imaginary) → blue-violet
- **Lightness** ← function of `|f(z)|`:
  - Standard mapping: `ℓ(r) = (2/π)·arctan(r)` — smoothly maps [0,∞) to [0,1)
  - Satisfies symmetry: `ℓ(1/r) = 1 - ℓ(r)` so inverse functions are symmetrically light/dark
- **Saturation** ← fixed at 0.8–1.0

### Visual Signatures of Poles and Zeros

- **Zeros**: all hues converge, brightness → black (|f| → 0). Colors cycle **counterclockwise** around zeros
- **Poles**: all hues converge, brightness → white (|f| → ∞). Colors cycle **clockwise** around poles  
- **Order k zero/pole**: colors cycle k times around the point
- **Essential singularities**: chaotic color oscillation near the point (Picard's theorem)

### Enhanced Domain Coloring (Contour Lines)

Superimpose contour structure on the basic coloring:

- **Modulus contours**: `fract(log₂|f(z)|)` creates rings at logarithmically-spaced intervals where |f| doubles. Darken pixels near the contour lines
- **Phase contours**: `fract(n · arg(f(z)) / 2π)` for n evenly-spaced isochromatic lines (typically n=6 or n=12)
- **Grid lines**: overlay integer values of Re(f) and Im(f) using `smoothstep` for anti-aliased lines
- At conformal points, modulus × phase contours form approximately square tiles. Near singularities, tiles distort — this is diagnostic

### GLSL Fragment Shader Implementation

The fragment shader evaluates f(z) at every pixel. Complex numbers are `vec2` (.x = real, .y = imaginary).

#### Complex Arithmetic Library (complex-math.glsl)

```glsl
// Multiplication: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// Division: (a+bi)/(c+di)
vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2(dot(a, b), a.y*b.x - a.x*b.y) / max(d, 1e-10);
}

// Power (real exponent): z^n via polar form
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(n * theta), sin(n * theta));
}

// Logarithm (principal branch, cut on negative real axis)
vec2 clog(vec2 z) {
    return vec2(log(length(z)), atan(z.y, z.x));
}

// Exponential: e^(a+bi) = e^a(cos(b) + i·sin(b))
vec2 cexp(vec2 z) {
    return exp(z.x) * vec2(cos(z.y), sin(z.y));
}

// Complex sine: sin(a+bi) = sin(a)cosh(b) + i·cos(a)sinh(b)
vec2 csin(vec2 z) {
    return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// Complex cosine
vec2 ccos(vec2 z) {
    return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
}
```

#### Color Mapping (color-mapping.glsl)

```glsl
// Compact branchless HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Domain coloring: map complex value w = f(z) to RGB
vec3 domainColor(vec2 w, float contourDensity, bool showModContours, bool showPhaseContours, bool showGrid) {
    float arg = atan(w.y, w.x);           // Phase: (-π, π]
    float mag = length(w);                  // Modulus
    
    // Base coloring
    float hue = arg / (2.0 * 3.14159265) + 0.5;  // Map (-π,π] to [0,1]
    float lightness = (2.0 / 3.14159265) * atan(mag);  // Smooth [0,∞) → [0,1)
    float saturation = 0.85;
    
    // Enhanced contours
    float modContour = 1.0;
    float phaseContour = 1.0;
    float gridLine = 1.0;
    
    if (showModContours) {
        float logMag = log2(max(mag, 1e-10));
        modContour = 0.7 + 0.3 * (0.5 + 0.5 * cos(2.0 * 3.14159265 * logMag * contourDensity));
    }
    
    if (showPhaseContours) {
        float phaseLines = 0.5 + 0.5 * cos(6.0 * arg);  // 6 phase lines
        phaseContour = 0.7 + 0.3 * phaseLines;
    }
    
    if (showGrid) {
        float gx = 1.0 - smoothstep(0.0, 0.05, abs(fract(w.x + 0.5) - 0.5));
        float gy = 1.0 - smoothstep(0.0, 0.05, abs(fract(w.y + 0.5) - 0.5));
        gridLine = 1.0 - 0.3 * max(gx, gy);
    }
    
    lightness *= modContour * phaseContour * gridLine;
    
    return hsv2rgb(vec3(hue, saturation, lightness));
}
```

#### Main Fragment Shader — Pole/Zero Evaluation via Uniform Arrays

This is the **critical performance pattern**: poles and zeros are stored in uniform arrays. Dragging never recompiles the shader — it only updates uniform values.

```glsl
#version 300 es
precision highp float;

#define MAX_SINGULARITIES 32

uniform vec2 u_resolution;
uniform vec2 u_center;      // Pan offset (complex plane center)
uniform float u_zoom;        // Zoom level
uniform int u_numPoles;
uniform int u_numZeros;
uniform vec2 u_poles[MAX_SINGULARITIES];
uniform vec2 u_zeros[MAX_SINGULARITIES];
uniform float u_gain;        // K multiplier
uniform float u_contourDensity;
uniform bool u_showModContours;
uniform bool u_showPhaseContours;
uniform bool u_showGrid;

out vec4 fragColor;

// #include "complex-math.glsl"
// #include "color-mapping.glsl"

vec2 evaluateFunction(vec2 z) {
    vec2 numerator = vec2(u_gain, 0.0);
    vec2 denominator = vec2(1.0, 0.0);
    
    for (int i = 0; i < MAX_SINGULARITIES; i++) {
        if (i >= u_numZeros) break;
        numerator = cmul(numerator, z - u_zeros[i]);
    }
    
    for (int i = 0; i < MAX_SINGULARITIES; i++) {
        if (i >= u_numPoles) break;
        denominator = cmul(denominator, z - u_poles[i]);
    }
    
    return cdiv(numerator, denominator);
}

void main() {
    // Map pixel to complex plane coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 z = uv / u_zoom + u_center;
    
    // Evaluate and color
    vec2 w = evaluateFunction(z);
    vec3 color = domainColor(w, u_contourDensity, u_showModContours, u_showPhaseContours, u_showGrid);
    
    // Draw axes
    float axisWidth = 1.5 / min(u_resolution.x, u_resolution.y) / u_zoom;
    float xAxis = smoothstep(axisWidth, 0.0, abs(z.y));
    float yAxis = smoothstep(axisWidth, 0.0, abs(z.x));
    color = mix(color, vec3(0.5), max(xAxis, yAxis) * 0.3);
    
    // Draw unit circle
    float unitCircle = smoothstep(axisWidth, 0.0, abs(length(z) - 1.0));
    color = mix(color, vec3(0.6), unitCircle * 0.2);
    
    fragColor = vec4(color, 1.0);
}
```

### Vertex Shader (fullscreen.vert)

```glsl
#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
```

The vertex buffer is just a fullscreen quad: `[-1,-1, 1,-1, -1,1, 1,1]` drawn as a triangle strip.

### Handling Singularities & Precision

- **Division by zero at poles**: the `max(d, 1e-10)` guard in `cdiv` prevents NaN. Domain coloring is self-healing because `atan` and `fract` wrap extreme values gracefully
- **Branch cuts**: `atan(y,x)` returns (-π, π], placing the principal cut on the negative real axis. Visible as sharp color discontinuities — this is mathematically correct and educational
- **Float precision**: require `precision highp float` (32-bit). Detect `GL_FRAGMENT_PRECISION_HIGH` for mobile fallback. At extreme zoom levels (>1000x), numerical artifacts will appear — acceptable for educational use
- **Overflow protection**: clamp inputs to `cexp()` (`z.x > 88.0` overflows float), `cpow()` for large bases

### Dynamic Shader Generation (Expression Mode)

When the user types an expression in the text field (Phase 2), the pipeline is:

1. **Parse** with `math.parse(input)` → AST
2. **Walk the AST** recursively, emitting GLSL for each node type:
   - `OperatorNode(+)` → `(left + right)`
   - `OperatorNode(*)` → `cmul(left, right)`
   - `OperatorNode(/)` → `cdiv(left, right)`
   - `OperatorNode(^)` → `cpow(left, right)` (real exponent) or `cexp(cmul(right, clog(left)))` (complex)
   - `SymbolNode('z')` → GLSL variable `z`
   - `ConstantNode(3.14)` → `vec2(3.14, 0.0)`
   - `FunctionNode('sin')` → `csin(arg)`
   - `FunctionNode('exp')` → `cexp(arg)`
3. **Splice** generated GLSL into the fragment shader template, replacing the `evaluateFunction` body
4. **Compile** via `gl.shaderSource()` + `gl.compileShader()`
5. **On compile error**: keep the last working shader, show error inline in the formula bar

**Debounce** expression edits by 300–500ms before triggering recompilation. Use **KHR_parallel_shader_compile** extension for non-blocking compilation where available. Double-buffer shader programs: compile new while old renders, swap atomically on success.

---

## 7. 3D Magnitude Surface

### Concept

The "analytic landscape" renders |f(z)| as height over the complex plane, colored by arg(f(z)). Zeros become valleys touching zero, poles become infinite peaks (clamped via log or arctan).

### Implementation with react-three-fiber

Use a **grid-based mesh** approach:

1. Evaluate f(z) on a uniform grid (128×128 during interaction, 256×256 when stationary)
2. Height = `log(1 + |f(z)|)` or `(2/π)·arctan(|f(z)|)` to tame pole heights
3. Color each vertex by `arg(f(z))` using the same hue mapping as 2D domain coloring
4. Generate `BufferGeometry` with position and color attributes
5. Use `@react-three/drei`'s `OrbitControls` for camera interaction

```tsx
// Conceptual structure
<Canvas>
  <OrbitControls enableDamping dampingFactor={0.1} />
  <ambientLight intensity={0.4} />
  <directionalLight position={[5, 10, 5]} intensity={0.6} />
  <SurfaceMesh poles={poles} zeros={zeros} gain={gain} resolution={resolution} />
</Canvas>
```

The `SurfaceMesh` component:
- Reads poles/zeros from TanStack Store on each `useFrame`
- Recomputes the mesh geometry when poles/zeros change (throttled to 30fps during drag, full resolution on release)
- Uses `THREE.ShaderMaterial` with a vertex shader that reads height from a data texture (for GPU-side evaluation) OR computes on CPU with complex.js and uploads as vertex positions

### Performance Strategy

- During drag: 64×64 grid, no shadows, wireframe optional
- On release: 256×256 grid, smooth shading, full lighting
- Use `useMemo` for geometry construction, invalidate only when function changes
- LOD: if FPS drops below 30, reduce grid resolution

---

## 8. Interaction Design — Poles & Zeros

### Drag from Toolbox to Canvas

Use `@use-gesture/react`'s `useDrag` hook on the toolbox prototype cards. On drag start, create a floating preview element (pole × or zero ○) that follows the cursor. On drop over the canvas:

1. Convert pixel coordinates to complex plane coordinates using the current pan/zoom transform
2. Dispatch `addPole(z)` or `addZero(z)` to TanStack Store
3. The WebGL render loop picks up the new uniform values on the next frame

### Drag on Canvas to Reposition

Attach `useDrag` to each pole/zero marker rendered as an SVG overlay on the canvas (not inside WebGL — this keeps hit testing simple and accessible):

1. **Hit test**: on pointerdown, find the nearest pole/zero within 20px screen distance
2. **During drag**: update the pole/zero position in TanStack Store on every pointermove. The render loop reads the updated uniform array each frame
3. **On release**: snap to grid if snap mode is enabled (`Math.round(x * 4) / 4` for quarter-integer grid)

### Conjugate Pair Enforcement

When a pole/zero is off the real axis (|Im| > 0.01), automatically create and maintain its complex conjugate:

- Moving one conjugate moves the other symmetrically
- Dragging to Im ≈ 0 (within snap threshold) merges into a single real pole/zero
- Dragging a real pole/zero away from the axis automatically spawns the conjugate pair
- This keeps all polynomial coefficients real — educationally important

### Visual Conventions

- **Poles**: × marker, red/orange fill, 12px size, 2px stroke
- **Zeros**: ○ marker, blue/teal fill, 12px size, 2px stroke
- **Selected**: highlighted ring, slightly larger (16px), coordinate tooltip visible
- **Unit circle**: dashed circle at |z|=1 as reference
- **Axes**: thin lines through origin, labeled Re and Im
- **Grid**: optional, faint lines at integer values

### Keyboard Interaction

- `Tab` cycles through placed poles/zeros
- `Arrow keys` nudge selected element by 0.1 (0.01 with Shift)
- `Delete`/`Backspace` removes selected element
- `Escape` deselects
- `D` duplicates selected (offset by 0.5+0.5i)

### Touch Support

- PointerEvents API (unified mouse + touch)
- Minimum 44×44px hit targets (Apple HIG)
- Pinch-to-zoom via `@use-gesture`'s `usePinch`, mapped to the d3-zoom transform
- Long-press on a pole/zero to select (shows context menu: delete, duplicate, enter exact value)

---

## 9. Formula Display & Expression System

### KaTeX Rendering

The formula bar displays the current function using KaTeX, rebuilt from the TanStack Store on every relevant state change:

```typescript
function buildFactoredLaTeX(zeros: Complex[], poles: Complex[], gain: number): string {
  const formatZ = (z: Complex) => {
    if (Math.abs(z.im) < 0.001) return z.re.toFixed(2);
    if (Math.abs(z.re) < 0.001) return `${z.im.toFixed(2)}i`;
    return `${z.re.toFixed(2)} ${z.im >= 0 ? '+' : '-'} ${Math.abs(z.im).toFixed(2)}i`;
  };
  
  const numTerms = zeros.map(z => `(z - ${formatZ(z)})`).join('');
  const denTerms = poles.map(p => `(z - ${formatZ(p)})`).join('');
  
  const K = gain === 1 ? '' : `${gain} \\cdot `;
  const num = numTerms || '1';
  const den = denTerms || '1';
  
  return poles.length > 0
    ? `f(z) = ${K}\\frac{${num}}{${den}}`
    : `f(z) = ${K}${num}`;
}
```

### Expression ↔ GLSL Pipeline (Phase 2)

The expression input provides a bidirectional system:

- **Pole/zero mode → expression**: automatically generate the expression string from the pole/zero configuration
- **Expression mode → rendering**: parse with math.js, compile AST to GLSL, recompile shader
- **Expression mode → pole/zero extraction**: for rational functions, use math.js to factor and extract roots (display as non-editable markers on the plane)

The math.js `node.toTex()` method converts the AST directly to LaTeX for KaTeX rendering — single source of truth for both the shader and the display.

---

## 10. State Management Architecture

### TanStack Store Shape

```typescript
interface ExplorerState {
  // Function definition
  mode: 'poles-zeros' | 'expression';
  poles: Complex[];
  zeros: Complex[];
  gain: number;
  expression: string;  // Raw text input (expression mode)

  // Viewport
  center: { re: number; im: number };
  zoom: number;

  // View
  viewMode: '2d' | '3d';

  // Display options
  showModContours: boolean;
  showPhaseContours: boolean;
  showGrid: boolean;
  contourDensity: number;

  // Interaction state
  selectedId: string | null;
  hoveredId: string | null;
  cursorZ: { re: number; im: number } | null;
}
```

Each pole/zero gets a unique `id` (nanoid) and a `type` field ('pole' | 'zero'). Conjugate pairs share a `pairId`.

### TanStack Store Setup

```typescript
import { Store } from '@tanstack/store';

const explorerStore = new Store<ExplorerState>(initialState);

// Actions are functions that call store.setState()
function addPole(z: Complex) {
  explorerStore.setState((prev) => ({
    ...prev,
    poles: [...prev.poles, { id: nanoid(), type: 'pole', ...z }],
  }));
}

// Undo/redo via history middleware
const history = createHistoryMiddleware(explorerStore, { limit: 50 });

// Persistence via subscribe + localStorage
explorerStore.subscribe(() => {
  const { poles, zeros, gain, center, zoom, mode, expression } = explorerStore.state;
  localStorage.setItem('complex-explorer', JSON.stringify({ poles, zeros, gain, center, zoom, mode, expression }));
});
```

### React Components Use @tanstack/react-store

```typescript
import { useStore } from '@tanstack/react-store';

// Selector-based subscriptions — re-renders only when poles change
const poles = useStore(explorerStore, (s) => s.poles);
```

### WebGL Render Loop Reads State Without React

```typescript
class DomainColoringRenderer {
  private store = explorerStore;  // Reference to the TanStack Store

  render = () => {
    const state = this.store.state;  // Direct property access — no React subscription!
    
    // Update uniforms from state
    gl.uniform1i(this.uniforms.numPoles, state.poles.length);
    gl.uniform1i(this.uniforms.numZeros, state.zeros.length);
    gl.uniform2fv(this.uniforms.poles, flattenComplexArray(state.poles));
    gl.uniform2fv(this.uniforms.zeros, flattenComplexArray(state.zeros));
    gl.uniform1f(this.uniforms.gain, state.gain);
    gl.uniform2f(this.uniforms.center, state.center.re, state.center.im);
    gl.uniform1f(this.uniforms.zoom, state.zoom);
    gl.uniform1f(this.uniforms.contourDensity, state.contourDensity);
    gl.uniform1i(this.uniforms.showModContours, state.showModContours ? 1 : 0);
    gl.uniform1i(this.uniforms.showPhaseContours, state.showPhaseContours ? 1 : 0);
    gl.uniform1i(this.uniforms.showGrid, state.showGrid ? 1 : 0);
    
    // Draw fullscreen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    this.rafId = requestAnimationFrame(this.render);
  };
}
```

---

## 11. Performance Budget & Degradation Strategy

### Target

- **60fps** on 2020+ MacBook Air (M1) and recent Windows laptops with dedicated GPU
- **30fps minimum** on Chromebooks with Intel UHD 620, ARM Mali, or PowerVR GPUs
- **Usable** on iPads (iPad Air 4+, any iPad Pro)

### Adaptive Quality

```typescript
class PerformanceMonitor {
  private frameTimes: number[] = [];
  
  measureFrame(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length >= 60) {
      const avgFps = 1000 / (this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length);
      this.frameTimes = [];
      
      if (avgFps < 25) this.reduceQuality();
      if (avgFps > 55) this.increaseQuality();
    }
  }
  
  reduceQuality() {
    // 1. Reduce canvas DPR (0.75 → 0.5)
    // 2. Disable contour lines
    // 3. Reduce 3D mesh resolution
  }
}
```

### GPU Detection at Startup

```typescript
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
if (debugInfo) {
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  // Set initial quality preset based on known GPU strings
  if (renderer.includes('Mali') || renderer.includes('PowerVR')) {
    setQualityPreset('low');  // DPR 0.5, no contours, 64x64 3D mesh
  }
}
```

### WebGL Context Loss Handling

Handle from day one — contexts can be lost at any time:

```typescript
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();  // Critical: allows restoration
  cancelAnimationFrame(this.rafId);
});

canvas.addEventListener('webglcontextrestored', () => {
  this.initGL();  // Recreate all programs, buffers, textures
  this.render();
});
```

### Shader Compilation Budget

- **Uniform updates** (dragging): ~0.01ms per frame — effectively free
- **Shader recompilation** (function change): 10–500ms on ANGLE (Windows). Mitigate with:
  - `KHR_parallel_shader_compile` for non-blocking compile
  - Double-buffered programs (compile new while old renders)
  - Show a brief "compiling..." indicator if >100ms
  - Debounce expression edits by 300ms

### Bundle Budget

| Chunk | Target | Notes |
|-------|--------|-------|
| Initial JS | <150KB gzipped | React + TanStack Store + core UI |
| WebGL renderer | <20KB gzipped | Custom, no framework |
| Three.js (3D view) | <100KB gzipped | Code-split, lazy-loaded on "3D" toggle |
| KaTeX | ~90KB gzipped | CSS + JS + fonts. Loaded eagerly (formula bar is always visible) |
| math.js | ~170KB gzipped | Code-split, loaded on first expression input focus |
| Total initial | <260KB gzipped | Before 3D or expression features |

---

## 12. Project Structure

```
complex-explorer/
├── public/
│   ├── robots.txt
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── +config.ts              # Vike SPA config (extends vike-react)
│   │   ├── +Head.tsx               # <head> metadata
│   │   └── index/
│   │       └── +Page.tsx           # Main explorer page (single-page app)
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (Button, Input, etc.)
│   │   ├── common/
│   │   │   ├── CommandMenu.tsx     # Cmd+K palette
│   │   │   └── ThemeProvider.tsx   # SSR-safe dark/light toggle
│   │   ├── explorer/
│   │   │   ├── ExplorerLayout.tsx  # Top-level layout (toolbar + canvas + formula bar)
│   │   │   ├── Canvas2D.tsx        # WebGL2 domain coloring canvas wrapper
│   │   │   ├── Canvas3D.tsx        # react-three-fiber 3D surface (lazy-loaded)
│   │   │   ├── Toolbox.tsx         # Pole/zero drag sources
│   │   │   ├── PlacedList.tsx      # List of placed poles/zeros
│   │   │   ├── FormulaBar.tsx      # KaTeX formula display
│   │   │   ├── CoordReadout.tsx    # Cursor position overlay
│   │   │   ├── TopBar.tsx          # View toggle, settings
│   │   │   ├── SettingsPanel.tsx   # Contour/grid/color options
│   │   │   ├── ExpressionInput.tsx # Text expression field (Phase 2)
│   │   │   ├── PoleZeroMarker.tsx  # SVG overlay marker for a single pole/zero
│   │   │   └── MarkersOverlay.tsx  # SVG layer rendering all markers on the canvas
│   │   └── surface/
│   │       ├── SurfaceMesh.tsx     # Three.js BufferGeometry mesh
│   │       └── SurfaceScene.tsx    # R3F Canvas + controls + lighting
│   │
│   ├── renderer/
│   │   ├── DomainColoringRenderer.ts  # WebGL2 renderer class (imperative, no React)
│   │   ├── ShaderCompiler.ts          # Dynamic GLSL compilation pipeline
│   │   ├── PanZoomController.ts       # d3-zoom integration for canvas
│   │   └── PerformanceMonitor.ts      # Adaptive quality scaling
│   │
│   ├── shaders/
│   │   ├── fullscreen.vert            # Passthrough vertex shader
│   │   ├── complex-math.glsl          # Complex arithmetic library
│   │   ├── color-mapping.glsl         # HSV conversion + domain coloring
│   │   ├── domain-coloring.frag       # Main fragment shader (pole/zero uniform mode)
│   │   └── expression-template.frag   # Template for dynamic expression compilation
│   │
│   ├── store/
│   │   ├── explorer-store.ts          # TanStack Store definition
│   │   ├── presets.ts                 # Curated preset functions
│   │   └── url-state.ts              # URL hash encoding/decoding
│   │
│   ├── math/
│   │   ├── complex.ts                 # Complex number type + utilities
│   │   ├── ast-to-glsl.ts            # math.js AST → GLSL walker
│   │   ├── formula-latex.ts           # Build KaTeX strings from state
│   │   └── polynomial.ts             # Polynomial multiplication for expanded form
│   │
│   ├── lib/
│   │   ├── utils.ts                   # cn() and shared utilities
│   │   └── webgl-utils.ts            # Shader creation, context setup helpers
│   │
│   └── hooks/
│       ├── useWebGLRenderer.ts        # Hook to init/destroy the renderer
│       ├── usePoleZeroDrag.ts         # Drag interaction for markers
│       ├── useToolboxDrag.ts          # Drag-from-toolbox interaction
│       └── useConjugatePairs.ts       # Conjugate pair enforcement logic
│
├── .interface-design/
│   └── system.md                      # Persisted design system decisions
│
├── biome.json                         # Linting config
├── .nvmrc                             # `24` — local Node version pin
├── .node-version                      # `24` — alternate Node version pin
├── tsconfig.json                      # TypeScript strict config
├── vite.config.ts                     # Vite + vike + glsl plugin
├── app.css                            # Tailwind 4 theme (CSS-based config via @theme)
├── package.json
└── pnpm-lock.yaml
```

---

## 13. Build, Lint & Quality Gates

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    react(),
    vike(),  // SPA mode configured via +config.ts (ssr: false)
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      warnDuplicatedImports: true,
      compress: true,  // Minify in production
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          math: ['mathjs'],
          katex: ['katex'],
        },
      },
    },
  },
});
```

### Lint & Type Checking

```json
// package.json scripts
{
  "dev": "vite dev",
  "build": "vite build",
  "lint": "biome check src/",
  "lint:fix": "biome check --write src/",
  "lint:typecheck": "tsgo --noEmit || tsc --noEmit",
  "lint:duplicates": "jscpd src/ --threshold 5",
  "test": "vitest",
  "test:e2e": "playwright test"
}
```

**Package manager usage**

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm lint:typecheck
pnpm test
pnpm test:e2e
```

All examples, automation, and future docs for this project should use `pnpm`, not `npm`, `yarn`, or `bun`.

### Biome Rules (Key Overrides)

- `complexity.noExcessiveCognitiveComplexity`: warn at 15
- `style.noNonNullAssertion`: error (use proper narrowing)
- `suspicious.noExplicitAny`: error
- Max file length: warn at 300 lines (extract to sub-modules)

---

## 14. Accessibility

- All interactive elements (buttons, markers, sliders) focusable with visible focus indicators (2px ring using `--accent`)
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<aside>` for landmarks
- ARIA labels on canvas (`role="img"`, `aria-label="Complex function domain coloring visualization"`)
- Pole/zero markers have `role="button"`, `aria-label="Pole at 1 + 2i"`, keyboard-operable
- 4.5:1 contrast ratio minimum for all text
- Respect `prefers-reduced-motion`: disable animated transitions, keep domain coloring static refresh
- Dark/light mode via `prefers-color-scheme` + manual toggle
- Screen reader announcement on pole/zero add/remove/move via `aria-live="polite"` region

### Keyboard Parity for Core Workflow

Dragging is the signature interaction, but it cannot be the only first-class interaction.

- Users must be able to **create** a pole or zero from keyboard-accessible controls without drag
- Users must be able to **select** the current singularity list and move the active item with step sizes
- Default nudge step: `0.1`; fine step with `Shift`: `0.01`
- Users must be able to **edit exact coordinates** directly from the selected item workflow
- Users must be able to **delete** the selected item without opening a context menu
- Keyboard-created and keyboard-moved objects use the same source of truth and same visual feedback as dragged objects

### Accessibility Behavior Requirements

- Touch targets: minimum 44px for all controls that are not precision-canvas gestures
- Focus order must follow workspace logic: top bar -> tool rail/drawer -> placed items/examples -> canvas-related controls -> formula bar
- Focus should never be trapped inside the floating panel except while an actual popover/dialog is open
- The current selection and current mode must be announced clearly enough that a screen-reader user can tell what object is active and what changed
- Hover-only information (probe details, residue reveal, helper hints) must have a click/focus-accessible equivalent
- Presentation mode must preserve contrast, focus visibility, and keyboard operation; it is not allowed to become mouse-only "big screen mode"

---

## 15. Phased Implementation Plan

### Phase 1: Core Loop (Target: working in 2 days)

**Goal**: Drag a pole onto the plane, see domain coloring update.

1. Scaffold project: Node 24 + pnpm + Vite + Vike SPA + React 19 + Tailwind 4 + shadcn/ui init
2. Create `DomainColoringRenderer` class with hardcoded `f(z) = z` shader
3. Wire up canvas with `useRef`, init/destroy renderer in `useEffect`
4. Add pan/zoom via d3-zoom, mapped to shader uniforms
5. Create TanStack Store with poles/zeros arrays
6. Implement uniform-array shader (the main fragment shader above)
7. Build Toolbox with draggable pole/zero prototypes
8. Build MarkersOverlay (SVG layer for pole/zero markers)
9. Implement drag-to-reposition for placed markers
10. Build FormulaBar with KaTeX rendering
11. Add CoordinateReadout overlay
12. Add CommandMenu with Cmd+K

### Phase 2: Polish & 3D (Target: +2 days)

13. Conjugate pair enforcement
14. Settings panel (contour toggles, density slider, grid toggle)
15. Gain (K) slider in toolbox
16. Preset gallery (load curated functions)
17. 3D magnitude surface with react-three-fiber (lazy-loaded)
18. View toggle (2D ↔ 3D) with shared state
19. Adaptive quality monitoring
20. WebGL context loss handling

### Phase 3: Expression Engine (Target: +2 days)

21. Expression text input component
22. math.js AST → GLSL compiler (`ast-to-glsl.ts`)
23. Dynamic shader compilation pipeline with error handling
24. Bidirectional sync: expression ↔ pole/zero extraction
25. URL state encoding for sharing
26. Dark/light mode toggle

### Phase 4: Hardening (Target: +1 day)

27. Touch interaction testing and refinement
28. Performance testing on Chromebook / low-end GPU
29. Keyboard navigation testing
30. Accessibility audit
31. Bundle size verification
32. E2E tests for core interactions

### Phase 5: Deployment (Target: +0.5 day)

33. GitHub Pages deployment via GitHub Actions (build on push to main)
34. Custom domain setup for `plot.catrgb.com` (CNAME record + GitHub Pages config)
35. Vite `base` path configuration for GitHub Pages compatibility

---

## 16. Design Validation Checklist

Before presenting any output, run these checks:

### Craft Checks

- [ ] **Swap test**: If you swapped the layout for a standard dashboard template, would it feel different? The domain coloring canvas should be the dominant, unmistakable element
- [ ] **Squint test**: Blur eyes — can you still perceive the toolbox/canvas/formula hierarchy? Are borders too strong?
- [ ] **Signature test**: Point to 5 specific elements where the mathematical tool identity appears (coordinate readout font, pole/zero marker design, color-coded formula, contour line styling, unit circle overlay)
- [ ] **Token test**: Do CSS variable names feel like they belong to a math visualization tool?
- [ ] **Content test**: Read every visible string as a student would. Does the screen tell a coherent story about exploring complex functions?

### Technical Checks

- [ ] No React state holds WebGL objects
- [ ] Render loop reads TanStack Store via `store.state`, never via hooks
- [ ] Shader recompilation never happens during drag operations
- [ ] Canvas handles context loss gracefully
- [ ] All shadcn components use named Lucide icon imports
- [ ] Tailwind classes use design system tokens, no arbitrary values
- [ ] Three.js chunk is code-split and lazy-loaded
- [ ] `precision highp float` declared in all fragment shaders
- [ ] Every interactive element has focus state, hover state, and disabled state

### State Coverage

- [ ] Empty state: no poles/zeros placed → identity function f(z)=1, helpful prompt in toolbox
- [ ] Loading state: canvas shows while WebGL initializes
- [ ] Error state: WebGL not available → clear message with browser upgrade suggestion
- [ ] 3D view loading: skeleton while Three.js chunk loads

---

## 17. Reference Implementations & Resources

### Existing Tools to Study

| Tool | URL | What to learn |
|------|-----|---------------|
| Spirulae | https://harry7557558.github.io/spirulae/ | Best-in-class GPU math visualization. Study the expression→GLSL pipeline and 3D surface rendering |
| cplot | https://person594.github.io/cplot/ | Clean expression parsing → GLSL compilation |
| complex-analysis.com | https://complex-analysis.com/content/domain_coloring.html | The target user experience for domain coloring education |
| David Bau's conformal | https://www.davidbau.com/conformal/ | Minimal, elegant expression-driven complex viz |
| Control Systems Academy | https://controlsystemsacademy.com/0019/0019.html | Gold standard for interactive pole/zero placement UI |
| Shadertoy examples | https://www.shadertoy.com/view/WtlGDN | Domain coloring shader patterns (Gamma function) |

### Key Technical References

| Topic | Resource |
|-------|----------|
| GLSL complex number implementation | Harley Turan: "Visualizing Complex Numbers Using GLSL" (hturan.com) |
| Enhanced domain coloring theory | Wegert (2012): "Visual Exploration of Complex Functions" |
| Domain coloring color mapping | Linköping University: "Visualizing complex analytic functions using domain coloring" |
| Dynamic shader compilation | Ryan Kaplan: "Building a Fast Equation Grapher" (rykap.com) |
| Expression → GLSL | jzohdi/glsl_math on GitHub |
| react-three-fiber custom shaders | drei docs: `shaderMaterial` helper |
| KaTeX API | katex.org — use `katex.renderToString()` for React integration |
| d3-zoom for canvas | d3-zoom docs — `zoom().scaleExtent([0.1, 100])` |

---

## Implementation Notes for the LLM

### Do

- Use **Node 24** and **pnpm** for all scaffold, install, script, and CI examples
- Start with the WebGL2 renderer and TanStack Store — the core render loop must work before any UI
- Keep the renderer class fully imperative — no React hooks inside it
- Use `vite-plugin-glsl` `#include` for modular shader code
- Test on a real canvas early — don't build the full UI before confirming shaders compile
- Use `@use-gesture/react` for all pointer interactions on the canvas
- Implement conjugate pair logic as a TanStack Store action, not in the UI layer
- Code-split Three.js behind `React.lazy()` with a loading fallback

### Don't

- Don't introduce `bun`, `npm`, or `yarn` commands into project docs, scripts, or setup notes
- Don't use `react-three-fiber` for the 2D domain coloring view — it's unnecessary overhead for a single fullscreen quad
- Don't store the `WebGLRenderingContext` or shader programs in React state
- Don't recompile shaders on every drag frame — uniforms are the mechanism for position updates
- Don't use `localStorage` directly in components — use React state and TanStack Store with persist middleware
- Don't import `*` from lucide-react or three — use named imports
- Don't use dnd-kit or react-dnd — they're DOM-oriented, not canvas-aware
- Don't skip the empty state design — "No poles or zeros" must be a warm, actionable UI, not a blank canvas with no guidance

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAN | 5 proposals, 5 accepted, 0 deferred |
| Outside Voice | `/codex review` | Independent 2nd opinion | 1 | ISSUES_FOUND | 14 findings, 3 actioned (undo rethink, correctness harness, store cleanup) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 4 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 6/10 → 9/10, 7 decisions |

- **CODEX:** 14-point challenge. Key fixes: History API undo replaced with in-memory snapshots via TanStack Store subscribe, CPU/GPU correctness harness added, expression mode stubs removed from initial store.
- **CROSS-MODEL:** Codex disagreed on undo approach (History API), product focus (control systems vs pure math). Undo concern was correct and actioned. Product focus is intentional (built for Carl).
- **UNRESOLVED:** 0
- **VERDICT:** CEO + ENG + DESIGN CLEARED — ready to implement.
