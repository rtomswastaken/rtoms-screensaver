/**
 * rtoms-screensaver: Topography Engine
 * Lightweight, procedural 2D Canvas Marching Squares with 3D Simplex Noise.
 * Features:
 * - Denser, rich isocontour waves
 * - Theme Support: Monochrome B&W, Warm Amber, Dark Green, Dynamic RGB Gamer Mode
 * - Subtle cartographic grid with soft luminescence bloom
 * - Preallocated typed arrays for zero GC in hot animation loop
 */

class TopographyEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    // Simplex Noise instance
    this.simplex = new SimplexNoise();

    // Configuration
    this.targetFps = 60;
    this.speed = 0.000038; // Hypnotic, liquid-smooth evolution
    this.spatialScale = 0.0013; // Rich natural terrain feature scale
    this.isPaused = false;
    this.lastTime = performance.now();
    this.timeOffset = 0;

    // Themes
    this.themeNames = ['monochrome', 'warm', 'darkgreen', 'rgb'];
    this.currentTheme = document.body ? (document.body.getAttribute('data-theme') || 'monochrome') : 'monochrome';

    // Denser Density Presets
    this.densityPresets = {
      low: [0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9],
      medium: [
        0.12, 0.17, 0.22, 0.27, 0.32, 0.37, 0.42, 0.47,
        0.52, 0.57, 0.62, 0.67, 0.72, 0.77, 0.82, 0.87
      ],
      high: [
        0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4, 0.44,
        0.48, 0.52, 0.56, 0.6, 0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.88, 0.92
      ]
    };
    this.currentDensityName = 'medium';
    this.isoLevels = this.densityPresets[this.currentDensityName];

    // Grid: 8px cells for silky-smooth continuous curves
    this.baseCellSize = 8;
    this.cellSize = this.baseCellSize;
    this.width = 0;
    this.height = 0;
    this.cols = 0;
    this.rows = 0;
    this.dpr = 1;

    // Cartographic background grid
    this.gridSpacing = 56;

    // Preallocated Typed Arrays
    this.noiseBuffer = null;

    // Adaptive Performance Monitor
    this.frameTimeHistory = new Float32Array(30);
    this.historyIndex = 0;
    this.consecutiveSlowFrames = 0;

    // Motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Visual styles per theme
    this.lineWidth = 1.7;

    this.initResizeObserver();
    this.resize();
  }

  setTheme(themeName) {
    if (this.themeNames.includes(themeName)) {
      this.currentTheme = themeName;
    }
  }

  initResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.canvas);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    this.dpr = dpr;

    this.cssWidth = rect.width || window.innerWidth;
    this.cssHeight = rect.height || window.innerHeight;

    this.width = Math.floor(this.cssWidth * dpr);
    this.height = Math.floor(this.cssHeight * dpr);

    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.cols = Math.ceil(this.cssWidth / this.cellSize) + 1;
    this.rows = Math.ceil(this.cssHeight / this.cellSize) + 1;

    const totalVertices = this.cols * this.rows;
    if (!this.noiseBuffer || this.noiseBuffer.length !== totalVertices) {
      this.noiseBuffer = new Float32Array(totalVertices);
    }
  }

  cycleDensity() {
    const keys = ['low', 'medium', 'high'];
    const nextIdx = (keys.indexOf(this.currentDensityName) + 1) % keys.length;
    this.currentDensityName = keys[nextIdx];
    this.isoLevels = this.densityPresets[this.currentDensityName];
    return this.currentDensityName;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  /**
   * Main render loop driven by requestAnimationFrame
   */
  render(currentTime) {
    const delta = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    this.frameTimeHistory[this.historyIndex] = delta;
    this.historyIndex = (this.historyIndex + 1) % 30;

    if (delta > 26) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames > 45 && this.cellSize < 16) {
        this.cellSize += 2;
        this.resize();
        this.consecutiveSlowFrames = 0;
      }
    } else {
      if (this.consecutiveSlowFrames > 0) this.consecutiveSlowFrames--;
    }

    if (!this.isPaused && !this.prefersReducedMotion) {
      this.timeOffset += delta * this.speed;
    }

    const ctx = this.ctx;
    const dpr = this.dpr;
    const width = this.width;
    const height = this.height;
    const cssW = this.cssWidth;
    const cssH = this.cssHeight;
    const cols = this.cols;
    const rows = this.rows;
    const cellSize = this.cellSize;
    const noiseBuffer = this.noiseBuffer;
    const simplex = this.simplex;
    const scale = this.spatialScale;
    const t = this.timeOffset;
    const theme = this.currentTheme;

    // Theme Color Definitions
    let bgColor = '#000000';
    let gridColor = 'rgba(255, 255, 255, 0.07)';
    let defaultLineColor = 'rgba(255, 255, 255, 0.88)';
    let accentLineColor = 'rgba(255, 255, 255, 0.98)';
    let glowColor = 'rgba(255, 255, 255, 0.5)';

    if (theme === 'warm') {
      bgColor = '#0d0905';
      gridColor = 'rgba(255, 175, 75, 0.08)';
      defaultLineColor = 'rgba(255, 195, 115, 0.9)';
      accentLineColor = 'rgba(255, 225, 160, 1.0)';
      glowColor = 'rgba(255, 150, 40, 0.55)';
    } else if (theme === 'darkgreen') {
      bgColor = '#030d06';
      gridColor = 'rgba(50, 220, 100, 0.08)';
      defaultLineColor = 'rgba(70, 235, 125, 0.9)';
      accentLineColor = 'rgba(140, 255, 180, 1.0)';
      glowColor = 'rgba(40, 220, 95, 0.6)';
    } else if (theme === 'rgb') {
      bgColor = '#050408';
      gridColor = 'rgba(180, 120, 255, 0.075)';
      glowColor = 'rgba(255, 255, 255, 0.45)';
    }

    // 1. Clear background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.scale(dpr, dpr);

    // 2. Draw subtle cartographic grid
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;

    const spacing = this.gridSpacing;
    for (let x = 0; x <= cssW; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
    }
    for (let y = 0; y <= cssH; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
    }
    ctx.stroke();

    // 3. Evaluate noise height field into preallocated typed buffer
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = r * cellSize;
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const n1 = simplex.noise3D(x * scale, y * scale, t);
        const n2 = simplex.noise3D(x * scale * 2.1 + 8.1, y * scale * 2.1 + 12.3, t * 1.25) * 0.32;
        noiseBuffer[idx++] = (n1 + n2 + 1.32) * 0.378;
      }
    }

    // 4. Marching Squares contour line extraction with soft glow
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 5;

    const levels = this.isoLevels;
    const numLevels = levels.length;

    for (let l = 0; l < numLevels; l++) {
      const iso = levels[l];
      const isMajorLine = (l % 4 === 0);

      ctx.beginPath();

      if (theme === 'rgb') {
        // RGB Gamer Rainbow mode: dynamic shifting hue based on time and contour level
        const hue = (currentTime * 0.045 + l * 22) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, ${isMajorLine ? '75%' : '65%'})`;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      } else {
        ctx.strokeStyle = isMajorLine ? accentLineColor : defaultLineColor;
        ctx.shadowColor = glowColor;
      }

      ctx.lineWidth = isMajorLine ? this.lineWidth * 1.35 : this.lineWidth;

      for (let r = 0; r < rows - 1; r++) {
        const yTop = r * cellSize;
        const yBottom = yTop + cellSize;
        const rowOffset = r * cols;
        const nextRowOffset = (r + 1) * cols;

        for (let c = 0; c < cols - 1; c++) {
          const xLeft = c * cellSize;
          const xRight = xLeft + cellSize;

          const vTL = noiseBuffer[rowOffset + c];
          const vTR = noiseBuffer[rowOffset + c + 1];
          const vBR = noiseBuffer[nextRowOffset + c + 1];
          const vBL = noiseBuffer[nextRowOffset + c];

          let cellCase = 0;
          if (vTL >= iso) cellCase |= 8;
          if (vTR >= iso) cellCase |= 4;
          if (vBR >= iso) cellCase |= 2;
          if (vBL >= iso) cellCase |= 1;

          if (cellCase === 0 || cellCase === 15) continue;

          const topX = xLeft + (iso - vTL) / (vTR - vTL || 0.0001) * cellSize;
          const rightY = yTop + (iso - vTR) / (vBR - vTR || 0.0001) * cellSize;
          const bottomX = xLeft + (iso - vBL) / (vBR - vBL || 0.0001) * cellSize;
          const leftY = yTop + (iso - vTL) / (vBL - vTL || 0.0001) * cellSize;

          switch (cellCase) {
            case 1:
            case 14:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(bottomX, yBottom);
              break;
            case 2:
            case 13:
              ctx.moveTo(bottomX, yBottom);
              ctx.lineTo(xRight, rightY);
              break;
            case 3:
            case 12:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(xRight, rightY);
              break;
            case 4:
            case 11:
              ctx.moveTo(topX, yTop);
              ctx.lineTo(xRight, rightY);
              break;
            case 5:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(topX, yTop);
              ctx.moveTo(bottomX, yBottom);
              ctx.lineTo(xRight, rightY);
              break;
            case 6:
            case 9:
              ctx.moveTo(topX, yTop);
              ctx.lineTo(bottomX, yBottom);
              break;
            case 7:
            case 8:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(topX, yTop);
              break;
            case 10:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(bottomX, yBottom);
              ctx.moveTo(topX, yTop);
              ctx.lineTo(xRight, rightY);
              break;
          }
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Self-contained 3D Simplex Noise
 */
class SimplexNoise {
  constructor(seed = 42) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const temp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }

    this.grad3 = new Float32Array([
      1, 1, 0,  -1, 1, 0,  1, -1, 0,  -1, -1, 0,
      1, 0, 1,  -1, 0, 1,  1, 0, -1,  -1, 0, -1,
      0, 1, 1,   0, -1, 1,  0, 1, -1,   0, -1, -1
    ]);
  }

  dot3(gIdx, x, y, z) {
    const g = gIdx * 3;
    return this.grad3[g] * x + this.grad3[g + 1] * y + this.grad3[g + 2] * z;
  }

  noise3D(xin, yin, zin) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;

    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1, j1, k1;
    let i2, j2, k2;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
      } else {
        i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;

    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;

    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const perm = this.perm;
    const permMod12 = this.permMod12;

    const gi0 = permMod12[ii + perm[jj + perm[kk]]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    let n0 = 0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot3(gi0, x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    let n1 = 0;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot3(gi1, x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    let n2 = 0;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot3(gi2, x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    let n3 = 0;
    if (t3 > 0) {
      t3 *= t3;
      n3 = t3 * t3 * this.dot3(gi3, x3, y3, z3);
    }

    return 32.0 * (n0 + n1 + n2 + n3);
  }
}

window.TopographyEngine = TopographyEngine;
