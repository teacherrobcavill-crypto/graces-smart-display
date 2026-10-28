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

  // 6. Initialize Quick Action Shortcuts (in Top Bar)
  if (typeof ShortcutsManager !== 'undefined') {
    ShortcutsManager.init();
  }

  // 7. Initialize Settings Modal
  SettingsManager.initModal();

  // 8. Setup Night Mode Controls (Bedtime Fullscreen & Split-Screen Toggle)
  const nightModeBtn = document.getElementById('nightModeBtn');
  const nightOverlay = document.getElementById('nightModeOverlay');
  const nightVideo = document.getElementById('nightModeVideo');

  if (nightModeBtn) {
    nightModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.body.classList.contains('night-mode-active')) {
        exitNightMode();
        showToast('Returned to split view ☀️');
      } else {
        showToast('Entering Bedtime Mode (Full Screen) 🌙');
        enterNightMode(true);
      }
    });
  }

  // Tapping anywhere in full screen night mode immediately returns to split saved mode
  if (nightOverlay) {
    nightOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      exitNightMode();
      showToast('Returned to split view ☀️');
    });
  }

  if (nightVideo) {
    ['click', 'touchend'].forEach(evt => {
      nightVideo.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitNightMode();
        showToast('Returned to split view ☀️');
      });
    });
  }

  // 9. Fullscreen Toggle Button (for explicit manual browser fullscreen toggle)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Listen for fullscreen state changes
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
    document.addEventListener(evt, () => {
      const video = document.getElementById('nightModeVideo');
      // If user exited video fullscreen via back button or swipe, exit night mode cleanly
      if (document.body.classList.contains('night-mode-active')) {
        const isVideoFs = document.fullscreenElement === video || document.webkitFullscreenElement === video;
        if (!isVideoFs && video && video.srcObject) {
          exitNightMode();
        }
      }
      updateFullscreenIcon();
    });
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
 * Exit Fullscreen (Only called when explicitly tapping the fullscreen button)
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
 * Live Bedtime Canvas Rendering Engine
 * Renders high-res amber clock on pure black background
 */
let nightCanvasInterval = null;

function renderNightCanvas() {
  const canvas = document.getElementById('nightCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // 1. OLED true black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // 2. Get current time
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const is24 = SettingsManager.config ? SettingsManager.config.is24Hour : false;

  let displayHours = hours;
  let period = '';
  if (!is24) {
    period = hours >= 12 ? ' PM' : ' AM';
    displayHours = hours % 12 || 12;
  }
  const timeStr = `${String(displayHours).padStart(is24 ? 2 : 1, '0')}:${String(minutes).padStart(2, '0')}${period}`;
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // 3. Draw Clock
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 157, 66, 0.4)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#ff9d42';
  ctx.font = '800 180px Outfit, "Plus Jakarta Sans", sans-serif';
  ctx.fillText(timeStr, w / 2, h / 2 - 40);

  // 4. Draw Date
  ctx.shadowBlur = 15;
  ctx.fillStyle = 'rgba(255, 157, 66, 0.65)';
  ctx.font = '500 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(dateStr, w / 2, h / 2 + 80);

  // 5. Draw Hint
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 157, 66, 0.4)';
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Tap anywhere to return to split view ☀️', w / 2, h / 2 + 160);
}

function startNightCanvasLoop() {
  renderNightCanvas();
  if (nightCanvasInterval) clearInterval(nightCanvasInterval);
  nightCanvasInterval = setInterval(renderNightCanvas, 1000);
}

function stopNightCanvasLoop() {
  if (nightCanvasInterval) {
    clearInterval(nightCanvasInterval);
    nightCanvasInterval = null;
  }
}

/**
 * Enter Nighttime Mode (expands to full screen)
 */
function enterNightMode(goFullscreen = true) {
  document.body.classList.add('night-mode-active');
  ClockManager._userDismissedNightMode = false;

  // Start live canvas rendering
  startNightCanvasLoop();

  // On Android split-screen, promote media/canvas to OS fullscreen across entire tablet
  const canvas = document.getElementById('nightCanvas');
  const video = document.getElementById('nightModeVideo');

  if (goFullscreen && canvas && video && canvas.captureStream) {
    try {
      if (!video.srcObject) {
        video.srcObject = canvas.captureStream(2);
      }
      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(() => {
          const reqFs = video.requestFullscreen || video.webkitRequestFullscreen || video.webkitEnterFullscreen;
          if (reqFs) {
            reqFs.call(video).catch(() => {
              if (!isFullscreen()) requestFullscreenHelper();
            });
          } else if (!isFullscreen()) {
            requestFullscreenHelper();
          }
        }).catch(() => {
          if (!isFullscreen()) requestFullscreenHelper();
        });
      }
    } catch (e) {
      if (!isFullscreen()) requestFullscreenHelper();
    }
  } else if (goFullscreen && !isFullscreen()) {
    requestFullscreenHelper();
  }

  const nightBtn = document.getElementById('nightModeBtn');
  if (nightBtn) nightBtn.classList.add('active');

  updateFullscreenIcon();
}

/**
 * Exit Nighttime Mode (returns to split view, RETAINING the webpage in full screen mode)
 */
function exitNightMode() {
  document.body.classList.remove('night-mode-active');
  ClockManager._userDismissedNightMode = true;

  // Stop canvas loop
  stopNightCanvasLoop();

  // If a video element was promoted to OS-level fullscreen, exit the video only
  const video = document.getElementById('nightModeVideo');
  if (video) {
    try {
      if (document.fullscreenElement === video || document.webkitFullscreenElement === video) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
      if (video.webkitExitFullscreen) video.webkitExitFullscreen();
      video.pause();
    } catch (e) {
      console.debug('Exit video error:', e);
    }
  }

  // NOTE: Retain the webpage in full screen mode!
  // Do NOT call exitFullscreenHelper() here so the browser stays in full screen without address bars.

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
