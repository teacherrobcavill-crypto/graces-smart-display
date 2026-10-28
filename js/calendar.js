/**
 * Apple Family Calendar Engine for Grace's Smart Display
 * - Loads and parses Family.ics / family.json (shared to gracecavill@icloud.com)
 * - Identifies Today's and Upcoming events
 * - Formats dates, times, and recurrence
 * - Voice integrated with Alexa
 */
const CalendarManager = {
  events: [],
  upcomingEvents: [],

  init() {
    this.loadCalendar();
    // Refresh calendar view every 30 minutes
    setInterval(() => this.loadCalendar(), 30 * 60 * 1000);
  },

  async loadCalendar() {
    try {
      // 1. Try loading pre-parsed family.json
      const response = await fetch('data/family.json');
      if (response.ok) {
        this.events = await response.json();
        this.processEvents();
        return;
      }
    } catch (e) {
      console.debug('Direct JSON fetch fallback to ICS parser');
    }

    try {
      // 2. Fallback to family.ics
      const icsRes = await fetch('data/family.ics');
      if (icsRes.ok) {
        const icsText = await icsRes.text();
        this.parseICS(icsText);
        this.processEvents();
      }
    } catch (err) {
      console.warn('Could not load calendar data:', err);
    }
  },

  parseICS(icsText) {
    const rawEvents = icsText.split('BEGIN:VEVENT');
    this.events = [];

    for (let i = 1; i < rawEvents.length; i++) {
      const block = rawEvents[i];
      const summaryMatch = block.match(/SUMMARY:(.*)/);
      const startMatch = block.match(/DTSTART.*?:(\d{8}(?:T\d{6})?)/);
      const endMatch = block.match(/DTEND.*?:(\d{8}(?:T\d{6})?)/);
      const rruleMatch = block.match(/RRULE:(.*)/);
      const locMatch = block.match(/LOCATION:(.*)/);

      if (summaryMatch && startMatch) {
        this.events.push({
          title: summaryMatch[1].trim(),
          start: startMatch[1].trim(),
          end: endMatch ? endMatch[1].trim() : '',
          rrule: rruleMatch ? rruleMatch[1].trim() : '',
          location: locMatch ? locMatch[1].trim() : ''
        });
      }
    }
  },

  processEvents() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentDate = now.getDate();

    const startOfToday = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
    const endWindow = new Date(startOfToday.getTime() + 35 * 24 * 60 * 60 * 1000); // Look ahead 35 days (5 weeks)

    const processed = [];

    this.events.forEach(ev => {
      const parsedStart = this.parseDateString(ev.start);
      if (!parsedStart) return;

      // Handle YEARLY recurrence (e.g. Birthdays like Angi, Bob, Melob)
      if (ev.rrule && ev.rrule.includes('FREQ=YEARLY')) {
        const evThisYear = new Date(currentYear, parsedStart.getMonth(), parsedStart.getDate(), parsedStart.getHours(), parsedStart.getMinutes());
        if (evThisYear >= startOfToday && evThisYear <= endWindow) {
          processed.push({
            title: ev.title,
            date: evThisYear,
            isAllDay: !ev.start.includes('T'),
            location: ev.location
          });
        }
      } else {
        // Direct event
        if (parsedStart >= startOfToday && parsedStart <= endWindow) {
          processed.push({
            title: ev.title,
            date: parsedStart,
            isAllDay: !ev.start.includes('T'),
            location: ev.location
          });
        }
      }
    });

    // Sort by date ascending
    processed.sort((a, b) => a.date - b.date);

    // Deduplicate same title on same day
    const unique = [];
    const seen = new Set();
    processed.forEach(item => {
      const key = `${item.title}_${item.date.toDateString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    this.upcomingEvents = unique.slice(0, 25); // Show up to 25 upcoming events
    this.renderCalendar();
  },

  parseDateString(dtStr) {
    if (!dtStr || dtStr.length < 8) return null;
    const year = parseInt(dtStr.substring(0, 4), 10);
    const month = parseInt(dtStr.substring(4, 6), 10) - 1;
    const day = parseInt(dtStr.substring(6, 8), 10);

    let hours = 0;
    let minutes = 0;

    if (dtStr.includes('T') && dtStr.length >= 13) {
      hours = parseInt(dtStr.substring(9, 11), 10);
      minutes = parseInt(dtStr.substring(11, 13), 10);
    }

    return new Date(year, month, day, hours, minutes);
  },

  renderCalendar() {
    const list = document.getElementById('calendarEventsList');
    if (!list) return;

    if (this.upcomingEvents.length === 0) {
      list.innerHTML = `
        <div class="no-events-msg">
          <span>✨</span>
          <span>No upcoming family events scheduled this week</span>
        </div>
      `;
      return;
    }

    const now = new Date();
    const todayStr = now.toDateString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toDateString();

    list.innerHTML = '';
    this.upcomingEvents.forEach(item => {
      const row = document.createElement('div');
      row.className = 'calendar-event-item';

      let dateBadge = '';
      let badgeClass = 'badge-upcoming';

      if (item.date.toDateString() === todayStr) {
        dateBadge = 'Today';
        badgeClass = 'badge-today';
      } else if (item.date.toDateString() === tomorrowStr) {
        dateBadge = 'Tomorrow';
        badgeClass = 'badge-tomorrow';
      } else {
        dateBadge = item.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }

      let timeStr = 'All Day';
      if (!item.isAllDay && (item.date.getHours() !== 0 || item.date.getMinutes() !== 0)) {
        timeStr = item.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }

      row.innerHTML = `
        <div class="event-date-col">
          <span class="event-badge ${badgeClass}">${dateBadge}</span>
          <span class="event-time">${timeStr}</span>
        </div>
        <div class="event-info-col">
          <div class="event-title">${item.title}</div>
          ${item.location ? `<div class="event-location">📍 ${item.location}</div>` : ''}
        </div>
      `;
      list.appendChild(row);
    });
  },

  getUpcomingSummary() {
    if (this.upcomingEvents.length === 0) {
      return "There are no family events scheduled for the next few days.";
    }
    const first = this.upcomingEvents[0];
    const dateStr = first.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return `Your next family event is ${first.title} on ${dateStr}.`;
  }
};
