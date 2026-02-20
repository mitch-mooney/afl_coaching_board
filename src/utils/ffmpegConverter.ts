import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

export type ConversionProgress = {
  phase: 'loading' | 'converting' | 'done';
  progress: number; // 0-1
};

async function getFFmpeg(onProgress?: (progress: ConversionProgress) => void): Promise<FFmpeg> {
  if (ffmpeg && loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.({ phase: 'converting', progress: Math.min(progress, 1) });
  });

  onProgress?.({ phase: 'loading', progress: 0 });

  // Load FFmpeg WASM files from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  onProgress?.({ phase: 'loading', progress: 1 });
  return ffmpeg;
}

export async function convertWebMToMP4(
  webmBlob: Blob,
  onProgress?: (progress: ConversionProgress) => void
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);

  onProgress?.({ phase: 'converting', progress: 0 });

  // Write input file
  await ff.writeFile('input.webm', await fetchFile(webmBlob));

  // Convert WebM to MP4
  await ff.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', 'output.mp4']);

  // Read output file
  const data = await ff.readFile('output.mp4');

  // Clean up
  await ff.deleteFile('input.webm');
  await ff.deleteFile('output.mp4');

  onProgress?.({ phase: 'done', progress: 1 });

  // Convert to a regular ArrayBuffer for Blob compatibility
  const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const copy = new Uint8Array(uint8.length);
  copy.set(uint8);
  return new Blob([copy], { type: 'video/mp4' });
}
