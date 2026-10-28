/**
 * Main Application Orchestrator for Grace's Smart Display (Split-Screen Mode)
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load Configuration
  const config = SettingsManager.load();

  // 2. Apply Theme
  document.body.setAttribute('data-theme', config.theme || 'pastel-sunset');

  // 3. Initialize Clock & Greeting
  ClockManager.init({
    userName: config.userName,
    is24Hour: config.is24Hour,
    autoNightEnabled: true
  });

  // 4. Initialize Weather for Bramley & Tadley
  WeatherManager.init({
    lat: config.lat,
    lon: config.lon,
    locationName: config.locationName
  });

  // 5. Initialize Apple Family Calendar (gracecavill@icloud.com)
  if (typeof CalendarManager !== 'undefined') {
    CalendarManager.init();
  }

  // 6. Initialize Settings Modal
  SettingsManager.initModal();

  // 7. Setup Evening Clock / Night Mode Controls
  const nightModeBtn = document.getElementById('nightModeBtn');
  const nightOverlay = document.getElementById('nightModeOverlay');

  function enterEveningClock(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    ClockManager.enterNightMode();
  }

  function exitEveningClock(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    ClockManager.exitNightMode();
  }

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', enterEveningClock);
  }

  // Touching anywhere on the evening clock screen returns to the main dashboard
  if (nightOverlay) {
    let touched = false;
    nightOverlay.addEventListener('pointerup', (e) => {
      touched = true;
      exitEveningClock(e);
      setTimeout(() => { touched = false; }, 300);
    });

    nightOverlay.addEventListener('click', (e) => {
      if (!touched) {
        exitEveningClock(e);
      }
    });
  }

  // 8. Fullscreen Toggle (Cross-Browser + Split-Screen Fallback)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Listen for fullscreen state changes to toggle button icon
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
    document.addEventListener(evt, updateFullscreenIcon);
  });
});

/**
 * Check if currently in fullscreen (across all browser engines)
 */
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    document.body.classList.contains('immersive-mode')
  );
}

/**
 * Robust Cross-Browser Fullscreen with Split-Screen Fallback
 */
function toggleFullscreen() {
  const docEl = document.documentElement;
  const isFs = isFullscreen();

  if (!isFs) {
    const requestFs =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.webkitRequestFullScreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFs) {
      try {
        const p = requestFs.call(docEl);
        if (p && p.catch) {
          p.catch((err) => {
            console.debug('Native fullscreen disallowed in split-screen mode, activating immersive layout:', err.message);
            toggleImmersiveFallback();
          });
        }
      } catch (err) {
        toggleImmersiveFallback();
      }
    } else {
      toggleImmersiveFallback();
    }
  } else {
    const exitFs =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try {
        exitFs.call(document);
      } catch (err) {
        console.debug('Exit fullscreen error:', err);
      }
    }
    document.body.classList.remove('immersive-mode');
  }

  updateFullscreenIcon();
}

/**
 * Immersive fallback for Samsung One UI Split-Screen mode
 */
function toggleImmersiveFallback() {
  document.body.classList.toggle('immersive-mode');
  updateFullscreenIcon();
}

/**
 * Toggle Fullscreen Icon state
 */
function updateFullscreenIcon() {
  const btn = document.getElementById('fullscreenBtn');
  if (!btn) return;

  const isFs = isFullscreen();
  if (isFs) {
    btn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" width="22" height="22">
        <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
      </svg>
    `;
    btn.setAttribute('title', 'Exit Fullscreen');
    btn.classList.add('active');
  } else {
    btn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" width="22" height="22">
        <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
      </svg>
    `;
    btn.setAttribute('title', 'Fullscreen Mode');
    btn.classList.remove('active');
  }
}
