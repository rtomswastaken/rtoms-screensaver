/**
 * RTOMS Retro CRT Ambient Dashboard - Telemetry Engine
 * High-performance Canvas 2D visualizations:
 * 1. Cross-Hatched Histogram (matches reference photo with hatched bars & continuous trend line)
 * 2. Multi-harmonic Live Oscilloscope & Audio/Signal Spectrum
 * 3. Multi-axis Polar Spider/Radar Chart (Activity, Signal, Memory, Processing, Stability, Performance)
 * 4. Memory / Resource History Line Chart with live telemetry
 * 5. Circular 360-degree Radar Sweep with phosphor persistence blips
 * 6. Procedural Binary & Hexadecimal Memory Dump Feed
 */

class TelemetryEngine {
  constructor() {
    this.isPaused = false;
    this.theme = {
      primary: '#ffb000',
      highlight: '#ffe082',
      muted: 'rgba(255, 176, 0, 0.25)',
      dim: 'rgba(255, 176, 0, 0.08)',
      bg: '#0a0600'
    };

    // Cache canvas contexts
    this.charts = {};
    this.time = 0;
    this.lastFrame = performance.now();

    // Data buffers
    this.initHistogramData();
    this.initRadarChartData();
    this.initMemoryHistoryData();
    this.initRadarSweepData();
    this.initHexFeed();
  }

  setTheme(themeConfig) {
    this.theme = { ...this.theme, ...themeConfig };
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
  // 1. Cross-Hatched Histogram (Exact match to reference photo)
  // =========================================================================
  initHistogramData() {
    this.histBars = [
      0.88, 0.76, 0.62, 0.48, 0.38, 0.32, 0.26, 0.22, 0.18, 0.15,
      0.14, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04
    ];
    this.histTargetBars = [...this.histBars];
    this.histPeak = 57.1;
  }

  renderHistogram(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 28;
    const padR = 12;
    const padT = 24;
    const padB = 20;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // 1. Fine raster grid
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= plotH; y += plotH / 4) {
      ctx.moveTo(padL, padT + y);
      ctx.lineTo(padL + plotW, padT + y);
    }
    for (let x = 0; x <= plotW; x += plotW / 5) {
      ctx.moveTo(padL + x, padT);
      ctx.lineTo(padL + x, padT + plotH);
    }
    ctx.stroke();

    // 2. Cross-Hatched Bars
    const numBars = this.histBars.length;
    const barWidth = plotW / numBars;

    // Slowly morph target bars
    if (!this.isPaused && Math.floor(t * 2) !== Math.floor((t - 0.016) * 2)) {
      for (let i = 0; i < numBars; i++) {
        const decay = Math.exp(-i * 0.15);
        this.histTargetBars[i] = Math.max(0.04, Math.min(0.95, decay * (0.8 + Math.sin(t * 0.8 + i) * 0.18)));
      }
    }
    for (let i = 0; i < numBars; i++) {
      this.histBars[i] += (this.histTargetBars[i] - this.histBars[i]) * 0.08;
    }

    // Render bars with diagonal cross-hatching
    for (let i = 0; i < numBars; i++) {
      const bH = this.histBars[i] * plotH;
      const bX = padL + i * barWidth;
      const bY = padT + plotH - bH;
      const bW = barWidth - 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(bX, bY, bW, bH);
      ctx.clip();

      // Diagonal cross-hatch strokes (45 deg)
      ctx.strokeStyle = this.theme.primary;
      ctx.lineWidth = 1;
      const hatchSpacing = 4;
      ctx.beginPath();
      for (let x = -bH; x < bW + bH; x += hatchSpacing) {
        ctx.moveTo(bX + x, bY + bH);
        ctx.lineTo(bX + x + bH, bY);
      }
      ctx.stroke();

      // Reverse diagonal strokes (135 deg) for double cross-hatching
      if (i < 8) {
        ctx.beginPath();
        for (let x = -bH; x < bW + bH; x += hatchSpacing) {
          ctx.moveTo(bX + x + bH, bY + bH);
          ctx.lineTo(bX + x, bY);
        }
        ctx.stroke();
      }

      ctx.restore();

      // Bar top outline
      ctx.strokeStyle = this.theme.highlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bX, bY);
      ctx.lineTo(bX + bW, bY);
      ctx.stroke();
    }

    // 3. Continuous Spline Trend Curve across top
    ctx.beginPath();
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 6;

    for (let i = 0; i < numBars; i++) {
      const bH = this.histBars[i] * plotH;
      const ptX = padL + i * barWidth + barWidth * 0.5;
      const ptY = padT + plotH - bH;
      if (i === 0) ctx.moveTo(ptX, ptY);
      else {
        const prevH = this.histBars[i - 1] * plotH;
        const prevX = padL + (i - 1) * barWidth + barWidth * 0.5;
        const prevY = padT + plotH - prevH;
        const cX1 = (prevX + ptX) / 2;
        ctx.bezierCurveTo(cX1, prevY, cX1, ptY, ptX, ptY);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Peak callout tag (matches "57.1%" in reference image)
    const peakIdx = 1;
    const peakX = padL + peakIdx * barWidth + barWidth * 0.5;
    const peakY = padT + plotH - this.histBars[peakIdx] * plotH;

    ctx.fillStyle = this.theme.primary;
    ctx.font = '9px "Share Tech Mono", monospace';
    const tagText = `${this.histPeak.toFixed(1)}%`;
    const textW = ctx.measureText(tagText).width;

    ctx.fillRect(peakX - textW / 2 - 3, peakY - 18, textW + 6, 12);
    ctx.fillStyle = this.theme.bg;
    ctx.fillText(tagText, peakX - textW / 2, peakY - 9);

    // Callout pointer arrow
    ctx.fillStyle = this.theme.primary;
    ctx.beginPath();
    ctx.moveTo(peakX - 3, peakY - 6);
    ctx.lineTo(peakX + 3, peakY - 6);
    ctx.lineTo(peakX, peakY - 2);
    ctx.closePath();
    ctx.fill();

    // Axis labels
    ctx.fillStyle = this.theme.primary;
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillText('100%', 2, padT + 8);
    ctx.fillText('50%', 6, padT + plotH * 0.5 + 3);
    ctx.fillText('0%', 12, padT + plotH);
    ctx.fillText('0', padL, cssH - 6);
    ctx.fillText('5.0', padL + plotW * 0.4, cssH - 6);
    ctx.fillText('10.0', padL + plotW * 0.8, cssH - 6);

    ctx.restore();
  }

  // =========================================================================
  // 2. Oscilloscope Waveform & Spectrum
  // =========================================================================
  renderOscilloscope(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const midY = cssH * 0.48;

    // 1. Grid
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < cssW; x += 24) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
    }
    for (let y = 0; y < cssH; y += 18) {
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
    }
    ctx.stroke();

    // Center axis crosshair
    ctx.strokeStyle = this.theme.muted;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(cssW, midY);
    ctx.stroke();

    // 2. Superimposed Waveforms
    const drawWave = (color, lw, speed, freq1, freq2, amp) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.shadowColor = color;
      ctx.shadowBlur = lw > 1 ? 5 : 0;

      for (let x = 0; x < cssW; x += 2) {
        const rad = (x / cssW) * Math.PI * 2;
        const y1 = Math.sin(rad * freq1 + t * speed) * amp;
        const y2 = Math.cos(rad * freq2 - t * speed * 0.7) * (amp * 0.4);
        const y3 = Math.sin(rad * 4.5 + t * speed * 1.5) * (amp * 0.18);
        const y = midY + y1 + y2 + y3;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Sub-harmonic wave (dim)
    drawWave(this.theme.muted, 1, 1.8, 2.5, 5.0, 16);
    // Main signal wave (bright & glowing)
    drawWave(this.theme.highlight, 1.8, 2.6, 3.2, 7.1, 26);

    // 3. Frequency Spectrum Bars at bottom
    const specBars = 20;
    const barW = (cssW - 20) / specBars;
    const barBaseY = cssH - 6;

    ctx.fillStyle = this.theme.primary;
    ctx.shadowBlur = 0;
    for (let i = 0; i < specBars; i++) {
      const freqAmp = Math.abs(Math.sin(t * 3.5 + i * 0.5) * Math.cos(t * 1.8 + i * 0.3));
      const bH = Math.max(2, freqAmp * (cssH * 0.24));
      ctx.fillRect(10 + i * barW, barBaseY - bH, barW - 2, bH);
    }

    // Telemetry text
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.primary;
    ctx.fillText('SIG: 4.88 kHz', 6, 12);
    ctx.fillText('AMP: 2.4 Vpp', cssW - 58, 12);

    ctx.restore();
  }

  // =========================================================================
  // 3. Multi-Axis Polar Spider / Radar Chart
  // =========================================================================
  initRadarChartData() {
    this.radarAxes = ['ACTIVITY', 'SIGNAL', 'MEMORY', 'PROCESSING', 'STABILITY', 'PERFORMANCE'];
    this.radarValues = [0.85, 0.72, 0.64, 0.88, 0.92, 0.78];
    this.radarTargets = [...this.radarValues];
  }

  renderRadarChart(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const cX = cssW * 0.5;
    const cY = cssH * 0.52;
    const maxR = Math.min(cssW, cssH) * 0.35;
    const numAxes = this.radarAxes.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Slowly morph radar values
    if (!this.isPaused && Math.floor(t * 1.5) !== Math.floor((t - 0.016) * 1.5)) {
      for (let i = 0; i < numAxes; i++) {
        this.radarTargets[i] = 0.45 + Math.sin(t * 0.9 + i * 1.3) * 0.38 + Math.cos(t * 1.5 - i) * 0.12;
      }
    }
    for (let i = 0; i < numAxes; i++) {
      this.radarValues[i] += (this.radarTargets[i] - this.radarValues[i]) * 0.06;
    }

    // 1. Concentric polygon guide rings
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    const rings = 4;
    for (let r = 1; r <= rings; r++) {
      const radius = (maxR / rings) * r;
      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const ang = i * angleStep - Math.PI / 2;
        const x = cX + Math.cos(ang) * radius;
        const y = cY + Math.sin(ang) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 2. Radial Axis Spokes
    ctx.strokeStyle = this.theme.muted;
    for (let i = 0; i < numAxes; i++) {
      const ang = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cX, cY);
      ctx.lineTo(cX + Math.cos(ang) * maxR, cY + Math.sin(ang) * maxR);
      ctx.stroke();

      // Axis labels
      const labelDist = maxR + 13;
      const lx = cX + Math.cos(ang) * labelDist;
      const ly = cY + Math.sin(ang) * labelDist;
      ctx.font = '7.5px "Share Tech Mono", monospace';
      ctx.fillStyle = this.theme.primary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.radarAxes[i], lx, ly);
    }

    // 3. Animated Data Polygon
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const ang = i * angleStep - Math.PI / 2;
      const val = Math.max(0.15, Math.min(1.0, this.radarValues[i]));
      const dist = maxR * val;
      const x = cX + Math.cos(ang) * dist;
      const y = cY + Math.sin(ang) * dist;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Translucent fill
    ctx.fillStyle = this.theme.muted;
    ctx.fill();

    // Glowing border
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing vertices
    ctx.fillStyle = this.theme.highlight;
    for (let i = 0; i < numAxes; i++) {
      const ang = i * angleStep - Math.PI / 2;
      const val = Math.max(0.15, Math.min(1.0, this.radarValues[i]));
      const dist = maxR * val;
      const x = cX + Math.cos(ang) * dist;
      const y = cY + Math.sin(ang) * dist;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // =========================================================================
  // 4. Memory & Resource Line Chart
  // =========================================================================
  initMemoryHistoryData() {
    this.memHistory = [];
    for (let i = 0; i < 40; i++) {
      this.memHistory.push(0.3 + Math.sin(i * 0.4) * 0.15 + Math.random() * 0.08);
    }
  }

  renderMemoryChart(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const padL = 28;
    const padR = 8;
    const padT = 20;
    const padB = 24;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // Add new telemetry data periodically
    if (!this.isPaused && Math.floor(t * 4) !== Math.floor((t - 0.016) * 4)) {
      const last = this.memHistory[this.memHistory.length - 1];
      const next = Math.max(0.15, Math.min(0.9, last + (Math.random() - 0.5) * 0.1 + Math.sin(t * 0.5) * 0.02));
      this.memHistory.push(next);
      if (this.memHistory.length > 40) this.memHistory.shift();
    }

    // Grid
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= plotH; y += plotH / 3) {
      ctx.moveTo(padL, padT + y);
      ctx.lineTo(padL + plotW, padT + y);
    }
    for (let x = 0; x <= plotW; x += plotW / 4) {
      ctx.moveTo(padL + x, padT);
      ctx.lineTo(padL + x, padT + plotH);
    }
    ctx.stroke();

    // Data Line & Filled Area
    const stepX = plotW / (this.memHistory.length - 1);
    ctx.beginPath();
    for (let i = 0; i < this.memHistory.length; i++) {
      const x = padL + i * stepX;
      const y = padT + plotH - this.memHistory[i] * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Stroke
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Close area for subtle hatch/gradient fill
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.lineTo(padL, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = this.theme.dim;
    ctx.fill();

    // Latest value readout
    const currentVal = this.memHistory[this.memHistory.length - 1];
    const mbUsed = (currentVal * 16384).toFixed(0);
    const pct = (currentVal * 100).toFixed(1);

    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.primary;
    ctx.textAlign = 'left';
    ctx.fillText(`BUFFER: ${mbUsed} MB (${pct}%)`, padL, 12);
    ctx.fillText('HEAP: 74.2%', padL + plotW * 0.6, 12);

    // Axis labels
    ctx.fillText('16G', 2, padT + 8);
    ctx.fillText('8G', 8, padT + plotH * 0.5 + 3);
    ctx.fillText('0G', 8, padT + plotH);
    ctx.fillText('-40s', padL, cssH - 8);
    ctx.fillText('-20s', padL + plotW * 0.5, cssH - 8);
    ctx.fillText('NOW', padL + plotW - 16, cssH - 8);

    ctx.restore();
  }

  // =========================================================================
  // 5. Circular 360-Degree Radar Sweep with Persistence Blips
  // =========================================================================
  initRadarSweepData() {
    this.blips = [
      { dist: 0.65, angle: 1.1, life: 0.8 },
      { dist: 0.35, angle: 2.8, life: 0.4 },
      { dist: 0.82, angle: 4.6, life: 0.9 },
      { dist: 0.50, angle: 5.7, life: 0.2 }
    ];
  }

  renderRadarSweep(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;
    const cX = cssW * 0.5;
    const cY = cssH * 0.5;
    const radius = Math.min(cssW, cssH) * 0.44;

    // 1. Concentric radar rings
    ctx.strokeStyle = this.theme.dim;
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(rPct => {
      ctx.beginPath();
      ctx.arc(cX, cY, radius * rPct, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = this.theme.muted;
    ctx.beginPath();
    ctx.moveTo(cX - radius, cY);
    ctx.lineTo(cX + radius, cY);
    ctx.moveTo(cX, cY - radius);
    ctx.lineTo(cX, cY + radius);
    ctx.stroke();

    // 2. Rotating Sweep Beam
    const sweepAngle = (t * 1.6) % (Math.PI * 2);

    // Phosphor decay sector (fading trail behind beam)
    const trailAngle = 0.45;
    const grad = ctx.createRadialGradient(cX, cY, 0, cX, cY, radius);
    grad.addColorStop(0, this.theme.muted);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.arc(cX, cY, radius, sweepAngle - trailAngle, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = this.theme.dim;
    ctx.fill();
    ctx.restore();

    // Leading sweep line
    const beamX = cX + Math.cos(sweepAngle) * radius;
    const beamY = cY + Math.sin(sweepAngle) * radius;
    ctx.strokeStyle = this.theme.highlight;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.lineTo(beamX, beamY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Detection Blips
    this.blips.forEach(blip => {
      const bX = cX + Math.cos(blip.angle) * (radius * blip.dist);
      const bY = cY + Math.sin(blip.angle) * (radius * blip.dist);

      // Check if sweep beam passes near blip
      const angleDiff = (sweepAngle - blip.angle + Math.PI * 2) % (Math.PI * 2);
      if (angleDiff < 0.1) {
        blip.life = 1.0;
      } else {
        blip.life = Math.max(0.05, blip.life - 0.008);
      }

      ctx.fillStyle = this.theme.highlight;
      ctx.globalAlpha = blip.life;
      ctx.beginPath();
      ctx.arc(bX, bY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }

  // =========================================================================
  // 6. Binary & Hexadecimal Memory Feed
  // =========================================================================
  initHexFeed() {
    this.hexLines = [];
    const hexChars = '0123456789ABCDEF';
    for (let i = 0; i < 18; i++) {
      const addr = `0x${(0x7F00 + i * 8).toString(16).toUpperCase()}`;
      let bytes = '';
      for (let b = 0; b < 4; b++) {
        bytes += hexChars[Math.floor(Math.random() * 16)] + hexChars[Math.floor(Math.random() * 16)] + ' ';
      }
      let bin = '';
      for (let b = 0; b < 8; b++) {
        bin += Math.random() > 0.5 ? '1' : '0';
      }
      this.hexLines.push(`${addr}: ${bytes.trim()} [${bin}]`);
    }
  }

  renderHexFeed(ctx, w, h, dpr, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;

    // Add new lines periodically
    if (!this.isPaused && Math.floor(t * 3) !== Math.floor((t - 0.016) * 3)) {
      const hexChars = '0123456789ABCDEF';
      const addr = `0x${(0x7F00 + Math.floor(Math.random() * 512)).toString(16).toUpperCase()}`;
      let bytes = '';
      for (let b = 0; b < 4; b++) {
        bytes += hexChars[Math.floor(Math.random() * 16)] + hexChars[Math.floor(Math.random() * 16)] + ' ';
      }
      let bin = '';
      for (let b = 0; b < 8; b++) {
        bin += Math.random() > 0.5 ? '1' : '0';
      }
      this.hexLines.push(`${addr}: ${bytes.trim()} [${bin}]`);
      if (this.hexLines.length > 20) this.hexLines.shift();
    }

    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.primary;
    const lineH = 13;
    const startY = 14;

    for (let i = 0; i < this.hexLines.length; i++) {
      const y = startY + i * lineH;
      if (y > cssH) break;
      const isLatest = (i === this.hexLines.length - 1);
      ctx.fillStyle = isLatest ? this.theme.highlight : this.theme.primary;
      ctx.globalAlpha = Math.max(0.3, (i + 1) / this.hexLines.length);
      ctx.fillText(this.hexLines[i], 6, y);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  // =========================================================================
  // Main Animation Tick
  // =========================================================================
  render() {
    const now = performance.now();
    const dt = (now - this.lastFrame) * 0.001;
    this.lastFrame = now;

    if (!this.isPaused) {
      this.time += dt;
    }
    const t = this.time;

    if (this.charts.histogram) {
      this.renderHistogram(this.charts.histogram.ctx, this.charts.histogram.width, this.charts.histogram.height, this.charts.histogram.dpr, t);
    }
    if (this.charts.oscilloscope) {
      this.renderOscilloscope(this.charts.oscilloscope.ctx, this.charts.oscilloscope.width, this.charts.oscilloscope.height, this.charts.oscilloscope.dpr, t);
    }
    if (this.charts.radarChart) {
      this.renderRadarChart(this.charts.radarChart.ctx, this.charts.radarChart.width, this.charts.radarChart.height, this.charts.radarChart.dpr, t);
    }
    if (this.charts.memory) {
      this.renderMemoryChart(this.charts.memory.ctx, this.charts.memory.width, this.charts.memory.height, this.charts.memory.dpr, t);
    }
    if (this.charts.radarSweep) {
      this.renderRadarSweep(this.charts.radarSweep.ctx, this.charts.radarSweep.width, this.charts.radarSweep.height, this.charts.radarSweep.dpr, t);
    }
    if (this.charts.hexFeed) {
      this.renderHexFeed(this.charts.hexFeed.ctx, this.charts.hexFeed.width, this.charts.hexFeed.height, this.charts.hexFeed.dpr, t);
    }
  }
}

window.TelemetryEngine = TelemetryEngine;
