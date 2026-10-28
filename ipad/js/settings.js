/**
 * Legacy iOS Compatible Settings Manager (ES5)
 */
var SettingsManager = {
  STORAGE_KEY: 'robs_ipad_display_config_v1',

  defaults: {
    userName: 'Rob',
    locationName: 'Bramley, Tadley',
    lat: 51.3300,
    lon: -1.0800,
    theme: 'pastel-sunset',
    is24Hour: false,
    wakeLockEnabled: true
  },

  config: null,

  load: function() {
    try {
      var stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        this.config = {};
        for (var key in this.defaults) {
          this.config[key] = typeof parsed[key] !== 'undefined' ? parsed[key] : this.defaults[key];
        }
      } else {
        this.config = JSON.parse(JSON.stringify(this.defaults));
      }
    } catch (e) {
      this.config = JSON.parse(JSON.stringify(this.defaults));
    }
    return this.config;
  },

  save: function(newConfig) {
    for (var key in newConfig) {
      this.config[key] = newConfig[key];
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  initModal: function() {
    var modal = document.getElementById('settingsModal');
    var openBtn = document.getElementById('settingsBtn');
    var closeBtn = document.getElementById('closeSettingsBtn');
    var saveBtn = document.getElementById('saveSettingsBtn');

    if (!modal || !openBtn) return;

    var self = this;
    openBtn.addEventListener('click', function() {
      self.populateForm();
      modal.className += ' is-open';
    });

    closeBtn.addEventListener('click', function() {
      modal.className = modal.className.replace(' is-open', '');
    });

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.className = modal.className.replace(' is-open', '');
    });

    saveBtn.addEventListener('click', function() {
      self.saveFromForm();
      modal.className = modal.className.replace(' is-open', '');
      self.applyConfig();
    });
  },

  populateForm: function() {
    var c = this.config;
    document.getElementById('settingName').value = c.userName;
    document.getElementById('settingLocation').value = c.locationName;
    document.getElementById('settingLat').value = c.lat;
    document.getElementById('settingLon').value = c.lon;
    document.getElementById('settingTheme').value = c.theme;
    document.getElementById('setting24Hour').checked = c.is24Hour;
    document.getElementById('settingWakeLock').checked = c.wakeLockEnabled;
  },

  saveFromForm: function() {
    var newConfig = {
      userName: document.getElementById('settingName').value.trim() || 'Rob',
      locationName: document.getElementById('settingLocation').value.trim() || 'Bramley, Tadley',
      lat: parseFloat(document.getElementById('settingLat').value) || 51.3300,
      lon: parseFloat(document.getElementById('settingLon').value) || -1.0800,
      theme: document.getElementById('settingTheme').value,
      is24Hour: document.getElementById('setting24Hour').checked,
      wakeLockEnabled: document.getElementById('settingWakeLock').checked
    };

    this.save(newConfig);
  },

  applyConfig: function() {
    var c = this.config;

    document.body.setAttribute('data-theme', c.theme);

    ClockManager.userName = c.userName;
    ClockManager.is24Hour = c.is24Hour;
    ClockManager.updateClock();

    WeatherManager.lat = c.lat;
    WeatherManager.lon = c.lon;
    WeatherManager.locationName = c.locationName;
    WeatherManager.updateLocationLabel();
    WeatherManager.fetchWeather();
  }
};
