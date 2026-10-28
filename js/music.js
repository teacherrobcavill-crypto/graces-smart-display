/**
 * In-Screen Audio & JBL Boombox Hub for Grace's Smart Display
 * - 100% In-Screen Audio Playback (Never leaves dashboard)
 * - Streams Pop Hits, Lofi, Soundtracks, and generative Bedtime Rain
 * - Sends sub-audible heartbeat to keep JBL Boombox awake
 */
const MusicManager = {
  keepAliveEnabled: true,
  audioContext: null,
  keepAliveIntervalId: null,
  currentStreamAudio: null,
  rainNoiseNode: null,
  isPlaying: false,

  // Curated reliable high-quality continuous audio streams
  streams: {
    'top pop hits': 'https://stream.zeno.fm/f3wvbbqmdg8uv', // Pop Hits stream
    'pop': 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    'study & chill': 'https://stream.zeno.fm/0r0xa792kwzuv', // Lofi Beats stream
    'lofi': 'https://stream.zeno.fm/0r0xa792kwzuv',
    'disney favorites': 'https://stream.zeno.fm/f9u2h5h3y5quv', // Soundtracks / Family
    'soundtracks': 'https://stream.zeno.fm/f9u2h5h3y5quv'
  },

  defaultPlaylists: [
    { id: '1', title: 'Top Pop Hits', icon: '🎧', query: 'top pop hits' },
    { id: '2', title: 'Bedtime Calm', icon: '💤', query: 'bedtime' },
    { id: '3', title: 'Study & Chill', icon: '📚', query: 'study & chill' },
    { id: '4', title: 'Disney Favorites', icon: '✨', query: 'disney favorites' }
  ],
  playlists: [],

  init(options = {}) {
    this.playlists = options.playlists || this.defaultPlaylists;
    this.keepAliveEnabled = options.keepAliveEnabled ?? true;

    this.renderPlaylists();
    this.bindControls();

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
        this.playInScreenAudio(pl.query || pl.title);
      });
      grid.appendChild(btn);
    });
  },

  bindControls() {
    const stopBtn = document.getElementById('stopAudioBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopAudio();
      });
    }

    this.currentStreamAudio = document.getElementById('dashboardAudioPlayer');
    if (this.currentStreamAudio) {
      this.currentStreamAudio.addEventListener('error', (e) => {
        console.warn('Audio stream error, falling back to ambient generator:', e);
      });
    }
  },

  /**
   * Play music completely in-screen without opening any apps
   */
  playInScreenAudio(query) {
    const q = (query || '').toLowerCase().trim();

    // Check for Bedtime / Rain
    if (q.includes('bedtime') || q.includes('sleep') || q.includes('rain')) {
      this.playBedtimeSounds();
      return;
    }

    // Stop existing audio
    this.stopAudio();

    // Match stream URL or default to Pop Hits
    let streamUrl = this.streams['top pop hits'];
    let displayTitle = query || 'Top Pop Hits';

    for (const key of Object.keys(this.streams)) {
      if (q.includes(key)) {
        streamUrl = this.streams[key];
        break;
      }
    }

    if (!this.currentStreamAudio) {
      this.currentStreamAudio = document.getElementById('dashboardAudioPlayer');
    }

    if (this.currentStreamAudio) {
      this.currentStreamAudio.src = streamUrl;
      this.currentStreamAudio.play().catch(e => {
        console.debug('Autoplay prevented, requires tap:', e);
      });
      this.isPlaying = true;
    }

    this.showNowPlaying(displayTitle, 'Streaming on JBL Boombox', '🎧');
  },

  /**
   * Generative Bedtime Rain & Sleep White Noise (Lush, offline, relaxing)
   */
  playBedtimeSounds() {
    this.stopAudio();

    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Generate 5 seconds of soft pink noise buffer
      const bufferSize = this.audioContext.sampleRate * 5;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Warm low-pass filter to sound like gentle rain outside bedroom window
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioContext.currentTime);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.18, this.audioContext.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);

      noise.start();
      this.rainNoiseNode = noise;
      this.isPlaying = true;

      this.showNowPlaying('Bedtime Sleep Sounds', 'Gentle rain on JBL Boombox', '🌧️');
    } catch (e) {
      console.warn('Bedtime sounds generator error:', e);
    }
  },

  /**
   * Stop all playing audio
   */
  stopAudio() {
    // 1. Stop streaming audio
    if (this.currentStreamAudio) {
      this.currentStreamAudio.pause();
      this.currentStreamAudio.src = '';
    }

    // 2. Stop generative rain
    if (this.rainNoiseNode) {
      try {
        this.rainNoiseNode.stop();
        this.rainNoiseNode.disconnect();
      } catch (e) {}
      this.rainNoiseNode = null;
    }

    this.isPlaying = false;
    this.hideNowPlaying();
  },

  showNowPlaying(title, subtitle, icon = '🎵') {
    const bar = document.getElementById('nowPlayingBar');
    const titleEl = document.getElementById('nowPlayingTitle');
    const subEl = document.getElementById('nowPlayingSubtitle');
    const iconEl = document.getElementById('nowPlayingIcon');

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (iconEl) iconEl.textContent = icon;
    if (bar) bar.classList.add('is-active');
  },

  hideNowPlaying() {
    const bar = document.getElementById('nowPlayingBar');
    if (bar) bar.classList.remove('is-active');
  },

  /**
   * Sub-audible (20Hz) audio pulse to keep JBL Boombox Bluetooth link active
   */
  startKeepAlive() {
    if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);

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
    if (this.isPlaying) return; // If already playing music, speaker is definitely awake!

    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

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
