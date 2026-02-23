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

/**
 * Trim a video blob and convert to MP4.
 * MP4 inputs use stream copy for speed; WebM inputs are re-encoded.
 */
export async function trimAndConvertVideo(
  inputBlob: Blob,
  trimStart: number,
  trimEnd: number,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; duration: number }> {
  const ff = await getFFmpeg(onProgress);
  const trimDuration = trimEnd - trimStart;
  const isMP4 = inputBlob.type === 'video/mp4' || inputBlob.type === 'video/quicktime';
  const inputName = isMP4 ? 'trim_input.mp4' : 'trim_input.webm';
  const outputName = 'trim_output.mp4';

  onProgress?.({ phase: 'converting', progress: 0 });

  await ff.writeFile(inputName, await fetchFile(inputBlob));

  if (isMP4) {
    // Fast path: stream copy, no re-encode
    await ff.exec([
      '-ss', String(trimStart),
      '-i', inputName,
      '-t', String(trimDuration),
      '-c', 'copy',
      outputName,
    ]);
  } else {
    // Re-encode WebM to MP4 with slightly more compression
    await ff.exec([
      '-ss', String(trimStart),
      '-i', inputName,
      '-t', String(trimDuration),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      outputName,
    ]);
  }

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  onProgress?.({ phase: 'done', progress: 1 });

  const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const copy = new Uint8Array(uint8.length);
  copy.set(uint8);
  return { blob: new Blob([copy], { type: 'video/mp4' }), duration: trimDuration };
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
