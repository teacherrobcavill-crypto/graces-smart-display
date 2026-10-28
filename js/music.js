/**
 * Music & JBL Boombox Hub for Grace's Smart Display
 */
const MusicManager = {
  keepAliveEnabled: true,
  audioContext: null,
  keepAliveIntervalId: null,

  defaultPlaylists: [
    { id: '1', title: 'Top Pop Hits', icon: '🎧', query: 'Top Pop Hits' },
    { id: '2', title: 'Bedtime Calm', icon: '💤', query: 'Bedtime Sleep Sounds' },
    { id: '3', title: 'Study & Chill', icon: '📚', query: 'Lofi Chill Beats' },
    { id: '4', title: 'Disney Favorites', icon: '✨', query: 'Disney Soundtracks' }
  ],
  playlists: [],

  init(options = {}) {
    this.playlists = options.playlists || this.defaultPlaylists;
    this.keepAliveEnabled = options.keepAliveEnabled ?? true;

    this.renderPlaylists();
    this.bindEvents();

    if (this.keepAliveEnabled) {
      this.startKeepAlive();
    }
  },

  renderPlaylists() {
    const grid = document.getElementById('playlistGrid');
    if (!grid) return;

    grid.innerHTML = '';
    this.playlists.forEach(pl => {
      const btn = document.createElement('button');
      btn.className = 'playlist-btn';
      btn.innerHTML = `
        <span class="btn-icon">${pl.icon || '🎵'}</span>
        <span class="btn-title">${pl.title}</span>
      `;
      btn.addEventListener('click', () => this.launchPlaylist(pl));
      grid.appendChild(btn);
    });
  },

  bindEvents() {
    const openAppBtn = document.getElementById('openAmazonMusicBtn');
    if (openAppBtn) {
      openAppBtn.addEventListener('click', () => this.launchAmazonMusicApp());
    }
  },

  /**
   * Launch Amazon Music via Android intent or web fallback
   */
  launchAmazonMusicApp() {
    // Try launching the native Amazon Music Android app
    const intentUrl = 'intent://#Intent;package=com.amazon.mp3;scheme=amznmp;end;';
    const fallbackUrl = 'https://music.amazon.co.uk';

    const start = Date.now();
    window.location.href = intentUrl;

    setTimeout(() => {
      // If the app wasn't opened and browser remains active, fallback to web
      if (Date.now() - start < 1500) {
        window.open(fallbackUrl, '_blank');
      }
    }, 1000);
  },

  /**
   * Launch specific search query in Amazon Music or trigger voice reminder
   */
  launchPlaylist(pl) {
    if (!pl) return;

    // Show temporary feedback toast / prompt
    const promptBox = document.querySelector('.alexa-prompts');
    if (promptBox) {
      const originalHtml = promptBox.innerHTML;
      promptBox.innerHTML = `
        <div class="prompt-chip" style="border-left-color: var(--accent-color); background: rgba(255,255,255,0.12); color: #fff;">
          🗣 Say: "Alexa, play ${pl.query} on Amazon Music"
        </div>
      `;
      setTimeout(() => {
        promptBox.innerHTML = originalHtml;
      }, 7000);
    }

    // Also attempt to trigger Android intent for Amazon Music search
    const encoded = encodeURIComponent(pl.query);
    const searchIntent = `intent://search?query=${encoded}#Intent;package=com.amazon.mp3;scheme=amznmp;end;`;
    window.location.href = searchIntent;
  },

  /**
   * Sub-audible (20Hz) audio pulse to keep JBL Boombox Bluetooth link active
   */
  startKeepAlive() {
    if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);

    // Run every 9 minutes (JBL auto-powers off after ~15-20 min of absolute silence)
    this.keepAliveIntervalId = setInterval(() => {
      this.playSilentPulse();
    }, 9 * 60 * 1000);
  },

  stopKeepAlive() {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  },

  playSilentPulse() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      // 20Hz is sub-audible yet registers as active PCM audio stream to the Bluetooth DAC
      osc.frequency.setValueAtTime(20, this.audioContext.currentTime);
      gain.gain.setValueAtTime(0.001, this.audioContext.currentTime); // Inaudible volume

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    } catch (e) {
      // AudioContext might require user interaction first
      console.debug('Keep-alive pulse waiting for initial touch.');
    }
  }
};
