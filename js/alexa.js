/**
 * Alexa Voice Assistant Controller for Grace's Smart Display
 */
const AlexaManager = {
  recognition: null,
  isListening: false,

  init() {
    this.bindAlexaButton();
    this.bindPromptChips();
    this.initSpeechRecognition();
  },

  bindAlexaButton() {
    const tapBtn = document.getElementById('alexaTapBtn');
    if (!tapBtn) return;

    tapBtn.addEventListener('click', () => {
      this.triggerAlexa();
    });
  },

  bindPromptChips() {
    const chips = document.querySelectorAll('.prompt-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const query = chip.getAttribute('data-query');
        const action = chip.getAttribute('data-action');

        if (query) {
          this.executeVoiceAction(`play ${query}`);
        } else if (action === 'alarm') {
          this.executeVoiceAction('set an alarm for 7:30 AM');
        } else if (action === 'weather') {
          this.executeVoiceAction('weather forecast');
        } else {
          this.triggerAlexa();
        }
      });
    });
  },

  initSpeechRecognition() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechClass) {
      try {
        this.recognition = new SpeechClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-GB';

        this.recognition.onstart = () => {
          this.setListeningState(true);
        };

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('Voice recognized:', transcript);
          this.handleSpeechResult(transcript);
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          this.setListeningState(false);
          // If speech fails or permission not granted, fallback to launching Alexa app
          this.launchNativeAlexaApp();
        };

        this.recognition.onend = () => {
          this.setListeningState(false);
        };
      } catch (err) {
        console.warn('Speech recognition init failed:', err);
      }
    }
  },

  triggerAlexa() {
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // On Galaxy Tab A8, directly open the Alexa voice assistant
      this.launchNativeAlexaApp();
    } else if (this.recognition) {
      // On desktop / browser, use speech recognition
      try {
        if (this.isListening) {
          this.recognition.stop();
        } else {
          this.recognition.start();
        }
      } catch (e) {
        this.launchNativeAlexaApp();
      }
    } else {
      this.launchNativeAlexaApp();
    }
  },

  launchNativeAlexaApp() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Launch Amazon Alexa App voice interface on Android
      window.location.href = 'intent://#Intent;package=com.amazon.dee.app;scheme=alexa;end;';
    } else {
      // Desktop / Web fallback
      window.open('https://alexa.amazon.co.uk', '_blank');
    }
  },

  setListeningState(active) {
    this.isListening = active;
    const btn = document.getElementById('alexaTapBtn');
    const title = document.getElementById('alexaBtnTitle');
    const subtitle = document.getElementById('alexaBtnSubtitle');

    if (btn) {
      if (active) {
        btn.classList.add('is-listening');
        if (title) title.textContent = 'Listening... Speak now';
        if (subtitle) subtitle.textContent = 'Say a song, artist, or question';
      } else {
        btn.classList.remove('is-listening');
        if (title) title.textContent = 'Tap to Talk to Alexa';
        if (subtitle) subtitle.textContent = 'or say "Alexa..." hands-free';
      }
    }
  },

  handleSpeechResult(transcript) {
    const title = document.getElementById('alexaBtnTitle');
    const subtitle = document.getElementById('alexaBtnSubtitle');
    if (title) title.textContent = `"${transcript}"`;
    if (subtitle) subtitle.textContent = 'Executing...';

    setTimeout(() => {
      this.setListeningState(false);
    }, 2500);

    this.executeVoiceAction(transcript);
  },

  executeVoiceAction(text) {
    const lower = text.toLowerCase();

    // 1. Weather
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      WeatherManager.fetchWeather();
      const condition = document.getElementById('weatherCondition')?.textContent || 'Fair';
      const temp = document.getElementById('currentTemp')?.textContent || '';
      this.speakFeedback(`In Bramley it is currently ${temp} and ${condition}.`);
      return;
    }

    // 2. Alarm / Bedtime
    if (lower.includes('bedtime') || lower.includes('goodnight') || lower.includes('sleep')) {
      document.body.classList.add('night-mode-active');
      MusicManager.launchPlaylist({ title: 'Bedtime Calm', query: 'Bedtime Sleep Sounds' });
      return;
    }

    // 3. Music queries (play ...)
    let musicQuery = text;
    if (lower.startsWith('alexa, play')) {
      musicQuery = text.substring(11).replace(/on amazon music/i, '').trim();
    } else if (lower.startsWith('play')) {
      musicQuery = text.substring(4).replace(/on amazon music/i, '').trim();
    }

    MusicManager.launchPlaylist({ title: musicQuery, query: musicQuery });
  },

  speakFeedback(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      window.speechSynthesis.speak(utterance);
    }
  }
};
