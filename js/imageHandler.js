class ImageHandler {
  constructor() {
    this.imageInput = document.getElementById('imageInput');
    this.record = document.getElementById('record');
    this.previewBtn = document.getElementById('previewBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.status = document.getElementById('status');
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
    this.previewBtn.addEventListener('click', () => this.togglePreview());
  }

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        this.record.innerHTML = '';
        this.record.appendChild(img);
        this.previewBtn.disabled = false;
        this.exportBtn.disabled = false;
        this.status.textContent = 'Image loaded. Click Preview to see the rotation.';
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }
  }

  togglePreview() {
    if (this.record.classList.contains('rotating')) {
      this.record.classList.remove('rotating');
      this.previewBtn.textContent = 'Preview Rotation';
    } else {
      this.record.classList.add('rotating');
      this.previewBtn.textContent = 'Stop Preview';
    }
  }
}