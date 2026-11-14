# Design Specification: rtoms-screensaver

**Date**: 2026-11-14  
**Project**: rtoms-screensaver  
**Repository**: `/Users/rtoms/Downloads/github/rtoms-screensaver`  
**Status**: Approved Specification  

---

## 1. Overview & Objectives

`rtoms-screensaver` is a minimalist, high-performance web screensaver. It features:
1. **Procedural Topographic Background Animation**: Smoothly moving monochrome contour lines inspired by topographic elevation maps, rendered via Marching Squares on an HTML5 Canvas 2D context using Simplex Noise.
2. **Centered 24-Hour Flip Clock**: Large, responsive, minimalist 3D mechanical flip clock displaying `HH : MM : SS`, dynamically scaling with viewport resolution.
3. **"hello rtoms" Badge**: Understated, right-aligned top-right title with balanced padding and subtle border frame.
4. **Screensaver Features**: First-interaction fullscreen launch, Wake Lock API integration to prevent display sleep, keyboard navigation, and zero external runtime dependencies.

---

## 2. Technical Architecture & File Structure

The project is built entirely with modern vanilla web standards (HTML5, CSS3, ES6 JavaScript) to guarantee instant loading, zero build steps, and longevity.

```text
rtoms-screensaver/
├── index.html        # Semantic HTML structure, meta tags, and SVG icons
├── style.css         # Minimalist monochrome design, 3D CSS flip animations, responsive typography
├── app.js            # Main controller: clock sync, UI state, fullscreen & wake lock lifecycle
├── topography.js     # Topography engine: Simplex noise, preallocated Marching Squares, canvas render loop
├── README.md         # Documentation, usage guide, keyboard shortcuts
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-11-14-rtoms-screensaver-design.md
```

---

## 3. Background Engine: Procedural Topography (`topography.js`)

### 3.1 Mathematical Principles & Algorithms
* **Simplex Noise**: 3D Simplex noise generator (`x`, `y`, `time`) producing continuous smooth elevation scalar fields $f(x, y, t)$.
* **Marching Squares Contour Extraction**:
  - A 2D grid divides the viewport into cells.
  - Cell corners evaluate the noise value against predefined elevation threshold levels (iso-levels).
  - A lookup table (16 bitwise configurations) computes segment coordinates between interpolated edge points.
* **Preallocated Typed Arrays (Zero Garbage Collection)**:
  - Noise values stored in a preallocated `Float32Array`.
  - Isoline segment coordinate buffers preallocated to avoid creating object allocations in the animation loop.
* **Adaptive Resolution & DPR Scaling**:
  - Reads `window.devicePixelRatio` with a maximum cap of 2.0 to balance crispness with GPU/CPU efficiency.
  - Monitors frame time delta. If frame render times exceed 24ms over consecutive frames, grid step dynamically downscales, recovering when frame times stabilize.
  - Uses `ResizeObserver` to adapt to screen geometry changes smoothly.
* **Delta-Time Animation Loop**:
  - Animation progress is driven by `elapsedTime = (currentTime - startTime) * speed`.
  - No frame-rate dependencies; movement remains constant speed regardless of refresh rate (60Hz, 120Hz, 144Hz).
* **Configurable Density Levels**:
  - `M` key cycles through:
    1. **Medium (Default)**: Balanced contour spacing (~16 iso-levels).
    2. **High**: Denser contour topology (~24 iso-levels).
    3. **Low**: Spacious, sparse elevation curves (~10 iso-levels).
* **Motion Preferences**:
  - Detects `window.matchMedia('(prefers-reduced-motion: reduce)')`. If active, noise time-offset increments are paused while rendering a static, crisp topographic view.

---

## 4. Foreground Flip Clock (`app.js` & `style.css`)

### 4.1 Mechanical 3D Card Architecture
* **Layout**: Centered vertically and horizontally in the viewport.
* **Format**: 24-Hour format `HH : MM : SS` composed of 6 distinct digit card units and 2 separator colons.
* **Card Structure**:
  Each digit card consists of:
  - `card-top-static`: displays the current digit's top half.
  - `card-bottom-static`: displays the incoming digit's bottom half underneath.
  - `card-top-flip`: front face displays current digit's top half, flips down $-90^\circ$ around bottom hinge.
  - `card-bottom-flip`: back face displays incoming digit's bottom half, flips from $+90^\circ$ down to $0^\circ$ around top hinge.
  - Shading overlays: CSS gradient overlays simulating fold shadows and light absorption during the flip action.
* **Selective Digit Updates**:
  - The controller compares each of the 6 digits (`H1`, `H2`, `M1`, `M2`, `S1`, `S2`) against previous states.
  - An animation cycle is triggered **only** for changed digits (seconds digit flips every second; tens of minutes flips every 10 minutes).
  - DOM elements are retained and reused; zero element destruction/recreation.
* **Clock Synchronization**:
  - Synchronized against `performance.now()` and aligned to system millisecond boundaries (`1000 - Date.now() % 1000`).
  - Eliminates `setInterval` timer drift.

### 4.2 Styling & Aesthetics
* **Palette**:
  - Canvas Background: Pure `#000000`.
  - Topographic Lines: `#FFFFFF` with slight anti-aliasing opacity.
  - Flip Cards: Deep charcoal `#111111` with `rgba(255, 255, 255, 0.12)` border and subtle backdrop blur.
  - Numerals: Bold, clean sans-serif/tabular figures (`font-variant-numeric: tabular-nums`).
* **Sizing**:
  - Responsive scaling using `clamp(2rem, 9vw, 8.5rem)` digit sizes to ensure massive presence on 4K/fullscreen while remaining proportionate on smaller viewports.

---

## 5. UI Layout & Screensaver Lifecycle

### 5.1 "hello rtoms" Header Badge
* **Position**: Fixed top-right with balanced offset (`top: 2.5rem; right: 2.5rem;`).
* **Styling**: Minimalist bordered pill/box (`1px solid rgba(255, 255, 255, 0.18)`), lowercase tracking, muted white text (`rgba(255, 255, 255, 0.8)`). Understated and secondary to the primary clock focus.

### 5.2 Fullscreen Lifecycle
* **First-Interaction Auto-Fullscreen**:
  - First click, touch, or keypress triggers `document.documentElement.requestFullscreen()`.
  - A discreet hint ("Click or press [F] for Fullscreen") shows on initial load and smoothly fades out upon entering fullscreen.
* **Shortcut & Native Exit Tracking**:
  - Key `F`: toggles fullscreen on/off.
  - Native `fullscreenchange` listener ensures UI state remains consistent when exiting via `Escape`.
* **Keyboard Shortcuts**:
  - `F`: Toggle Fullscreen.
  - `Space`: Pause / Resume topographic movement.
  - `M`: Cycle Marching Squares density (Low / Medium / High).
* **Screen Wake Lock**:
  - Automatically requests `navigator.wakeLock.request('screen')` when supported.
  - Listens to `visibilitychange` to reacquire the wake lock when the tab/window returns to focus.
  - Graceful fallback for unsupported browsers with no console errors.

---

## 6. Verification & Testing Strategy

1. **Topography Verification**:
   - Inspect canvas rendering in browser, verify Marching Squares connects contour lines cleanly without seams.
   - Verify DPR scaling on high-DPI displays.
   - Check performance metrics: zero array allocations in hot loop, stable frame rate.
2. **Clock Verification**:
   - Test digit transition accuracy at edge cases (e.g., `59` to `00` seconds, `23:59:59` to `00:00:00`).
   - Confirm only modified digit cards animate.
3. **Interaction Verification**:
   - Test `F` and `Escape` fullscreen transitions.
   - Test Wake Lock reacquisition lifecycle.
   - Test `Space` pause/resume and `M` density cycling.
