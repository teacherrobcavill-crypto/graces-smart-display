/**
 * Apple Calendar Engine for Grace's Smart Display
 * - Loads and parses Family & Grace calendars (from data/family.json)
 * - Identifies Today's and Upcoming events
 * - Shows distinct badges & colors for Family vs Grace events
 * - Allows creating new events directly for Grace's Calendar
 * - Persists local custom events in LocalStorage and merges with live iCloud
 * - Formats dates, times, and recurrence
 * - Voice integrated with Alexa
 */
const CalendarManager = {
  events: [],
  upcomingEvents: [],
  STORAGE_KEY_CUSTOM_EVENTS: 'graces_local_custom_events_v1',

  init() {
    this.loadCalendar();
    this.initNewEventModal();
    // Refresh calendar view every 5 minutes
    setInterval(() => this.loadCalendar(), 5 * 60 * 1000);
  },

  async loadCalendar() {
    let fetched = [];
    try {
      // 1. Try loading combined family.json with cache buster
      const response = await fetch('data/family.json?t=' + Date.now());
      if (response.ok) {
        fetched = await response.json();
      }
    } catch (e) {
      console.debug('Direct JSON fetch fallback to ICS parser');
    }

    if (!fetched || fetched.length === 0) {
      try {
        // 2. Fallback to raw ICS files if JSON fetch fails
        this.events = [];
        const famRes = await fetch('data/family.ics?t=' + Date.now());
        if (famRes.ok) {
          const icsText = await famRes.text();
          this.parseICS(icsText, 'Family', '#FF9500', true);
        }
        try {
          const graceRes = await fetch('data/grace.ics?t=' + Date.now());
          if (graceRes.ok) {
            const graceText = await graceRes.text();
            this.parseICS(graceText, 'Grace', '#83D754', false);
          }
        } catch (e) {}

        fetched = this.events;
      } catch (err) {
        console.warn('Could not load calendar data:', err);
      }
    }

    // Merge fetched iCloud events with user-created local custom events
    const custom = this.getLocalCustomEvents();
    this.events = [...(fetched || []), ...custom];
    this.processEvents();
  },

  parseICS(icsText, calName = 'Family', calColor = '#FF9500', reset = true) {
    const rawEvents = icsText.split('BEGIN:VEVENT');
    if (reset) {
      this.events = [];
    }

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
          location: locMatch ? locMatch[1].trim() : '',
          calendar: calName,
          color: calColor
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

      const calName = ev.calendar || 'Family';
      const calColor = ev.color || (calName.toLowerCase() === 'grace' ? '#83D754' : '#FF9500');

      // Check UNTIL date if recurring
      if (ev.rrule && ev.rrule.includes('UNTIL=')) {
        const untilMatch = ev.rrule.match(/UNTIL=(\d{8}(?:T\d{6}Z?)?)/);
        if (untilMatch) {
          const untilDate = this.parseDateString(untilMatch[1]);
          if (untilDate && untilDate < startOfToday) {
            return; // Expired recurring event
          }
        }
      }

      // Handle YEARLY recurrence (e.g. Birthdays like Angi, Bob, Melob)
      if (ev.rrule && ev.rrule.includes('FREQ=YEARLY')) {
        const evThisYear = new Date(currentYear, parsedStart.getMonth(), parsedStart.getDate(), parsedStart.getHours(), parsedStart.getMinutes());
        if (evThisYear >= startOfToday && evThisYear <= endWindow) {
          processed.push({
            id: ev.id,
            isCustom: ev.isCustom || false,
            title: ev.title,
            date: evThisYear,
            isAllDay: !ev.start.includes('T'),
            location: ev.location,
            calendar: calName,
            color: calColor
          });
        }
      } else if (ev.rrule && ev.rrule.includes('FREQ=WEEKLY')) {
        let iter = new Date(parsedStart);
        while (iter < endWindow) {
          if (iter >= startOfToday) {
            processed.push({
              id: ev.id,
              isCustom: ev.isCustom || false,
              title: ev.title,
              date: new Date(iter),
              isAllDay: !ev.start.includes('T'),
              location: ev.location,
              calendar: calName,
              color: calColor
            });
          }
          iter = new Date(iter.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else {
        // Direct event
        if (parsedStart >= startOfToday && parsedStart <= endWindow) {
          processed.push({
            id: ev.id,
            isCustom: ev.isCustom || false,
            title: ev.title,
            date: parsedStart,
            isAllDay: !ev.start.includes('T'),
            location: ev.location,
            calendar: calName,
            color: calColor
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
      const key = `${(item.calendar || '').toLowerCase()}_${item.title.trim().toLowerCase()}_${item.date.toDateString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    this.upcomingEvents = unique.slice(0, 30); // Show up to 30 upcoming events
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
          <span>No upcoming events scheduled this month</span>
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
      if (item.color) {
        row.style.borderLeftColor = item.color;
      }

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

      const calTagClass = item.calendar && item.calendar.toLowerCase() === 'grace' ? 'tag-grace' : 'tag-family';

      row.innerHTML = `
        <div class="event-date-col">
          <span class="event-badge ${badgeClass}">${dateBadge}</span>
          <span class="event-time">${timeStr}</span>
        </div>
        <div class="event-info-col">
          <div class="event-title-row">
            <span class="event-title">${item.title}</span>
            <span class="event-cal-tag ${calTagClass}">${item.calendar || 'Family'}</span>
          </div>
          ${item.location ? `<div class="event-location">📍 ${item.location}</div>` : ''}
        </div>
        ${item.isCustom ? `<button class="event-delete-btn" type="button" data-event-id="${item.id}" title="Remove event" aria-label="Remove event">&times;</button>` : ''}
      `;
      list.appendChild(row);
    });

    // Attach delete listeners for custom events
    list.querySelectorAll('.event-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-event-id');
        if (id && confirm('Remove this event from Grace\'s calendar?')) {
          this.deleteCustomEvent(id);
        }
      });
    });
  },

  getUpcomingSummary() {
    if (this.upcomingEvents.length === 0) {
      return "There are no events scheduled for the next few days.";
    }
    const first = this.upcomingEvents[0];
    const dateStr = first.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return `Your next event is ${first.title} on ${dateStr}.`;
  },

  /* -------------------------------------------------------------
     Custom Event Persistence & Management
     ------------------------------------------------------------- */
  getLocalCustomEvents() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CUSTOM_EVENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveLocalCustomEvents(list) {
    try {
      localStorage.setItem(this.STORAGE_KEY_CUSTOM_EVENTS, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },

  addCustomEvent(eventObj) {
    const list = this.getLocalCustomEvents();
    list.push(eventObj);
    this.saveLocalCustomEvents(list);

    this.events.push(eventObj);
    this.processEvents();
  },

  deleteCustomEvent(id) {
    let list = this.getLocalCustomEvents();
    list = list.filter(e => e.id !== id);
    this.saveLocalCustomEvents(list);

    this.events = this.events.filter(e => e.id !== id);
    this.processEvents();
    this.showToast('Event removed from Grace\'s Calendar');
  },

  /* -------------------------------------------------------------
     Modal Dialog & Form Handling
     ------------------------------------------------------------- */
  initNewEventModal() {
    const modal = document.getElementById('newEventModal');
    const openBtn = document.getElementById('addEventBtn');
    const closeBtn = document.getElementById('closeNewEventBtn');
    const cancelBtn = document.getElementById('cancelNewEventBtn');
    const saveBtn = document.getElementById('saveEventBtn');
    const exportIcsBtn = document.getElementById('exportIcsBtn');
    const titleInput = document.getElementById('eventTitleInput');
    const dateInput = document.getElementById('eventDateInput');
    const timeTypeAllDay = document.getElementById('timeTypeAllDay');
    const timeTypeSpecific = document.getElementById('timeTypeSpecific');
    const timePickersRow = document.getElementById('timePickersRow');
    const startTimeInput = document.getElementById('eventStartTimeInput');
    const endTimeInput = document.getElementById('eventEndTimeInput');
    const locationInput = document.getElementById('eventLocationInput');
    const quickPills = modal ? modal.querySelectorAll('.quick-pill') : [];

    if (!modal || !openBtn) return;

    // Helper: format Date object to YYYY-MM-DD
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Open Modal
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      dateInput.value = formatDate(now);

      // Default to All Day checked
      if (timeTypeAllDay) timeTypeAllDay.checked = true;
      if (timePickersRow) timePickersRow.style.display = 'none';

      // Default start time to next round hour
      const nextHour = (now.getHours() + 1) % 24;
      if (startTimeInput) startTimeInput.value = `${String(nextHour).padStart(2, '0')}:00`;
      const endHour = (nextHour + 1) % 24;
      if (endTimeInput) endTimeInput.value = `${String(endHour).padStart(2, '0')}:00`;

      if (titleInput) titleInput.value = '';
      if (locationInput) locationInput.value = '';

      // Set active quick pill to "Today"
      quickPills.forEach(p => p.classList.remove('active'));
      const todayPill = modal.querySelector('.quick-pill[data-offset="0"]');
      if (todayPill) todayPill.classList.add('active');

      modal.classList.add('is-open');
      setTimeout(() => {
        if (titleInput) titleInput.focus();
      }, 150);
    });

    // Close Modal
    const closeModal = () => modal.classList.remove('is-open');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Time Toggle handler
    if (timeTypeAllDay) {
      timeTypeAllDay.addEventListener('change', () => {
        if (timeTypeAllDay.checked && timePickersRow) {
          timePickersRow.style.display = 'none';
        }
      });
    }
    if (timeTypeSpecific) {
      timeTypeSpecific.addEventListener('change', () => {
        if (timeTypeSpecific.checked && timePickersRow) {
          timePickersRow.style.display = 'flex';
        }
      });
    }

    // Quick Date Pills
    quickPills.forEach(pill => {
      pill.addEventListener('click', () => {
        quickPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const now = new Date();
        const offset = pill.getAttribute('data-offset');
        const dayTarget = pill.getAttribute('data-day');

        if (offset !== null) {
          const d = new Date(now.getTime() + parseInt(offset, 10) * 24 * 60 * 60 * 1000);
          dateInput.value = formatDate(d);
        } else if (dayTarget === 'saturday') {
          const d = new Date(now);
          const currentDay = d.getDay(); // 0 is Sunday, 6 is Saturday
          const diff = (6 - currentDay + 7) % 7 || 7;
          d.setDate(d.getDate() + diff);
          dateInput.value = formatDate(d);
        } else if (dayTarget === 'sunday') {
          const d = new Date(now);
          const currentDay = d.getDay();
          const diff = (7 - currentDay) % 7 || 7;
          d.setDate(d.getDate() + diff);
          dateInput.value = formatDate(d);
        }
      });
    });

    if (dateInput) {
      dateInput.addEventListener('input', () => {
        quickPills.forEach(p => p.classList.remove('active'));
      });
    }

    // Handle Event Creation
    const handleSave = (shouldExportIcs = false) => {
      const title = titleInput ? titleInput.value.trim() : '';
      const dateVal = dateInput ? dateInput.value : '';
      const location = locationInput ? locationInput.value.trim() : '';

      if (!title) {
        if (titleInput) {
          titleInput.focus();
          titleInput.style.borderColor = '#ff4757';
          setTimeout(() => { titleInput.style.borderColor = ''; }, 1500);
        }
        return;
      }
      if (!dateVal) {
        if (dateInput) dateInput.focus();
        return;
      }

      const isAllDay = timeTypeAllDay ? timeTypeAllDay.checked : true;
      const [y, m, d] = dateVal.split('-');
      const dateStr = `${y}${m}${d}`;

      let start = dateStr;
      let end = dateStr;

      if (!isAllDay) {
        const startT = (startTimeInput && startTimeInput.value ? startTimeInput.value : '10:00').replace(':', '') + '00';
        start = `${dateStr}T${startT}`;
        if (endTimeInput && endTimeInput.value) {
          const endT = endTimeInput.value.replace(':', '') + '00';
          end = `${dateStr}T${endT}`;
        }
      }

      const eventObj = {
        id: 'grace_' + Date.now(),
        title: title,
        start: start,
        end: end,
        rrule: '',
        location: location,
        calendar: 'Grace',
        color: '#83D754',
        isCustom: true,
        createdAt: Date.now()
      };

      this.addCustomEvent(eventObj);

      if (shouldExportIcs) {
        this.downloadICS(eventObj);
      }

      closeModal();
      this.showToast(`✨ Added "${title}" to Grace's Calendar!`);
    };

    if (saveBtn) {
      saveBtn.addEventListener('click', () => handleSave(false));
    }
    if (exportIcsBtn) {
      exportIcsBtn.addEventListener('click', () => handleSave(true));
    }

    if (titleInput) {
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave(false);
        }
      });
    }
  },

  /* -------------------------------------------------------------
     Export & Notifications
     ------------------------------------------------------------- */
  downloadICS(event) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const nowStr = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Graces Smart Display//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@graces-smart-display`,
      `DTSTAMP:${nowStr}`,
      event.start.includes('T') ? `DTSTART:${event.start}` : `DTSTART;VALUE=DATE:${event.start}`,
      event.end ? (event.end.includes('T') ? `DTEND:${event.end}` : `DTEND;VALUE=DATE:${event.end}`) : '',
      `SUMMARY:${event.title}`,
      event.location ? `LOCATION:${event.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  showToast(message) {
    let toast = document.getElementById('toastNotice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastNotice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
};
