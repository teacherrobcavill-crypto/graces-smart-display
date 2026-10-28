/**
 * Alexa Voice Assistant & Wake-Word Engine for Grace's Smart Display
 * - Continuous "Alexa" wake-word detection
 * - Echo Show Cyan/Blue glowing border & bottom lightbar
 * - Two-tone Echo chime sound via Web Audio API
 * - Robust user-gesture activation & automatic recovery
 */
const AlexaManager = {
  recognition: null,
  isListening: false,
  isWakeWordActive: false,
  audioContext: null,
  glowTimeout: null,
  hasStarted: false,

  jokes: [
    "Why did the music teacher go to jail? Because she got caught with too many sharp objects!",
    "What do you call a sleeping dinosaur? A dino-snore!",
    "Why was six afraid of seven? Because seven eight nine!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the teddy bear say no to dessert? Because it was already stuffed!",
    "What is brown, hairy and wears sunglasses? A coconut on vacation!"
  ],

  init() {
    this.initAudioContext();
    this.bindButtons();

    // Browser security requires a user interaction to start speech recognition reliably
    const startOnFirstTap = () => {
      this.initSpeechEngine();
      this.startListening();
      document.removeEventListener('click', startOnFirstTap);
      document.removeEventListener('touchstart', startOnFirstTap);
    };
    document.addEventListener('click', startOnFirstTap, { once: true });
    document.addEventListener('touchstart', startOnFirstTap, { once: true });

    // Also try starting immediately in case browser allows it (e.g. Fully Kiosk)
    this.initSpeechEngine();
    this.startListening();
  },

  initAudioContext() {
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) {
        this.audioContext = new AudioClass();
      }
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  },

  playEchoChime() {
    try {
      if (!this.audioContext) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2: 880 Hz (A5)
      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.audioContext.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);
    } catch (err) {
      console.debug('Chime audio waiting for touch.');
    }
  },

  initSpeechEngine() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      console.warn('SpeechRecognition API not supported on this browser.');
      return;
    }

    if (this.recognition) return;

    try {
      this.recognition = new SpeechClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-GB';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.hasStarted = true;
        console.log('Alexa voice listener is active and listening for "Alexa"');
      };

      this.recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          if (event.results[i].isFinal) {
            this.processSpeech(transcript, true);
          } else {
            interim += transcript;
            this.processSpeech(interim, false);
          }
        }
      };

      this.recognition.onerror = (e) => {
        console.debug('Voice engine event:', e.error);
        if (e.error === 'not-allowed') {
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Automatically restart speech loop so it remains always listening
        setTimeout(() => {
          if (this.hasStarted) {
            this.startListening();
          }
        }, 600);
      };
    } catch (err) {
      console.warn('Speech engine init error:', err);
    }
  },

  startListening(forceUserGesture = false) {
    if (!this.recognition) {
      this.initSpeechEngine();
    }
    if (!this.recognition) return;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      // If already started, that's fine
    }
  },

  processSpeech(text, isFinal) {
    const lower = text.toLowerCase();

    // Check for Wake Word: "alexa"
    if (lower.includes('alexa')) {
      if (!this.isWakeWordActive) {
        this.activateEchoGlow();
        this.playEchoChime();
        this.isWakeWordActive = true;
      }

      // Extract command after "alexa"
      const alexaIndex = lower.indexOf('alexa');
      const command = lower.substring(alexaIndex + 5).replace(/^[,.\s]+/, '').trim();

      const hudText = document.getElementById('echoVoiceText');
      if (hudText && command) {
        hudText.textContent = `"${command}"`;
      }

      if (isFinal && command.length > 2) {
        this.executeCommand(command);
        this.isWakeWordActive = false;
      }
    } else if (this.isWakeWordActive && isFinal && text.trim().length > 1) {
      this.executeCommand(text.trim());
      this.isWakeWordActive = false;
    }
  },

  activateEchoGlow(promptText = 'Listening...') {
    document.body.classList.add('alexa-active');
    const hudText = document.getElementById('echoVoiceText');
    if (hudText) hudText.textContent = promptText;

    if (this.glowTimeout) clearTimeout(this.glowTimeout);
    this.glowTimeout = setTimeout(() => {
      this.deactivateEchoGlow();
    }, 6000);
  },

  deactivateEchoGlow() {
    document.body.classList.remove('alexa-active');
    this.isWakeWordActive = false;
  },

  bindButtons() {
    const topAlexaBtn = document.getElementById('topAlexaBtn');
    if (topAlexaBtn) {
      topAlexaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.initSpeechEngine();
        this.startListening(true);
        this.playEchoChime();
        this.activateEchoGlow('Listening... Say a command');
        this.isWakeWordActive = true;
      });
    }
  },

  executeCommand(rawCommand) {
    const cmd = rawCommand.toLowerCase().trim();
    const hudText = document.getElementById('echoVoiceText');
    if (hudText) hudText.textContent = `"${cmd}"`;

    // 1. SKIP / NEXT TRACK
    if (cmd.includes('skip') || cmd.includes('next track') || cmd.includes('next song') || cmd === 'next') {
      const trackName = MusicManager.skipNext();
      this.speak(`Skipping to ${trackName}`);
      setTimeout(() => this.deactivateEchoGlow(), 2500);
      return;
    }

    // 2. PREVIOUS TRACK
    if (cmd.includes('previous track') || cmd.includes('previous song') || cmd.includes('go back')) {
      const trackName = MusicManager.skipPrevious();
      this.speak(`Previous track: ${trackName}`);
      setTimeout(() => this.deactivateEchoGlow(), 2500);
      return;
    }

    // 3. PAUSE / RESUME
    if (cmd === 'pause' || cmd.includes('pause music')) {
      MusicManager.pauseAudio();
      this.speak("Paused.");
      setTimeout(() => this.deactivateEchoGlow(), 2000);
      return;
    }

    if (cmd === 'resume' || cmd.includes('unpause') || cmd.includes('continue')) {
      MusicManager.resumeAudio();
      this.speak("Resuming playback.");
      setTimeout(() => this.deactivateEchoGlow(), 2000);
      return;
    }

    // 4. STOP
    if (cmd.includes('stop') || cmd.includes('quiet') || cmd.includes('shut up')) {
      MusicManager.stopAudio();
      this.speak("Stopping playback.");
      setTimeout(() => this.deactivateEchoGlow(), 2000);
      return;
    }

    // 5. CALENDAR & FAMILY SCHEDULE
    if (cmd.includes('calendar') || cmd.includes('events') || cmd.includes('schedule') || cmd.includes('plans')) {
      const calSpeech = typeof CalendarManager !== 'undefined' ? CalendarManager.getUpcomingSummary() : "No events found.";
      this.speak(calSpeech);
      setTimeout(() => this.deactivateEchoGlow(), 4500);
      return;
    }

    // 6. WEATHER
    if (cmd.includes('weather') || cmd.includes('temperature') || cmd.includes('rain')) {
      WeatherManager.fetchWeather();
      const condition = document.getElementById('weatherCondition')?.textContent || 'Fair';
      const temp = document.getElementById('currentTemp')?.textContent || '16°';
      const speech = `In Bramley, it is currently ${temp} and ${condition}.`;
      this.speak(speech);
      setTimeout(() => this.deactivateEchoGlow(), 3500);
      return;
    }

    // 7. TIME
    if (cmd.includes('time is it') || cmd.includes('what time')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
      this.speak(`The time is ${timeStr}.`);
      setTimeout(() => this.deactivateEchoGlow(), 2500);
      return;
    }

    // 8. JOKE
    if (cmd.includes('joke')) {
      const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
      this.speak(randomJoke);
      setTimeout(() => this.deactivateEchoGlow(), 5000);
      return;
    }

    // 9. BEDTIME / GOODNIGHT
    if (cmd.includes('bedtime') || cmd.includes('goodnight') || cmd.includes('sleep sounds')) {
      document.body.classList.add('night-mode-active');
      MusicManager.playInScreenAudio('bedtime');
      this.speak("Goodnight Grace. Sweet dreams.");
      setTimeout(() => this.deactivateEchoGlow(), 3000);
      return;
    }

    // 10. PLAY MUSIC
    if (cmd.startsWith('play') || cmd.includes('music') || cmd.includes('hits') || cmd.includes('songs') || cmd.includes('track')) {
      let songTitle = cmd.replace(/^play/i, '')
                         .replace(/on amazon music/i, '')
                         .replace(/on amazon/i, '')
                         .replace(/amazon music/i, '')
                         .replace(/music/i, '')
                         .trim();
      if (!songTitle) songTitle = 'Pop Hits';

      MusicManager.playInScreenAudio(songTitle);
      this.speak(`Playing ${songTitle} on the JBL Boombox.`);
      setTimeout(() => this.deactivateEchoGlow(), 3000);
      return;
    }

    // Fallback
    this.speak(`I heard: ${cmd}`);
    setTimeout(() => this.deactivateEchoGlow(), 2500);
  },

  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
};
