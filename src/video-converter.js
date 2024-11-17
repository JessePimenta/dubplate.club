import { fetchFile } from '@ffmpeg/util';

export class VideoConverter {
  constructor(ffmpeg) {
    this.ffmpeg = ffmpeg;
  }

  async convert(file, { onProgress, onError, onComplete }) {
    try {
      // Write the input file to FFmpeg's virtual filesystem
      const inputFileName = `input${Date.now()}.mp4`;
      const outputFileName = `output${Date.now()}.mp4`;
      
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // Setup progress handler
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      // Run FFmpeg command with optimized settings
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'ultrafast', // Faster conversion
        '-crf', '28', // Balance between quality and file size
        '-c:a', 'aac',
        '-b:a', '128k',
        outputFileName
      ]);

      // Read the output file
      const data = await this.ffmpeg.readFile(outputFileName);
      const blob = new Blob([data], { type: 'video/mp4' });
      
      // Clean up files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      onComplete(blob);
    } catch (error) {
      console.error('Conversion error:', error);
      onError(error);
    }
  }
}