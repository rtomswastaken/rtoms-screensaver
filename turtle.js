/**
 * RTOMS Retro CRT Ambient Dashboard - Turtle Arcade Mini-Game
 * A small decorative autonomous pixel-art turtle playing a maze-chase game.
 * Features:
 * - Tiny 8x8 pixel-art turtle character with animated flippers
 * - Autonomously navigates a maze using BFS pathfinding to collect dots
 * - Continuous infinite autoplay with score tracking and dot respawning
 * - Theme-aware phosphor colors
 */

class TurtleArcade {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.score = 0;
    this.dotsEaten = 0;
    this.totalDots = 0;

    this.theme = {
      primary: '#ffb000',
      highlight: '#ffe082',
      muted: 'rgba(255, 176, 0, 0.3)',
      dim: 'rgba(255, 176, 0, 0.1)',
      bg: '#0a0600'
    };

    // Maze grid: 32 cols x 7 rows
    this.cols = 32;
    this.rows = 7;
    this.cellSize = 12;

    // Turtle state
    this.turtle = {
      x: 1, // Grid col
      y: 1, // Grid row
      realX: 1,
      realY: 1,
      dirX: 1,
      dirY: 0,
      facing: 'right', // 'right', 'left', 'up', 'down'
      animFrame: 0,
      speed: 0.12 // Movement interpolation speed
    };

    // Particles for eaten dots
    this.particles = [];

    this.initMaze();
    this.resize();
  }

  setTheme(themeConfig) {
    this.theme = { ...this.theme, ...themeConfig };
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    this.dpr = dpr;
    this.width = Math.floor(rect.width * dpr);
    this.height = Math.floor(rect.height * dpr);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Dynamic cell size based on viewport width
    this.cellSize = Math.floor((this.cssWidth - 30) / this.cols);
    this.offsetX = Math.floor((this.cssWidth - this.cols * this.cellSize) / 2);
    this.offsetY = Math.floor((this.cssHeight - this.rows * this.cellSize) / 2) + 6;
  }

  initMaze() {
    // 1 = Wall, 0 = Open path with dot
    this.maze = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,1,1,0,1,0,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1],
      [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1],
      [1,1,0,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    this.dots = [];
    this.totalDots = 0;
    for (let r = 0; r < this.rows; r++) {
      this.dots[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const isDot = (this.maze[r][c] === 0);
        this.dots[r][c] = isDot;
        if (isDot) this.totalDots++;
      }
    }
  }

  // BFS Pathfinding to nearest available dot
  findNextStep() {
    const startX = this.turtle.x;
    const startY = this.turtle.y;

    // Check if current cell has a dot
    if (this.dots[startY] && this.dots[startY][startX]) {
      this.dots[startY][startX] = false;
      this.score += 10;
      this.dotsEaten++;
      this.spawnParticles(startX, startY);

      // Respawn dots if all eaten
      if (this.dotsEaten >= this.totalDots) {
        this.score += 100;
        this.initMaze();
        this.dotsEaten = 0;
      }
    }

    // Queue for BFS: [x, y, firstStepDir]
    const queue = [];
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    visited[startY][startX] = true;

    const dirs = [
      { x: 1, y: 0, facing: 'right' },
      { x: -1, y: 0, facing: 'left' },
      { x: 0, y: 1, facing: 'down' },
      { x: 0, y: -1, facing: 'up' }
    ];

    // Initialize queue with immediate neighbors
    dirs.forEach(d => {
      const nx = startX + d.x;
      const ny = startY + d.y;
      if (this.isValid(nx, ny) && !visited[ny][nx]) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, initialDir: d });
      }
    });

    let bestDir = null;

    while (queue.length > 0) {
      const curr = queue.shift();

      if (this.dots[curr.y] && this.dots[curr.y][curr.x]) {
        bestDir = curr.initialDir;
        break;
      }

      dirs.forEach(d => {
        const nx = curr.x + d.x;
        const ny = curr.y + d.y;
        if (this.isValid(nx, ny) && !visited[ny][nx]) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny, initialDir: curr.initialDir });
        }
      });
    }

    if (bestDir) {
      this.turtle.dirX = bestDir.x;
      this.turtle.dirY = bestDir.y;
      this.turtle.facing = bestDir.facing;
      this.turtle.x += bestDir.x;
      this.turtle.y += bestDir.y;
    } else {
      // Pick random valid neighbor if no dot found
      const validDirs = dirs.filter(d => this.isValid(startX + d.x, startY + d.y));
      if (validDirs.length > 0) {
        const pick = validDirs[Math.floor(Math.random() * validDirs.length)];
        this.turtle.dirX = pick.x;
        this.turtle.dirY = pick.y;
        this.turtle.facing = pick.facing;
        this.turtle.x += pick.x;
        this.turtle.y += pick.y;
      }
    }
  }

  isValid(c, r) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    return this.maze[r][c] === 0;
  }

  spawnParticles(c, r) {
    const px = this.offsetX + c * this.cellSize + this.cellSize * 0.5;
    const py = this.offsetY + r * this.cellSize + this.cellSize * 0.5;
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0
      });
    }
  }

  update() {
    // Interpolate turtle position towards target cell
    const dx = this.turtle.x - this.turtle.realX;
    const dy = this.turtle.y - this.turtle.realY;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      this.turtle.realX = this.turtle.x;
      this.turtle.realY = this.turtle.y;
      this.findNextStep();
    } else {
      this.turtle.realX += dx * this.turtle.speed;
      this.turtle.realY += dy * this.turtle.speed;
    }

    this.turtle.animFrame += 0.15;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  drawTurtle(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);

    // Rotate according to facing direction
    if (this.turtle.facing === 'left') ctx.scale(-1, 1);
    else if (this.turtle.facing === 'down') ctx.rotate(Math.PI / 2);
    else if (this.turtle.facing === 'up') ctx.rotate(-Math.PI / 2);

    const s = size * 0.85;
    const legOffset = Math.sin(this.turtle.animFrame) * 2;

    // 1. Shell (rounded polygon with cross hatch)
    ctx.fillStyle = this.theme.highlight;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.42, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shell pattern (cross)
    ctx.strokeStyle = this.theme.bg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, 0);
    ctx.lineTo(s * 0.25, 0);
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();

    // 2. Head
    ctx.fillStyle = this.theme.primary;
    ctx.beginPath();
    ctx.arc(s * 0.45, 0, s * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // 3. Flippers
    ctx.fillStyle = this.theme.primary;
    // Front flippers
    ctx.fillRect(s * 0.15, -s * 0.42 + legOffset * 0.5, 3, 4);
    ctx.fillRect(s * 0.15, s * 0.28 - legOffset * 0.5, 3, 4);
    // Back flippers
    ctx.fillRect(-s * 0.35, -s * 0.38 - legOffset * 0.5, 3, 3);
    ctx.fillRect(-s * 0.35, s * 0.25 + legOffset * 0.5, 3, 3);

    ctx.restore();
  }

  render() {
    this.update();

    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cSize = this.cellSize;
    const oX = this.offsetX;
    const oY = this.offsetY;

    // 1. Header strip: Title & Score
    ctx.font = '8.5px "Share Tech Mono", monospace';
    ctx.fillStyle = this.theme.primary;
    ctx.fillText('TURTLE_BOT // AUTONOMOUS PATROL', oX, 11);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${String(this.score).padStart(4, '0')}  DOTS: ${this.dotsEaten}/${this.totalDots}`, oX + this.cols * cSize, 11);
    ctx.textAlign = 'left';

    // 2. Render Maze Walls
    ctx.fillStyle = this.theme.dim;
    ctx.strokeStyle = this.theme.muted;
    ctx.lineWidth = 1;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 1) {
          const x = oX + c * cSize;
          const y = oY + r * cSize;
          ctx.fillRect(x, y, cSize, cSize);
          ctx.strokeRect(x, y, cSize, cSize);
        }
      }
    }

    // 3. Render Collectible Phosphor Dots
    ctx.fillStyle = this.theme.primary;
    ctx.shadowColor = this.theme.primary;
    ctx.shadowBlur = 3;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.dots[r] && this.dots[r][c]) {
          const cx = oX + c * cSize + cSize * 0.5;
          const cy = oY + r * cSize + cSize * 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0;

    // 4. Render Particles
    this.particles.forEach(p => {
      ctx.fillStyle = this.theme.highlight;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 2, 2);
    });
    ctx.globalAlpha = 1.0;

    // 5. Render Pixel Turtle
    const tX = oX + this.turtle.realX * cSize + cSize * 0.5;
    const tY = oY + this.turtle.realY * cSize + cSize * 0.5;
    this.drawTurtle(ctx, tX, tY, cSize);

    ctx.restore();
  }
}

window.TurtleArcade = TurtleArcade;
