import { useEffect, useState } from 'react';
import { useVideoStore } from '../store/videoStore';
import { getBufferedRanges, calculateBufferedPercent } from '../utils/videoBuffer';

/**
 * Buffer state information for streaming video
 */
export interface BufferState {
  /** Whether the video is currently buffering */
  isBuffering: boolean;
  /** Percentage of video that has been buffered (0-100) */
  bufferedPercent: number;
  /** Array of buffered time ranges */
  bufferedRanges: Array<{ start: number; end: number }>;
  /** Whether enough data is buffered for smooth playback */
  canPlayThrough: boolean;
}

const DEFAULT_BUFFER_STATE: BufferState = {
  isBuffering: false,
  bufferedPercent: 0,
  bufferedRanges: [],
  canPlayThrough: false,
};

/**
 * Owns the buffering state for the loaded video: wires the waiting/canplay/
 * canplaythrough/progress/stalled listeners and returns the current BufferState.
 * Extracted from useVideoPlayback — the buffering concern shares nothing with
 * its sync/transport code. Keyed off the store's videoElement (the source of
 * truth) so the listeners attach/migrate whenever the element appears or changes.
 */
export function useVideoBuffering(): BufferState {
  const videoElement = useVideoStore((s) => s.videoElement);
  const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);

  useEffect(() => {
    const video = videoElement;
    if (!video) return;

    // Buffering event handlers for streaming large videos
    const handleWaiting = () => {
      // Video is waiting for more data - buffering
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    const handleCanPlay = () => {
      // Enough data to start playing
      setBufferState((prev) => ({
        ...prev,
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleCanPlayThrough = () => {
      // Enough data buffered to play through without interruption
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: true,
      });
    };

    const handleProgress = () => {
      // New data has been downloaded
      setBufferState((prev) => ({
        ...prev,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleStalled = () => {
      // Download has stalled unexpectedly
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('stalled', handleStalled);

    // Initialize buffer state if video already has buffered data
    if (video.buffered.length > 0) {
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: video.readyState >= 4,
      });
    }

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [videoElement]);

  return bufferState;
}
