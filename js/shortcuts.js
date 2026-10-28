/**
 * Quick Shortcuts Engine for Grace's Galaxy Dashboard
 * Provides embedded one-tap actions (Bedtime Fullscreen, Fullscreen Toggle, Music, Calendar Refresh)
 */
const ShortcutsManager = {
  containerId: 'shortcutsGrid',

  init() {
    this.render();
  },

  getShortcuts() {
    const config = SettingsManager.load();
    if (!config.shortcuts || !Array.isArray(config.shortcuts) || config.shortcuts.length === 0) {
      config.shortcuts = [
        { id: 'night', title: 'Bedtime', subtitle: 'Full Screen', icon: '🌙', type: 'night-fullscreen' },
        { id: 'fullscreen', title: 'Fullscreen', subtitle: 'Split / Full', icon: '⛶', type: 'toggle-fullscreen' },
        { id: 'music', title: 'Amazon Music', subtitle: 'Open App', icon: '🎵', type: 'amazon-music' },
        { id: 'calendar', title: 'Calendar', subtitle: 'Sync Live', icon: '🗓️', type: 'refresh-data' }
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
      btn.className = `shortcut-btn shortcut-${item.id || 'custom'}`;
      if (item.type === 'night-fullscreen') {
        btn.classList.add('shortcut-night');
      }

      btn.setAttribute('data-action', item.type || 'url');
      if (item.url) btn.setAttribute('data-url', item.url);
      btn.title = `${item.title} (${item.subtitle || ''})`;

      btn.innerHTML = `
        <span class="shortcut-btn-icon">${item.icon || '⚡'}</span>
        <span class="shortcut-btn-label">${item.title}</span>
        <span class="shortcut-btn-sub">${item.subtitle || ''}</span>
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
      case 'night-fullscreen':
        showToast('Entering Bedtime Mode (Full Screen) 🌙');
        enterNightMode(true);
        break;

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
