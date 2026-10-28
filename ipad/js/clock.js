/**
 * Legacy iOS Compatible Clock Engine (iOS 9+ / ES5)
 */
var ClockManager = {
  is24Hour: false,
  userName: 'Rob',
  nightStartHour: 21,
  nightStartMinute: 30,
  nightEndHour: 7,
  nightEndMinute: 0,
  autoNightEnabled: true,
  _greetingInitialized: false,
  _userDismissedNightMode: false,

  init: function(options) {
    options = options || {};
    this.is24Hour = typeof options.is24Hour !== 'undefined' ? options.is24Hour : false;
    this.userName = options.userName || 'Rob';
    this.autoNightEnabled = typeof options.autoNightEnabled !== 'undefined' ? options.autoNightEnabled : true;

    var self = this;
    this.updateClock();
    setInterval(function() {
      self.updateClock();
    }, 1000);
  },

  updateClock: function() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();

    var period = '';
    var displayHours = hours;

    if (!this.is24Hour) {
      period = hours >= 12 ? 'PM' : 'AM';
      displayHours = hours % 12 || 12;
    }

    var minStr = minutes < 10 ? '0' + minutes : '' + minutes;
    var hourStr = this.is24Hour && displayHours < 10 ? '0' + displayHours : '' + displayHours;
    var formattedTime = hourStr + ':' + minStr;

    var clockDisplay = document.getElementById('clockDisplay');
    var clockPeriod = document.getElementById('clockPeriod');
    if (clockDisplay) clockDisplay.textContent = formattedTime;
    if (clockPeriod) {
      clockPeriod.textContent = period;
      clockPeriod.style.display = this.is24Hour ? 'none' : 'inline-block';
    }

    var nightClock = document.getElementById('nightClock');
    if (nightClock) nightClock.textContent = formattedTime;

    // Date
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var dateStr = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()];

    var dateDisplay = document.getElementById('dateDisplay');
    var nightDate = document.getElementById('nightDate');
    if (dateDisplay) dateDisplay.textContent = dateStr;
    if (nightDate) nightDate.textContent = dateStr;

    if (seconds === 0 || !this._greetingInitialized) {
      this.updateGreeting(hours, minutes);
      this._greetingInitialized = true;
    }

    if (this.autoNightEnabled && seconds === 0) {
      this.checkNightSchedule(hours, minutes);
    }
  },

  updateGreeting: function(hours, minutes) {
    var greetingText = document.getElementById('greetingText');
    var greetingEmoji = document.getElementById('greetingEmoji');
    if (!greetingText) return;

    var timeVal = hours * 60 + minutes;
    var greeting = 'Hello';
    var emoji = '✨';

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

    greetingText.textContent = greeting + ', ' + this.userName;
    if (greetingEmoji) greetingEmoji.textContent = emoji;
  },

  checkNightSchedule: function(hours, minutes) {
    var current = hours * 60 + minutes;
    var start = this.nightStartHour * 60 + this.nightStartMinute;
    var end = this.nightEndHour * 60 + this.nightEndMinute;

    var isNight = start > end ? (current >= start || current < end) : (current >= start && current < end);

    if (isNight && !document.body.classList.contains('night-mode-active') && !this._userDismissedNightMode) {
      document.body.classList.add('night-mode-active');
    } else if (!isNight && document.body.classList.contains('night-mode-active')) {
      document.body.classList.remove('night-mode-active');
      this._userDismissedNightMode = false;
    }
  },

  dismissNightModeTemporarily: function() {
    this._userDismissedNightMode = true;
    document.body.classList.remove('night-mode-active');
  }
};
