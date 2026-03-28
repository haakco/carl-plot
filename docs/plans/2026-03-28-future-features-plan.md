# Complex Explorer — Future Features Plan

**Date:** 2026-03-28
**Status:** Planned
**Prerequisite:** Phases 1–5 complete (commit `7bcd4a6`)

---

## Overview

This plan covers all features beyond the core 5 phases. Items are grouped into three tiers by user impact and implementation complexity.

**Existing partial work:**
- Stability glow ring exists on minimap pole markers (`PoleZeroPanel.tsx`)
- Residue reveal exists as `ResidueInfo.tsx` (shows residue on selected pole)
- 9 presets exist in `presets.ts` (no thumbnails)

---

## Tier 1 — Quick Wins (1–2 days total)

These can ship independently with minimal risk.

### 1. Export as PNG/SVG

**What:** Button in the top bar or command palette that captures the current canvas view as a downloadable image.

**Implementation:**
- PNG: Call `canvas.toBlob()` on the WebGL canvas, create an `<a>` download link
- SVG: Not practical for WebGL domain coloring — PNG only is fine
- Add "Export PNG" to the command palette and a download icon button in the top bar
- Include current function label (LaTeX rendered to canvas or as filename)
- Respect current viewport (pan/zoom state)

**Files to create/modify:**
- `src/lib/export-image.ts` — `exportCanvasToPng(canvas, filename)` helper
- `src/components/common/CommandMenu.tsx` — add "Export as PNG" command
- `src/components/explorer/TopBar.tsx` — add download button

**Testing:** Unit test for filename generation; manual test for download.

---

### 2. Richer Preset Gallery with Thumbnails

**What:** Replace the plain text preset list with a visual gallery showing small preview thumbnails.

**Implementation:**
- Pre-render thumbnails at build time using a small headless canvas script, or
- Generate thumbnails on first render using a tiny offscreen WebGL canvas (128x128)
- Store as base64 data URIs in the preset definitions
- Display as a grid of thumbnail cards in the Toolbox `ExamplesSection`

**Recommendation:** Static pre-rendered PNGs in `public/presets/` is simplest. Generate once with a script, commit the images.

**Files to create/modify:**
- `scripts/generate-preset-thumbnails.ts` — one-time generation script
- `public/presets/*.png` — thumbnail images
- `src/store/presets.ts` — add `thumbnail?: string` field to `Preset` interface
- `src/components/explorer/Toolbox.tsx` — render thumbnail grid in `ExamplesSection`

---

### 3. ChemE / Control Systems Presets

**What:** Add curated presets relevant to chemical engineering and control systems courses.

**Presets to add:**
- **PID controller:** Typical PID transfer function poles/zeros
- **First-order with dead time:** Single real pole with transport delay approximation
- **Second-order underdamped:** Classic ζ < 1 conjugate pole pair
- **Notch filter:** Conjugate zero pair on/near unit circle with poles inside
- **Lead compensator:** Zero closer to origin than pole
- **Lag compensator:** Pole closer to origin than zero
- **CSTR linearization:** Typical chemical reactor transfer function

**Files to modify:**
- `src/store/presets.ts` — add new preset entries with descriptive names and descriptions

---

### 4. Stability Glow — Complete Implementation

**What:** Extend the existing minimap stability glow to the main canvas markers and add a legend.

**Current state:** `getStabilityColor()` in `singularity-helpers.ts` returns green/yellow/red based on pole magnitude vs unit circle. Used only in the minimap.

**Implementation:**
- Apply the same glow ring to `PoleZeroMarker.tsx` on the main canvas
- Add a small legend in the `CoordReadout` or `PoleZeroPanel` showing the color meaning
- Optionally pulse the glow ring for marginally stable poles (|p| ≈ 1)

**Files to modify:**
- `src/components/explorer/PoleZeroMarker.tsx` — add stability glow circle
- `src/components/explorer/CoordReadout.tsx` — add legend indicator

---

## Tier 2 — Medium Features (1–2 days each)

These require more design thought and new rendering infrastructure.

### 5. Residue Reveal — Enhanced

**What:** Expand the existing `ResidueInfo` into a richer display with visual annotation on the canvas.

**Current state:** `ResidueInfo.tsx` shows the residue value in the formula bar when a pole is selected.

**Enhancements:**
- Show residue as an annotation label near the pole on the 2D canvas
- Show residue magnitude as a colored halo intensity around the pole
- Show all residues at once (not just selected pole) via a toggle
- Add residue table in the toolbox sidebar

**Files to create/modify:**
- `src/components/explorer/MarkersOverlay.tsx` — render residue labels near poles
- `src/components/explorer/Toolbox.tsx` — add residue table section
- `src/math/residue.ts` — may need batch computation helper

---

### 6. Impulse Response Sparkline

**What:** A small inline chart showing the discrete-time impulse response h[n] of the current system, visible in the toolbox or a popover.

**Implementation:**
- Compute h[n] via partial fraction expansion + inverse Z-transform for rational functions
- Render as a tiny SVG sparkline (≈200x60px) in the toolbox
- Update reactively as poles/zeros change
- Show first 50–100 samples
- Color-code: stable (decaying) in green, unstable (growing) in red

**Files to create:**
- `src/math/impulse-response.ts` — compute h[n] from poles, zeros, gain
- `src/components/explorer/ImpulseSparkline.tsx` — SVG sparkline component
- Add to `Toolbox.tsx` as a collapsible section

**Dependencies:** Partial fraction expansion (can reuse/extend `residue.ts`)

---

### 7. Conformal Mapping Grid Visualization

**What:** Overlay a grid on the z-plane and show how f(z) deforms it — the classic conformal mapping visualization.

**Implementation:**
- Draw a regular grid (horizontal + vertical lines) on the domain
- For each grid intersection, evaluate f(z) and draw the deformed grid in the w-plane
- Can be done as an SVG overlay on the canvas or a second "w-plane" panel
- Best approach: side-by-side z-plane and w-plane with grid correspondence highlighting

**Files to create:**
- `src/components/explorer/ConformalGrid.tsx` — SVG grid overlay component
- `src/math/conformal-grid.ts` — grid evaluation and deformation math

**Complexity:** Medium-high. The grid must handle singularities gracefully (lines near poles will diverge).

---

### 8. Animated Parameter Sweeps

**What:** Animate a parameter (gain K, pole position, zero position) over a range and watch the domain coloring evolve.

**Implementation:**
- Add an "Animate" button that sweeps the gain slider from min to max (or a pole along a path)
- Use `requestAnimationFrame` loop updating the store value each frame
- Timeline scrubber to pause/seek
- Record mode: capture frames for GIF export (stretch goal)

**Files to create:**
- `src/components/explorer/AnimationControls.tsx` — play/pause/scrubber UI
- `src/hooks/useParameterSweep.ts` — animation loop logic
- Modify `Toolbox.tsx` to include animation section

---

### 9. Root Locus Ghosting

**What:** When dragging a pole, show a "ghost trail" of its previous positions, approximating a root locus plot.

**Implementation:**
- Track the last N positions of the dragged pole during drag
- Render as fading dots/line on the markers overlay SVG
- Clear the trail when drag ends or on a timer
- Optionally show the full root locus curve for gain variation (requires computing roots of characteristic polynomial as K varies)

**Files to modify:**
- `src/hooks/usePoleZeroDrag.ts` — track position history during drag
- `src/components/explorer/MarkersOverlay.tsx` — render ghost trail

---

### 10. Multiplicity Shockwave

**What:** Visual effect when two poles or zeros are placed at the same location (creating a higher-order singularity).

**Implementation:**
- Detect when a pole/zero is dropped within ε of another same-type singularity
- Merge them into a multiplicity-N singularity
- Play a brief radial pulse animation on the canvas (CSS or SVG animation)
- Show the multiplicity count as a small badge on the marker

**Files to modify:**
- `src/store/explorer-store.ts` — add multiplicity detection in `moveSingularity`
- `src/components/explorer/PoleZeroMarker.tsx` — render multiplicity badge and animation

---

## Tier 3 — Major Features (3+ days each)

These are substantial additions that may warrant their own design documents.

### 11. Nyquist Plot Overlay

**What:** Plot the Nyquist contour (f(jω) for ω from -∞ to +∞) overlaid on the complex plane or in a separate panel.

**Implementation:**
- Evaluate f(z) along the imaginary axis (z = jω) for a range of ω values
- Plot the resulting curve in the w-plane
- Highlight the encirclement of the critical point (-1, 0)
- Show gain/phase margins
- Interactive: hover on the Nyquist curve highlights the corresponding ω on the Bode plot (stretch goal)

**Complexity:** High. Requires careful numerical evaluation near poles on the imaginary axis, handling of infinite frequencies, and a secondary plot panel.

**Files to create:**
- `src/math/nyquist.ts` — Nyquist contour evaluation
- `src/components/explorer/NyquistPlot.tsx` — SVG plot component
- `src/components/explorer/NyquistPanel.tsx` — panel with controls

---

### 12. Laplace Lens

**What:** A probe tool that shows the Laplace-domain interpretation at the cursor position — the inverse Laplace transform contribution from nearby poles.

**Implementation:**
- On hover/click, compute the partial fraction term for the nearest pole
- Show the time-domain response contribution (e.g., "Ae^{σt}cos(ωt)" for a complex pole at σ±jω)
- Render as a tooltip with both the LaTeX formula and a small time-domain waveform plot
- Animate the waveform to show decay/growth

**Complexity:** High. Requires partial fraction decomposition, LaTeX rendering, and inline waveform plotting.

**Files to create:**
- `src/math/laplace-lens.ts` — partial fraction and time-domain computation
- `src/components/explorer/LaplaceLens.tsx` — tooltip/overlay component

---

### 13. Tutorial / Guided Exploration Mode

**What:** An interactive walkthrough that introduces complex analysis concepts using the explorer as a teaching tool.

**Implementation:**
- Step-by-step tutorial with narration, highlighting, and preset loading
- Steps: (1) What is domain coloring, (2) Place a zero — see one color cycle, (3) Place a pole — see infinity, (4) Drag a pole — watch the function change, (5) Conjugate pairs, (6) Expression mode
- Overlay coach marks pointing to UI elements
- Progress tracking (which tutorials completed)
- Accessible via a "?" help button or first-time-visit detection

**Complexity:** High. Requires a tutorial engine, step sequencing, overlay positioning, and content writing.

**Files to create:**
- `src/components/tutorial/TutorialOverlay.tsx` — coach marks and narration
- `src/components/tutorial/TutorialEngine.ts` — step sequencing logic
- `src/data/tutorials.ts` — tutorial content and step definitions

---

## Priority Order (Recommended)

| Priority | Item | Effort | User Impact |
|----------|------|--------|-------------|
| 1 | Export as PNG | 2 hrs | High — sharing is the #1 requested feature |
| 2 | ChemE presets | 1 hr | High — directly serves Carl's students |
| 3 | Stability glow (complete) | 2 hrs | Medium — reinforces core concept |
| 4 | Residue reveal (enhanced) | 4 hrs | Medium — deepens exploration |
| 5 | Impulse response sparkline | 4 hrs | Medium — bridges time/frequency domains |
| 6 | Preset thumbnails | 3 hrs | Medium — discoverability |
| 7 | Root locus ghosting | 4 hrs | Medium — nice interaction polish |
| 8 | Multiplicity shockwave | 3 hrs | Low — delight feature |
| 9 | Conformal mapping grid | 1 day | Medium — educational value |
| 10 | Animated parameter sweeps | 1 day | Medium — exploration tool |
| 11 | Nyquist plot | 2–3 days | High for controls — specialized audience |
| 12 | Laplace lens | 2–3 days | High for controls — specialized audience |
| 13 | Tutorial mode | 3+ days | High — onboarding |
