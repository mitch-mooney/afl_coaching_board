import { useEffect, type RefObject } from 'react';
import { useVideoStore } from '../store/videoStore';

export interface VideoSyncState {
  src: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
}

/**
 * Reconcile a <video> element to the desired playback state. Sets src only when
 * it differs, plays/pauses on the transition, seeks only when the element has
 * drifted > 0.5s from the target, and applies volume/mute. play() rejections
 * (autoplay policy) are swallowed, matching the previous inline behaviour.
 */
export function syncVideoElement(el: HTMLVideoElement, state: VideoSyncState): void {
  if (state.src && el.src !== state.src) el.src = state.src;
  if (state.isPlaying && el.paused) el.play().catch(() => {});
  else if (!state.isPlaying && !el.paused) el.pause();
  if (Math.abs(el.currentTime - state.currentTime) > 0.5) el.currentTime = state.currentTime;
  el.volume = state.volume;
  el.muted = state.isMuted;
}

/**
 * Keep a local <video> element mirrored to the shared videoStore playback state.
 * Used by the Video-tab workspace and the Board-tab PiP overlay.
 */
export function useVideoElementSync(videoRef: RefObject<HTMLVideoElement | null>): void {
  const videoElement = useVideoStore((s) => s.videoElement);
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const currentTime = useVideoStore((s) => s.currentTime);
  const volume = useVideoStore((s) => s.volume);
  const isMuted = useVideoStore((s) => s.isMuted);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoElement) return;
    syncVideoElement(el, { src: videoElement.src, isPlaying, currentTime, volume, isMuted });
  }, [videoRef, videoElement, isPlaying, currentTime, volume, isMuted]);
}
