/**
 * Legacy iOS Compatible Apple Family Calendar Engine (ES5)
 */
var CalendarManager = {
  events: [],
  upcomingEvents: [],

  init: function() {
    this.loadCalendar();
    var self = this;
    // Refresh calendar every 5 minutes to pick up additions/deletions
    setInterval(function() {
      self.loadCalendar();
    }, 5 * 60 * 1000);
  },

  loadCalendar: function() {
    var self = this;

    // 1. Render immediately if already present
    if (window.EMBEDDED_FAMILY_EVENTS && window.EMBEDDED_FAMILY_EVENTS.length > 0) {
      this.events = window.EMBEDDED_FAMILY_EVENTS;
      this.processEvents();
    }

    // 2. Dynamically reload fresh data.js to catch any deleted/added events
    var scriptId = 'dynamicCalendarDataScript';
    var oldScript = document.getElementById(scriptId);
    if (oldScript && oldScript.parentNode) {
      oldScript.parentNode.removeChild(oldScript);
    }

    var script = document.createElement('script');
    script.id = scriptId;
    script.src = 'js/data.js?t=' + (new Date()).getTime();
    script.onload = function() {
      if (window.EMBEDDED_FAMILY_EVENTS) {
        self.events = window.EMBEDDED_FAMILY_EVENTS;
        self.processEvents();
      }
    };
    document.body.appendChild(script);
  },

  processEvents: function() {
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth();
    var currentDate = now.getDate();

    var startOfToday = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
    var endWindow = new Date(startOfToday.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 days

    var processed = [];

    for (var i = 0; i < this.events.length; i++) {
      var ev = this.events[i];
      var parsedStart = this.parseDateString(ev.start);
      if (!parsedStart) continue;

      if (ev.rrule && ev.rrule.indexOf('FREQ=YEARLY') !== -1) {
        var evThisYear = new Date(currentYear, parsedStart.getMonth(), parsedStart.getDate(), parsedStart.getHours(), parsedStart.getMinutes());
        if (evThisYear >= startOfToday && evThisYear <= endWindow) {
          processed.push({
            title: ev.title,
            date: evThisYear,
            isAllDay: ev.start.indexOf('T') === -1,
            location: ev.location
          });
        }
      } else {
        if (parsedStart >= startOfToday && parsedStart <= endWindow) {
          processed.push({
            title: ev.title,
            date: parsedStart,
            isAllDay: ev.start.indexOf('T') === -1,
            location: ev.location
          });
        }
      }
    }

    processed.sort(function(a, b) {
      return a.date - b.date;
    });

    var unique = [];
    var seen = {};
    for (var j = 0; j < processed.length; j++) {
      var item = processed[j];
      var key = item.title + '_' + item.date.toDateString();
      if (!seen[key]) {
        seen[key] = true;
        unique.push(item);
      }
    }

    this.upcomingEvents = unique.slice(0, 30);
    this.renderCalendar();
  },

  parseDateString: function(dtStr) {
    if (!dtStr || dtStr.length < 8) return null;
    var year = parseInt(dtStr.substring(0, 4), 10);
    var month = parseInt(dtStr.substring(4, 6), 10) - 1;
    var day = parseInt(dtStr.substring(6, 8), 10);

    var hours = 0;
    var minutes = 0;

    if (dtStr.indexOf('T') !== -1 && dtStr.length >= 13) {
      hours = parseInt(dtStr.substring(9, 11), 10);
      minutes = parseInt(dtStr.substring(11, 13), 10);
    }

    return new Date(year, month, day, hours, minutes);
  },

  renderCalendar: function() {
    var list = document.getElementById('calendarEventsList');
    if (!list) return;

    if (this.upcomingEvents.length === 0) {
      list.innerHTML = '<div class="no-events-msg"><span>✨</span><span>No upcoming family events scheduled this month</span></div>';
      return;
    }

    var now = new Date();
    var todayStr = now.toDateString();
    var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    var tomorrowStr = tomorrow.toDateString();

    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var html = '';
    for (var i = 0; i < this.upcomingEvents.length; i++) {
      var item = this.upcomingEvents[i];

      var dateBadge = '';
      var badgeClass = 'badge-upcoming';

      if (item.date.toDateString() === todayStr) {
        dateBadge = 'Today';
        badgeClass = 'badge-today';
      } else if (item.date.toDateString() === tomorrowStr) {
        dateBadge = 'Tomorrow';
        badgeClass = 'badge-tomorrow';
      } else {
        dateBadge = days[item.date.getDay()] + ', ' + item.date.getDate() + ' ' + months[item.date.getMonth()];
      }

      var timeStr = 'All Day';
      if (!item.isAllDay && (item.date.getHours() !== 0 || item.date.getMinutes() !== 0)) {
        var h = item.date.getHours();
        var m = item.date.getMinutes();
        timeStr = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
      }

      html += '<div class="calendar-event-item">' +
                '<div class="event-date-col">' +
                  '<span class="event-badge ' + badgeClass + '">' + dateBadge + '</span>' +
                  '<span class="event-time">' + timeStr + '</span>' +
                '</div>' +
                '<div class="event-info-col">' +
                  '<div class="event-title">' + item.title + '</div>' +
                  (item.location ? '<div class="event-location">📍 ' + item.location + '</div>' : '') +
                '</div>' +
              '</div>';
    }

    list.innerHTML = html;
  }
};
