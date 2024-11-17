class AudioHandler {
  constructor() {
    // Create WaveSurfer instance with correct container reference
    this.wavesurfer = WaveSurfer.create({
      container: document.querySelector('#waveform'),
      waveColor: '#4a9eff',
      progressColor: '#1976D2',
      height: 80,
      cursorWidth: 2,
      cursorColor: '#fff',
      barWidth: 2,
      barGap: 1,
      responsive: true,
      normalize: true,
      minPxPerSec: 50,
      plugins: [
        WaveSurfer.RegionsPlugin.create({
          dragSelection: {
            color: 'rgba(74, 158, 255, 0.3)'
          }
        })
      ]
    });

    // Get DOM elements
    this.audioInput = document.getElementById('audioInput');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.currentTime = document.getElementById('currentTime');
    this.totalTime = document.getElementById('totalTime');
    this.status = document.getElementById('status');

    // Initialize state
    this.activeRegion = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // File upload handler
    this.audioInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const audioURL = URL.createObjectURL(file);
          await this.wavesurfer.load(audioURL);
          this.status.textContent = 'Audio loaded. Click and drag to select a region.';
        } catch (error) {
          console.error('Error loading audio:', error);
          this.status.textContent = 'Error loading audio file.';
        }
      }
    });

    // Playback controls
    this.playPauseBtn.addEventListener('click', () => {
      this.wavesurfer.playPause();
      this.playPauseBtn.textContent = this.wavesurfer.isPlaying() ? 'Pause' : 'Play';
    });

    this.stopBtn.addEventListener('click', () => {
      this.wavesurfer.stop();
      this.playPauseBtn.textContent = 'Play';
    });

    // WaveSurfer events
    this.wavesurfer.on('ready', () => {
      this.playPauseBtn.disabled = false;
      this.stopBtn.disabled = false;
      this.totalTime.textContent = formatTime(this.wavesurfer.getDuration());
    });

    this.wavesurfer.on('audioprocess', () => {
      this.currentTime.textContent = formatTime(this.wavesurfer.getCurrentTime());
    });

    this.wavesurfer.on('finish', () => {
      this.playPauseBtn.textContent = 'Play';
    });

    // Region events
    this.wavesurfer.on('region-created', (region) => {
      // Remove any existing regions before adding new one
      const regions = this.getRegions();
      regions.forEach(r => {
        if (r !== region) {
          r.remove();
        }
      });

      region.setOptions({
        color: 'rgba(74, 158, 255, 0.3)',
        drag: true,
        resize: true
      });
    });

    this.wavesurfer.on('region-clicked', (region, e) => {
      e.stopPropagation();
      this.activeRegion = region;
      region.play();
    });

    this.wavesurfer.on('interaction', () => {
      this.activeRegion = null;
    });
  }

  getRegions() {
    return this.wavesurfer.regions.getRegions();
  }
}