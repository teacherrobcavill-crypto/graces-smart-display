/**
 * Clock & Greeting Engine for Grace's Smart Display
 * - Auto Bedtime Mode: 10:00 PM (22:00) every day
 * - Auto Wake / Main Screen: 06:00 AM Mon-Fri, 07:00 AM Sat-Sun
 * - Manual Moon Toggle & Touch-to-Wake overrides
 */
const ClockManager = {
  is24Hour: false,
  userName: 'Grace',
  bedtimeHour: 22,
  bedtimeMinute: 0,
  weekdayWakeHour: 6,
  weekdayWakeMinute: 0,
  weekendWakeHour: 7,
  weekendWakeMinute: 0,
  autoNightEnabled: true,
  _manualNightModeActive: false,
  _userDismissedNightMode: false,

  init(options = {}) {
    this.is24Hour = options.is24Hour ?? false;
    this.userName = options.userName || 'Grace';
    this.autoNightEnabled = options.autoNightEnabled ?? true;

    this.updateClock();
    // Run initial schedule check immediately on load
    this.checkNightSchedule(new Date());
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

    // 4. Auto-Night Schedule Check (every minute on second 0)
    if (this.autoNightEnabled && seconds === 0) {
      this.checkNightSchedule(now);
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
    } else if (timeVal >= 17 * 60 && timeVal < 22 * 60) {
      greeting = 'Good evening';
      emoji = '✨';
    } else {
      greeting = 'Sweet dreams';
      emoji = '🌙';
    }

    greetingText.textContent = `${greeting}, ${this.userName}`;
    if (greetingEmoji) greetingEmoji.textContent = emoji;
  },

  isNightTime(now = new Date()) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMins = hours * 60 + minutes;

    const bedtimeMins = this.bedtimeHour * 60 + this.bedtimeMinute; // 22:00 = 1320

    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6); // Sun = 0, Sat = 6
    const wakeHour = isWeekend ? this.weekendWakeHour : this.weekdayWakeHour;
    const wakeMinute = isWeekend ? this.weekendWakeMinute : this.weekdayWakeMinute;
    const wakeMins = wakeHour * 60 + wakeMinute; // 06:00 (360) or 07:00 (420)

    // Night spans across midnight from bedtime (22:00) until wake time (06:00/07:00)
    return currentMins >= bedtimeMins || currentMins < wakeMins;
  },

  checkNightSchedule(now = new Date()) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6);
    const wakeHour = isWeekend ? this.weekendWakeHour : this.weekdayWakeHour;
    const wakeMinute = isWeekend ? this.weekendWakeMinute : this.weekdayWakeMinute;

    // 1. Bedtime Trigger: 22:00 every day
    if (hours === this.bedtimeHour && minutes === this.bedtimeMinute) {
      this._userDismissedNightMode = false;
      this._manualNightModeActive = false;
      if (!document.body.classList.contains('night-mode-active')) {
        document.body.classList.add('night-mode-active');
      }
      return;
    }

    // 2. Morning Wake Trigger: 06:00 (Mon-Fri) or 07:00 (Sat-Sun)
    if (hours === wakeHour && minutes === wakeMinute) {
      this._userDismissedNightMode = false;
      this._manualNightModeActive = false;
      if (document.body.classList.contains('night-mode-active')) {
        document.body.classList.remove('night-mode-active');
      }
      return;
    }

    // 3. Steady State Check
    if (this._manualNightModeActive) {
      // User explicitly toggled mode on; respect user's manual choice
      return;
    }

    const isNight = this.isNightTime(now);

    if (isNight) {
      // Nighttime: if user has not tapped screen to dismiss, keep bedtime active
      if (!this._userDismissedNightMode && !document.body.classList.contains('night-mode-active')) {
        document.body.classList.add('night-mode-active');
      }
    } else {
      // Daytime: reset dismiss flag for tonight, keep main screen active
      this._userDismissedNightMode = false;
      if (document.body.classList.contains('night-mode-active')) {
        document.body.classList.remove('night-mode-active');
      }
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
