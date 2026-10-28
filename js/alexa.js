/**
 * Alexa Voice Assistant & Wake-Word Engine for Grace's Smart Display
 * - Continuous "Alexa" wake-word detection
 * - Echo Show Cyan/Blue glowing border & bottom lightbar
 * - Two-tone Echo chime sound via Web Audio API
 * - 100% In-Screen Execution (NEVER navigates away or opens Play Store)
 */
const AlexaManager = {
  recognition: null,
  isListening: false,
  isWakeWordActive: false,
  audioContext: null,
  glowTimeout: null,

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
    this.bindPromptChips();
    this.startContinuousListening();
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

  /**
   * Signature Echo Show Two-Tone Wake Chime (D5 -> A5)
   */
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
      console.debug('Chime audio waiting for user gesture.');
    }
  },

  /**
   * Continuous Speech Recognition (Listens for "Alexa" in bedroom)
   */
  startContinuousListening() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      console.warn('SpeechRecognition API not supported on this browser.');
      return;
    }

    try {
      this.recognition = new SpeechClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-GB';

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
        // Silently restart on timeout or quiet room
        if (e.error !== 'no-speech') {
          console.debug('Voice listener event:', e.error);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart speech loop so it stays always-listening
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch (e) {
            // Already active
          }
        }, 500);
      };

      // Start the listener
      this.recognition.start();
    } catch (err) {
      console.debug('Voice loop restart delayed:', err);
    }
  },

  /**
   * Process incoming speech: Detects "Alexa" wake word
   */
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

  /**
   * Turn ON the Echo Show Blue Glowing Frame & Bottom Lightbar
   */
  activateEchoGlow(promptText = 'Listening...') {
    document.body.classList.add('alexa-active');
    const hudText = document.getElementById('echoVoiceText');
    if (hudText) hudText.textContent = promptText;

    if (this.glowTimeout) clearTimeout(this.glowTimeout);
    // Keep glow on for at least 6 seconds if waiting for speech
    this.glowTimeout = setTimeout(() => {
      this.deactivateEchoGlow();
    }, 6000);
  },

  /**
   * Turn OFF the Echo Show Blue Glowing Frame
   */
  deactivateEchoGlow() {
    document.body.classList.remove('alexa-active');
    this.isWakeWordActive = false;
  },

  /**
   * Bind Tap to Talk Button
   */
  bindButtons() {
    const tapBtn = document.getElementById('alexaTapBtn');
    if (!tapBtn) return;

    tapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playEchoChime();
      this.activateEchoGlow('Listening... Say a command');
      this.isWakeWordActive = true;
    });
  },

  /**
   * Bind Prompt Chips
   */
  bindPromptChips() {
    const chips = document.querySelectorAll('.prompt-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playEchoChime();
        this.activateEchoGlow();

        const query = chip.getAttribute('data-query');
        const action = chip.getAttribute('data-action');

        setTimeout(() => {
          if (query) {
            this.executeCommand(`play ${query}`);
          } else if (action === 'skip') {
            this.executeCommand('skip');
          } else if (action === 'alarm') {
            this.executeCommand('set an alarm for 7:30 AM');
          } else if (action === 'weather') {
            this.executeCommand('what is the weather');
          }
        }, 500);
      });
    });
  },

  /**
   * Execute voice commands 100% in-screen (No navigation!)
   */
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

    // 6. TIME
    if (cmd.includes('time is it') || cmd.includes('what time')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
      this.speak(`The time is ${timeStr}.`);
      setTimeout(() => this.deactivateEchoGlow(), 2500);
      return;
    }

    // 7. JOKE
    if (cmd.includes('joke')) {
      const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
      this.speak(randomJoke);
      setTimeout(() => this.deactivateEchoGlow(), 5000);
      return;
    }

    // 8. BEDTIME / GOODNIGHT
    if (cmd.includes('bedtime') || cmd.includes('goodnight') || cmd.includes('sleep sounds')) {
      document.body.classList.add('night-mode-active');
      MusicManager.playInScreenAudio('bedtime');
      this.speak("Goodnight Grace. Sweet dreams.");
      setTimeout(() => this.deactivateEchoGlow(), 3000);
      return;
    }

    // 9. PLAY MUSIC / POP HITS / LOFI / DISNEY / ON AMAZON MUSIC
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
      if (!songTitle) songTitle = 'Pop Hits';

      MusicManager.playInScreenAudio(songTitle);
      this.speak(`Playing ${songTitle}.`);
      setTimeout(() => this.deactivateEchoGlow(), 3000);
      return;
    }

    // 7. ALARM
    if (cmd.includes('alarm')) {
      this.speak("Alarm set for 7:30 AM.");
      setTimeout(() => this.deactivateEchoGlow(), 2500);
      return;
    }

    // Fallback: Friendly Echo answer
    this.speak(`I heard: ${cmd}`);
    setTimeout(() => this.deactivateEchoGlow(), 2500);
  },

  /**
   * Speak response in clear UK English voice
   */
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
