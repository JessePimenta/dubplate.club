document.addEventListener('DOMContentLoaded', () => {
  if (typeof WaveSurfer === 'undefined') {
    console.error('WaveSurfer not loaded');
    return;
  }

  const imageHandler = new ImageHandler();
  const audioHandler = new AudioHandler();
  new VideoExporter(imageHandler, audioHandler);
});