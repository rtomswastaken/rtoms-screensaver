/**
 * RTOMS Retro CRT Ambient Dashboard - Main Controller
 * Orchestrates:
 * - Local time greeting schedule & live retro digital clock
 * - Kanjirappally live weather via Open-Meteo & pixel-art SVG weather icons
 * - 4 Phosphor Themes with persistence (T key)
 * - Global CRT Optical pipeline toggling (H key)
 * - TelemetryEngine and TurtleArcade loops
 * - Fullscreen & Wake Lock lifecycle
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Theme System
  // =========================================================================
  const themes = [
    {
      id: 'amber',
      name: 'Amber',
      bg: '#0a0600',
      primary: '#ffb000',
      highlight: '#ffe082',
      muted: 'rgba(255, 176, 0, 0.28)',
      dim: 'rgba(255, 176, 0, 0.08)'
    },
    {
      id: 'green',
      name: 'Green',
      bg: '#000a03',
      primary: '#33ff66',
      highlight: '#a3ffbe',
      muted: 'rgba(51, 255, 102, 0.28)',
      dim: 'rgba(51, 255, 102, 0.08)'
    },
    {
      id: 'cyan',
      name: 'Cyan',
      bg: '#02080d',
      primary: '#00f0ff',
      highlight: '#d5fbff',
      muted: 'rgba(0, 240, 255, 0.28)',
      dim: 'rgba(0, 240, 255, 0.08)'
    },
    {
      id: 'monochrome',
      name: 'Mono',
      bg: '#050505',
      primary: '#f0f0f0',
      highlight: '#ffffff',
      muted: 'rgba(240, 240, 240, 0.28)',
      dim: 'rgba(240, 240, 240, 0.08)'
    }
  ];

  let currentThemeIdx = 0; // Amber by default
  const savedTheme = localStorage.getItem('rtoms_phosphor_theme');
  if (savedTheme) {
    const idx = themes.findIndex(t => t.id === savedTheme);
    if (idx !== -1) currentThemeIdx = idx;
  }

  let telemetry = null;
  let turtle = null;

  function applyTheme(idx) {
    currentThemeIdx = idx;
    const t = themes[currentThemeIdx];
    document.body.setAttribute('data-theme', t.id);
    localStorage.setItem('rtoms_phosphor_theme', t.id);

    if (telemetry) telemetry.setTheme(t);
    if (turtle) turtle.setTheme(t);

    const themeBadge = document.getElementById('btn-theme');
    if (themeBadge) {
      const lbl = themeBadge.querySelector('.btn-label');
      if (lbl) lbl.textContent = `Theme: ${t.name} [T]`;
    }
  }

  function cycleTheme() {
    const next = (currentThemeIdx + 1) % themes.length;
    applyTheme(next);
  }

  // =========================================================================
  // 2. Greeting, Date & Live Clock
  // =========================================================================
  const elGreeting = document.getElementById('greeting-text');
  const elDate = document.getElementById('date-text');
  const elClock = document.getElementById('clock-digits');
  const elTz = document.getElementById('timezone-tag');

  function getLocalTimezoneAbbr() {
    try {
      const match = new Date().toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ');
      return match[match.length - 1] || 'IST';
    } catch (e) {
      return 'IST';
    }
  }

  function updateClockAndGreeting() {
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();

    // Greeting Schedule:
    // 05:00–11:59: GOOD MORNING
    // 12:00–16:59: GOOD AFTERNOON
    // 17:00–20:59: GOOD EVENING
    // 21:00–04:59: GOOD NIGHT
    let greeting = 'GOOD MORNING,';
    if (hours >= 12 && hours < 17) {
      greeting = 'GOOD AFTERNOON,';
    } else if (hours >= 17 && hours < 21) {
      greeting = 'GOOD EVENING,';
    } else if (hours >= 21 || hours < 5) {
      greeting = 'GOOD NIGHT,';
    }

    if (elGreeting) elGreeting.textContent = greeting;

    // Date: SUNDAY · NOVEMBER 15 · 2026
    if (elDate) {
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dateNum = now.getDate();
      const year = now.getFullYear();
      elDate.textContent = `${dayName} · ${monthName} ${dateNum} · ${year}`;
    }

    // 12-hour Clock with continuous seconds: 05:33:42 PM
    if (elClock) {
      const rawH = hours % 12 || 12;
      const sH = String(rawH).padStart(2, '0');
      const sM = String(mins).padStart(2, '0');
      const sS = String(secs).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      elClock.textContent = `${sH}:${sM}:${sS} ${ampm}`;
    }

    if (elTz) {
      elTz.textContent = getLocalTimezoneAbbr();
    }
  }

  setInterval(updateClockAndGreeting, 250);
  updateClockAndGreeting();

  // =========================================================================
  // 3. Weather System (Kanjirappally, Kerala, India via Open-Meteo)
  // =========================================================================
  const elWeatherTemp = document.getElementById('weather-temp');
  const elWeatherDesc = document.getElementById('weather-desc');
  const elWeatherDetails = document.getElementById('weather-details');
  const elWeatherIcon = document.getElementById('weather-icon');

  // Custom Pixel-Art SVGs
  const pixelIcons = {
    sun: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="7" y="13" width="2" height="2"/>
      <rect x="1" y="7" width="2" height="2"/>
      <rect x="13" y="7" width="2" height="2"/>
      <rect x="3" y="3" width="2" height="2"/>
      <rect x="11" y="3" width="2" height="2"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="11" y="11" width="2" height="2"/>
      <rect x="5" y="5" width="6" height="6"/>
    </svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="6" y="2" width="5" height="2"/>
      <rect x="4" y="4" width="3" height="2"/>
      <rect x="3" y="6" width="3" height="4"/>
      <rect x="4" y="10" width="3" height="2"/>
      <rect x="6" y="12" width="5" height="2"/>
      <rect x="11" y="4" width="2" height="2"/>
      <rect x="11" y="10" width="2" height="2"/>
    </svg>`,
    cloud: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="4" width="6" height="2"/>
      <rect x="3" y="6" width="10" height="2"/>
      <rect x="2" y="8" width="12" height="4"/>
    </svg>`,
    partlyCloudy: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="2" height="2"/>
      <rect x="5" y="1" width="2" height="2"/>
      <rect x="1" y="5" width="2" height="2"/>
      <rect x="3" y="3" width="3" height="3"/>
      <rect x="6" y="7" width="6" height="2"/>
      <rect x="4" y="9" width="10" height="4"/>
    </svg>`,
    rain: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="3" width="6" height="2"/>
      <rect x="3" y="5" width="10" height="2"/>
      <rect x="2" y="7" width="12" height="3"/>
      <rect x="3" y="11" width="2" height="2"/>
      <rect x="7" y="11" width="2" height="2"/>
      <rect x="11" y="11" width="2" height="2"/>
      <rect x="4" y="13" width="2" height="2"/>
      <rect x="8" y="13" width="2" height="2"/>
    </svg>`,
    thunder: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="5" y="2" width="6" height="2"/>
      <rect x="3" y="4" width="10" height="2"/>
      <rect x="2" y="6" width="12" height="3"/>
      <polygon points="7,9 9,9 6,13 8,13 5,16 10,11 8,11 10,9"/>
    </svg>`,
    fog: `<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="4" width="12" height="2"/>
      <rect x="4" y="7" width="10" height="2"/>
      <rect x="1" y="10" width="13" height="2"/>
      <rect x="3" y="13" width="9" height="2"/>
    </svg>`
  };

  async function fetchWeather() {
    const lat = 9.55;
    const lon = 76.78;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather fetch status: ${res.status}`);
      const data = await res.json();
      const current = data.current;

      const tempC = Math.round(current.temperature_2m);
      const code = current.weather_code;
      const humidity = current.relative_humidity_2m;
      const wind = current.wind_speed_10m;

      updateWeatherUI(tempC, code, humidity, wind);
    } catch (err) {
      // Graceful fallback realistic data for Kanjirappally
      updateWeatherUI(29, 2, 78, 2.5);
    }
  }

  function updateWeatherUI(tempC, code, humidity, wind) {
    if (elWeatherTemp) elWeatherTemp.textContent = `${tempC}°C`;

    let desc = 'PARTLY CLOUDY';
    let iconSvg = pixelIcons.partlyCloudy;
    const hour = new Date().getHours();
    const isNight = (hour < 6 || hour >= 18);

    if (code === 0) {
      desc = isNight ? 'CLEAR NIGHT' : 'SUNNY';
      iconSvg = isNight ? pixelIcons.moon : pixelIcons.sun;
    } else if (code === 1 || code === 2) {
      desc = 'PARTLY CLOUDY';
      iconSvg = pixelIcons.partlyCloudy;
    } else if (code === 3) {
      desc = 'CLOUDY / OVERCAST';
      iconSvg = pixelIcons.cloud;
    } else if (code === 45 || code === 48) {
      desc = 'MIST / FOG';
      iconSvg = pixelIcons.fog;
    } else if (code >= 51 && code <= 67 || (code >= 80 && code <= 82)) {
      desc = 'TROPICAL RAIN';
      iconSvg = pixelIcons.rain;
    } else if (code >= 95) {
      desc = 'THUNDERSTORM';
      iconSvg = pixelIcons.thunder;
    }

    if (elWeatherDesc) elWeatherDesc.textContent = desc;
    if (elWeatherDetails) elWeatherDetails.textContent = `HUM: ${humidity}% · WIND: ${wind} km/h`;
    if (elWeatherIcon) elWeatherIcon.innerHTML = iconSvg;
  }

  fetchWeather();
  setInterval(fetchWeather, 15 * 60 * 1000); // 15 min update

  // =========================================================================
  // 4. CRT Optical Effects Toggle (H key)
  // =========================================================================
  const savedCrt = localStorage.getItem('rtoms_crt_mode');
  if (savedCrt === 'disabled') {
    document.body.classList.add('crt-disabled');
  }

  function toggleCrtEffects() {
    const isOff = document.body.classList.toggle('crt-disabled');
    localStorage.setItem('rtoms_crt_mode', isOff ? 'disabled' : 'enabled');
    const btnCrt = document.getElementById('btn-crt');
    if (btnCrt) {
      const lbl = btnCrt.querySelector('.btn-label');
      if (lbl) lbl.textContent = isOff ? 'CRT: Flat [H]' : 'CRT: Curved [H]';
    }
  }

  // =========================================================================
  // 5. Fullscreen & Interaction Handling
  // =========================================================================
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
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  function updateFullscreenUI() {
    const fs = isFullscreen();
    const btnFs = document.getElementById('btn-fullscreen');
    if (btnFs) {
      const lbl = btnFs.querySelector('.btn-label');
      if (lbl) lbl.textContent = fs ? 'Windowed [F]' : 'Fullscreen [F]';
    }
  }

  document.addEventListener('fullscreenchange', updateFullscreenUI);
  document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

  // Auto-launch fullscreen on initial interaction anywhere
  let hasInteracted = false;
  function handleFirstClick() {
    if (!hasInteracted) {
      hasInteracted = true;
      if (!isFullscreen()) toggleFullscreen();
      acquireWakeLock();
    }
  }
  window.addEventListener('click', handleFirstClick, { once: true });
  window.addEventListener('touchstart', handleFirstClick, { once: true });

  // Screen Wake Lock
  let wakeLock = null;
  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (err) {}
    }
  }
  acquireWakeLock();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      acquireWakeLock();
      updateClockAndGreeting();
    }
  });

  // =========================================================================
  // 6. Bottom-Edge Auto-Hiding Control HUD
  // =========================================================================
  const hudBar = document.getElementById('hud-bar');
  let idleTimeout = null;

  function handleMouseMove(e) {
    document.body.classList.remove('cursor-hidden');
    clearTimeout(idleTimeout);

    // Only display HUD if cursor is within bottom 90px of viewport
    const isAtBottom = e.clientY >= (window.innerHeight - 90);
    if (isAtBottom && hudBar) {
      hudBar.classList.add('visible');
    } else if (hudBar) {
      hudBar.classList.remove('visible');
    }

    idleTimeout = setTimeout(() => {
      document.body.classList.add('cursor-hidden');
      if (hudBar) hudBar.classList.remove('visible');
    }, 2800);
  }

  window.addEventListener('mousemove', handleMouseMove);
  if (hudBar) {
    hudBar.addEventListener('mouseenter', () => hudBar.classList.add('visible'));
  }

  // =========================================================================
  // 7. Keyboard Shortcuts
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    if (key === 't') {
      e.preventDefault();
      cycleTheme();
    } else if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (telemetry) {
        telemetry.isPaused = !telemetry.isPaused;
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
          const lbl = btnPause.querySelector('.btn-label');
          if (lbl) lbl.textContent = telemetry.isPaused ? 'Paused [Space]' : 'Live [Space]';
        }
      }
    } else if (key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (key === 'r') {
      e.preventDefault();
      fetchWeather();
    } else if (key === 'h') {
      e.preventDefault();
      toggleCrtEffects();
    }
  });

  // Wire buttons
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) btnTheme.addEventListener('click', cycleTheme);

  const btnPause = document.getElementById('btn-pause');
  if (btnPause) btnPause.addEventListener('click', () => {
    if (telemetry) {
      telemetry.isPaused = !telemetry.isPaused;
      const lbl = btnPause.querySelector('.btn-label');
      if (lbl) lbl.textContent = telemetry.isPaused ? 'Paused [Space]' : 'Live [Space]';
    }
  });

  const btnFullscreen = document.getElementById('btn-fullscreen');
  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  const btnWeather = document.getElementById('btn-weather');
  if (btnWeather) btnWeather.addEventListener('click', fetchWeather);

  const btnCrt = document.getElementById('btn-crt');
  if (btnCrt) btnCrt.addEventListener('click', toggleCrtEffects);

  // =========================================================================
  // 8. Canvas Visualizations Initialization & Main Loop
  // =========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Telemetry Canvas Engine
    telemetry = new TelemetryEngine();
    telemetry.registerCanvas('histogram', document.getElementById('canvas-histogram'));
    telemetry.registerCanvas('oscilloscope', document.getElementById('canvas-oscilloscope'));
    telemetry.registerCanvas('radarChart', document.getElementById('canvas-radar-chart'));
    telemetry.registerCanvas('memory', document.getElementById('canvas-memory'));
    telemetry.registerCanvas('radarSweep', document.getElementById('canvas-radar-sweep'));
    telemetry.registerCanvas('hexFeed', document.getElementById('canvas-hex-feed'));

    // 2. Turtle Arcade Mini-Game
    const turtleCanvas = document.getElementById('canvas-turtle');
    if (turtleCanvas) {
      turtle = new TurtleArcade(turtleCanvas);
    }

    // Apply saved or default theme
    applyTheme(currentThemeIdx);

    // Responsive Canvas Resize Observer
    window.addEventListener('resize', () => {
      if (telemetry) telemetry.resizeAll();
      if (turtle) turtle.resize();
    });

    // 3. Unified 60 FPS Render Loop
    function mainLoop() {
      if (document.visibilityState === 'visible') {
        if (telemetry) telemetry.render();
        if (turtle) turtle.render();
      }
      requestAnimationFrame(mainLoop);
    }
    requestAnimationFrame(mainLoop);
  });

})();
