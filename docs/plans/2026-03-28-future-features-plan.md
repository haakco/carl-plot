# Complex Explorer — Future Features Plan

**Date:** 2026-03-28
**Status:** Complete
**Prerequisite:** Phases 1–5 complete (commit `7bcd4a6`)

---

## Overview

This plan covers all features beyond the core 5 phases. Items are grouped into three tiers by user impact and implementation complexity.

---

## Completed Items

### 1. Export as PNG — DONE

**What:** Button in top bar + command palette to download the current canvas as PNG.

**Implementation:**
- Created `src/lib/export-image.ts` with `exportCanvasToPng()` utility
- Added "PNG" button to `TopBar.tsx`
- Added "Export as PNG" command to `CommandMenu.tsx` (Export group)
- Set `preserveDrawingBuffer: true` on WebGL context to ensure non-blank exports
- 4 unit tests in `src/lib/export-image.test.ts`

---

### 2. ChemE / Control Systems Presets — DONE

**What:** 7 curated presets for chemical engineering and control systems courses.

**Added to `src/store/presets.ts`:**
- PID controller (2 zeros + pole at origin, gain 10)
- First-order with delay (Pade-approximated RHP zero)
- Second-order underdamped (zeta = 0.3 conjugate pair)
- Notch filter (unit-circle zeros, inside poles)
- Lead compensator (zero closer to origin)
- Lag compensator (pole closer to origin)
- CSTR linearization (unstable pole with stabilizing zero)

---

### 3. Richer Preset Gallery with Categories — DONE

**What:** Replaced plain text preset list with categorized gallery showing descriptions.

**Implementation:**
- Added `category: PresetCategory` field to `Preset` interface ("basics" | "filters" | "controls")
- All 16 presets tagged with appropriate categories
- `ExamplesSection` in `Toolbox.tsx` now groups by category with color-coded headers
- Descriptions visible inline (not just on hover)

---

### 4. Stability Glow — Complete Implementation — DONE

**What:** Extended stability glow from minimap to main canvas markers with pulsing animation for marginal stability and a legend overlay.

**Implementation:**
- Main canvas markers already had glow (from Phase 5)
- Added pulsing `<animate>` for marginally stable poles (|p| ≈ 1) in `PoleZeroMarker.tsx`
- Created `StabilityLegend.tsx` — bottom-left overlay showing green/yellow/red meaning
- Legend auto-hides when no poles exist
- Wired into `ExplorerLayout.tsx` (2D view only)

---

### 5. Residue Reveal — Enhanced — DONE

**What:** Expanded residue display with canvas labels, show-all toggle, and residue table in toolbox.

**Implementation:**
- Added `computeAllResidues()` and `formatResiduePlain()` to `src/math/residue.ts`
- Added `showAllResidues` toggle to store with `toggleShowAllResidues()` action
- `MarkersOverlay.tsx` now renders residue labels near poles (opacity scales with magnitude)
- `ResidueSection` in `Toolbox.tsx` shows a table of all pole residues
- "Show labels" / "Hide labels" toggle button in the residue section
- "Toggle residue labels" command added to `CommandMenu.tsx`

---

### 6. Impulse Response Sparkline — DONE

**What:** Small SVG bar chart showing h[n] impulse response in the toolbox sidebar.

**Implementation:**
- Created `src/math/impulse-response.ts` with `computeImpulseResponse()` using partial fraction expansion
- Created `src/components/explorer/ImpulseSparkline.tsx` — 180x50 SVG sparkline
- Shows 64 samples as vertical bars, color-coded green (stable) or red (unstable)
- Includes stability indicator text
- 8 unit tests covering FIR case, real poles, decay, growth, oscillation, and stability check
- Added as collapsible section in `Toolbox.tsx`

---

## Bug Fixes Applied During Implementation

### [P1] D3 zoom initialization from loaded viewport — FIXED

**Problem:** After loading a preset or URL with non-default center/zoom, d3-zoom still had identity transform, causing first pan/wheel to snap back to origin.

**Fix:** Added `syncTransformFromStore()` to `PanZoomController.ts` that computes the d3 transform from current store center/zoom. Called on init and whenever store center/zoom change from outside the zoom handler (via `isZoomDriven` flag to prevent loops).

---

### [P1] Cursor-only updates polluting undo history — FIXED

**Problem:** Every `setCursorZ` mousemove filled the undo stack, making Cmd+Z rewind cursor movement instead of pole/zero edits.

**Fix:** Added `isUndoableChange()` function in `explorer-store.ts` that compares all non-transient fields (excluding cursorZ, hoveredId, center, zoom, webglContextLost). Undo stack only grows when meaningful state changes.

---

### [P2] Cursor coordinate conversion with center/zoom — FIXED

**Problem:** `handleMouseMove` in `PanZoomController.ts` computed cursorZ as if viewport were always centered at 0 with zoom 1.

**Fix:** Now reads `center` and `zoom` from store and applies them: `re = center.re + (pixelX - w/2) / (k * minDim)`.

---

### [P2] Pair linkage in URL deserialization — FIXED (then revised)

**Problem:** `deserializeComplex()` created items without `pairId`, so conjugate pair behavior broke after loading shared URLs.

**Original fix:** After deserializing, pass poles/zeros through `buildWithConjugates()` to detect and link conjugate pairs.

**Revised fix:** Heuristic re-linking was incorrect — two independent poles at conjugate positions would be forcibly paired. Now pair metadata is serialized explicitly as `pp`/`zp` index tuples in the URL. Only URLs created with paired items will load as paired.

---

### [P2] Conjugate enforcement on arrow-key nudges — FIXED

**Problem:** Keyboard nudging used `moveSingularity()` directly, bypassing conjugate enforcement.

**Fix:** Changed to use `moveWithConjugate()` from `singularity-helpers.ts`, matching the drag path.

---

### [P2] "Clear all poles/zeros" restoring defaults — FIXED

**Problem:** Command called `reset()` which restores `initialState` (with default pole and zero), not an empty canvas.

**Fix:** Added `clearAll()` action that empties poles/zeros/expression while preserving view settings. Command now calls `clearAll()`.

---

### [P2] PNG export blank from WebGL — FIXED

**Problem:** WebGL canvas created with `preserveDrawingBuffer: false` (default), so `toBlob()` captures blank frame.

**Fix:** Changed to `preserveDrawingBuffer: true` in `DomainColoringRenderer.ts`.

---

### 7. Root Locus Ghosting — DONE

**What:** Ghost trail of pole positions during drag, approximating root locus.

**Implementation:**
- Added `ghostTrail` to `ExplorerState` (transient, excluded from undo history)
- `pushGhostPoint()` and `clearGhostTrail()` actions in `explorer-store.ts`
- `usePoleZeroDrag.ts` and `PoleZeroMarker.tsx` record positions during drag
- `MarkersOverlay.tsx` renders trail as SVG polyline + fading dots (opacity scales with recency)
- Trail lingers 600ms after drag release, max 40 points

---

### 8. Multiplicity Shockwave — DONE

**What:** Visual effect and badge when poles/zeros merge at same location.

**Implementation:**
- `MarkersOverlay.tsx` computes `multiplicityMap` — counts same-type items within 0.05 tolerance
- `PoleZeroMarker.tsx` accepts `multiplicity` prop
- When multiplicity > 1: pulsing shockwave ring animation + "×N" badge in top-right corner
- Badge has dark background circle with colored text matching marker type

---

### 9. Conformal Mapping Grid — DONE

**What:** Overlay grid showing how f(z) deforms the z-plane.

**Implementation:**
- Created `src/components/explorer/ConformalGrid.tsx`
- 11×11 grid from -3 to +3, 60 samples per line
- Each grid line mapped through `evaluateRational()` and rendered as SVG path
- Horizontal lines in blue (`oklch(0.6 0.08 200)`), vertical in green (`oklch(0.6 0.08 145)`)
- Line breaks when pixel jump > 200px (near poles)
- Toggle via `showConformalGrid` store field + "Toggle conformal grid" in command palette
- Renders at z-index 5 (below markers, above domain coloring)

---

### 10. Animated Parameter Sweeps — DONE

**What:** Animate gain parameter over a range with play/pause.

**Implementation:**
- Created `src/components/explorer/GainSweep.tsx`
- Play/pause button with configurable min/max range inputs
- Ping-pong animation: sweeps gain forward then backward over 3-second cycle
- 30fps via `requestAnimationFrame` with frame throttling
- Added as "Gain Sweep" section in `Toolbox.tsx`

---

### 11. Nyquist Plot Overlay — DONE

**What:** Nyquist contour H(e^{jω}) with gain/phase margins.

**Implementation:**
- Created `src/components/explorer/NyquistPlot.tsx`
- Evaluates H(z) on upper unit circle (ω = 0 to π, 256 points)
- Auto-scaled 180×140 SVG plot with axes, dashed unit circle, critical point (-1, 0)
- `findMargins()` computes gain margin (dB) and phase margin (degrees) by detecting crossings
- Gain margin crossing point highlighted with dot
- Margins displayed below plot

---

### 12. Laplace Lens — DONE

**What:** Probe tool showing H(z) magnitude/phase at cursor with output waveform.

**Implementation:**
- Created `src/components/explorer/LaplaceLens.tsx`
- Shows |H(z)| and ∠H(z) at current cursor position
- 80×24 sparkline showing output waveform at cursor frequency (40 samples)
- Updates in real-time as cursor moves
- Added as section in `Toolbox.tsx`

---

### 13. Tutorial / Guided Exploration Mode — DONE

**What:** Interactive 8-step walkthrough introducing the tool's features.

**Implementation:**
- Created `src/components/explorer/Tutorial.tsx`
- 8 steps: welcome, adding poles/zeros, dragging, stability, domain coloring, response plots, advanced features, keyboard shortcuts
- Bottom-center floating card with progress dots, back/next/skip controls
- Dismissed state persisted in localStorage (`complex-explorer-tutorial-dismissed`)
- "Restart tutorial" command added to command palette Help group
- Auto-shows on first visit

---

## Bug Fixes Applied During Review

### [P2] Zero-only FIR impulse response — FIXED

**Problem:** `computeImpulseResponse()` treated all pole-free systems as K·δ[n], ignoring zeros entirely. The "Simple zero" preset (H(z)=z) rendered the same impulse response as a constant gain.

**Fix:** Added `computeFirResponse()` that computes polynomial coefficients via convolution of (z - z_i) factors. H(z) = z now correctly shows h = [1, 0, ...].

---

### [P2] Repeated-pole systems showing flat zero — FIXED

**Problem:** For higher-order poles, the partial fraction code silently skipped them, leaving the sample buffer full of zeros. The sparkline showed a flat zero signal for any repeated-pole system.

**Fix:** When all poles are higher-order and produce zero output, `computeImpulseResponse()` now returns NaN-filled array. `ImpulseSparkline` detects NaN and shows "Repeated poles — partial fraction unsupported" instead of misleading data.

---

### [P2] Analysis panels showing stale data in expression mode — FIXED

**Problem:** Residue table, impulse sparkline, Nyquist plot, Laplace lens, and gain sweep always derived data from poles/zeros, even when the renderer was using `state.expression`. Switching from a preset to an expression showed contradictory UI.

**Fix:** Wrapped all pole/zero analysis panels in `isPoleZeroMode` guard in `Toolbox.tsx`. They are hidden when `mode !== "poles-zeros"`.

---

### [P2] Conformal grid using stale poles in expression mode — FIXED

**Problem:** `ConformalGrid` always sampled `evaluateRational(poles, zeros, gain)`, even when the canvas was rendering an expression. The grid overlay didn't match the visible function.

**Fix:** Added `mode !== "poles-zeros"` guard in `ConformalGrid.tsx`. Grid won't render in expression mode.

---

### [P2] Gain sweep flooding undo stack — FIXED

**Problem:** Gain sweep called `setGain()` 30 times/second during animation, filling the undo stack with ~90 entries per sweep cycle. Cmd+Z replayed the sweep frame by frame.

**Fix:** Added `setGainTransient()` that sets `skipHistoryCapture = true` before updating. Sweep animation uses this instead of `setGain()`.

---

### [P2] Conformal grid fixed to origin viewport — FIXED

**Problem:** Grid always covered -3 to +3 regardless of viewport. Panning or zooming made grid lines disappear.

**Fix:** Grid extent now adapts to current `center` and `zoom` from store: `halfExtent = max(1, 3/zoom)`, lines centered on viewport center.

---

## All Features Complete

All 13 planned features have been implemented with 13 bug fixes applied.
Quality gates: TypeScript clean, Biome 0 errors, 153 tests passing (17 test files), production build clean.
