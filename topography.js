/**
 * rtoms-screensaver: Topography Engine
 * Lightweight, procedural 2D Canvas Marching Squares with 3D Simplex Noise.
 * Zero GC in hot loop, preallocated typed arrays, adaptive resolution, DPR scaling.
 */

class TopographyEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    // Simplex Noise instance
    this.simplex = new SimplexNoise();

    // Configuration
    this.targetFps = 60;
    this.speed = 0.00015; // Slow, hypnotic flow matching the reference video
    this.spatialScale = 0.0016; // Terrain feature scale
    this.isPaused = false;
    this.lastTime = performance.now();
    this.timeOffset = 0;

    // Density Presets (number of elevation iso-levels)
    this.densityPresets = {
      low: [0.15, 0.3, 0.45, 0.6, 0.75, 0.9],
      medium: [0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96],
      high: [
        0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5,
        0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95
      ]
    };
    this.currentDensityName = 'medium';
    this.isoLevels = this.densityPresets[this.currentDensityName];

    // Grid & Memory Preallocation
    this.baseCellSize = 16; // Grid cell size in CSS pixels
    this.cellSize = this.baseCellSize;
    this.width = 0;
    this.height = 0;
    this.cols = 0;
    this.rows = 0;
    this.dpr = 1;

    // Preallocated Typed Arrays
    this.noiseBuffer = null; // Float32Array for cell vertex heights

    // Adaptive Performance Monitor
    this.frameTimeHistory = new Float32Array(30);
    this.historyIndex = 0;
    this.consecutiveSlowFrames = 0;

    // Motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Line style
    this.lineWidth = 1.35;
    this.lineColor = 'rgba(255, 255, 255, 0.85)';
    this.accentLineColor = 'rgba(255, 255, 255, 0.95)';

    this.initResizeObserver();
    this.resize();
  }

  initResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.canvas);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0); // Cap at 2.0 for kiosk efficiency
    this.dpr = dpr;

    this.cssWidth = rect.width || window.innerWidth;
    this.cssHeight = rect.height || window.innerHeight;

    this.width = Math.floor(this.cssWidth * dpr);
    this.height = Math.floor(this.cssHeight * dpr);

    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Grid dimension calculation
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
    const delta = Math.min(currentTime - this.lastTime, 100); // Clamp to prevent jump after background tab
    this.lastTime = currentTime;

    // Track frame performance for adaptive quality
    this.frameTimeHistory[this.historyIndex] = delta;
    this.historyIndex = (this.historyIndex + 1) % 30;

    // Check if frame times are consistently exceeding 24ms (~40 FPS)
    if (delta > 24) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames > 45 && this.cellSize < 28) {
        // Step down quality gracefully
        this.cellSize += 4;
        this.resize();
        this.consecutiveSlowFrames = 0;
      }
    } else {
      if (this.consecutiveSlowFrames > 0) this.consecutiveSlowFrames--;
    }

    // Time advance
    if (!this.isPaused && !this.prefersReducedMotion) {
      this.timeOffset += delta * this.speed;
    }

    const ctx = this.ctx;
    const dpr = this.dpr;
    const width = this.width;
    const height = this.height;
    const cols = this.cols;
    const rows = this.rows;
    const cellSize = this.cellSize;
    const noiseBuffer = this.noiseBuffer;
    const simplex = this.simplex;
    const scale = this.spatialScale;
    const t = this.timeOffset;

    // 1. Clear background with pitch black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Evaluate scalar height field into preallocated buffer
    // Combining 2 octaves for organic natural topography ridges
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = r * cellSize;
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        // Primary broad elevation
        const n1 = simplex.noise3D(x * scale, y * scale, t);
        // Finer organic detail
        const n2 = simplex.noise3D(x * scale * 2.2 + 10.5, y * scale * 2.2 + 20.2, t * 1.3) * 0.35;
        // Normalized into [0, 1] range
        noiseBuffer[idx++] = (n1 + n2 + 1.35) * 0.37;
      }
    }

    // 3. Marching Squares line extraction & batch drawing
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const levels = this.isoLevels;
    const numLevels = levels.length;

    for (let l = 0; l < numLevels; l++) {
      const iso = levels[l];
      const isMajorLine = (l % 4 === 0);

      ctx.beginPath();
      ctx.strokeStyle = isMajorLine ? this.accentLineColor : this.lineColor;
      ctx.lineWidth = isMajorLine ? this.lineWidth * 1.4 : this.lineWidth;

      for (let r = 0; r < rows - 1; r++) {
        const yTop = r * cellSize;
        const yBottom = yTop + cellSize;
        const rowOffset = r * cols;
        const nextRowOffset = (r + 1) * cols;

        for (let c = 0; c < cols - 1; c++) {
          const xLeft = c * cellSize;
          const xRight = xLeft + cellSize;

          // Corner scalar values
          const vTL = noiseBuffer[rowOffset + c];
          const vTR = noiseBuffer[rowOffset + c + 1];
          const vBR = noiseBuffer[nextRowOffset + c + 1];
          const vBL = noiseBuffer[nextRowOffset + c];

          // 4-bit classification
          let cellCase = 0;
          if (vTL >= iso) cellCase |= 8;
          if (vTR >= iso) cellCase |= 4;
          if (vBR >= iso) cellCase |= 2;
          if (vBL >= iso) cellCase |= 1;

          // If all inside or all outside, no isoline
          if (cellCase === 0 || cellCase === 15) continue;

          // Linear interpolation for exact edge crossing
          // Top edge (vTL -> vTR)
          const topX = xLeft + (iso - vTL) / (vTR - vTL || 0.0001) * cellSize;
          // Right edge (vTR -> vBR)
          const rightY = yTop + (iso - vTR) / (vBR - vTR || 0.0001) * cellSize;
          // Bottom edge (vBL -> vBR)
          const bottomX = xLeft + (iso - vBL) / (vBR - vBL || 0.0001) * cellSize;
          // Left edge (vTL -> vBL)
          const leftY = yTop + (iso - vTL) / (vBL - vTL || 0.0001) * cellSize;

          switch (cellCase) {
            case 1: // BL
            case 14:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(bottomX, yBottom);
              break;
            case 2: // BR
            case 13:
              ctx.moveTo(bottomX, yBottom);
              ctx.lineTo(xRight, rightY);
              break;
            case 3: // BL & BR (bottom horizontal-ish)
            case 12:
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(xRight, rightY);
              break;
            case 4: // TR
            case 11:
              ctx.moveTo(topX, yTop);
              ctx.lineTo(xRight, rightY);
              break;
            case 5: // Saddle: BL & TR
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(topX, yTop);
              ctx.moveTo(bottomX, yBottom);
              ctx.lineTo(xRight, rightY);
              break;
            case 6: // TR & BR (right vertical-ish)
            case 9:
              ctx.moveTo(topX, yTop);
              ctx.lineTo(bottomX, yBottom);
              break;
            case 7: // Not TL
            case 8: // Only TL
              ctx.moveTo(xLeft, leftY);
              ctx.lineTo(topX, yTop);
              break;
            case 10: // Saddle: TL & BR
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
 * Fast, zero-allocation per sample evaluation.
 */
class SimplexNoise {
  constructor(seed = 42) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    // Initial permutation table
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Seeded shuffle
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

    // Precalculated gradients for 3D
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

// Export for app.js
window.TopographyEngine = TopographyEngine;
