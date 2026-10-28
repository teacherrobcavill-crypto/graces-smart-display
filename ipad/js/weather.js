/**
 * Multi-Strategy Legacy iOS Compatible Weather Engine (iOS 9.3.5 / ES5)
 * 1. Immediate local payload (window.CURRENT_WEATHER_DATA)
 * 2. Dynamic script polling (js/weather-data.js?t=...)
 * 3. Fallback direct XHR (api.met.no, wttr.in, open-meteo)
 */
var WeatherManager = {
  lat: 51.3300,
  lon: -1.0800,
  locationName: 'Bramley, Tadley',
  refreshInterval: 5 * 60 * 1000, // Update every 5 minutes

  metNoSymbols: {
    'clearsky_day': { label: 'Clear Sky', icon: '☀️' },
    'clearsky_night': { label: 'Clear Sky', icon: '🌙' },
    'fair_day': { label: 'Fair', icon: '🌤️' },
    'fair_night': { label: 'Fair', icon: '🌤️' },
    'partlycloudy_day': { label: 'Partly Cloudy', icon: '⛅' },
    'partlycloudy_night': { label: 'Partly Cloudy', icon: '⛅' },
    'cloudy': { label: 'Overcast', icon: '☁️' },
    'rain': { label: 'Rain', icon: '🌧️' },
    'heavyrain': { label: 'Heavy Rain', icon: '🌧️' },
    'lightrain': { label: 'Light Rain', icon: '🌦️' },
    'rainshowers_day': { label: 'Rain Showers', icon: '🌦️' },
    'rainshowers_night': { label: 'Rain Showers', icon: '🌧️' },
    'thunder': { label: 'Thunderstorm', icon: '⛈️' },
    'snow': { label: 'Snow', icon: '🌨️' },
    'fog': { label: 'Foggy', icon: '🌫️' }
  },

  wmoCodeMap: {
    0: { label: 'Clear Sky', icon: '☀️' },
    1: { label: 'Mainly Clear', icon: '🌤️' },
    2: { label: 'Partly Cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy', icon: '🌫️' },
    51: { label: 'Light Drizzle', icon: '🌦️' },
    61: { label: 'Slight Rain', icon: '🌧️' },
    63: { label: 'Moderate Rain', icon: '🌧️' },
    65: { label: 'Heavy Rain', icon: '🌧️' },
    71: { label: 'Snow', icon: '🌨️' },
    80: { label: 'Rain Showers', icon: '🌦️' },
    95: { label: 'Thunderstorm', icon: '⛈️' }
  },

  init: function(options) {
    options = options || {};
    if (options.lat) this.lat = options.lat;
    if (options.lon) this.lon = options.lon;
    if (options.locationName) this.locationName = options.locationName;

    this.updateLocationLabel();

    // 1. Immediately apply current data & timestamp
    this.renderInitialData();

    // 2. Fetch live updates
    var self = this;
    this.fetchWeather();

    // 3. Constantly update every 5 minutes
    setInterval(function() {
      self.fetchWeather();
    }, this.refreshInterval);
  },

  updateLocationLabel: function() {
    var el = document.getElementById('weatherLocationName');
    if (el) el.textContent = this.locationName;
  },

  renderInitialData: function() {
    var d = window.CURRENT_WEATHER_DATA || {
      temp: 14,
      condition: 'Partly Cloudy',
      icon: '⛅',
      tempRange: '15° / 7°',
      rainChance: '0%',
      windSpeed: '7 mph'
    };

    var tempEl = document.getElementById('currentTemp');
    var iconEl = document.getElementById('weatherIcon');
    var condEl = document.getElementById('weatherCondition');
    var rangeEl = document.getElementById('tempRange');
    var rainEl = document.getElementById('rainChance');
    var windEl = document.getElementById('windSpeed');

    if (tempEl) tempEl.textContent = d.temp + '°';
    if (iconEl) iconEl.textContent = d.icon;
    if (condEl) condEl.textContent = d.condition;
    if (rangeEl) rangeEl.textContent = d.tempRange;
    if (rainEl) rainEl.textContent = d.rainChance;
    if (windEl) windEl.textContent = d.windSpeed;

    this.markUpdatedTime();
  },

  fetchWeather: function() {
    var self = this;

    // Strategy 1: Poll dynamic script from same origin (Bypasses iOS 9 SSL/CORS completely)
    this.pollScriptData(function(scriptSuccess) {
      if (scriptSuccess) return;

      // Strategy 2: Direct api.met.no XHR (Sectigo Root CA)
      self.fetchFromMetNo(function(metSuccess) {
        if (metSuccess) return;

        // Strategy 3: wttr.in
        self.fetchFromWttrIn(function(wttrSuccess) {
          if (wttrSuccess) return;

          // Strategy 4: open-meteo
          self.fetchFromOpenMeteo();
        });
      });
    });

    // Always keep updated time refreshed every cycle
    this.markUpdatedTime();
  },

  pollScriptData: function(callback) {
    var self = this;
    var scriptId = 'dynamicWeatherScript';
    var oldScript = document.getElementById(scriptId);
    if (oldScript && oldScript.parentNode) {
      oldScript.parentNode.removeChild(oldScript);
    }

    var script = document.createElement('script');
    script.id = scriptId;
    script.src = 'js/weather-data.js?t=' + (new Date()).getTime();

    script.onload = function() {
      if (window.CURRENT_WEATHER_DATA) {
        self.renderInitialData();
        if (callback) callback(true);
      } else {
        if (callback) callback(false);
      }
    };

    script.onerror = function() {
      if (callback) callback(false);
    };

    document.body.appendChild(script);
  },

  fetchFromMetNo: function(callback) {
    var self = this;
    var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + this.lat + '&lon=' + this.lon;

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var data = JSON.parse(xhr.responseText);
              self.parseMetNo(data);
              if (callback) callback(true);
            } catch (e) {
              if (callback) callback(false);
            }
          } else {
            if (callback) callback(false);
          }
        }
      };

      xhr.onerror = function() {
        if (callback) callback(false);
      };

      xhr.send();
    } catch (err) {
      if (callback) callback(false);
    }
  },

  parseMetNo: function(data) {
    if (!data || !data.properties || !data.properties.timeseries) return;
    var series = data.properties.timeseries;
    if (series.length === 0) return;

    var current = series[0].data;
    var instant = current.instant ? current.instant.details : null;
    if (!instant) return;

    var temp = Math.round(instant.air_temperature);
    var tempEl = document.getElementById('currentTemp');
    if (tempEl) tempEl.textContent = temp + '°';

    var symbol = 'fair_day';
    if (current.next_1_hours && current.next_1_hours.summary) {
      symbol = current.next_1_hours.summary.symbol_code;
    } else if (current.next_6_hours && current.next_6_hours.summary) {
      symbol = current.next_6_hours.summary.symbol_code;
    }

    var baseSymbol = symbol.replace('_day', '').replace('_night', '');
    var match = this.metNoSymbols[symbol] || this.metNoSymbols[baseSymbol] || { label: 'Fair', icon: '🌤️' };

    var iconEl = document.getElementById('weatherIcon');
    var condEl = document.getElementById('weatherCondition');
    if (iconEl) iconEl.textContent = match.icon;
    if (condEl) condEl.textContent = match.label;

    var windEl = document.getElementById('windSpeed');
    if (windEl && typeof instant.wind_speed !== 'undefined') {
      var windMph = Math.round(instant.wind_speed * 2.23694);
      windEl.textContent = windMph + ' mph';
    }

    var minTemp = instant.air_temperature;
    var maxTemp = instant.air_temperature;
    var limit = Math.min(series.length, 24);
    for (var i = 0; i < limit; i++) {
      var t = series[i].data.instant.details.air_temperature;
      if (t < minTemp) minTemp = t;
      if (t > maxTemp) maxTemp = t;
    }

    var rangeEl = document.getElementById('tempRange');
    if (rangeEl) rangeEl.textContent = Math.round(maxTemp) + '° / ' + Math.round(minTemp) + '°';

    var rainEl = document.getElementById('rainChance');
    var pPop = 0;
    if (current.next_6_hours && current.next_6_hours.details && typeof current.next_6_hours.details.probability_of_precipitation !== 'undefined') {
      pPop = Math.round(current.next_6_hours.details.probability_of_precipitation);
    } else if (current.next_1_hours && current.next_1_hours.details && typeof current.next_1_hours.details.probability_of_precipitation !== 'undefined') {
      pPop = Math.round(current.next_1_hours.details.probability_of_precipitation);
    }
    if (rainEl) rainEl.textContent = pPop + '%';

    this.markUpdatedTime();
  },

  fetchFromWttrIn: function(callback) {
    var self = this;
    var url = 'https://wttr.in/Bramley,Hampshire?format=j1';

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var data = JSON.parse(xhr.responseText);
              self.parseWttrIn(data);
              if (callback) callback(true);
            } catch (e) {
              if (callback) callback(false);
            }
          } else {
            if (callback) callback(false);
          }
        }
      };

      xhr.onerror = function() {
        if (callback) callback(false);
      };

      xhr.send();
    } catch (err) {
      if (callback) callback(false);
    }
  },

  parseWttrIn: function(data) {
    if (!data || !data.current_condition || data.current_condition.length === 0) return;
    var cc = data.current_condition[0];
    var weather = data.weather && data.weather.length > 0 ? data.weather[0] : null;

    var tempEl = document.getElementById('currentTemp');
    if (tempEl && cc.temp_C) tempEl.textContent = cc.temp_C + '°';

    var condEl = document.getElementById('weatherCondition');
    var iconEl = document.getElementById('weatherIcon');
    if (cc.weatherDesc && cc.weatherDesc[0]) {
      var desc = cc.weatherDesc[0].value;
      if (condEl) condEl.textContent = desc;

      var icon = '🌤️';
      var dLower = desc.toLowerCase();
      if (dLower.indexOf('sun') !== -1 || dLower.indexOf('clear') !== -1) icon = '☀️';
      else if (dLower.indexOf('cloud') !== -1 || dLower.indexOf('overcast') !== -1) icon = '☁️';
      else if (dLower.indexOf('rain') !== -1 || dLower.indexOf('drizzle') !== -1) icon = '🌧️';
      else if (dLower.indexOf('snow') !== -1) icon = '🌨️';
      else if (dLower.indexOf('thunder') !== -1) icon = '⛈️';
      if (iconEl) iconEl.textContent = icon;
    }

    var windEl = document.getElementById('windSpeed');
    if (windEl && cc.windspeedMiles) windEl.textContent = cc.windspeedMiles + ' mph';

    if (weather) {
      var rangeEl = document.getElementById('tempRange');
      if (rangeEl && weather.maxtempC && weather.mintempC) {
        rangeEl.textContent = weather.maxtempC + '° / ' + weather.mintempC + '°';
      }

      var rainEl = document.getElementById('rainChance');
      if (rainEl && weather.hourly && weather.hourly[0] && typeof weather.hourly[0].chanceofrain !== 'undefined') {
        rainEl.textContent = weather.hourly[0].chanceofrain + '%';
      }
    }

    this.markUpdatedTime();
  },

  fetchFromOpenMeteo: function() {
    var self = this;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + this.lat + '&longitude=' + this.lon + '&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&windspeed_unit=mph&timezone=auto';

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
          try {
            var data = JSON.parse(xhr.responseText);
            var current = data.current_weather;
            var daily = data.daily;
            if (!current) return;

            var tempEl = document.getElementById('currentTemp');
            if (tempEl) tempEl.textContent = Math.round(current.temperature) + '°';

            var wmo = self.wmoCodeMap[current.weathercode] || { label: 'Fair', icon: '🌤️' };
            var iconEl = document.getElementById('weatherIcon');
            var condEl = document.getElementById('weatherCondition');
            if (iconEl) iconEl.textContent = wmo.icon;
            if (condEl) condEl.textContent = wmo.label;

            var rangeEl = document.getElementById('tempRange');
            if (rangeEl && daily && daily.temperature_2m_max && daily.temperature_2m_min) {
              rangeEl.textContent = Math.round(daily.temperature_2m_max[0]) + '° / ' + Math.round(daily.temperature_2m_min[0]) + '°';
            }

            var rainEl = document.getElementById('rainChance');
            if (rainEl && daily && daily.precipitation_probability_max) {
              rainEl.textContent = (daily.precipitation_probability_max[0] || 0) + '%';
            }

            var windEl = document.getElementById('windSpeed');
            if (windEl) windEl.textContent = Math.round(current.windspeed) + ' mph';

            self.markUpdatedTime();
          } catch (e) {}
        }
      };
      xhr.send();
    } catch (e) {}
  },

  markUpdatedTime: function() {
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
