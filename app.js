/**
 * rtoms-screensaver: Main Application Controller
 * Handles 24-hour flip clock mechanical transitions, system synchronization,
 * Wake Lock, fullscreen management, bottom-edge HUD, and Theme switcher (T key).
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Topography Background Initialization
  // ==========================================================================
  const canvas = document.getElementById('bg-canvas');
  let topography = null;

  if (canvas && window.TopographyEngine) {
    topography = new TopographyEngine(canvas);

    const renderLoop = (time) => {
      topography.render(time);
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
  }

  // ==========================================================================
  // 2. Flip Clock Controller
  // ==========================================================================
  const digitUnits = [
    { id: 'h0', el: document.getElementById('h0'), val: null },
    { id: 'h1', el: document.getElementById('h1'), val: null },
    { id: 'm0', el: document.getElementById('m0'), val: null },
    { id: 'm1', el: document.getElementById('m1'), val: null },
    { id: 's0', el: document.getElementById('s0'), val: null },
    { id: 's1', el: document.getElementById('s1'), val: null }
  ];

  digitUnits.forEach((unit) => {
    if (!unit.el) return;
    unit.topStatic = unit.el.querySelector('.card-half.top.static .digit-num');
    unit.bottomStatic = unit.el.querySelector('.card-half.bottom.static .digit-num');
    unit.topFlap = unit.el.querySelector('.card-half.top.flap .digit-num');
    unit.bottomFlap = unit.el.querySelector('.card-half.bottom.flap .digit-num');
    unit.isFlipping = false;
  });

  /**
   * Perform realistic 3D mechanical flip on a single digit
   */
  function flipDigit(unit, nextVal) {
    const prevVal = unit.val;

    // First boot: set all faces immediately without animation
    if (prevVal === null) {
      unit.val = nextVal;
      setUnitDigits(unit, nextVal, nextVal, nextVal, nextVal);
      return;
    }

    if (prevVal === nextVal) return;
    unit.val = nextVal;

    unit.el.classList.remove('flipping');
    void unit.el.offsetWidth; // Force CSS reflow

    // Setup faces for flip physics
    unit.topStatic.textContent = nextVal;
    unit.bottomStatic.textContent = prevVal;
    unit.topFlap.textContent = prevVal;
    unit.bottomFlap.textContent = nextVal;

    unit.el.classList.add('flipping');

    setTimeout(() => {
      unit.bottomStatic.textContent = nextVal;
      unit.topFlap.textContent = nextVal;
      unit.el.classList.remove('flipping');
    }, 480);
  }

  function setUnitDigits(unit, ts, bs, tf, bf) {
    if (unit.topStatic) unit.topStatic.textContent = ts;
    if (unit.bottomStatic) unit.bottomStatic.textContent = bs;
    if (unit.topFlap) unit.topFlap.textContent = tf;
    if (unit.bottomFlap) unit.bottomFlap.textContent = bf;
  }

  /**
   * Synchronize clock against actual system time & Date
   */
  const dateText = document.getElementById('date-text');
  let lastDay = null;

  function updateDate(now) {
    if (!dateText) return;
    const day = now.getDate();
    if (day !== lastDay) {
      lastDay = day;
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      dateText.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  function updateTime() {
    const now = new Date();
    updateDate(now);

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const targetDigits = [
      hours[0], hours[1],
      minutes[0], minutes[1],
      seconds[0], seconds[1]
    ];

    for (let i = 0; i < 6; i++) {
      if (digitUnits[i].val !== targetDigits[i]) {
        flipDigit(digitUnits[i], targetDigits[i]);
      }
    }
  }

  /**
   * System time synchronization loop
   */
  let timerId = null;
  function scheduleNextTick() {
    updateTime();
    const now = Date.now();
    const delay = 1000 - (now % 1000) + 1;
    timerId = setTimeout(scheduleNextTick, delay);
  }

  scheduleNextTick();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (timerId) clearTimeout(timerId);
      scheduleNextTick();
      acquireWakeLock();
    }
  });

  // ==========================================================================
  // 3. Theme Engine (T Key: Warm -> Dark Green -> B&W -> RGB Gamer Mode)
  // ==========================================================================
  const themes = [
    { id: 'warm', name: 'Warm' },
    { id: 'darkgreen', name: 'Emerald' },
    { id: 'monochrome', name: 'B&W' },
    { id: 'rgb', name: 'RGB Gamer' }
  ];
  let currentThemeIndex = -1; // Next press triggers themes[0] ('warm')
  const themeBadge = document.getElementById('theme-badge');

  function applyTheme(themeObj) {
    document.body.setAttribute('data-theme', themeObj.id);
    if (topography) {
      topography.setTheme(themeObj.id);
    }
    if (themeBadge) {
      themeBadge.textContent = `Theme: ${themeObj.name} [T]`;
    }
  }

  function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    applyTheme(themes[currentThemeIndex]);
  }

  // ==========================================================================
  // 4. Screen Wake Lock API
  // ==========================================================================
  let wakeLock = null;

  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch (err) {}
    }
  }

  acquireWakeLock();

  // ==========================================================================
  // 5. Fullscreen & Interaction Handling
  // ==========================================================================
  const kioskHint = document.getElementById('kiosk-hint');
  const fullscreenBadge = document.getElementById('fullscreen-badge');
  const pauseBadge = document.getElementById('pause-badge');
  const densityBadge = document.getElementById('density-badge');
  const hudBar = document.getElementById('hud-bar');

  function isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function toggleFullscreen() {
    if (!isFullscreen()) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  function updateFullscreenUI() {
    const fs = isFullscreen();
    if (fullscreenBadge) {
      fullscreenBadge.textContent = fs ? 'Windowed [F]' : 'Fullscreen [F]';
    }
    if (fs && kioskHint) {
      kioskHint.classList.add('hidden');
    }
  }

  document.addEventListener('fullscreenchange', updateFullscreenUI);
  document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

  // Auto-launch fullscreen on first interaction anywhere
  let hasInteracted = false;
  function handleFirstInteraction() {
    if (!hasInteracted) {
      hasInteracted = true;
      if (!isFullscreen()) {
        toggleFullscreen();
      }
      if (kioskHint) {
        kioskHint.classList.add('hidden');
      }
      acquireWakeLock();
    }
  }

  window.addEventListener('click', handleFirstInteraction, { once: true });
  window.addEventListener('touchstart', handleFirstInteraction, { once: true });

  setTimeout(() => {
    if (kioskHint) kioskHint.classList.add('hidden');
  }, 6000);

  // ==========================================================================
  // 6. Bottom-Edge HUD Trigger & Idle Cursor Hiding
  // ==========================================================================
  let idleTimeout = null;
  const BOTTOM_ZONE_PX = 95; // Cursor must be within 95px of the bottom edge

  function handleMouseMove(e) {
    document.body.classList.remove('cursor-hidden');
    clearTimeout(idleTimeout);

    // Only display HUD if cursor is near bottom of the viewport
    const isAtBottom = e.clientY >= (window.innerHeight - BOTTOM_ZONE_PX);
    if (isAtBottom) {
      if (hudBar) hudBar.classList.add('visible');
    } else {
      if (hudBar) hudBar.classList.remove('visible');
    }

    // Auto-hide cursor after 2.8s of inactivity
    idleTimeout = setTimeout(() => {
      document.body.classList.add('cursor-hidden');
      if (hudBar) hudBar.classList.remove('visible');
    }, 2800);
  }

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mousedown', () => {
    document.body.classList.remove('cursor-hidden');
  });

  if (hudBar) {
    hudBar.addEventListener('mouseenter', () => {
      hudBar.classList.add('visible');
    });
  }

  // ==========================================================================
  // 7. Keyboard Shortcuts & Controls
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    if (key === 't') {
      e.preventDefault();
      cycleTheme();
    } else if (key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (topography) {
        const isPaused = topography.togglePause();
        if (pauseBadge) {
          pauseBadge.textContent = isPaused ? 'Paused [Space]' : 'Live [Space]';
        }
      }
    } else if (key === 'm') {
      e.preventDefault();
      if (topography) {
        const density = topography.cycleDensity();
        if (densityBadge) {
          const cap = density.charAt(0).toUpperCase() + density.slice(1);
          densityBadge.textContent = `Density: ${cap} [M]`;
        }
      }
    }
  });

  // HUD Bar Click Handlers
  if (themeBadge) {
    themeBadge.addEventListener('click', cycleTheme);
  }
  if (fullscreenBadge) {
    fullscreenBadge.addEventListener('click', toggleFullscreen);
  }
  if (pauseBadge) {
    pauseBadge.addEventListener('click', () => {
      if (topography) {
        const isPaused = topography.togglePause();
        pauseBadge.textContent = isPaused ? 'Paused [Space]' : 'Live [Space]';
      }
    });
  }
  if (densityBadge) {
    densityBadge.addEventListener('click', () => {
      if (topography) {
        const density = topography.cycleDensity();
        const cap = density.charAt(0).toUpperCase() + density.slice(1);
        densityBadge.textContent = `Density: ${cap} [M]`;
      }
    });
  }

})();
