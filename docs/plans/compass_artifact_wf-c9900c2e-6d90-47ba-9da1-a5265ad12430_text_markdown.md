# Building a web-based interactive complex function explorer

**WebGL2 is the right foundation for a GPU-accelerated domain coloring tool in 2026**, offering 95.6% browser coverage versus WebGPU's 82.7% — and delivering identical fragment shader performance for this specific per-pixel workload. The optimal architecture pairs a raw WebGL2 renderer for 2D domain coloring with react-three-fiber for 3D magnitude surfaces, using Zustand to bridge React UI state to the GPU render loop without triggering re-renders. Every major existing open-source domain coloring implementation — Spirulae, cplot, Ricky Reusser's adaptive domain coloring, and the Shadertoy corpus — chose WebGL/GLSL, confirming this as the proven path. The critical architectural decision is using **uniform arrays with a count variable** for pole/zero positions (allowing drag-and-drop without shader recompilation) while reserving dynamic GLSL generation only for structural function changes.

---

## Topic 1: WebGPU offers no advantage for per-pixel domain coloring

### Browser support favors WebGL2 for educational reach

WebGL2 covers **~95.6%** of global browsers — effectively universal on every modern browser including mobile Safari (15+), all Chromebooks, and Linux. WebGPU has reached **~82.7%** as of early 2026, with Chrome 113+ (enabled by default since April 2023), Firefox 141+ (Windows, July 2025), and Safari 26+ (September 2025, marked partial on caniuse). The **13-percentage-point gap** matters for an educational tool: students on older iPads (iOS 15–25), Linux lab machines, and school-managed browsers with delayed updates will have WebGL2 but not WebGPU.

Google announced in November 2025 that WebGPU was officially supported across all four major engine families, but coverage gaps persist. Firefox Android remains behind a flag with Mozilla targeting 2026 work. Firefox Linux lacks stable support. Approximately 45% of older devices cannot support storage buffers in vertex shaders, forcing WebGPU's compatibility mode.

### Performance is identical for this workload

Domain coloring is a **single-draw-call, fragment-shader-bound** workload: render a fullscreen quad, evaluate `f(z)` at every pixel, map to color. Both APIs dispatch fragment shaders to the same GPU hardware — the ALUs don't care which API submitted the work. WebGPU's advantages (reduced CPU overhead per draw call, compute shaders, multi-threaded command encoding, render bundles) apply to scenes with hundreds of draw calls or GPGPU workloads, not a single-quad renderer.

| Aspect | WebGL2 | WebGPU |
|--------|--------|--------|
| Fragment shader speed | Native GPU | Native GPU |
| Pipeline setup | ~50 lines JS | ~150+ lines JS |
| Shader compilation | GLSL (fast, well-optimized) | WGSL → SPIR-V/MSL/DXIL (more stages) |
| Browser coverage | 95.6% | 82.7% |
| Existing domain coloring tools | All of them | One experimental (gil.earth) |

### The hybrid migration path exists if needed

Three.js r171+ (September 2025) offers `import * as THREE from 'three/webgpu'` with **automatic WebGL2 fallback** — zero feature detection needed. Its TSL (Three Shading Language) compiles to both WGSL and GLSL ES 3.00 from a single JavaScript-based shader definition. However, custom `ShaderMaterial` with inline GLSL does *not* work in the WebGPU renderer, so cross-backend compatibility requires TSL or node materials.

For this project, the recommended approach is **raw WebGL2** for the 2D domain coloring view (minimal overhead, full control) and **react-three-fiber with Three.js** for the 3D magnitude surface (where scene graph management, lighting, and camera controls add value). If WebGPU becomes important later, the 3D view can migrate by changing the R3F renderer prop.

### What existing projects chose

Every production domain coloring tool uses WebGL/GLSL:

- **Spirulae** (harry7557558) — WebGL fragment shaders with a custom expression parser compiling to GLSL. Supports both 2D domain coloring and 3D complex surface visualization
- **cplot** (person594) — WebGL reimplementation of David Bau's conformal viewer, parses arbitrary expressions into GLSL
- **complex-function-plotter** (wgxli) — WebGL + React, 65 GitHub stars, includes contour integrals and residues
- **Ricky Reusser's adaptive domain coloring** — WebGL via regl, with `fwidth()` for screen-space adaptive contouring
- **Shadertoy corpus** — Dozens of domain coloring shaders (Gamma function, Möbius transformations, complex sine), all WebGL/GLSL
- **gil.earth** — The single WebGPU/WGSL implementation, experimental, uses Poiesis framework

---

## Topic 2: How domain coloring maps complex numbers to pixels

### The mathematical color mapping

The standard domain coloring algorithm maps the output `w = f(z)` to color using HSL/HSV space:

- **Hue** ← `arg(f(z))`: the phase angle maps to the color wheel. Positive reals → red, positive imaginary → yellow-green, negative reals → cyan, negative imaginary → blue-violet
- **Lightness** ← a function of `|f(z)|`: must satisfy `ℓ(1/r) = 1 - ℓ(r)` so inverse functions are symmetrically light/dark. The standard choice is **`ℓ(r) = (2/π)·arctan(r)`**, smoothly mapping `[0,∞)` to `[0,1)`
- **Saturation** ← typically fixed at maximum

**Zeros** appear as points where all hues converge with brightness going to black (`|f| → 0`). **Poles** show all hues converging with brightness going to white (`|f| → ∞`). For a zero or pole of order *k*, colors cycle *k* times around the point. The critical visual distinction: colors cycle **counterclockwise** around zeros and **clockwise** around poles (Wegert, 2012).

### Enhanced domain coloring adds contour structure

Elias Wegert's *enhanced phase portraits* (2011) superimpose contour lines that make the visualization dramatically more informative:

**Modulus contours** use a sawtooth function of log-modulus: `fract(log₂|f(z)|)` creates rings at logarithmically-spaced intervals where `|f|` doubles. Between rings, darker shading corresponds to smaller `|f|`. **Phase contours** use `fract(n · arg(f(z)) / 2π)` for *n* evenly-spaced isochromatic lines. The intersection of modulus and phase contours creates approximately square tiles near conformal points and elongated/distorted tiles near singularities — a powerful diagnostic for conformality.

**Grid lines** overlaying the integer values of `Re(f)` and `Im(f)` add further structure: `1.0 - smoothstep(0.0, lineWidth, abs(fract(f.x) - 0.5))`.

### GLSL implementation of complex arithmetic

Since GLSL has no native complex type, complex numbers are represented as `vec2` (`.x` = real, `.y` = imaginary). The essential operations:

```glsl
// Multiply: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}
// Divide: (a+bi)/(c+di)
vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d;
}
// Power (real exponent): z^n via polar form
vec2 cpow(vec2 z, float n) {
    float r = length(z), theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(n*theta), sin(n*theta));
}
// Logarithm (principal branch)
vec2 clog(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }
// Exponential: e^(a+bi) = e^a(cos(b) + i·sin(b))
vec2 cexp(vec2 z) { return exp(z.x) * vec2(cos(z.y), sin(z.y)); }
```

The compact branchless HSV-to-RGB conversion widely used on Shadertoy:

```glsl
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
```

### Handling singularities and precision in shaders

Division by zero at poles requires guarding: when `dot(b,b) < 1e-10`, clamp to a large value. In practice, domain coloring is self-healing here because `log₂(r)` grows slowly and `fract()` wraps extreme values. **Branch cuts** for `log`, `sqrt`, and *n*th roots appear as sharp color discontinuities — `atan(y,x)` in GLSL returns `(-π, π]`, placing the principal branch cut on the negative real axis. These cannot be eliminated but can be visually indicated.

**Float precision** matters: `highp` (32-bit IEEE 754, ~7 decimal digits) is required for complex analysis visualization. Mobile GPUs may only support `mediump` (16-bit) in fragment shaders, causing visible artifacts near poles and at large zoom levels. Use `#ifdef GL_FRAGMENT_PRECISION_HIGH` to detect. For extreme zoom (Mandelbrot-style), emulated double precision via "double-single" arithmetic (two floats encoding high+low) is possible but expensive.

Overflow near singularities: `exp(z.x)` overflows for `z.x > ~88`; `pow(r, n)` overflows for large *r*. Clamp inputs before these operations. GLSL's `mod(x, 0.0)` is undefined on some platforms — always guard.

### 3D magnitude surface rendering

The "analytic landscape" represents `|f(z)|` as height over the complex plane, colored by `arg(f(z))`. Zeros become valleys, poles become peaks. Two mesh generation strategies are viable:

**Grid-based approach** (simpler): Evaluate `f(z)` on a uniform N×N grid (typically 256×256), clamp pole heights via `log(1 + |f|)` or `(2/π)·arctan(|f|)`, generate two triangles per grid cell. This works well with Three.js `BufferGeometry` and can be computed on the CPU with Complex.js, then uploaded as vertex attributes. Use coarser grids (64×64) during interaction and finer grids when stationary.

**Ray-surface intersection** (Spirulae's approach, state of the art): Cast a ray per pixel in the fragment shader, approximate the intersection with the surface `z = |f(x+iy)|`. This avoids generating geometry entirely and delivers unlimited resolution, but requires more complex shader code and may be slower on low-end GPUs.

---

## Topic 3: Drag-and-drop pole/zero placement and live formula display

### Existing tools define the interaction vocabulary

The most instructive reference implementations are:

- **person594/cplot** — Parses arbitrary expressions of `z`, compiles to GLSL fragment shaders at runtime. Includes a time variable `t` and mouse cursor variable `c` for interactive placement. This is the closest existing analog to the proposed tool
- **Spirulae** — Custom equation parser that compiles to GLSL, supporting special functions including Riemann zeta. Both 2D and 3D views
- **David Bau's conformal viewer** — Text input → instant domain coloring, parameterized expressions with sliders for variables
- **Control Systems Academy** — The gold standard for drag-and-drop pole/zero placement: "Add pole"/"Add zero" buttons, drag on the s-plane, live Bode plot updates. Complex conjugate pairs handled automatically

From Desmos, the borrowable UX patterns are: auto-detection of free variables with automatic slider creation, inline sliders with adjustable bounds, instant feedback at 60fps, and shareable state via URL encoding.

### Best practices for pole/zero drag interaction

The right approach is **custom pointer event handling** via `@use-gesture/react` rather than DOM-oriented libraries like dnd-kit or react-dnd, which weren't designed for canvas coordinate spaces. Key implementation details:

- **Coordinate display**: Show `Re: X.XX, Im: Y.YY` as a tooltip tracking the dragged element, updating on every `pointermove`
- **Conjugate pair enforcement**: When a pole/zero is off the real axis, automatically create and move its conjugate. If dragged to `Im ≈ 0`, merge into a single real pole/zero. This keeps polynomial coefficients real
- **Snapping**: `Math.round(x * 4) / 4` for quarter-integer grid snapping, toggleable with a modifier key
- **Visual conventions** (from control theory): poles as **×** markers in red/orange, zeros as **○** markers in blue/green, with the unit circle drawn as reference
- **Touch support**: PointerEvents API (unified mouse + touch), minimum 44×44px hit targets per Apple HIG, pinch-to-zoom via `@use-gesture`'s `usePinch`
- **Undo/redo**: Maintain a state history stack; each add/remove/move pushes immutable state snapshots (using Immer)

### Live formula rendering with KaTeX

**KaTeX** is the clear choice for real-time formula display. It renders synchronously (no page reflow), takes ~25KB gzipped, and can be called on every drag frame at 60fps. The formula is built from the pole/zero configuration:

```javascript
function buildLaTeX(zeros, poles, K) {
  const num = zeros.map(z => `(z - ${formatComplex(z)})`).join('');
  const den = poles.map(p => `(z - ${formatComplex(p)})`).join('');
  return `f(z) = ${K} \\cdot \\frac{${num || '1'}}{${den || '1'}}`;
}
```

For the expanded polynomial form, **math.js** can multiply polynomials symbolically. Its `node.toTex()` method converts parsed expression ASTs directly to LaTeX strings. Toggling between factored and expanded forms provides pedagogical value.

### Compiling user expressions into GLSL at runtime

The definitive pattern, documented by Ryan Kaplan in "Building a Fast Equation Grapher":

1. **Parse** user input into an AST using math.js (`math.parse('z^2 + 1/(z-i)')`)
2. **Walk the AST** recursively, emitting GLSL for each node (variables → GLSL identifiers, operations → `cmul`/`cdiv`/`cpow` calls, functions → GLSL complex function implementations)
3. **Splice** generated GLSL into a fragment shader template containing complex arithmetic utilities and color mapping code
4. **Compile** via `gl.shaderSource()` + `gl.compileShader()` at runtime
5. **Handle errors** gracefully: if compilation fails, keep the last working shader active and display the error

The library **jzohdi/glsl_math** on GitHub transforms human-readable math expressions like `x^(-2cos(x))` into GLSL-compatible strings. For this project, a custom AST walker built on math.js's parse tree provides the most control.

---

## Topic 4: The recommended library stack for 2026

### Rendering: Two canvases, two approaches

The 2D domain coloring view should use **raw WebGL2** (or a thin wrapper like regl) — a single fullscreen quad with a custom fragment shader requires ~50–150 lines of JavaScript with zero dependencies. The overhead of Three.js's scene graph is unnecessary for this flat rendering pattern.

The 3D magnitude surface view should use **react-three-fiber v9.5** (`@react-three/fiber`, ~28k GitHub stars) with Three.js. R3F provides `useFrame` for the animation loop (runs outside React reconciliation), `shaderMaterial` from `@react-three/drei` for custom shaders, and `OrbitControls` for 3D camera interaction. R3F v9 supports React 19 and WebGPU through an async renderer factory.

### Interaction, state, and math libraries

| Component | Recommended Library | Why |
|-----------|-------------------|-----|
| Pointer interaction | `@use-gesture/react` | Canvas-aware drag/pinch/zoom, same ecosystem as R3F |
| 2D pan/zoom | `d3-zoom` | Battle-tested transform management with zoom-to-cursor |
| 3D camera | `OrbitControls` from `@react-three/drei` | One-line integration with R3F |
| Math rendering | `katex` v0.16+ (6.2M weekly npm downloads) | Synchronous, 60fps-viable formula updates |
| Expression parsing | `mathjs` (~14k GitHub stars) | Full complex number support, AST access, `toTex()` |
| Complex arithmetic (JS) | `complex.js` (~10KB) | Lightweight, optimized for hot loops |
| State management | `zustand` v5 (~24.9M weekly npm downloads) | Store readable outside React via `getState()`; R3F uses it internally |

**KaTeX vs MathJax**: KaTeX wins decisively for this use case. Its synchronous rendering avoids the flicker that MathJax's async `typesetPromise()` causes during rapid updates. KaTeX's LaTeX subset covers everything needed for transfer function notation (fractions, superscripts, products).

**Zustand** is the ideal state manager because the WebGL render loop can call `useStore.getState()` each frame to read pole/zero positions without triggering React re-renders, while React UI components use selector-based subscriptions (`useStore(s => s.poles)`) for display updates. The store serves as a single source of truth bridging the imperative GPU layer and the declarative React layer.

---

## Topic 5: Architecture that keeps 60fps on student Chromebooks

### Decouple the render loop from React completely

The fundamental pattern is the "thin React wrapper": React owns the `<canvas>` element and all UI controls, while a standalone `WebGLRenderer` class runs via `requestAnimationFrame` entirely outside React's reconciliation cycle. Communication is one-way via refs and Zustand's `getState()`:

```
React Component Tree              Imperative WebGL Layer
┌────────────────────┐            ┌────────────────────────┐
│ App                │            │ WebGLRenderer class     │
│  ├─ ControlPanel   │──ref────→ │  - compileShader()      │
│  │  ├─ FormulaView │           │  - updateUniforms()     │
│  │  ├─ PoleList    │           │  - render() at 60fps    │
│  ├─ Canvas (ref)   │           │  - handleResize()       │
└────────────────────┘            └────────────────────────┘
```

Never pass WebGL objects as React state. Use `useRef` for the renderer instance, uniforms, and mutable state. Zustand's `subscribe` with transient updates handles high-frequency changes (drag positions) without reconciliation.

### Uniforms for positions, recompilation only for structure changes

The most important performance decision: **pole/zero positions change via uniform updates** (essentially free — one `gl.uniform2fv()` call per frame), while only the function's *structure* triggers shader recompilation. The recommended GLSL pattern:

```glsl
#define MAX_POLES 32
uniform int u_numPoles;
uniform int u_numZeros;
uniform vec2 u_poles[MAX_POLES];
uniform vec2 u_zeros[MAX_ZEROS];

vec2 f(vec2 z) {
    vec2 num = vec2(1.0, 0.0);
    vec2 den = vec2(1.0, 0.0);
    for (int i = 0; i < MAX_POLES; i++) {
        if (i >= u_numPoles) break;
        den = cmul(den, z - u_poles[i]);
    }
    for (int i = 0; i < MAX_ZEROS; i++) {
        if (i >= u_numZeros) break;
        num = cmul(num, z - u_zeros[i]);
    }
    return cdiv(num, den);
}
```

This means **dragging poles/zeros never recompiles the shader**. Adding/removing poles only changes a count uniform (still no recompilation). Only switching to an entirely different function form (e.g., from rational to exponential) requires recompilation. The **32-element max** uses ~256 uniform floats, well within WebGL's minimum guarantee of 64 fragment uniform vectors.

### Shader compilation can freeze the browser — mitigate it

On Windows, Chrome and Firefox use ANGLE (translating GLSL → HLSL → D3D bytecode), and complex shaders can take **10–500ms** to compile — long enough to drop frames. Mitigation strategies:

- **KHR_parallel_shader_compile** extension (widely supported): enables non-blocking polling for compile status via `COMPLETION_STATUS_KHR`. Submit compile, do other work, poll each frame
- **Double-buffered shader programs**: compile the new program while the old one renders. On success, swap atomically at the frame boundary. On failure, keep the old program and display the error
- **Debounce formula edits**: wait **300–500ms** after the last keystroke before triggering recompilation
- **Progressive rendering**: immediately show a low-resolution preview (render at 1/4 resolution) while the full shader compiles

### Graceful degradation for diverse student hardware

Intel integrated graphics (UHD 620/630, Iris Xe) powers ~60% of student laptops. Chromebooks use ARM Mali, PowerVR, or low-end Intel GPUs with shared memory (often 2–4GB total). iPads have excellent Apple GPUs. Key strategies:

- **Start at reduced device pixel ratio** (0.5–0.75×) and adaptively increase based on measured FPS over ~60 frames
- **Detect GPU** via `WEBGL_debug_renderer_info` to set initial quality presets
- **Query actual limits**: `gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)` at startup
- **Handle context loss from day one**: WebGL contexts can be lost at any time (GPU reset, memory pressure, tab backgrounding). Listen for `webglcontextlost` (call `e.preventDefault()`), then `webglcontextrestored` to recreate all resources

### Build tooling: vite-plugin-glsl for shader development

Use **vite-plugin-glsl** (3,500+ weekly npm downloads, Vite 4–7 compatible) for shader bundling. It provides `#include` directives for modular GLSL, shader minification in production, and **hot module replacement** for shader development — edit a `.frag` file and see changes instantly. For dynamically generated shaders (the main use case here), import utility GLSL chunks via the plugin and concatenate them with runtime-generated code before calling `gl.shaderSource()`.

Organize shaders as modular files: `complex-math.glsl` (shared arithmetic), `color-mapping.glsl` (HSV/domain coloring utilities), `fullscreen.vert` (passthrough vertex shader), with the main fragment shader generated at runtime from user input.

---

## Conclusion

The architecture that emerges from this research is deliberately asymmetric: **WebGL2 for the performance-critical 2D domain coloring** (where raw control over a single fullscreen quad matters most and broad compatibility is essential), **react-three-fiber for the 3D magnitude surface** (where scene graph management, lighting, and camera controls add real value), and **Zustand as the bridge** between React's declarative UI and the imperative GPU layer.

The most impactful technical insight is that **uniform arrays eliminate the need for shader recompilation during interaction**. A student dragging poles around the complex plane should trigger nothing more expensive than a `gl.uniform2fv()` call — the shader evaluates the rational function with a loop over the uniform array, and the count is itself a uniform. This makes smooth 60fps interaction achievable even on Chromebooks with integrated GPUs.

For the expression-to-GLSL pipeline, math.js provides both the parser (with AST access) and the LaTeX output (`node.toTex()`) needed to simultaneously update the shader and the KaTeX formula display from a single parsed representation. The Spirulae project by harry7557558 demonstrates this full pipeline in production, including 3D visualization, and serves as the best reference implementation to study.

The stack summary: **WebGL2 + react-three-fiber + Zustand + KaTeX + math.js + @use-gesture + d3-zoom + vite-plugin-glsl**. All actively maintained, MIT-licensed, React 19 compatible, and collectively proven across the existing domain coloring ecosystem.