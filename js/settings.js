/**
 * Settings Manager & LocalStorage Persistence (Split-Screen Mode)
 */
const SettingsManager = {
  STORAGE_KEY: 'graces_smart_display_config_v2',

  defaults: {
    userName: 'Grace',
    locationName: 'Bramley, Tadley',
    lat: 51.3300,
    lon: -1.0800,
    theme: 'pastel-sunset',
    is24Hour: false,
    shortcuts: [
      { id: 'music', title: 'Amazon Music', subtitle: 'Open App', icon: '🎵', type: 'amazon-music' },
      { id: 'calendar', title: 'Sync Schedule', subtitle: 'Refresh', icon: '🗓️', type: 'refresh-data' }
    ]
  },

  config: null,

  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = Object.assign({}, this.defaults, JSON.parse(stored));
      } else {
        this.config = Object.assign({}, this.defaults);
      }
    } catch (e) {
      this.config = Object.assign({}, this.defaults);
    }

    if (!this.config.shortcuts || !Array.isArray(this.config.shortcuts)) {
      this.config.shortcuts = JSON.parse(JSON.stringify(this.defaults.shortcuts));
    } else {
      // Filter out any previous bedtime shortcut so it doesn't duplicate the top moon button
      this.config.shortcuts = this.config.shortcuts.filter(s => s.type !== 'night-fullscreen');
      if (this.config.shortcuts.length === 0) {
        this.config.shortcuts = JSON.parse(JSON.stringify(this.defaults.shortcuts));
      }
    }

    return this.config;
  },

  save(newConfig) {
    this.config = Object.assign({}, this.config, newConfig);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },

  initModal() {
    const modal = document.getElementById('settingsModal');
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const addShortcutBtn = document.getElementById('addShortcutBtn');

    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
      this.populateForm();
      modal.classList.add('is-open');
    });

    closeBtn.addEventListener('click', () => {
      modal.classList.remove('is-open');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('is-open');
    });

    saveBtn.addEventListener('click', () => {
      this.saveFromForm();
      modal.classList.remove('is-open');
      this.applyConfig();
      if (typeof showToast === 'function') {
        showToast('Settings & Shortcuts updated ✨');
      }
    });

    if (addShortcutBtn) {
      addShortcutBtn.addEventListener('click', () => this.addShortcutRow());
    }
  },

  populateForm() {
    const c = this.config;
    document.getElementById('settingName').value = c.userName;
    document.getElementById('settingLocation').value = c.locationName;
    document.getElementById('settingLat').value = c.lat;
    document.getElementById('settingLon').value = c.lon;
    document.getElementById('settingTheme').value = c.theme;
    document.getElementById('setting24Hour').checked = c.is24Hour;

    this.renderShortcutRows(c.shortcuts || this.defaults.shortcuts);
  },

  renderShortcutRows(shortcuts) {
    const container = document.getElementById('settingsShortcutList');
    if (!container) return;
    container.innerHTML = '';

    shortcuts.forEach((sc, index) => {
      container.appendChild(this.createShortcutRow(sc, index));
    });
  },

  createShortcutRow(sc, index) {
    const row = document.createElement('div');
    row.className = 'shortcut-edit-row';

    const isUrl = sc.type === 'url';

    row.innerHTML = `
      <input type="text" class="icon-input" value="${sc.icon || '⚡'}" maxlength="4" title="Emoji">
      <input type="text" class="title-input" value="${sc.title || ''}" placeholder="Title">
      <input type="text" class="sub-input" value="${sc.subtitle || ''}" placeholder="Subtitle">
      <select class="action-select">
        <option value="amazon-music" ${sc.type === 'amazon-music' ? 'selected' : ''}>🎵 Amazon Music App</option>
        <option value="refresh-data" ${sc.type === 'refresh-data' ? 'selected' : ''}>🗓️ Sync Schedule & Weather</option>
        <option value="toggle-fullscreen" ${sc.type === 'toggle-fullscreen' ? 'selected' : ''}>⛶ Fullscreen Toggle</option>
        <option value="url" ${isUrl ? 'selected' : ''}>🔗 Custom Web Link / App URL</option>
      </select>
      <input type="text" class="url-input" value="${sc.url || ''}" placeholder="https:// or app link" style="display: ${isUrl ? 'block' : 'none'};">
      <button type="button" class="remove-item-btn" title="Remove">&times;</button>
    `;

    const select = row.querySelector('.action-select');
    const urlInput = row.querySelector('.url-input');
    select.addEventListener('change', () => {
      urlInput.style.display = select.value === 'url' ? 'block' : 'none';
    });

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
      row.remove();
    });

    return row;
  },

  addShortcutRow() {
    const container = document.getElementById('settingsShortcutList');
    if (!container) return;
    const newSc = {
      id: 'custom-' + Date.now(),
      title: 'New Shortcut',
      subtitle: 'Open',
      icon: '⭐',
      type: 'url',
      url: 'https://'
    };
    container.appendChild(this.createShortcutRow(newSc, container.children.length));
  },

  saveFromForm() {
    const rows = document.querySelectorAll('#settingsShortcutList .shortcut-edit-row');
    const updatedShortcuts = [];

    rows.forEach((r, idx) => {
      const icon = r.querySelector('.icon-input').value.trim() || '⚡';
      const title = r.querySelector('.title-input').value.trim() || `Shortcut ${idx + 1}`;
      const subtitle = r.querySelector('.sub-input').value.trim() || '';
      const type = r.querySelector('.action-select').value;
      const url = r.querySelector('.url-input').value.trim();

      updatedShortcuts.push({
        id: `sc-${idx + 1}`,
        icon,
        title,
        subtitle,
        type,
        url: type === 'url' ? url : ''
      });
    });

    const newConfig = {
      userName: document.getElementById('settingName').value.trim() || 'Grace',
      locationName: document.getElementById('settingLocation').value.trim() || 'Bramley, Tadley',
      lat: parseFloat(document.getElementById('settingLat').value) || 51.3300,
      lon: parseFloat(document.getElementById('settingLon').value) || -1.0800,
      theme: document.getElementById('settingTheme').value,
      is24Hour: document.getElementById('setting24Hour').checked,
      shortcuts: updatedShortcuts.length > 0 ? updatedShortcuts : this.defaults.shortcuts
    };

    this.save(newConfig);
  },

  applyConfig() {
    const c = this.config;

    // Apply theme
    document.body.setAttribute('data-theme', c.theme);

    // Update Clock
    ClockManager.userName = c.userName;
    ClockManager.is24Hour = c.is24Hour;
    ClockManager.updateClock();

    // Update Weather
    WeatherManager.lat = c.lat;
    WeatherManager.lon = c.lon;
    WeatherManager.locationName = c.locationName;
    WeatherManager.updateLocationLabel();
    WeatherManager.fetchWeather();

    // Update Shortcuts UI in top bar
    if (typeof ShortcutsManager !== 'undefined') {
      ShortcutsManager.render();
    }
  }
};
