import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class FFmpegLoader {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.loaded = false;
  }

  async load(statusCallback) {
    if (this.loaded) return this.ffmpeg;

    try {
      statusCallback('Loading FFmpeg...');
      
      // Create blob URLs for the FFmpeg core files
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      );
      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      );

      // Load FFmpeg with the correct configuration
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
        logger: () => {}, // Disable verbose logging
      });

      this.loaded = true;
      statusCallback('FFmpeg is ready!');
      return this.ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      statusCallback('Failed to load FFmpeg. Please refresh the page.');
      throw error;
    }
  }
}

export const ffmpegLoader = new FFmpegLoader();