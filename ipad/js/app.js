/**
 * Rob's iPad Smart Display Orchestrator (Fullscreen 4:3 Ambient Display)
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load Settings
  const config = SettingsManager.load();

  // 2. Apply Visual Theme
  document.body.setAttribute('data-theme', config.theme || 'pastel-sunset');

  // 3. Initialize Clock & Greeting
  ClockManager.init({
    userName: config.userName,
    is24Hour: config.is24Hour,
    autoNightEnabled: true
  });

  // 4. Initialize Live Weather for Bramley & Tadley
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

  // 7. Request Screen Wake Lock (Keep iPad Screen Permanently On)
  if (config.wakeLockEnabled !== false) {
    requestWakeLock();
  }

  // 8. Setup Night Mode Controls
  const nightModeBtn = document.getElementById('nightModeBtn');
  const nightOverlay = document.getElementById('nightModeOverlay');

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('night-mode-active');
    });
  }

  // Tap night screen to temporarily awaken
  if (nightOverlay) {
    nightOverlay.addEventListener('click', () => {
      ClockManager.dismissNightModeTemporarily();
      setTimeout(() => {
        const now = new Date();
        ClockManager.checkNightSchedule(now.getHours(), now.getMinutes());
      }, 25000);
    });
  }

  // 9. Fullscreen Toggle
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }
});

/**
 * Screen Wake Lock API (Keeps iPad permanently illuminated)
 */
let wakeLockSentinel = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      updateWakeLockPill(true);

      wakeLockSentinel.addEventListener('release', () => {
        updateWakeLockPill(false);
      });
    } catch (err) {
      console.debug('Wake lock request waiting or not supported:', err);
      updateWakeLockPill(false);
    }
  }
}

// Re-acquire wake lock when tab/app returns to foreground
document.addEventListener('visibilitychange', async () => {
  if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

function updateWakeLockPill(active) {
  const pill = document.getElementById('wakeLockPill');
  if (!pill) return;
  if (active) {
    pill.style.opacity = '1';
    pill.querySelector('span:last-child').textContent = 'Always On';
  } else {
    pill.style.opacity = '0.7';
    pill.querySelector('span:last-child').textContent = 'Display On';
  }
}

/**
 * Fullscreen Toggle
 */
function toggleFullscreen() {
  const docEl = document.documentElement;
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);

  if (!isFs) {
    const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (requestFs) {
      requestFs.call(docEl).catch(e => console.debug(e));
    }
  } else {
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFs) {
      exitFs.call(document);
    }
  }
}
