/**
 * In-Screen Audio & Multi-Track Engine for Grace's Smart Display
 * - Multi-track catalog supporting "Alexa, skip" / "Alexa, next track"
 * - In-screen controls: Previous, Play/Pause, Next/Skip, Stop
 * - Generative offline Bedtime Sleep Rain
 * - Keeps JBL Boombox awake with inaudible 20Hz pulse
 */
const MusicManager = {
  keepAliveEnabled: true,
  audioContext: null,
  keepAliveIntervalId: null,
  currentStreamAudio: null,
  rainNoiseNode: null,
  isPlaying: false,
  isPaused: false,

  currentCategoryIndex: 0,
  currentTrackIndex: 0,

  catalog: [
    {
      id: 'pop',
      category: 'Top Pop Hits',
      icon: '🎧',
      tracks: [
        { title: 'Global Pop Hits 2026', artist: 'Chart Radio 1', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
        { title: 'Top 40 UK & US Countdown', artist: 'Hit Mix Radio', url: 'https://stream.zeno.fm/4t83wcfqd0hvv' },
        { title: 'Teen Pop Dance Party', artist: 'Energy Radio UK', url: 'https://stream.zeno.fm/0r0xa792kwzuv' }
      ]
    },
    {
      id: 'disney',
      category: 'Disney Favorites',
      icon: '✨',
      tracks: [
        { title: 'Disney Magical Soundtracks', artist: 'Disney Soundtracks', url: 'https://stream.zeno.fm/f9u2h5h3y5quv' },
        { title: 'Family Movie Hits', artist: 'Kids Radio UK', url: 'https://stream.zeno.fm/75k1z5mrvqruv' },
        { title: 'Classic Animation Melodies', artist: 'Magical Kingdom', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' }
      ]
    },
    {
      id: 'lofi',
      category: 'Study & Chill',
      icon: '📚',
      tracks: [
        { title: 'Lofi Chill Study Beats', artist: 'Chillhop Beats', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
        { title: 'Cozy Bedroom Vibes', artist: 'Lofi Cafe', url: 'https://stream.zeno.fm/v9uqg26y968uv' },
        { title: 'Midnight Chill Lounge', artist: 'Aesthetic Sound', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' }
      ]
    },
    {
      id: 'bedtime',
      category: 'Bedtime Calm',
      icon: '💤',
      isRain: true,
      tracks: [
        { title: 'Gentle Bedroom Rain', artist: 'Natural Sleep Sounds', url: 'rain' },
        { title: 'Soothing Sleep Ambience', artist: 'Deep Calm', url: 'rain' }
      ]
    }
  ],

  playlists: [],

  init(options = {}) {
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
    this.catalog.forEach((cat, idx) => {
      const btn = document.createElement('button');
      btn.className = 'playlist-btn';
      btn.type = 'button';
      btn.innerHTML = `
        <span class="btn-icon">${cat.icon || '🎵'}</span>
        <span class="btn-title">${cat.category}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectCategory(idx, 0);
      });
      grid.appendChild(btn);
    });
  },

  bindControls() {
    const prevBtn = document.getElementById('prevAudioBtn');
    const playPauseBtn = document.getElementById('playPauseAudioBtn');
    const skipBtn = document.getElementById('skipAudioBtn');
    const stopBtn = document.getElementById('stopAudioBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipPrevious();
      });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlayPause();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipNext();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopAudio();
      });
    }

    this.currentStreamAudio = document.getElementById('dashboardAudioPlayer');
  },

  selectCategory(catIdx, trackIdx = 0) {
    this.currentCategoryIndex = catIdx % this.catalog.length;
    const cat = this.catalog[this.currentCategoryIndex];
    this.currentTrackIndex = trackIdx % cat.tracks.length;

    this.playCurrentTrack();
  },

  playInScreenAudio(query) {
    const q = (query || '').toLowerCase().trim();

    // Check for Bedtime / Rain
    if (q.includes('bedtime') || q.includes('sleep') || q.includes('rain') || q.includes('night')) {
      const bedtimeIdx = this.catalog.findIndex(c => c.id === 'bedtime');
      this.selectCategory(bedtimeIdx >= 0 ? bedtimeIdx : 3, 0);
      return;
    }

    // Match genre
    let targetIdx = 0;
    if (q.includes('disney') || q.includes('soundtrack') || q.includes('magic')) {
      targetIdx = this.catalog.findIndex(c => c.id === 'disney');
    } else if (q.includes('lofi') || q.includes('study') || q.includes('chill')) {
      targetIdx = this.catalog.findIndex(c => c.id === 'lofi');
    } else {
      targetIdx = 0; // Default to Pop Hits
    }

    this.selectCategory(targetIdx >= 0 ? targetIdx : 0, 0);
  },

  playCurrentTrack() {
    this.stopAudioStreamsOnly();

    const cat = this.catalog[this.currentCategoryIndex];
    const track = cat.tracks[this.currentTrackIndex];

    if (cat.isRain || track.url === 'rain') {
      this.startRainSound();
      this.showNowPlaying(track.title, `${track.artist} (JBL Boombox)`, cat.icon);
    } else {
      if (!this.currentStreamAudio) {
        this.currentStreamAudio = document.getElementById('dashboardAudioPlayer');
      }
      if (this.currentStreamAudio) {
        this.currentStreamAudio.src = track.url;
        this.currentStreamAudio.play().catch(e => {
          console.debug('Autoplay waiting for touch:', e);
        });
      }
      this.showNowPlaying(track.title, `${track.artist} · ${cat.category}`, cat.icon);
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.updatePlayPauseIcon(true);
  },

  /**
   * "Alexa, skip" / "Alexa, next track"
   */
  skipNext() {
    const cat = this.catalog[this.currentCategoryIndex];
    this.currentTrackIndex = (this.currentTrackIndex + 1) % cat.tracks.length;
    this.playCurrentTrack();
    return cat.tracks[this.currentTrackIndex].title;
  },

  /**
   * "Alexa, previous track"
   */
  skipPrevious() {
    const cat = this.catalog[this.currentCategoryIndex];
    this.currentTrackIndex = (this.currentTrackIndex - 1 + cat.tracks.length) % cat.tracks.length;
    this.playCurrentTrack();
    return cat.tracks[this.currentTrackIndex].title;
  },

  togglePlayPause() {
    if (!this.isPlaying) {
      this.selectCategory(this.currentCategoryIndex, this.currentTrackIndex);
      return;
    }

    if (this.isPaused) {
      this.resumeAudio();
    } else {
      this.pauseAudio();
    }
  },

  pauseAudio() {
    if (this.currentStreamAudio) {
      this.currentStreamAudio.pause();
    }
    if (this.rainNoiseNode) {
      try { this.rainNoiseNode.stop(); } catch (e) {}
      this.rainNoiseNode = null;
    }
    this.isPaused = true;
    this.updatePlayPauseIcon(false);
  },

  resumeAudio() {
    const cat = this.catalog[this.currentCategoryIndex];
    if (cat.isRain) {
      this.startRainSound();
    } else if (this.currentStreamAudio) {
      this.currentStreamAudio.play().catch(e => console.debug(e));
    }
    this.isPaused = false;
    this.updatePlayPauseIcon(true);
  },

  stopAudioStreamsOnly() {
    if (this.currentStreamAudio) {
      this.currentStreamAudio.pause();
      this.currentStreamAudio.src = '';
    }
    if (this.rainNoiseNode) {
      try {
        this.rainNoiseNode.stop();
        this.rainNoiseNode.disconnect();
      } catch (e) {}
      this.rainNoiseNode = null;
    }
  },

  stopAudio() {
    this.stopAudioStreamsOnly();
    this.isPlaying = false;
    this.isPaused = false;
    this.hideNowPlaying();
  },

  startRainSound() {
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

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
    } catch (e) {
      console.warn('Rain sound error:', e);
    }
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

  updatePlayPauseIcon(isPlaying) {
    const icon = document.getElementById('playPauseIcon');
    if (!icon) return;
    if (isPlaying) {
      icon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // Pause symbol
    } else {
      icon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>'; // Play triangle symbol
    }
  },

  startKeepAlive() {
    if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);
    this.keepAliveIntervalId = setInterval(() => {
      this.playSilentPulse();
    }, 9 * 60 * 1000);
  },

  playSilentPulse() {
    if (this.isPlaying && !this.isPaused) return;

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
      console.debug('Pulse waiting for user touch');
    }
  }
};
