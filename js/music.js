/**
 * Authentic Amazon Music App Player for Grace's Smart Display
 * - Large Album Artwork, Song Name, Artist & Album details
 * - Real-time Progress Scrubber (Elapsed / Total time)
 * - Amazon Music Controls: Shuffle, Previous, Play/Pause, Next/Skip, Repeat, Heart
 * - Animated Equalizer waves (ılı)
 * - Multi-track streams & Generative Rain
 */
const MusicManager = {
  keepAliveEnabled: true,
  audioContext: null,
  keepAliveIntervalId: null,
  currentStreamAudio: null,
  rainNoiseNode: null,

  isPlaying: false,
  isPaused: false,
  isShuffle: false,
  isRepeat: false,
  isLiked: false,

  currentCategoryIndex: 0,
  currentTrackIndex: 0,
  trackElapsedSeconds: 0,
  trackDurationSeconds: 215, // Default ~3:35
  scrubberIntervalId: null,

  catalog: [
    {
      id: 'pop',
      category: 'Top Pop Hits',
      tracks: [
        {
          title: 'Cruel Summer',
          artist: 'Taylor Swift',
          album: 'Lover',
          duration: 178, // 2:58
          artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv'
        },
        {
          title: 'Espresso',
          artist: 'Sabrina Carpenter',
          album: "Short n' Sweet",
          duration: 175, // 2:55
          artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/4t83wcfqd0hvv'
        },
        {
          title: 'Dance The Night',
          artist: 'Dua Lipa',
          album: 'Barbie The Album',
          duration: 176, // 2:56
          artwork: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv'
        },
        {
          title: 'Anti-Hero',
          artist: 'Taylor Swift',
          album: 'Midnights',
          duration: 200, // 3:20
          artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv'
        }
      ]
    },
    {
      id: 'disney',
      category: 'Disney Favorites',
      tracks: [
        {
          title: 'A Whole New World',
          artist: 'Mena Massoud & Naomi Scott',
          album: 'Aladdin (Original Soundtrack)',
          duration: 175,
          artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/f9u2h5h3y5quv'
        },
        {
          title: "How Far I'll Go",
          artist: "Auli'i Cravalho",
          album: 'Moana',
          duration: 163,
          artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/75k1z5mrvqruv'
        },
        {
          title: 'Let It Go',
          artist: 'Idina Menzel',
          album: 'Frozen',
          duration: 224,
          artwork: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/f9u2h5h3y5quv'
        }
      ]
    },
    {
      id: 'lofi',
      category: 'Study & Chill',
      tracks: [
        {
          title: 'Midnight Study Session',
          artist: 'Lofi Girl & Chillhop',
          album: 'Cozy Bedroom Beats',
          duration: 195,
          artwork: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv'
        },
        {
          title: 'Coffee & Raindrops',
          artist: 'Relax Cafe',
          album: 'Afternoon Calm',
          duration: 210,
          artwork: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&q=80',
          streamUrl: 'https://stream.zeno.fm/v9uqg26y968uv'
        }
      ]
    },
    {
      id: 'bedtime',
      category: 'Bedtime Calm',
      tracks: [
        {
          title: 'Gentle Bedroom Rain',
          artist: 'Deep Sleep Nature Sounds',
          album: 'Night Sleep Ambience',
          duration: 3600, // 1 hour
          artwork: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&q=80',
          streamUrl: 'rain'
        },
        {
          title: 'Starlit Waves & Ocean',
          artist: 'Calm Night Horizon',
          album: 'Sweet Dreams',
          duration: 3600,
          artwork: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80',
          streamUrl: 'rain'
        }
      ]
    }
  ],

  init() {
    this.bindControls();
    this.displayInitialTrack();

    if (this.keepAliveEnabled) {
      this.startKeepAlive();
    }
  },

  displayInitialTrack() {
    const cat = this.catalog[this.currentCategoryIndex];
    const track = cat.tracks[this.currentTrackIndex];
    this.updatePlayerUI(track, cat.category);
  },

  bindControls() {
    const prevBtn = document.getElementById('amzPrevBtn');
    const playPauseBtn = document.getElementById('amzPlayPauseBtn');
    const skipBtn = document.getElementById('amzSkipBtn');
    const shuffleBtn = document.getElementById('amzShuffleBtn');
    const repeatBtn = document.getElementById('amzRepeatBtn');
    const heartBtn = document.getElementById('amzHeartBtn');
    const progressBar = document.getElementById('amzProgressBarContainer');

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

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isShuffle = !this.isShuffle;
        shuffleBtn.classList.toggle('active', this.isShuffle);
      });
    }

    if (repeatBtn) {
      repeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isRepeat = !this.isRepeat;
        repeatBtn.classList.toggle('active', this.isRepeat);
      });
    }

    if (heartBtn) {
      heartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isLiked = !this.isLiked;
        heartBtn.classList.toggle('liked', this.isLiked);
      });
    }

    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        this.trackElapsedSeconds = Math.floor(pct * this.trackDurationSeconds);
        this.updateScrubberUI();
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

    if (q.includes('bedtime') || q.includes('sleep') || q.includes('rain')) {
      const idx = this.catalog.findIndex(c => c.id === 'bedtime');
      this.selectCategory(idx >= 0 ? idx : 3, 0);
      return;
    }

    if (q.includes('disney') || q.includes('soundtrack') || q.includes('aladdin') || q.includes('frozen')) {
      const idx = this.catalog.findIndex(c => c.id === 'disney');
      this.selectCategory(idx >= 0 ? idx : 1, 0);
      return;
    }

    if (q.includes('lofi') || q.includes('study') || q.includes('chill')) {
      const idx = this.catalog.findIndex(c => c.id === 'lofi');
      this.selectCategory(idx >= 0 ? idx : 2, 0);
      return;
    }

    // Check for Taylor Swift or Pop Hits
    const popIdx = this.catalog.findIndex(c => c.id === 'pop');
    let trackIdx = 0;
    if (q.includes('taylor') || q.includes('cruel summer')) trackIdx = 0;
    else if (q.includes('sabrina') || q.includes('espresso')) trackIdx = 1;
    else if (q.includes('dua lipa')) trackIdx = 2;

    this.selectCategory(popIdx >= 0 ? popIdx : 0, trackIdx);
  },

  playCurrentTrack() {
    this.stopAudioStreamsOnly();

    const cat = this.catalog[this.currentCategoryIndex];
    const track = cat.tracks[this.currentTrackIndex];

    this.trackDurationSeconds = track.duration || 210;
    this.trackElapsedSeconds = 0;

    this.updatePlayerUI(track, cat.category);

    if (track.streamUrl === 'rain') {
      this.startRainSound();
    } else {
      if (!this.currentStreamAudio) {
        this.currentStreamAudio = document.getElementById('dashboardAudioPlayer');
      }
      if (this.currentStreamAudio) {
        this.currentStreamAudio.src = track.streamUrl;
        this.currentStreamAudio.play().catch(e => console.debug('Playback tap needed:', e));
      }
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.updatePlayPauseIcon(true);
    this.startScrubber();
  },

  skipNext() {
    const cat = this.catalog[this.currentCategoryIndex];
    if (this.isShuffle) {
      this.currentTrackIndex = Math.floor(Math.random() * cat.tracks.length);
    } else {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % cat.tracks.length;
    }
    this.playCurrentTrack();
    const track = cat.tracks[this.currentTrackIndex];
    return `${track.title} by ${track.artist}`;
  },

  skipPrevious() {
    const cat = this.catalog[this.currentCategoryIndex];
    this.currentTrackIndex = (this.currentTrackIndex - 1 + cat.tracks.length) % cat.tracks.length;
    this.playCurrentTrack();
    const track = cat.tracks[this.currentTrackIndex];
    return `${track.title} by ${track.artist}`;
  },

  togglePlayPause() {
    if (!this.isPlaying) {
      this.playCurrentTrack();
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
    this.stopScrubber();
  },

  resumeAudio() {
    const cat = this.catalog[this.currentCategoryIndex];
    const track = cat.tracks[this.currentTrackIndex];

    if (track.streamUrl === 'rain') {
      this.startRainSound();
    } else if (this.currentStreamAudio) {
      this.currentStreamAudio.play().catch(e => console.debug(e));
    }
    this.isPaused = false;
    this.updatePlayPauseIcon(true);
    this.startScrubber();
  },

  stopAudio() {
    this.stopAudioStreamsOnly();
    this.isPlaying = false;
    this.isPaused = false;
    this.stopScrubber();
    this.trackElapsedSeconds = 0;
    this.updateScrubberUI();
    this.updatePlayPauseIcon(false);
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

  updatePlayerUI(track, categoryName) {
    const artImg = document.getElementById('amzArtworkImg');
    const titleEl = document.getElementById('amzTrackTitle');
    const artistEl = document.getElementById('amzTrackArtist');
    const albumEl = document.getElementById('amzTrackAlbum');
    const badgeEl = document.getElementById('amzCategoryBadge');

    if (artImg) artImg.src = track.artwork;
    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (albumEl) albumEl.textContent = `${track.album} · ${categoryName}`;
    if (badgeEl) badgeEl.textContent = categoryName;

    this.updateScrubberUI();
  },

  startScrubber() {
    this.stopScrubber();
    this.scrubberIntervalId = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        this.trackElapsedSeconds++;
        if (this.trackElapsedSeconds >= this.trackDurationSeconds) {
          if (this.isRepeat) {
            this.trackElapsedSeconds = 0;
          } else {
            this.skipNext();
          }
        }
        this.updateScrubberUI();
      }
    }, 1000);
  },

  stopScrubber() {
    if (this.scrubberIntervalId) {
      clearInterval(this.scrubberIntervalId);
      this.scrubberIntervalId = null;
    }
  },

  updateScrubberUI() {
    const elapsedEl = document.getElementById('amzElapsed');
    const totalEl = document.getElementById('amzTotal');
    const fillEl = document.getElementById('amzProgressFill');

    if (elapsedEl) elapsedEl.textContent = this.formatTime(this.trackElapsedSeconds);
    if (totalEl) totalEl.textContent = this.formatTime(this.trackDurationSeconds);

    if (fillEl) {
      const pct = Math.min(100, (this.trackElapsedSeconds / this.trackDurationSeconds) * 100);
      fillEl.style.width = `${pct}%`;
    }
  },

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  },

  updatePlayPauseIcon(playing) {
    const icon = document.getElementById('amzPlayPauseIcon');
    const equalizers = document.querySelectorAll('.equalizer-bar');

    if (icon) {
      if (playing) {
        icon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // Pause
      } else {
        icon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>'; // Play
      }
    }

    equalizers.forEach(bar => {
      bar.classList.toggle('animating', playing);
    });
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
      console.warn('Rain generator error:', e);
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
      console.debug('Keep-alive pulse waiting for interaction.');
    }
  }
};
