/**
 * Clock & Greeting Engine for Grace's Smart Display
 */
const ClockManager = {
  is24Hour: false,
  userName: 'Grace',
  nightStartHour: 21,
  nightStartMinute: 30,
  nightEndHour: 7,
  nightEndMinute: 0,
  autoNightEnabled: true,
  _manualNightModeActive: false,
  _userDismissedNightMode: false,

  init(options = {}) {
    this.is24Hour = options.is24Hour ?? false;
    this.userName = options.userName || 'Grace';
    this.autoNightEnabled = options.autoNightEnabled ?? true;

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  },

  updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // 1. Time string
    let period = '';
    let displayHours = hours;

    if (!this.is24Hour) {
      period = hours >= 12 ? 'PM' : 'AM';
      displayHours = hours % 12 || 12;
    }

    const formattedTime = `${String(displayHours).padStart(this.is24Hour ? 2 : 1, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Update main clock
    const clockDisplay = document.getElementById('clockDisplay');
    const clockPeriod = document.getElementById('clockPeriod');
    if (clockDisplay) clockDisplay.textContent = formattedTime;
    if (clockPeriod) {
      clockPeriod.textContent = period;
      clockPeriod.style.display = this.is24Hour ? 'none' : 'inline-block';
    }

    // Update night clock
    const nightClock = document.getElementById('nightClock');
    const nightPeriod = document.getElementById('nightPeriod');
    if (nightClock) nightClock.textContent = formattedTime;
    if (nightPeriod) {
      nightPeriod.textContent = period;
      nightPeriod.style.display = this.is24Hour ? 'none' : 'inline-block';
    }

    // 2. Date string (e.g. Wednesday, 28 October)
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = now.toLocaleDateString('en-GB', options);

    const dateDisplay = document.getElementById('dateDisplay');
    const nightDate = document.getElementById('nightDate');
    if (dateDisplay) dateDisplay.textContent = dateStr;
    if (nightDate) nightDate.textContent = dateStr;

    // 3. Dynamic Greeting (runs once a minute on second 0)
    if (seconds === 0 || !this._greetingInitialized) {
      this.updateGreeting(hours, minutes);
      this._greetingInitialized = true;
    }

    // 4. Auto-Night Schedule Check
    if (this.autoNightEnabled && seconds === 0) {
      this.checkNightSchedule(hours, minutes);
    }
  },

  updateGreeting(hours, minutes) {
    const greetingText = document.getElementById('greetingText');
    const greetingEmoji = document.getElementById('greetingEmoji');
    if (!greetingText) return;

    const timeVal = hours * 60 + minutes;
    let greeting = 'Hello';
    let emoji = '✨';

    if (timeVal >= 5 * 60 && timeVal < 12 * 60) {
      greeting = 'Good morning';
      emoji = '🌸';
    } else if (timeVal >= 12 * 60 && timeVal < 17 * 60) {
      greeting = 'Good afternoon';
      emoji = '☀️';
    } else if (timeVal >= 17 * 60 && timeVal < 21 * 60 + 30) {
      greeting = 'Good evening';
      emoji = '✨';
    } else {
      greeting = 'Sweet dreams';
      emoji = '🌙';
    }

    greetingText.textContent = `${greeting}, ${this.userName}`;
    if (greetingEmoji) greetingEmoji.textContent = emoji;
  },

  checkNightSchedule(hours, minutes) {
    if (this._manualNightModeActive) return;

    const current = hours * 60 + minutes;
    const start = this.nightStartHour * 60 + this.nightStartMinute; // e.g. 21:30 = 1290
    const end = this.nightEndHour * 60 + this.nightEndMinute;       // e.g. 07:00 = 420

    const isNight = start > end ? (current >= start || current < end) : (current >= start && current < end);

    if (isNight && !document.body.classList.contains('night-mode-active') && !this._userDismissedNightMode) {
      document.body.classList.add('night-mode-active');
    } else if (!isNight && document.body.classList.contains('night-mode-active') && !this._manualNightModeActive) {
      document.body.classList.remove('night-mode-active');
      this._userDismissedNightMode = false;
    }
  },

  enterNightMode() {
    this._manualNightModeActive = true;
    this._userDismissedNightMode = false;
    document.body.classList.add('night-mode-active');
    this.updateClock();
  },

  exitNightMode() {
    this._manualNightModeActive = false;
    this._userDismissedNightMode = true;
    document.body.classList.remove('night-mode-active');
  },

  dismissNightModeTemporarily() {
    this.exitNightMode();
  }
};
