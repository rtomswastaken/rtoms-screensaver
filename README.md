# RTOMS - Retro CRT Ambient Dashboard & Screensaver

RTOMS is an authentic, retro CRT ambient dashboard and screensaver engineered for vertical 9:16 portrait monitors, mobile docks, and desktop kiosk setups. It evokes vintage amber phosphor terminals, NASA mission-control displays, oscilloscope instrumentation, and early telemetry systems.

The entire interface operates as one continuous convex CRT glass surface with realistic barrel distortion, horizontal phosphor scanlines, fine raster textures, cathode ray beam sweeps, and phosphor bloom glow.

Built entirely with pure vanilla web technologies: zero external dependencies, no node build steps, no heavy frameworks, and full offline resilience.

---

## Visual Previews

### Portrait Mode (Amber Phosphor - Default)
![Amber Portrait Mode](docs/screenshots/amber-portrait.png)

### Landscape Desktop Terminal View
![Amber Landscape Mode](docs/screenshots/amber-landscape.png)

### Green Phosphor (VT220 Terminal Aesthetic)
![Green Phosphor Mode](docs/screenshots/green-portrait.png)

### Cyan Phosphor (Telemetry & Radar Mode)
![Cyan Phosphor Mode](docs/screenshots/cyan-portrait.png)

### Monochrome Phosphor (P4 High-Contrast White)
![Monochrome Phosphor Mode](docs/screenshots/mono-portrait.png)

---

## Core Features

- Continuous Convex CRT Optical Surface: Barrel pincushion glass curvature, radial corner vignette, horizontal phosphor scanlines, fine sub-pixel dot raster, and periodic vertical refresh beam sweeps.
- Four Phosphor Color Themes: Amber (warm P3 phosphor default), Green (DEC VT220 style), Cyan (radar telemetry style), and Monochrome (P4 high-contrast white). Cycle with the T key or through the bottom HUD. Theme preference is automatically persisted to local storage.
- Two-Sided Asymmetric Header:
  - Top Left: Dynamic time-of-day greeting (GOOD MORNING, GOOD AFTERNOON, GOOD EVENING, GOOD NIGHT), large retro display identity (RTOMS), and full calendar date.
  - Top Right: Real-time digital clock with seconds, local timezone tag, live Open-Meteo weather for Kanjirappally (Kerala, India) featuring custom pixel-art SVG weather icons, temperature, humidity, and wind conditions.
- Real-Time Telemetry Engines:
  - Cross-Hatched Histogram: Exact visual replica of vintage CRT chart displays with diagonal cross-hatching fill, spline curve envelope, and dynamic peak percentage callout.
  - Harmonics Oscilloscope: Multi-wave sinusoidal composite signal overlaid on live frequency spectrum analyzer bars.
  - Polar Spider / Radar Chart: Six-axis system health monitor (Activity, Signal, Memory, Processing, Stability, Performance) with animated polygon coverage.
  - Buffer Telemetry Chart: Real-time rolling memory stream line graph with grid markers and time markers.
  - 360-Degree Radar Sweep: Continuous circular beam sweep with phosphor persistence blips.
  - Hexadecimal & Binary Stream: Procedural machine-code memory dump stream.
- Autonomous Pixel-Art Turtle Arcade: Built-in 8-bit retro mini-game where an autonomous pixel turtle navigates a maze using BFS (Breadth-First Search) pathfinding to collect dots, tracking score and dot harvest statistics continuously.
- Kiosk Mode & Power Management: Includes Windows launch script, HTML5 Fullscreen API toggling, and Screen Wake Lock API integration to prevent display sleep during multi-hour kiosk runs.
- Bottom-Edge Auto-Hiding HUD: Control panel remains hidden during normal ambient operation. Moving the mouse cursor near the bottom edge reveals frosted glass control buttons. Mouse cursor automatically hides after 2.8 seconds of inactivity.

---

## Keyboard Controls & Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| T | Cycle Theme | Switches between Amber, Green, Cyan, and Monochrome |
| Space | Pause / Live | Freezes or resumes telemetry graphs and oscilloscope waves |
| F | Fullscreen | Toggles full-screen display mode |
| R | Refresh Weather | Forces an immediate Open-Meteo weather update |
| H | Toggle CRT Optics | Switches between curved convex CRT glass and flat presentation |
| Alt + F4 | Exit Kiosk | Closes kiosk browser window on Windows systems |
| Esc | Exit Fullscreen | Returns from fullscreen to regular browser window |

---

## How to Customize and Make It Yours

RTOMS was designed to be easily customized. All styling, parameters, and telemetry data are modular.

### 1. Changing the Call Sign / Name
To change the main heading from "RTOMS" to your own name or handle:
- In `index.html`, locate:
  ```html
  <h1 class="brand-title">RTOMS</h1>
  ```
  Replace `RTOMS` with your desired name (for example, `ALEX`, `NOVA`, or `ARCH`).

### 2. Changing the Weather Location
By default, RTOMS displays live weather for Kanjirappally, Kerala, India (coordinates: latitude 9.55, longitude 76.78).

To configure your own city:
1. Open `dashboard.js` and locate the `fetchWeather` function around line 223:
   ```javascript
   const lat = 9.55;  // Replace with your latitude
   const lon = 76.78; // Replace with your longitude
   ```
2. In `index.html`, update the location badge in the header:
   ```html
   <span class="badge loc-badge">KANJIRAPPALLY</span>
   ```
   Replace `KANJIRAPPALLY` with your city name.
3. If offline, the dashboard falls back gracefully to default temperature and weather data defined in `dashboard.js`.

### 3. Adding or Modifying Phosphor Themes
Color palettes are defined via CSS custom properties in `style.css` and matching theme definitions in `dashboard.js`.

To modify the default Amber color or add your own palette:
- In `style.css`, edit the CSS variables under `:root` or create a new `body[data-theme="your-theme"]` block:
  ```css
  body[data-theme="purple"] {
    --bg: #09000a;
    --primary: #d442f5;
    --highlight: #f3a6ff;
    --muted: rgba(212, 66, 245, 0.32);
    --dim: rgba(212, 66, 245, 0.08);
    --border: rgba(212, 66, 245, 0.28);
    --border-strong: rgba(212, 66, 245, 0.6);
  }
  ```
- In `dashboard.js`, append your theme definition to the `themes` array:
  ```javascript
  {
    id: 'purple',
    name: 'Purple',
    bg: '#09000a',
    primary: '#d442f5',
    highlight: '#f3a6ff',
    muted: 'rgba(212, 66, 245, 0.32)',
    dim: 'rgba(212, 66, 245, 0.08)'
  }
  ```

### 4. Customizing Telemetry & Oscilloscope
All procedural charts are generated inside `telemetry.js`:
- To adjust the histogram bars, edit `initHistogramData()` in `telemetry.js`.
- To alter the harmonics and speed of the oscilloscope, adjust `freq1`, `freq2`, and `freq3` in `renderOscilloscope()`.
- To rename the radar chart axes, update the `this.radarAxes` array in `initRadarChartData()`.

### 5. Customizing the Turtle Arcade
The autonomous maze runner is located in `turtle.js`:
- Adjust `this.turtle.speed` to make the turtle faster or slower.
- Customize the maze dimensions by changing `this.cols` and `this.rows`.
- Customize the 8x8 pixel turtle sprite definition in `drawTurtle()`.

---

## Windows Kiosk Setup & Deployment

A ready-to-run Windows launcher is provided in `launch-kiosk.bat`.

### Launching in Kiosk Mode
1. Clone or download this repository onto your Windows machine:
   ```bash
   git clone https://github.com/rtomswastaken/rtoms-screensaver.git
   ```
2. Double-click `launch-kiosk.bat`.
3. The dashboard will launch in Microsoft Edge (or Google Chrome) in true fullscreen kiosk mode, hiding all address bars, tabs, toolbars, and system borders.

### Exiting Kiosk Mode
- Press `Alt + F4` to exit the kiosk application at any time.

### Windows Power Configuration for Dedicated Kiosks
If running this application on a dedicated vertical secondary monitor or kiosk laptop:
1. Open Windows Settings -> System -> Power & Sleep.
2. Set "When plugged in, turn off screen after" to "Never".
3. Set "When plugged in, PC goes to sleep after" to "Never".
4. The dashboard automatically requests a browser Screen Wake Lock when active.

---

## Technical Specifications

- Rendering Engine: Pure HTML5 Canvas 2D with Retina/DPR scaling support.
- CSS Architecture: Continuous 3D convex CRT transformation pipeline with CSS custom property theming.
- Network Dependencies: Zero external runtime dependencies. Fallback monospace fonts ensure 100% offline capability.
- Weather Service: Open-Meteo REST API (public free tier, no API key required).
- Frame Rate: Consistent 60 FPS update cycle driven by `requestAnimationFrame`. Automatically throttles when the browser tab is hidden to conserve power.

---

## File Structure

```
rtoms-screensaver/
├── index.html          # Semantic CRT markup and chassis structure
├── style.css           # CRT optical shaders, animations, and phosphor themes
├── dashboard.js        # Clock, greeting, weather API, theme persistence, and HUD
├── telemetry.js        # Canvas 2D engines for histogram, oscilloscope, radar, and hex stream
├── turtle.js           # Autonomous 8-bit BFS turtle maze arcade engine
├── launch-kiosk.bat    # Windows batch launcher for Edge/Chrome kiosk mode
├── README.md           # Documentation, customization guide, and setup instructions
├── .gitignore          # Git exclusion rules
└── docs/
    └── screenshots/    # High-resolution previews for all phosphor themes
```

---

## License

MIT License. Free to use, adapt, and build upon.
