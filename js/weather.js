/**
 * Weather Engine for Bramley & Tadley using Open-Meteo (No API key needed)
 */
const WeatherManager = {
  lat: 51.3300,
  lon: -1.0800,
  locationName: 'Bramley, Tadley',
  refreshInterval: 20 * 60 * 1000, // 20 minutes

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
    77: { label: 'Snow Grains', icon: '🌨️' },
    80: { label: 'Rain Showers', icon: '🌦️' },
    81: { label: 'Moderate Showers', icon: '🌧️' },
    82: { label: 'Violent Showers', icon: '⛈️' },
    85: { label: 'Snow Showers', icon: '🌨️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm with Hail', icon: '⛈️' },
    99: { label: 'Heavy Hail Storm', icon: '⛈️' }
  },

  init(options = {}) {
    if (options.lat) this.lat = options.lat;
    if (options.lon) this.lon = options.lon;
    if (options.locationName) this.locationName = options.locationName;

    this.updateLocationLabel();
    this.fetchWeather();
    setInterval(() => this.fetchWeather(), this.refreshInterval);
  },

  updateLocationLabel() {
    const el = document.getElementById('weatherLocationName');
    if (el) el.textContent = this.locationName;
  },

  async fetchWeather() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&windspeed_unit=mph&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.renderWeather(data);
    } catch (err) {
      console.warn('Weather fetch failed, will retry:', err);
      const conditionEl = document.getElementById('weatherCondition');
      if (conditionEl && conditionEl.textContent.includes('Loading')) {
        conditionEl.textContent = 'Weather updating...';
      }
    }
  },

  renderWeather(data) {
    const current = data.current_weather;
    const daily = data.daily;

    if (!current) return;

    // 1. Current Temperature
    const tempEl = document.getElementById('currentTemp');
    if (tempEl) tempEl.textContent = `${Math.round(current.temperature)}°`;

    // 2. Weather Code & Icon
    const wmo = this.wmoCodeMap[current.weathercode] || { label: 'Fair', icon: '🌤️' };
    const iconEl = document.getElementById('weatherIcon');
    const conditionEl = document.getElementById('weatherCondition');
    if (iconEl) iconEl.textContent = wmo.icon;
    if (conditionEl) conditionEl.textContent = wmo.label;

    // 3. High / Low
    const tempRangeEl = document.getElementById('tempRange');
    if (tempRangeEl && daily && daily.temperature_2m_max && daily.temperature_2m_min) {
      const high = Math.round(daily.temperature_2m_max[0]);
      const low = Math.round(daily.temperature_2m_min[0]);
      tempRangeEl.textContent = `${high}° / ${low}°`;
    }

    // 4. Rain Chance
    const rainEl = document.getElementById('rainChance');
    if (rainEl && daily && daily.precipitation_probability_max) {
      const pop = daily.precipitation_probability_max[0] || 0;
      rainEl.textContent = `${pop}%`;
    }

    // 5. Wind Speed
    const windEl = document.getElementById('windSpeed');
    if (windEl) {
      windEl.textContent = `${Math.round(current.windspeed)} mph`;
    }

    // 6. Updated time
    const updatedEl = document.getElementById('weatherUpdated');
    if (updatedEl) {
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      updatedEl.textContent = `Updated ${timeStr}`;
    }
  }
};
