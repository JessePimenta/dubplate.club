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
  
  let backgroundElement = null;
  let hasBackground = false;
  let hasRegion = false;
  let animationFrameId = null;

  // Function to get supported mime type
  function getSupportedMimeType() {
    const types = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
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
        status.textContent = 'Artwork loaded. Add a background or audio to continue.';
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
    status.textContent = 'Background added. Add audio to continue.';
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
    status.textContent = 'Background removed.';
  }

  // Handle preview toggle
  previewBtn.addEventListener('click', () => {
    if (record.classList.contains('rotating')) {
      record.classList.remove('rotating');
      previewBtn.textContent = 'Preview';
    } else {
      record.classList.add('rotating');
      previewBtn.textContent = 'Stop Preview';
    }
  });

  // Handle audio upload
  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      wavesurfer.load(url);
      status.textContent = 'Select a region to export';
      hasRegion = false;
      exportBtn.disabled = true;
    }
  });

  // Enable buttons when audio is ready
  wavesurfer.on('ready', () => {
    playBtn.disabled = false;
    stopBtn.disabled = false;
  });

  // Handle region creation
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
    status.textContent = 'Region selected. Click Export Video to generate.';
  });

  // Handle region removal
  wavesurfer.on('region-removed', () => {
    hasRegion = false;
    exportBtn.disabled = true;
    status.textContent = 'Select a region to export';
  });

  // Play/Pause
  playBtn.addEventListener('click', () => {
    wavesurfer.playPause();
    playBtn.textContent = wavesurfer.isPlaying() ? 'Pause' : 'Play';
  });

  // Stop
  stopBtn.addEventListener('click', () => {
    wavesurfer.stop();
    playBtn.textContent = 'Play';
  });

  // Export functionality
  exportBtn.addEventListener('click', async () => {
    try {
      const regions = wavesurfer.regions.list;
      const region = Object.values(regions)[0];
      if (!region) {
        alert('Please select a region in the audio waveform');
        return;
      }

      const img = record.querySelector('img');
      if (!img) {
        alert('Please select an image first');
        return;
      }

      const audioFile = audioInput.files[0];
      if (!audioFile) {
        alert('Please select an audio file first');
        return;
      }

      exportBtn.disabled = true;
      status.textContent = 'Generating video...';

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
      source.connect(audioContext.destination);

      // Set up MediaRecorder with supported mime type
      const stream = canvas.captureStream();
      const audioStream = dest.stream;
      const tracks = [...stream.getVideoTracks(), ...audioStream.getAudioTracks()];
      const mimeType = getSupportedMimeType();
      
      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 12000000
      });

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'record-video.mp4';
        a.click();
        URL.revokeObjectURL(url);
        status.textContent = 'Video exported!';
        exportBtn.disabled = false;
        audioContext.close();
      };

      recorder.start();
      audioElement.currentTime = region.start;
      audioElement.play();

      const duration = (region.end - region.start) * 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
          cancelAnimationFrame(animationFrameId);
          recorder.stop();
          audioElement.pause();
          return;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Match CSS animation: 360 degrees per 4.2 seconds
        const degreesPerSecond = 360 / 4.2;
        const rotation = (elapsed / 1000) * degreesPerSecond;
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        const size = canvas.width - 40;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -size / 2, -size / 2, size, size);

        ctx.restore();

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
    } catch (error) {
      console.error('Export error:', error);
      status.textContent = 'Error exporting video';
      exportBtn.disabled = false;
    }
  });
});