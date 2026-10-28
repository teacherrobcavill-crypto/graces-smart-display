/**
 * Legacy iOS Compatible Orchestrator for Rob's iPad Display (ES5)
 */
document.addEventListener('DOMContentLoaded', function() {
  // 1. Load Settings
  var config = SettingsManager.load();

  // 2. Apply Theme
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

  // 7. Request Screen Wake Lock (if supported on iOS)
  if (config.wakeLockEnabled !== false) {
    requestWakeLock();
  }

  // 8. Setup Night Mode Controls
  var nightModeBtn = document.getElementById('nightModeBtn');
  var nightOverlay = document.getElementById('nightModeOverlay');

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', function() {
      if (document.body.className.indexOf('night-mode-active') !== -1) {
        document.body.className = document.body.className.replace(' night-mode-active', '');
      } else {
        document.body.className += ' night-mode-active';
      }
    });
  }

  if (nightOverlay) {
    nightOverlay.addEventListener('click', function() {
      ClockManager.dismissNightModeTemporarily();
      setTimeout(function() {
        var now = new Date();
        ClockManager.checkNightSchedule(now.getHours(), now.getMinutes());
      }, 25000);
    });
  }

  // 9. Fullscreen Toggle
  var fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleFullscreen();
    });
  }
});

/**
 * Screen Wake Lock
 */
var wakeLockSentinel = null;

function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      navigator.wakeLock.request('screen').then(function(sentinel) {
        wakeLockSentinel = sentinel;
        updateWakeLockPill(true);
        sentinel.addEventListener('release', function() {
          updateWakeLockPill(false);
        });
      }).catch(function(err) {
        console.debug('Wake lock error:', err);
      });
    } catch (e) {
      console.debug('Wake lock not supported on iOS:', e);
    }
  }
}

function updateWakeLockPill(active) {
  var pill = document.getElementById('wakeLockPill');
  if (!pill) return;
  pill.style.opacity = active ? '1' : '0.7';
}

/**
 * Fullscreen Toggle
 */
function toggleFullscreen() {
  var docEl = document.documentElement;
  var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);

  if (!isFs) {
    var requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (requestFs) {
      try {
        requestFs.call(docEl);
      } catch (e) {
        console.debug(e);
      }
    }
  } else {
    var exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFs) {
      try {
        exitFs.call(document);
      } catch (e) {
        console.debug(e);
      }
    }
  }
}
