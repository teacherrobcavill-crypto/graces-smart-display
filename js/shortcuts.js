/**
 * Quick Shortcuts Engine for Grace's Galaxy Dashboard
 * Embedded into top navigation bar next to the Moon button
 */
const ShortcutsManager = {
  containerId: 'topShortcutsContainer',

  init() {
    this.render();
  },

  getShortcuts() {
    const config = SettingsManager.load();
    if (!config.shortcuts || !Array.isArray(config.shortcuts)) {
      config.shortcuts = [
        { id: 'music', title: 'Amazon Music', subtitle: 'Open App', icon: '🎵', type: 'amazon-music' },
        { id: 'calendar', title: 'Sync Schedule', subtitle: 'Refresh', icon: '🗓️', type: 'refresh-data' }
      ];
      SettingsManager.save({ shortcuts: config.shortcuts });
    }
    return config.shortcuts;
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const shortcuts = this.getShortcuts();
    container.innerHTML = '';

    shortcuts.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `icon-btn top-shortcut-btn shortcut-${item.id || 'custom'}`;
      btn.setAttribute('aria-label', item.title);
      btn.title = item.title + (item.subtitle ? ` (${item.subtitle})` : '');

      btn.innerHTML = `
        <span class="top-shortcut-icon">${item.icon || '⚡'}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleAction(item, btn);
      });

      container.appendChild(btn);
    });
  },

  handleAction(item, btnElement) {
    if (btnElement) {
      btnElement.classList.add('is-pressed');
      setTimeout(() => btnElement.classList.remove('is-pressed'), 250);
    }

    switch (item.type) {
      case 'toggle-fullscreen':
        const willBeFs = !isFullscreen();
        toggleFullscreen();
        showToast(willBeFs ? 'Dashboard Full Screen ⛶' : 'Returned to Split Screen 📱');
        break;

      case 'amazon-music':
        showToast('Launching Amazon Music... 🎵');
        this.launchApp('amznmp3://', 'https://music.amazon.co.uk');
        break;

      case 'refresh-data':
        showToast('Syncing Schedule & Bramley Weather... ✨');
        if (typeof CalendarManager !== 'undefined') CalendarManager.loadCalendar();
        if (typeof WeatherManager !== 'undefined') WeatherManager.fetchWeather();
        break;

      case 'url':
      default:
        if (item.url) {
          showToast(`Opening ${item.title}... 🚀`);
          window.open(item.url, '_blank');
        }
        break;
    }
  },

  launchApp(appUri, fallbackUrl) {
    const start = Date.now();
    window.location.href = appUri;

    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(fallbackUrl, '_blank');
      }
    }, 1200);
  }
};
