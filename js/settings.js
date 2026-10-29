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
    theme: 'baby-pink',
    is24Hour: false
  },

  config: null,

  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = Object.assign({}, this.defaults, JSON.parse(stored));
        if (this.config.theme === 'pastel-sunset') {
          this.config.theme = 'baby-pink';
          this.save(this.config);
        }
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
  },

  populateForm() {
    const c = this.config;
    document.getElementById('settingName').value = c.userName;
    document.getElementById('settingLocation').value = c.locationName;
    document.getElementById('settingLat').value = c.lat;
    document.getElementById('settingLon').value = c.lon;
    document.getElementById('settingTheme').value = c.theme;
    document.getElementById('setting24Hour').checked = c.is24Hour;
  },

  saveFromForm() {
    const newConfig = {
      userName: document.getElementById('settingName').value.trim() || 'Grace',
      locationName: document.getElementById('settingLocation').value.trim() || 'Bramley, Tadley',
      lat: parseFloat(document.getElementById('settingLat').value) || 51.3300,
      lon: parseFloat(document.getElementById('settingLon').value) || -1.0800,
      theme: document.getElementById('settingTheme').value,
      is24Hour: document.getElementById('setting24Hour').checked
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
  }
};
