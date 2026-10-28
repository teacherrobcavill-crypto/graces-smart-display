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
      btn.type = 'button';
      btn.innerHTML = `
        <span class="btn-icon">${pl.icon || '🎵'}</span>
        <span class="btn-title">${pl.title}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.launchPlaylist(pl);
      });
      grid.appendChild(btn);
    });
  },

  bindEvents() {
    const openAppBtn = document.getElementById('openAmazonMusicBtn');
    if (openAppBtn) {
      openAppBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.launchAmazonMusicApp();
      });
    }
  },

  /**
   * Launch Amazon Music via Android intent or web fallback
   */
  launchAmazonMusicApp() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = 'intent://#Intent;package=com.amazon.mp3;scheme=amznmp;end;';
    } else {
      window.open('https://music.amazon.co.uk', '_blank');
    }
  },

  /**
   * Launch specific search query in Amazon Music or trigger voice reminder
   */
  launchPlaylist(pl) {
    if (!pl) return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    const query = pl.query || pl.title;

    if (isAndroid) {
      const encoded = encodeURIComponent(query);
      window.location.href = `intent://search?query=${encoded}#Intent;package=com.amazon.mp3;scheme=amznmp;end;`;
    } else {
      window.open(`https://music.amazon.co.uk/search/${encodeURIComponent(query)}`, '_blank');
    }
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
      gain.gain.setValueAtTime(0.001, this.audioContext.currentTime);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    } catch (e) {
      console.debug('Keep-alive pulse waiting for initial touch.');
    }
  }
};
