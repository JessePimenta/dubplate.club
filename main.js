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
        color: 'rgba(239,250,206, 0.6)',
        minLength: 10,
        maxLength: 60
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
  const status = document.getElementById('status');
  const currentTime = document.getElementById('currentTime');
  const totalTime = document.getElementById('totalTime');
  const tempoSlider = document.getElementById('tempoSlider');
  const tempoValue = document.getElementById('tempoValue');
  const resetTempoBtn = document.getElementById('resetTempo');
  const cropperModal = document.getElementById('cropperModal');
  const cropperImage = document.getElementById('cropperImage');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const cropDone = document.getElementById('cropDone');
  const artworkSlider = document.getElementById('artworkSlider');
  const artworkValue = document.getElementById('artworkValue');
  const resetArtwork = document.getElementById('resetArtwork');

  let backgroundElement = null;
  let hasBackground = false;
  let hasRegion = false;
  let audioContext = null;
  let source = null;
  let audioBuffer = null;
  let cropper = null;
  let secondsPerRotation = 4.2; // Default rotation value

  // Analytics tracking function
  function trackEvent(category, action, label = null) {
    if (typeof gtag !== 'undefined') {
      const eventData = {
        event_category: category,
        event_label: label
      };
      gtag('event', action, eventData);
    }
  }

  // Format time helper function
  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

function updateRegionTime(region) {
  // Calculate clamped duration once
  const duration = Math.min(Math.max(region.end - region.start, 10), 60);
  
  // Update region bounds if needed
  if (region.end - region.start !== duration) {
    region.end = region.start + duration;
  }

  // Format times using clamped duration
  const startTime = formatTime(region.start);
  const endTime = formatTime(region.start + duration);
  
  // Update status with clamped duration
  status.textContent = `clip length is ${duration.toFixed(1)}s (${startTime} - ${endTime})`;
}

  // Load default artwork
  const defaultArtwork = new Image();
  defaultArtwork.onload = () => {
    record.innerHTML = '';
    record.appendChild(defaultArtwork);
    previewBtn.disabled = false;
  };
  defaultArtwork.src = 'https://i.imgur.com/GIfl2Ov.jpeg';

  // Initialize Web Audio API context
  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Handle artwork upload
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      
      // Set up cropper
      cropperImage.src = url;
      cropperModal.style.display = 'block';
      
      if (cropper) {
        cropper.destroy();
      }
      
      cropper = new Cropper(cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        cropBoxResizable: false,
        cropBoxMovable: false,
        guides: false,
        center: true,
        highlight: false,
        background: false,
        modal: true,
      });

      trackEvent('Upload', 'artwork_upload', file.type);
    }
  });

  // Cropper controls
  zoomIn.addEventListener('click', () => {
    cropper.zoom(0.1);
  });

  zoomOut.addEventListener('click', () => {
    cropper.zoom(-0.1);
  });

  cropDone.addEventListener('click', () => {
    const canvas = cropper.getCroppedCanvas({
      width: 1080,
      height: 1080
    });

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = url;
      img.onload = () => {
        record.innerHTML = '';
        record.appendChild(img);
        previewBtn.disabled = false;
        status.textContent = 'artwork loaded';
      };
    });

    cropperModal.style.display = 'none';
    cropper.destroy();
    cropper = null;
  });

  // inspired by tempo adjust by nohup: https://miseryconfusion.com/bandcamp-tempo-adjust/
  // Handle tempo change 
  tempoSlider.addEventListener('input', (e) => {
    const tempo = parseFloat(e.target.value);
    tempoValue.textContent = `${tempo.toFixed(2)}x`;
    wavesurfer.setPlaybackRate(tempo);
    trackEvent('Interaction', 'adjust_tempo', tempo.toString());
  });

  // Reset tempo
  resetTempoBtn.addEventListener('click', () => {
    tempoSlider.value = "1";
    tempoValue.textContent = "1.00x";
    wavesurfer.setPlaybackRate(1);
    trackEvent('Interaction', 'reset_tempo');
  });

  // Handle background upload
  backgroundInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    trackEvent('Upload', 'background_upload', file.type);

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
      backgroundElement.loop = true;
      backgroundElement.muted = true;
      backgroundElement.playsInline = true;
      backgroundElement.setAttribute('playsinline', '');
      backgroundElement.setAttribute('webkit-playsinline', '');
      backgroundElement.setAttribute('x-webkit-airplay', 'allow');
      backgroundElement.setAttribute('data-type', 'video');
      
      // Wait for video to be loaded
      backgroundElement.addEventListener('loadedmetadata', () => {
        status.textContent = 'background video added (preview to play)';
      });
    } else {
      backgroundElement = document.createElement('img');
      status.textContent = 'background added';
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
  });

  function removeBackground() {
    const bg = document.querySelector('.background-layer');
    if (bg) {
      if (bg.tagName === 'VIDEO') {
        bg.pause();
      }
      bg.remove();
    }
    const overlay = document.querySelector('.overlay-layer');
    const deleteBtn = document.querySelector('.delete-background');
    
    if (overlay) overlay.remove();
    if (deleteBtn) deleteBtn.remove();
    
    hasBackground = false;
    backgroundElement = null;
    status.textContent = 'background removed';
    trackEvent('Interaction', 'remove_background');
  }

  // Handle preview toggle
  previewBtn.addEventListener('click', () => {
    const backgroundVideo = document.querySelector('.background-layer');
    const isStartingPreview = !record.classList.contains('rotating');
    
    if (record.classList.contains('rotating')) {
      record.classList.remove('rotating');
      previewBtn.textContent = 'Preview';
      if (backgroundVideo && backgroundVideo.tagName === 'VIDEO') {
        backgroundVideo.pause();
      }
    } else {
      record.classList.add('rotating');
      previewBtn.textContent = 'Stop Preview';
      if (backgroundVideo && backgroundVideo.tagName === 'VIDEO') {
        try {
          const playPromise = backgroundVideo.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Video play error:', error);
            });
          }
        } catch (error) {
          console.error('Video play error:', error);
        }
      }
    }
    trackEvent('Interaction', isStartingPreview ? 'start_preview' : 'stop_preview');
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
      trackEvent('Upload', 'audio_upload', file.type);
    }
  });

  // Enable buttons when audio is ready
  wavesurfer.on('ready', () => {
    playBtn.disabled = false;
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
    trackEvent('Interaction', 'create_region', `${formatTime(region.end - region.start)}`);
  });

  wavesurfer.on('region-update-end', (region) => {
    updateRegionTime(region);
    trackEvent('Interaction', 'update_region', `${formatTime(region.end - region.start)}`);
  });

  // Handle region removal
  wavesurfer.on('region-removed', () => {
    hasRegion = false;
    exportBtn.disabled = true;
    status.textContent = 'select a region to export';
    trackEvent('Interaction', 'remove_region');
  });

  // Update current time
  wavesurfer.on('audioprocess', () => {
    currentTime.textContent = formatTime(wavesurfer.getCurrentTime());
  });

  // Play/Pause
  playBtn.addEventListener('click', () => {
    wavesurfer.playPause();
    const isPlaying = wavesurfer.isPlaying();
    trackEvent('Interaction', isPlaying ? 'pause_audio' : 'play_audio');
    const icon = playBtn.querySelector('i');
    icon.classList.toggle('fa-play');
    icon.classList.toggle('fa-pause');
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
      status.textContent = 'creating video, please wait a moment...';

      // Create canvas for video
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Set up audio
      const audioContext = new AudioContext();
      const audioElement = new Audio();
      audioElement.src = URL.createObjectURL(audioFile);
      audioElement.playbackRate = parseFloat(tempoSlider.value);
      const source = audioContext.createMediaElementSource(audioElement);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest); // Connect to recording destination
      const monitorNode = audioContext.createGain();
      monitorNode.gain.value = 0; // Mute monitoring but keep recording
      source.connect(monitorNode);
      monitorNode.connect(audioContext.destination);

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

        source.disconnect();
        monitorNode.disconnect();
        // audioContext.close();
      };

      // Start recording
      recorder.start();
      
      const duration = Math.min(Math.max(region.end - region.start, 10), 60) * 1000;
      const startTime = Date.now();
      const secondsPerRotation = 4.2;
      const rpm = 60 / secondsPerRotation;
      const degreesPerFrame = (rpm * 360) / 60;

      // If there's a video background, start playing it
      if (backgroundElement && backgroundElement.tagName === 'VIDEO') {
        backgroundElement.currentTime = 0;
        await backgroundElement.play();
      }

      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
          if (backgroundElement && backgroundElement.tagName === 'VIDEO') {
            backgroundElement.pause();
          }
          recorder.stop();
          return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background if it exists
        if (hasBackground && backgroundElement) {
          const scaleFactor = 1.5;
          const scaledWidth = canvas.width * scaleFactor;
          const scaledHeight = canvas.height * scaleFactor;
          const offsetX = (scaledWidth - canvas.width) / -2;
          const offsetY = (scaledHeight - canvas.height) / -2;

          // Draw background
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
      audioElement.playbackRate = parseFloat(tempoSlider.value);
      audioElement.play();
    } catch (error) {
      console.error('Export error:', error);
      status.textContent = 'Error exporting video';
      exportBtn.disabled = false;
    }
  });
});