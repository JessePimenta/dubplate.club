class VideoExporter {
  constructor(imageHandler, audioHandler) {
    this.imageHandler = imageHandler;
    this.audioHandler = audioHandler;
    this.exportBtn = document.getElementById('exportBtn');
    this.status = document.getElementById('status');

    this.exportBtn.addEventListener('click', () => this.export());
  }

  async export() {
    try {
      const regions = this.audioHandler.getRegions();
      const region = regions[0];
      if (!region) {
        alert('Please select a region in the audio waveform');
        return;
      }

      const img = this.imageHandler.record.querySelector('img');
      if (!img) {
        alert('Please select an image first');
        return;
      }

      const audioFile = this.audioHandler.audioInput.files[0];
      if (!audioFile) {
        alert('Please select an audio file first');
        return;
      }

      this.exportBtn.disabled = true;
      this.status.textContent = 'Generating video...';

      await this.generateVideo(img, audioFile, region);
    } catch (error) {
      console.error('Export error:', error);
      this.status.textContent = 'Error exporting video';
      this.exportBtn.disabled = false;
    }
  }

  async generateVideo(img, audioFile, region) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const audioContext = new AudioContext();
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(audioFile);
    const source = audioContext.createMediaElementSource(audioElement);
    const dest = audioContext.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioContext.destination);

    const stream = canvas.captureStream();
    const audioStream = dest.stream;
    const tracks = [...stream.getVideoTracks(), ...audioStream.getAudioTracks()];
    const recorder = new MediaRecorder(new MediaStream(tracks), {
      mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      videoBitsPerSecond: 12000000
    });

    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/quicktime' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'record-video.mov';
      a.click();
      URL.revokeObjectURL(url);
      this.status.textContent = 'Video exported!';
      this.exportBtn.disabled = false;
      audioContext.close();
    };

    recorder.start();
    audioElement.currentTime = region.start;
    audioElement.play();

    const duration = (region.end - region.start) * 1000;
    const startTime = Date.now();
    const secondsPerRotation = 4.2;
    const rpm = 60 / secondsPerRotation;
    const degreesPerFrame = (rpm * 360) / 60;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        recorder.stop();
        audioElement.pause();
        return;
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  }
}