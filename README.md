# rtoms screensaver

A minimalist, high-performance screensaver featuring an animated procedural black-and-white topographic background and a large 24-hour mechanical 3D flip clock with an understated `hello rtoms` badge.

Built with pure, zero-dependency modern web standards (HTML5 Canvas 2D, CSS 3D transforms, ES6 JavaScript) engineered for long-running kiosk displays on Windows laptops.

![Monochrome Topography & Flip Clock](https://img.shields.io/badge/status-active-black?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-none-black?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-black?style=flat-square)

---

## Features

- **Procedural Topographic Flow**: Smooth elevation isocontour lines extracted in real-time via Marching Squares and 3D Simplex noise on HTML5 Canvas 2D.
- **24-Hour Mechanical Flip Clock**: Prominently large, centered `HH : MM : SS` clock with 3D folding flaps, fold shadows, side hinge notches, and system millisecond drift compensation.
- **Selective Digit Updates**: Only animates digits that actually change (seconds every second; tens of minutes every 10 minutes) with persistent DOM nodes for zero memory leaks.
- **Zero Garbage Collection Hot Loop**: Preallocated typed arrays (`Float32Array`) and batched vector path strokes for smooth frame rendering.
- **Adaptive Resolution**: Automatically detects display pixel ratio (Retina / 4K) and dynamically balances grid step if hardware load surges.
- **Understated Header**: Subtle `hello rtoms` status badge positioned in the upper-right corner with a pulsing live indicator.
- **Auto-Hiding Cursor**: Mouse pointer automatically disappears after 2.8 seconds of inactivity.
- **Windows Kiosk Ready**: Includes a dedicated double-click `.bat` launcher that opens true full-screen Edge/Chrome kiosk mode without address bars or tabs.

---

## Keyboard Controls & Shortcuts

| Key | Action |
| :--- | :--- |
| **`T`** | Cycle themes (**Warm** ➔ **Dark Green** ➔ **Monochrome B&W** ➔ **RGB Gamer**) |
| **`F`** | Toggle Fullscreen mode |
| **`Space`** | Pause / Resume topographic contour animation |
| **`M`** | Cycle contour density (**Low** ➔ **Medium** ➔ **High**) |
| **`Alt + F4`** | Exit Kiosk mode (Windows) |
| **`Esc`** | Exit Fullscreen (Standard browser mode) |

> **Note**: The bottom HUD menu is completely hidden during screensaver operation to keep the display clean, and reveals automatically whenever you move your cursor to the bottom edge of the screen.

---

## Windows Kiosk Launch Guide

### Quick Start (Double-Click)
1. Double-click **`launch-kiosk.bat`**.
2. Microsoft Edge (or Google Chrome) will immediately launch into true full-screen kiosk mode (`--kiosk --edge-kiosk-type=fullscreen`).
3. There are no URL bars, tabs, or desktop borders visible.

### How to Exit Kiosk Mode
Press **`Alt + F4`** at any time to close the screensaver and return to Windows.

---

## Windows Power Settings (For Long-Running Kiosk Laptops)

While `rtoms-screensaver` actively utilizes the **Screen Wake Lock API** (`navigator.wakeLock`) to request continuous screen activation, Windows OS-level group policies and battery-saving profiles can forcibly turn off displays. For a dedicated kiosk machine running unattended for hours:

1. **Keep Display Awake**:
   - Open **Settings** ➔ **System** ➔ **Power & battery** (or **Power & sleep**).
   - Under **Screen and sleep**, set:
     - *When plugged in, turn off my screen after*: **Never**
     - *When plugged in, put my device to sleep after*: **Never**
2. **Prevent Sleep When Lid is Closed** (If operating laptop with lid shut or connected to external display):
   - Press `Win + R`, type `control` and press Enter to open Control Panel.
   - Go to **Hardware and Sound** ➔ **Power Options**.
   - Click **"Choose what closing the lid does"** on the left sidebar.
   - Set *When I close the lid* (Plugged in) to **Do nothing**.
3. **Automatic Startup (Optional Screensaver on Boot)**:
   - Press `Win + R`, type `shell:startup` and press Enter.
   - Create a shortcut to `launch-kiosk.bat` and place it in the Startup folder.
   - The screensaver will launch automatically whenever Windows starts.

---

## Project Structure

```text
rtoms-screensaver/
├── index.html        # Semantic layout and 6 persistent flip units
├── style.css         # Monochrome styling & 3D CSS flip animations
├── app.js            # Clock drift correction, Wake Lock & input controls
├── topography.js     # Simplex noise & Marching Squares canvas engine
├── launch-kiosk.bat  # Dedicated Windows Edge/Chrome kiosk launcher
├── README.md         # Documentation & guide
└── .gitignore
```

---

## Offline & Zero-Dependency Guarantee

`rtoms-screensaver` contains zero external network requests, CDNs, or node modules. You can copy this folder to any flash drive, offline laptop, or air-gapped machine, and it will run immediately.
