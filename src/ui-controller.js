export class UIController {
  constructor() {
    this.elements = {
      status: document.getElementById('status'),
      progress: document.getElementById('progress'),
      convertBtn: document.getElementById('convertBtn'),
      videoInput: document.getElementById('videoInput'),
      preview: document.getElementById('preview')
    };
  }

  updateStatus(message) {
    this.elements.status.textContent = message;
  }

  updateProgress(value) {
    this.elements.progress.style.display = 'block';
    this.elements.progress.value = value;
  }

  hideProgress() {
    this.elements.progress.style.display = 'none';
  }

  setConvertButtonState(enabled) {
    this.elements.convertBtn.disabled = !enabled;
  }

  showPreview(url) {
    this.elements.preview.src = url;
    this.elements.preview.style.display = 'block';
  }

  hidePreview() {
    this.elements.preview.style.display = 'none';
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}