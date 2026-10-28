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

  // 6. Initialize Quick Action Shortcuts
  if (typeof ShortcutsManager !== 'undefined') {
    ShortcutsManager.init();
  }

  // 7. Initialize Settings Modal
  SettingsManager.initModal();

  // 8. Setup Night Mode Controls
  const nightModeBtn = document.getElementById('nightModeBtn');
  const nightOverlay = document.getElementById('nightModeOverlay');
  const nightExitBtn = document.getElementById('nightExitBtn');

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.body.classList.contains('night-mode-active')) {
        exitNightMode(true);
      } else {
        showToast('Entering Bedtime Mode (Full Screen) 🌙');
        enterNightMode(true);
      }
    });
  }

  // Exit button inside the night mode overlay
  if (nightExitBtn) {
    nightExitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exitNightMode(true);
      showToast('Woke display - returned to split view ☀️');
    });
  }

  // Tapping anywhere on night screen temporarily wakes it up for 30 seconds
  if (nightOverlay) {
    nightOverlay.addEventListener('click', (e) => {
      if (e.target.closest('#nightExitBtn')) return;
      ClockManager.dismissNightModeTemporarily();
      showToast('Waking screen for 30s ⏰');
      setTimeout(() => {
        const now = new Date();
        ClockManager.checkNightSchedule(now.getHours(), now.getMinutes());
      }, 30000);
    });
  }

  // 9. Fullscreen Toggle (Cross-Browser + Split-Screen Fallback)
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
 * Request Native Fullscreen with One UI / Split-Screen Fallback
 */
function requestFullscreenHelper() {
  const docEl = document.documentElement;
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
          console.debug('Native fullscreen fallback:', err.message);
          document.body.classList.add('immersive-mode');
        });
      }
    } catch (err) {
      document.body.classList.add('immersive-mode');
    }
  } else {
    document.body.classList.add('immersive-mode');
  }
}

/**
 * Exit Fullscreen
 */
function exitFullscreenHelper() {
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

/**
 * Robust Cross-Browser Fullscreen with Split-Screen Fallback
 */
function toggleFullscreen() {
  if (!isFullscreen()) {
    requestFullscreenHelper();
  } else {
    exitFullscreenHelper();
  }
  updateFullscreenIcon();
}

/**
 * Enter Nighttime Mode (optionally requesting full screen)
 */
function enterNightMode(goFullscreen = true) {
  document.body.classList.add('night-mode-active');
  ClockManager._userDismissedNightMode = false;

  if (goFullscreen && !isFullscreen()) {
    requestFullscreenHelper();
  }

  const nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) nightBtn.classList.add('active');

  updateFullscreenIcon();
}

/**
 * Exit Nighttime Mode (optionally leaving full screen to restore split view)
 */
function exitNightMode(leaveFullscreen = true) {
  document.body.classList.remove('night-mode-active');
  ClockManager._userDismissedNightMode = true;

  if (leaveFullscreen && isFullscreen()) {
    exitFullscreenHelper();
  }

  const nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) nightBtn.classList.remove('active');

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
    btn.setAttribute('title', 'Exit Fullscreen (Return to Split View)');
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

/**
 * Floating Aesthetic Toast Notification
 */
function showToast(message) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('is-visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2200);
}
