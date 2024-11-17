document.addEventListener('DOMContentLoaded', () => {
  // Create WaveSurfer instance
  const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#262626',
    progressColor: '#ffffff',
    height: 80,
    normalize: true,
    plugins: [
      WaveSurfer.regions.create({
        dragSelection: true,
        color: 'rgba(239,250,206, 0.6)'
      })
    ]
  });

  // Get DOM elements
  const imageInput = document.getElementById('imageInput');
  const backgroundInput = document.getElementById('backgroundInput');
  const record = document.getElementById('record');
  const previewBtn = document.getElementById('previewBtn');
  const exportBtn = document.getElementById('exportBtn');
  const audioInput = document.getElementById('audioInput');
  const playBtn = document.getElementById('playPauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const currentTime = document.getElementById('currentTime');
  const totalTime = document.getElementById('totalTime');
  
  let backgroundElement = null;
  let hasBackground = false;
  let hasRegion = false;

  // Load default artwork
  const defaultArtwork = new Image();
  defaultArtwork.onload = () => {
    record.innerHTML = '';
    record.appendChild(defaultArtwork);
    previewBtn.disabled = false;
  };
  defaultArtwork.src = 'https://i.imgur.com/GIfl2Ov.jpeg';

  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function updateRegionTime(region) {
    const duration = region.end - region.start;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    status.textContent = `clip length is (${minutes}:${seconds.toString().padStart(2, '0')}). export video to generate.`;
  }

  // Handle artwork upload
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.onload = () => {
        record.innerHTML = '';
        record.appendChild(img);
        previewBtn.disabled = false;
        status.textContent = 'artwork loaded';
      };
    }
  });

  // Handle background upload
  backgroundInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Remove existing background if any
    const existingBg = document.querySelector('.background-layer');
    const existingOverlay = document.querySelector('.overlay-layer');
    if (existingBg) existingBg.remove();
    if (existingOverlay) existingOverlay.remove();

    const url = URL.createObjectURL(file);
    const previewContainer = document.querySelector('.preview-container');

    // Create background element
    if (file.type.startsWith('video/')) {
      backgroundElement = document.createElement('video');
      backgroundElement.autoplay = true;
      backgroundElement.loop = true;
      backgroundElement.muted = true;
    } else {
      backgroundElement = document.createElement('img');
    }

    backgroundElement.src = url;
    backgroundElement.className = 'background-layer';
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay-layer';

    // Create delete button
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-background';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = removeBackground;

    // Add elements to container
    previewContainer.insertBefore(backgroundElement, previewContainer.firstChild);
    previewContainer.insertBefore(overlay, backgroundElement.nextSibling);
    previewContainer.appendChild(deleteBtn);

    hasBackground = true;
    status.textContent = 'background added';
  });

  function removeBackground() {
    const bg = document.querySelector('.background-layer');
    const overlay = document.querySelector('.overlay-layer');
    const deleteBtn = document.querySelector('.delete-background');
    
    if (bg) bg.remove();
    if (overlay) overlay.remove();
    if (deleteBtn) deleteBtn.remove();
    
    hasBackground = false;
    backgroundElement = null;
    status.textContent = 'background removed';
  }

  // Handle preview toggle
  previewBtn.addEventListener('click', () => {
    if (record.classList.contains('rotating')) {
      record.classList.remove('rotating');
      previewBtn.textContent = 'Preview';
    } else {
      record.classList.add('rotating');
      previewBtn.textContent = 'stop Preview';
    }
  });

  // Handle audio upload
  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      wavesurfer.load(url);
      status.textContent = 'select a region to export';
      hasRegion = false;
      exportBtn.disabled = true;
    }
  });

  // Enable buttons when audio is ready
  wavesurfer.on('ready', () => {
    playBtn.disabled = false;
    stopBtn.disabled = false;
    totalTime.textContent = formatTime(wavesurfer.getDuration());
  });

  // Handle region creation and updates
  wavesurfer.on('region-created', (region) => {
    // Remove any existing regions
    const regions = wavesurfer.regions.list;
    Object.keys(regions).forEach(id => {
      if (id !== region.id) {
        regions[id].remove();
      }
    });
    hasRegion = true;
    exportBtn.disabled = false;
    updateRegionTime(region);
  });

  wavesurfer.on('region-update-end', (region) => {
    updateRegionTime(region);
  });

  // Handle region removal
  wavesurfer.on('region-removed', () => {
    hasRegion = false;
    exportBtn.disabled = true;
    status.textContent = 'select a region to export';
  });

  // Update current time
  wavesurfer.on('audioprocess', () => {
    currentTime.textContent = formatTime(wavesurfer.getCurrentTime());
  });

  // Play/Pause
  playBtn.addEventListener('click', () => {
    wavesurfer.playPause();
    const icon = playBtn.querySelector('i');
    icon.classList.toggle('fa-play');
    icon.classList.toggle('fa-pause');
  });

  // Stop
  stopBtn.addEventListener('click', () => {
    wavesurfer.stop();
    const icon = playBtn.querySelector('i');
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');
  });

  // Export functionality
  exportBtn.addEventListener('click', async () => {
    try {
      const regions = wavesurfer.regions.list;
      const region = Object.values(regions)[0];
      if (!region) {
        alert('please select a region in the audio waveform');
        return;
      }

      const img = record.querySelector('img');
      if (!img) {
        alert('Please select an image first');
        return;
      }

      const audioFile = audioInput.files[0];
      if (!audioFile) {
        alert('please select an audio file first');
        return;
      }

      exportBtn.disabled = true;
      status.textContent = 'generating video, please wait a moment...';

      // Create canvas for video
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Set up audio
      const audioContext = new AudioContext();
      const audioElement = new Audio();
      audioElement.src = URL.createObjectURL(audioFile);
      const source = audioContext.createMediaElementSource(audioElement);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);

      // Set up MediaRecorder
      const stream = canvas.captureStream(60);
      const audioStream = dest.stream;
      const tracks = [...stream.getVideoTracks(), ...audioStream.getAudioTracks()];
      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        audioBitsPerSecond: 256000,
        videoBitsPerSecond: 8000000
      });

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dubplate-club.mp4';
        a.click();
        URL.revokeObjectURL(url);
        status.textContent = 'video exported';
        exportBtn.disabled = false;
        audioContext.close();
      };

      // Start recording
      recorder.start();
      
      const duration = (region.end - region.start) * 1000;
      const startTime = Date.now();
      const secondsPerRotation = 4.2;
      const rpm = 60 / secondsPerRotation;
      const degreesPerFrame = (rpm * 360) / 60;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
          recorder.stop();
          return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background if it exists
        if (hasBackground && backgroundElement) {
          // Scale up the background (1.5x like in CSS)
          const scaleFactor = 1.5;
          const scaledWidth = canvas.width * scaleFactor;
          const scaledHeight = canvas.height * scaleFactor;
          const offsetX = (scaledWidth - canvas.width) / -2;
          const offsetY = (scaledHeight - canvas.height) / -2;

          // Apply blur based on device width
          ctx.filter = `blur(${window.innerWidth <= 768 ? 34 : 44}px)`;
          ctx.drawImage(backgroundElement, offsetX, offsetY, scaledWidth, scaledHeight);

          // Add overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Black background if no background image
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw rotating record
        const rotation = (elapsed / 1000) * degreesPerFrame;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        const size = canvas.width - 40;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -size / 2, -size / 2, size, size);

        ctx.restore();

        requestAnimationFrame(animate);
      };

      animate();
      
      // Set audio time and play
      audioElement.currentTime = region.start;
      audioElement.play();
    } catch (error) {
      console.error('Export error:', error);
      status.textContent = 'Error exporting video';
      exportBtn.disabled = false;
    }
  });
});