/**
 * Settings Manager & LocalStorage Persistence
 */
const SettingsManager = {
  STORAGE_KEY: 'graces_smart_display_config_v1',

  defaults: {
    userName: 'Grace',
    locationName: 'Bramley, Tadley',
    lat: 51.3300,
    lon: -1.0800,
    theme: 'pastel-sunset',
    is24Hour: false,
    keepAliveEnabled: true,
    playlists: [
      { id: '1', title: 'Top Pop Hits', icon: '🎧', query: 'Top Pop Hits' },
      { id: '2', title: 'Bedtime Calm', icon: '💤', query: 'Bedtime Sleep Sounds' },
      { id: '3', title: 'Study & Chill', icon: '📚', query: 'Lofi Chill Beats' },
      { id: '4', title: 'Disney Favorites', icon: '✨', query: 'Disney Soundtracks' }
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
    const addPlBtn = document.getElementById('addPlaylistBtn');

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
    });

    if (addPlBtn) {
      addPlBtn.addEventListener('click', () => this.addPlaylistRow());
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
    document.getElementById('settingKeepAlive').checked = c.keepAliveEnabled;

    this.renderPlaylistRows(c.playlists);
  },

  renderPlaylistRows(playlists) {
    const container = document.getElementById('settingsPlaylistList');
    if (!container) return;
    container.innerHTML = '';

    playlists.forEach((pl, index) => {
      const row = document.createElement('div');
      row.className = 'playlist-edit-row';
      row.innerHTML = `
        <input type="text" class="icon-input" value="${pl.icon || '🎵'}" maxlength="4" title="Emoji">
        <input type="text" class="title-input" value="${pl.title}" placeholder="Button Title">
        <input type="text" class="query-input" value="${pl.query}" placeholder="Amazon Music search query">
        <button type="button" class="remove-item-btn" title="Remove">&times;</button>
      `;

      row.querySelector('.remove-item-btn').addEventListener('click', () => {
        row.remove();
      });

      container.appendChild(row);
    });
  },

  addPlaylistRow() {
    const container = document.getElementById('settingsPlaylistList');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'playlist-edit-row';
    row.innerHTML = `
      <input type="text" class="icon-input" value="✨" maxlength="4">
      <input type="text" class="title-input" value="New Playlist" placeholder="Button Title">
      <input type="text" class="query-input" value="Pop" placeholder="Amazon Music search query">
      <button type="button" class="remove-item-btn" title="Remove">&times;</button>
    `;

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
  },

  saveFromForm() {
    const rows = document.querySelectorAll('#settingsPlaylistList .playlist-edit-row');
    const updatedPlaylists = [];
    rows.forEach((r, idx) => {
      const icon = r.querySelector('.icon-input').value.trim() || '🎵';
      const title = r.querySelector('.title-input').value.trim() || `Mix ${idx + 1}`;
      const query = r.querySelector('.query-input').value.trim() || title;
      updatedPlaylists.push({ id: String(idx + 1), icon, title, query });
    });

    const newConfig = {
      userName: document.getElementById('settingName').value.trim() || 'Grace',
      locationName: document.getElementById('settingLocation').value.trim() || 'Bramley, Tadley',
      lat: parseFloat(document.getElementById('settingLat').value) || 51.3300,
      lon: parseFloat(document.getElementById('settingLon').value) || -1.0800,
      theme: document.getElementById('settingTheme').value,
      is24Hour: document.getElementById('setting24Hour').checked,
      keepAliveEnabled: document.getElementById('settingKeepAlive').checked,
      playlists: updatedPlaylists
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

    // Update Music
    MusicManager.playlists = c.playlists;
    MusicManager.renderPlaylists();
    if (c.keepAliveEnabled) {
      MusicManager.startKeepAlive();
    } else {
      MusicManager.stopKeepAlive();
    }
  }
};
