/**
 * Legacy iOS Compatible Weather Engine (Open-Meteo via XHR / ES5)
 */
var WeatherManager = {
  lat: 51.3300,
  lon: -1.0800,
  locationName: 'Bramley, Tadley',
  refreshInterval: 5 * 60 * 1000,

  wmoCodeMap: {
    0: { label: 'Clear Sky', icon: '☀️' },
    1: { label: 'Mainly Clear', icon: '🌤️' },
    2: { label: 'Partly Cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy', icon: '🌫️' },
    48: { label: 'Rime Fog', icon: '🌫️' },
    51: { label: 'Light Drizzle', icon: '🌦️' },
    53: { label: 'Moderate Drizzle', icon: '🌦️' },
    55: { label: 'Dense Drizzle', icon: '🌧️' },
    61: { label: 'Slight Rain', icon: '🌧️' },
    63: { label: 'Moderate Rain', icon: '🌧️' },
    65: { label: 'Heavy Rain', icon: '🌧️' },
    71: { label: 'Slight Snow', icon: '🌨️' },
    73: { label: 'Moderate Snow', icon: '🌨️' },
    75: { label: 'Heavy Snow', icon: '🌨️' },
    80: { label: 'Rain Showers', icon: '🌦️' },
    81: { label: 'Moderate Showers', icon: '🌧️' },
    82: { label: 'Violent Showers', icon: '⛈️' },
    95: { label: 'Thunderstorm', icon: '⛈️' }
  },

  init: function(options) {
    options = options || {};
    if (options.lat) this.lat = options.lat;
    if (options.lon) this.lon = options.lon;
    if (options.locationName) this.locationName = options.locationName;

    this.updateLocationLabel();
    var self = this;
    this.fetchWeather();
    setInterval(function() {
      self.fetchWeather();
    }, this.refreshInterval);
  },

  updateLocationLabel: function() {
    var el = document.getElementById('weatherLocationName');
    if (el) el.textContent = this.locationName;
  },

  fetchWeather: function() {
    var self = this;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + this.lat + '&longitude=' + this.lon + '&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&windspeed_unit=mph&timezone=auto';

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var data = JSON.parse(xhr.responseText);
              self.renderWeather(data);
            } catch (e) {
              console.warn('Weather JSON parse error', e);
            }
          } else {
            console.warn('Weather XHR error code: ' + xhr.status);
          }
        }
      };
      xhr.onerror = function(err) {
        console.warn('Weather network error:', err);
      };
      xhr.send();
    } catch (err) {
      console.warn('Weather fetch caught error:', err);
    }
  },

  renderWeather: function(data) {
    if (!data) return;
    var current = data.current_weather;
    var daily = data.daily;

    if (!current) return;

    // 1. Current Temperature
    var tempEl = document.getElementById('currentTemp');
    if (tempEl) tempEl.textContent = Math.round(current.temperature) + '°';

    // 2. Weather Icon & Condition
    var wmo = this.wmoCodeMap[current.weathercode] || { label: 'Fair', icon: '🌤️' };
    var iconEl = document.getElementById('weatherIcon');
    var conditionEl = document.getElementById('weatherCondition');
    if (iconEl) iconEl.textContent = wmo.icon;
    if (conditionEl) conditionEl.textContent = wmo.label;

    // 3. High / Low
    var tempRangeEl = document.getElementById('tempRange');
    if (tempRangeEl && daily && daily.temperature_2m_max && daily.temperature_2m_min) {
      var high = Math.round(daily.temperature_2m_max[0]);
      var low = Math.round(daily.temperature_2m_min[0]);
      tempRangeEl.textContent = high + '° / ' + low + '°';
    }

    // 4. Rain Chance
    var rainEl = document.getElementById('rainChance');
    if (rainEl && daily && daily.precipitation_probability_max) {
      var pop = daily.precipitation_probability_max[0] || 0;
      rainEl.textContent = pop + '%';
    }

    // 5. Wind Speed
    var windEl = document.getElementById('windSpeed');
    if (windEl) {
      windEl.textContent = Math.round(current.windspeed) + ' mph';
    }

    // 6. Updated time
    var updatedEl = document.getElementById('weatherUpdated');
    if (updatedEl) {
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var timeStr = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
      updatedEl.textContent = 'Updated ' + timeStr;
    }
  }
};
