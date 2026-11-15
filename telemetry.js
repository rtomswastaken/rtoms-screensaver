/**
 * RTOMS Retro CRT Ambient Dashboard - Telemetry Engine
 * High-performance Canvas 2D visualizations:
 * 1. Cross-Hatched Histogram (1-Column layout with peak tag & hatched bars)
 * 2. Multi-Harmonic Live Oscilloscope & Frequency Spectrum (Wide 3-Column layout)
 * 3. Carrier Signal Flux & Spectral Monitor (Wide banner graph)
 * 4. Memory / Resource History Line Chart (Half-height compact graph)
 * 5. Procedural Terminal-Text Diagnostic Feed (Typewriter & scroll under memory graph)
 * 6. Large 360-Degree Circular Radar Sweep (Full-height range monitor with persistence blips)
 */

class TelemetryEngine {
  constructor() {
    this.isPaused = false;
    this.speedMultiplier = 0.5; // Default 0.5x (Very Slow)

    this.theme = {
      primary: '#ffb000',
      highlight: '#ffe082',
      muted: 'rgba(255, 176, 0, 0.28)',
      dim: 'rgba(255, 176, 0, 0.08)',
      bg: '#0a0600'
    };

    // Cache canvas contexts
    this.charts = {};
    this.time = 0;
    this.lastFrame = performance.now();

    // Data buffers
    this.initHistogramData();
    this.initOscilloscopeData();
    this.initFluxData();
    this.initMemoryHistoryData();
    this.initRadarSweepData();
    this.initTerminalStream();
  }

  setTheme(themeConfig) {
    this.theme = { ...this.theme, ...themeConfig };
  }

  setSpeedMultiplier(speed) {
    this.speedMultiplier = Math.max(0.1, Number(speed) || 0.5);
  }

  registerCanvas(name, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    this.charts[name] = { canvas, ctx, width: 0, height: 0, dpr: 1 };
    this.resizeCanvas(name);
  }

  resizeAll() {
    Object.keys(this.charts).forEach(name => this.resizeCanvas(name));
  }

  resizeCanvas(name) {
    const entry = this.charts[name];
    if (!entry) return;
    const rect = entry.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    entry.dpr = dpr;
    entry.width = Math.floor(rect.width * dpr);
    entry.height = Math.floor(rect.height * dpr);
    entry.cssWidth = rect.width;
    entry.cssHeight = rect.height;

    if (entry.canvas.width !== entry.width || entry.canvas.height !== entry.height) {
      entry.canvas.width = entry.width;
      entry.canvas.height = entry.height;
    }
  }

  // =========================================================================
  // 1. Cross-Hatched Histogram (1 Column)
  // =========================================================================
  initHistogramData() {
    this.histBars = [
      0.88, 0.76, 0.62, 0.48, 0.38, 0.30, 0.24, 0.19, 0.15, 0.12,
      0.10, 0.09, 0.08, 0.07, 0.06, 0.05
    ];
    this.histTargetBars = [...this.histBars];
    this.histPeak = 57.1;
    this.histTargetPeak = 57.1;
    this.lastHistUpdate = 0;
  }

  renderHistogram(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 20;
    const padR = 8;
    const padT = 18;
    const padB = 16;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // Raster grid
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= plotH; y += plotH / 4) {
      ctx.moveTo(padL, padT + y);
      ctx.lineTo(padL + plotW, padT + y);
    }
    for (let x = 0; x <= plotW; x += plotW / 3) {
      ctx.moveTo(padL + x, padT);
      ctx.lineTo(padL + x, padT + plotH);
    }
    ctx.stroke();

    // Axis markers
    ctx.font = '7.5px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.muted;
    ctx.fillText('100%', 2, padT + 6);
    ctx.fillText('50%', 4, padT + plotH / 2 + 3);
    ctx.fillText('0%', 8, padT + plotH);

    // Calm, slow deliberate bar transitions
    if (!this.isPaused && (t - this.lastHistUpdate > 4.5)) {
      this.lastHistUpdate = t;
      const baseCurve = [
        0.88, 0.74, 0.60, 0.46, 0.36, 0.28, 0.22, 0.18, 0.14, 0.11,
        0.09, 0.08, 0.07, 0.06, 0.055, 0.045
      ];
      this.histTargetBars = baseCurve.map(b => {
        const jitter = (Math.random() - 0.5) * 0.12;
        return Math.max(0.04, Math.min(0.95, b + jitter));
      });
      this.histTargetPeak = +(54.0 + Math.random() * 6.5).toFixed(1);
    }

    // Smooth interpolation
    const lerpSpeed = 0.012 * Math.max(0.2, this.speedMultiplier);
    for (let i = 0; i < this.histBars.length; i++) {
      this.histBars[i] += (this.histTargetBars[i] - this.histBars[i]) * lerpSpeed;
    }
    this.histPeak += (this.histTargetPeak - this.histPeak) * lerpSpeed;

    const numBars = this.histBars.length;
    const barW = Math.max(2, (plotW / numBars) - 1.5);

    // Draw Cross-Hatched Bars
    for (let i = 0; i < numBars; i++) {
      const bh = this.histBars[i] * plotH;
      const bx = padL + i * (plotW / numBars);
      const by = padT + plotH - bh;

      ctx.strokeStyle = this.theme.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, bh);

      // Diagonal cross-hatching
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, barW, bh);
      ctx.clip();

      ctx.strokeStyle = this.theme.muted;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const step = 4;
      for (let d = -bh; d <= barW + bh; d += step) {
        ctx.moveTo(bx + d, by);
        ctx.lineTo(bx + d + bh, by + bh);
        ctx.moveTo(bx + d, by + bh);
        ctx.lineTo(bx + d + bh, by);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Spline line
    ctx.save();
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    const points = [];
    for (let i = 0; i < numBars; i++) {
      const px = padL + i * (plotW / numBars) + barW / 2;
      const py = padT + plotH - (this.histBars[i] * plotH);
      points.push({ x: px, y: py });
    }

    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();

    // Peak Tag Callout Box
    const peakIdx = 1;
    const peakX = padL + peakIdx * (plotW / numBars) + barW / 2;
    const peakY = padT + plotH - (this.histBars[peakIdx] * plotH) - 12;

    ctx.fillStyle = this.theme.highlight;
    ctx.strokeStyle = this.theme.primary;
    ctx.lineWidth = 1;
    ctx.fillRect(peakX - 14, Math.max(padT - 6, peakY - 8), 30, 12);
    ctx.strokeRect(peakX - 14, Math.max(padT - 6, peakY - 8), 30, 12);

    ctx.fillStyle = this.theme.bg;
    ctx.font = 'bold 8px "Share Tech Mono", monospace';
    ctx.fillText(`${this.histPeak.toFixed(1)}%`, peakX - 12, Math.max(padT + 3, peakY + 1));

    ctx.restore();
  }

  // =========================================================================
  // 2. Multi-Harmonic Oscilloscope & Spectrum (Wide 3 Columns)
  // =========================================================================
  initOscilloscopeData() {
    this.spectrumBars = new Float32Array(36);
    for (let i = 0; i < 36; i++) {
      this.spectrumBars[i] = 0.2 + Math.random() * 0.4;
    }
  }

  renderOscilloscope(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 20;
    const padR = 12;
    const padT = 16;
    const padB = 14;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // Center grid lines
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH / 2);
    ctx.lineTo(padL + plotW, padT + plotH / 2);
    for (let x = 0; x <= plotW; x += plotW / 6) {
      ctx.moveTo(padL + x, padT);
      ctx.lineTo(padL + x, padT + plotH);
    }
    ctx.stroke();

    // Upper Half: Harmonized Waveform (Calm & deliberate)
    const oscH = plotH * 0.58;
    const midY = padT + oscH * 0.5;

    ctx.save();
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 5;
    ctx.beginPath();

    const phase = t * 1.0;
    const steps = Math.floor(plotW);
    for (let x = 0; x <= steps; x++) {
      const u = x / steps;
      const w1 = Math.sin(u * 14.0 + phase) * 0.52;
      const w2 = Math.sin(u * 26.0 - phase * 0.6) * 0.28;
      const w3 = Math.sin(u * 6.0 + phase * 0.4) * 0.2;
      const amp = (w1 + w2 + w3) * (oscH * 0.44);
      const px = padL + x;
      const py = midY + amp;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Secondary Harmonic Ghost Wave
    ctx.strokeStyle = this.theme.muted;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = 0; x <= steps; x += 2) {
      const u = x / steps;
      const wGhost = Math.cos(u * 18.0 - phase * 0.45) * (oscH * 0.32);
      const px = padL + x;
      const py = midY + wGhost;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Lower Half: Frequency Spectrum Analyzer Bars across all 3 columns
    const specTop = padT + oscH + 6;
    const specH = plotH - oscH - 8;
    const numBars = this.spectrumBars.length;
    const bW = Math.max(2, (plotW / numBars) - 2.5);

    for (let i = 0; i < numBars; i++) {
      const target = 0.12 + 0.72 * (
        Math.sin(t * 0.75 + i * 0.35) * 0.5 + 0.5
      ) * (1 - Math.abs(i - numBars / 2) / (numBars / 1.3));

      const lerp = 0.025 * Math.max(0.2, this.speedMultiplier);
      this.spectrumBars[i] += (target - this.spectrumBars[i]) * lerp;

      const bh = Math.max(2, this.spectrumBars[i] * specH);
      const bx = padL + i * (plotW / numBars);
      const by = specTop + specH - bh;

      ctx.fillStyle = this.theme.primary;
      ctx.fillRect(bx, by, bW, bh);

      // Top phosphor dot
      ctx.fillStyle = this.theme.highlight;
      ctx.fillRect(bx, by, bW, 1.5);
    }

    ctx.restore();
  }

  // =========================================================================
  // 3. Carrier Signal Flux & Spectral Monitor (Wide Banner Graph)
  // =========================================================================
  initFluxData() {
    this.fluxBlipX = 0;
  }

  renderFlux(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 20;
    const padR = 14;
    const padT = 12;
    const padB = 10;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;
    const midY = padT + plotH / 2;

    // Fine background grid
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(padL + plotW, midY);
    for (let x = 0; x <= plotW; x += plotW / 8) {
      ctx.moveTo(padL + x, padT);
      ctx.lineTo(padL + x, padT + plotH);
    }
    ctx.stroke();

    // Dual-channel carrier wave trace
    ctx.save();
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    const phase = t * 1.3;
    const steps = Math.floor(plotW);
    for (let x = 0; x <= steps; x++) {
      const u = x / steps;
      const s1 = Math.sin(u * 18.0 + phase) * (plotH * 0.32);
      const s2 = Math.sin(u * 44.0 - phase * 0.8) * (plotH * 0.12);
      const spike = Math.exp(-Math.pow((u - (t * 0.3 % 1.0)) * 18, 2)) * (plotH * 0.38);
      const px = padL + x;
      const py = midY + s1 + s2 - spike;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Secondary sub-carrier trace
    ctx.strokeStyle = this.theme.muted;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let x = 0; x <= steps; x += 2) {
      const u = x / steps;
      const sGhost = Math.cos(u * 12.0 - phase * 0.5) * (plotH * 0.22);
      const px = padL + x;
      const py = midY + sGhost;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Micro callout labels inside flux monitor
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.muted;
    ctx.fillText('CARRIER: 440.0 MHZ', padL + 4, padT + 8);
    ctx.fillText('SPECTRAL RES: 0.05%', padL + plotW - 95, padT + 8);

    ctx.restore();
  }

  // =========================================================================
  // 4. Memory History Graph (Half Height)
  // =========================================================================
  initMemoryHistoryData() {
    this.memHistory = [];
    const count = 44;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const v = 0.35 + Math.sin(u * 8) * 0.22 + Math.cos(u * 14) * 0.12;
      this.memHistory.push(Math.max(0.12, Math.min(0.88, v)));
    }
    this.lastMemTick = 0;
  }

  renderMemoryChart(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 22;
    const padR = 8;
    const padT = 14;
    const padB = 14;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // Rolling updates at calm, measured intervals
    const updateInterval = 0.8;
    if (!this.isPaused && (t - this.lastMemTick > updateInterval)) {
      this.lastMemTick = t;
      const last = this.memHistory[this.memHistory.length - 1];
      const delta = (Math.random() - 0.48) * 0.15;
      const next = Math.max(0.12, Math.min(0.88, last + delta));
      this.memHistory.push(next);
      if (this.memHistory.length > 44) this.memHistory.shift();
    }

    // Grid lines
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= plotH; y += plotH / 2) {
      ctx.moveTo(padL, padT + y);
      ctx.lineTo(padL + plotW, padT + y);
    }
    ctx.stroke();

    // Axis markers
    ctx.font = '7.5px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.muted;
    ctx.fillText('16G', 2, padT + 6);
    ctx.fillText('0G', 6, padT + plotH);
    ctx.fillText('-40s', padL, padT + plotH + 10);
    ctx.fillText('NOW', padL + plotW - 14, padT + plotH + 10);

    // Continuous spline memory curve
    const n = this.memHistory.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const px = padL + (i / (n - 1)) * plotW;
      const py = padT + plotH - (this.memHistory[i] * plotH);
      pts.push({ x: px, y: py });
    }

    if (pts.length > 1) {
      // Area fill underneath
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, padT + plotH);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(pts[pts.length - 1].x, padT + plotH);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, this.theme.muted);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Top glowing stroke
      ctx.save();
      ctx.strokeStyle = this.theme.highlight;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = this.theme.primary;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // 5. Procedural Terminal-Text Feed (Directly Under Memory Graph)
  // =========================================================================
  initTerminalStream() {
    this.terminalLines = [
      'SYSTEM CHECK ........ OK',
      '0x7F2A: E4 01 B8 9F',
      'SIGNAL TRACE ....... STABLE',
      '10101001 01101010',
      'NODE RESPONSE: ACTIVE',
      'MEMORY SYNC: 98.4%',
      'BUS CLOCK: 440 MHZ'
    ];
    this.typewriterBuffer = 'SYS CHECK: PASS';
    this.typewriterIndex = 0;
    this.lastTypeTime = 0;
    this.lastLinePushTime = 0;

    this.sampleMessages = [
      'SYSTEM CHECK ........ OK',
      'SIGNAL TRACE ....... STABLE',
      'NODE RESPONSE: ACTIVE',
      'MEMORY SYNC: 98.4%',
      'BUS CLOCK: 440 MHZ',
      'CRC32 CHECKSUM: PASS',
      'VOLTAGE STAB: 99.1%',
      'CHANNEL 04: LOCKED',
      'THREAD DELTA: 0.02MS',
      'FRAME BUFFER: READY',
      'PACKET ROUTE: LOCAL',
      'IO STREAM: 1.4 MB/S',
      'WATCHDOG TIMER: ARMED',
      'SUBSYS 02: SYNC'
    ];
  }

  generateRandomHexLine() {
    const hexChars = '0123456789ABCDEF';
    const addr = `0x${(0x7F00 + Math.floor(Math.random() * 512)).toString(16).toUpperCase()}`;
    let bytes = '';
    for (let b = 0; b < 4; b++) {
      bytes += hexChars[Math.floor(Math.random() * 16)] + hexChars[Math.floor(Math.random() * 16)] + ' ';
    }
    return `${addr}: ${bytes.trim()}`;
  }

  generateRandomBinLine() {
    let b1 = '';
    let b2 = '';
    for (let i = 0; i < 8; i++) {
      b1 += Math.random() > 0.5 ? '1' : '0';
      b2 += Math.random() > 0.5 ? '1' : '0';
    }
    return `${b1} ${b2}`;
  }

  renderTerminal(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 10;
    const padT = 10;
    const lineH = 13.5;

    // Typewriter timing (scaled by speed multiplier)
    const typeInterval = 0.08 / Math.max(0.2, this.speedMultiplier);
    const lineInterval = 2.4 / Math.max(0.2, this.speedMultiplier);

    if (!this.isPaused) {
      if (t - this.lastTypeTime > typeInterval) {
        this.lastTypeTime = t;
        if (this.typewriterIndex < this.typewriterBuffer.length) {
          this.typewriterIndex++;
        }
      }

      if (t - this.lastLinePushTime > lineInterval) {
        this.lastLinePushTime = t;
        // Push completed line into history
        this.terminalLines.push(this.typewriterBuffer);
        if (this.terminalLines.length > 8) this.terminalLines.shift();

        // Choose next line to typewrite
        const r = Math.random();
        if (r < 0.45) {
          this.typewriterBuffer = this.sampleMessages[Math.floor(Math.random() * this.sampleMessages.length)];
        } else if (r < 0.75) {
          this.typewriterBuffer = this.generateRandomHexLine();
        } else {
          this.typewriterBuffer = this.generateRandomBinLine();
        }
        this.typewriterIndex = 0;
      }
    }

    // Render historical lines with phosphor alpha decay towards top
    ctx.font = '9.5px "Share Tech Mono", monospace';
    ctx.textBaseline = 'top';

    const maxLines = Math.floor((cssH - padT) / lineH) - 1;
    const renderList = this.terminalLines.slice(-maxLines);

    for (let i = 0; i < renderList.length; i++) {
      const y = padT + i * lineH;
      const alpha = Math.max(0.25, (i + 1) / renderList.length);
      ctx.fillStyle = this.theme.primary;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillText(renderList[i], padL, y);
    }

    // Active typing line at bottom
    const curY = padT + renderList.length * lineH;
    if (curY < cssH - 6) {
      const activeText = this.typewriterBuffer.substring(0, this.typewriterIndex);
      ctx.fillStyle = this.theme.highlight;
      ctx.globalAlpha = 1.0;
      ctx.fillText(activeText, padL, curY);

      // Blinking underscore cursor
      const showCursor = Math.floor(t * 3.5) % 2 === 0;
      if (showCursor) {
        const textW = ctx.measureText(activeText).width;
        ctx.fillText('_', padL + textW + 1, curY);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // =========================================================================
  // 6. Large 360-Degree Circular Radar Sweep (Right Column Full Height)
  // =========================================================================
  initRadarSweepData() {
    this.radarBlips = [
      { angle: 0.65, dist: 0.45, alpha: 0.8, tag: 'T-01' },
      { angle: 1.85, dist: 0.72, alpha: 0.5, tag: 'T-02' },
      { angle: 3.40, dist: 0.35, alpha: 0.9, tag: 'T-03' },
      { angle: 4.80, dist: 0.60, alpha: 0.6, tag: 'T-04' },
      { angle: 5.60, dist: 0.82, alpha: 0.7, tag: 'T-05' }
    ];
  }

  renderRadarSweep(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const cx = cssW / 2;
    const cy = cssH / 2;
    const radius = Math.min(cssW, cssH) * 0.44;

    // Range rings
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach(rRatio => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs & degree ticks
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Subtle 45-degree diagonals
    ctx.strokeStyle = this.theme.dim;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    const diagDist = radius * 0.707;
    ctx.moveTo(cx - diagDist, cy - diagDist);
    ctx.lineTo(cx + diagDist, cy + diagDist);
    ctx.moveTo(cx - diagDist, cy + diagDist);
    ctx.lineTo(cx + diagDist, cy - diagDist);
    ctx.stroke();
    ctx.setLineDash([]);

    // Degree labels at edge
    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('000°', cx, cy - radius + 8);
    ctx.fillText('090°', cx + radius - 10, cy);
    ctx.fillText('180°', cx, cy + radius - 8);
    ctx.fillText('270°', cx - radius + 10, cy);

    // Deliberate 360-degree sweep angle
    const sweepAngle = (t * 0.75) % (Math.PI * 2);

    // Phosphor sweep trail pie segment
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, sweepAngle - 0.48, sweepAngle);
    ctx.closePath();
    const trailGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    trailGrad.addColorStop(0, this.theme.muted);
    trailGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = trailGrad;
    ctx.fill();

    // Primary bright sweep beam
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
    ctx.stroke();
    ctx.restore();

    // Target blips with persistence decay
    this.radarBlips.forEach(blip => {
      let diff = sweepAngle - blip.angle;
      if (diff < 0) diff += Math.PI * 2;
      const proximity = Math.max(0, 1.0 - diff / (Math.PI * 1.5));
      const bx = cx + Math.cos(blip.angle) * (radius * blip.dist);
      const by = cy + Math.sin(blip.angle) * (radius * blip.dist);

      ctx.fillStyle = this.theme.highlight;
      ctx.globalAlpha = Math.max(0.18, proximity);
      ctx.beginPath();
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing halo
      if (proximity > 0.55) {
        ctx.strokeStyle = this.theme.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (1 - proximity) * 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '7px "Share Tech Mono", monospace';
        ctx.fillStyle = this.theme.highlight;
        ctx.fillText(blip.tag, bx + 7, by - 4);
      }
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  // =========================================================================
  // Main Unified Render Loop
  // =========================================================================
  render() {
    const now = performance.now();
    const dt = (now - this.lastFrame) * 0.001;
    this.lastFrame = now;

    if (!this.isPaused) {
      this.time += dt * this.speedMultiplier;
    }
    const t = this.time;

    if (this.charts.histogram) {
      this.renderHistogram(this.charts.histogram.ctx, this.charts.histogram.width, this.charts.histogram.height, this.charts.histogram.dpr, t);
    }
    if (this.charts.oscilloscope) {
      this.renderOscilloscope(this.charts.oscilloscope.ctx, this.charts.oscilloscope.width, this.charts.oscilloscope.height, this.charts.oscilloscope.dpr, t);
    }
    if (this.charts.flux) {
      this.renderFlux(this.charts.flux.ctx, this.charts.flux.width, this.charts.flux.height, this.charts.flux.dpr, t);
    }
    if (this.charts.memory) {
      this.renderMemoryChart(this.charts.memory.ctx, this.charts.memory.width, this.charts.memory.height, this.charts.memory.dpr, t);
    }
    if (this.charts.terminal) {
      this.renderTerminal(this.charts.terminal.ctx, this.charts.terminal.width, this.charts.terminal.height, this.charts.terminal.dpr, t);
    }
    if (this.charts.radarSweep) {
      this.renderRadarSweep(this.charts.radarSweep.ctx, this.charts.radarSweep.width, this.charts.radarSweep.height, this.charts.radarSweep.dpr, t);
    }
  }
}

window.TelemetryEngine = TelemetryEngine;
