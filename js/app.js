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

  // 7. Setup Night Mode Controls
  const nightModeBtn = document.getElementById('nightModeBtn');
  const nightOverlay = document.getElementById('nightModeOverlay');

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('night-mode-active');
    });
  }

  // Tapping the night screen temporarily wakes it up for 25 seconds
  if (nightOverlay) {
    nightOverlay.addEventListener('click', () => {
      ClockManager.dismissNightModeTemporarily();
      setTimeout(() => {
        const now = new Date();
        ClockManager.checkNightSchedule(now.getHours(), now.getMinutes());
      }, 25000);
    });
  }

  // 8. Fullscreen Toggle
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      toggleFullscreen();
    });
  }
});

/**
 * Handle browser fullscreen
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn(`Fullscreen error: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
