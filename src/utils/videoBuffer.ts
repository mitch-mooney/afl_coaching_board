export interface BufferedRange {
  start: number;
  end: number;
}

/** Adapter: read a video element's buffered TimeRanges as plain {start,end} objects. */
export function getBufferedRanges(video: HTMLVideoElement): BufferedRange[] {
  const ranges: BufferedRange[] = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
  }
  return ranges;
}

/**
 * Percentage (0..100) of the video duration that is buffered — sum of the
 * buffered range lengths over duration, capped at 100. Returns 0 when duration
 * is 0/falsy or nothing is buffered.
 */
export function calculateBufferedPercent(ranges: BufferedRange[], duration: number): number {
  if (!duration || duration === 0) return 0;
  if (ranges.length === 0) return 0;
  let total = 0;
  for (const range of ranges) total += range.end - range.start;
  return Math.min((total / duration) * 100, 100);
}
