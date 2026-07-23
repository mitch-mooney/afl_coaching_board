import { useAnimationStore, type AnimationSpeed } from '../../../store/animationStore';
import { scrubTo } from '../../../utils/boardScrub';

/**
 * Shared board-transport bindings for the transport widgets (PlayFab, TransportBar).
 * Owns the animationStore bindings + the derived scrub/stop actions; each widget
 * renders its own layout. Mirrors the §6b shared-control-hook pattern.
 */
export interface TransportControls {
  isPlaying: boolean;
  hasAnimation: boolean;
  progress: number; // 0..1
  speed: AnimationSpeed;
  togglePlayback: () => void;
  cycleSpeed: () => void;
  /** Reposition the board to an absolute progress (0..1); works while paused. */
  scrub: (progress01: number) => void;
  /** Pause if playing, then rewind to the start. */
  stop: () => void;
}

export function useTransportControls(): TransportControls {
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const hasAnimation = useAnimationStore((s) => s.hasAnimation);
  const progress = useAnimationStore((s) => s.progress);
  const speed = useAnimationStore((s) => s.speed);
  const togglePlayback = useAnimationStore((s) => s.togglePlayback);
  const cycleSpeed = useAnimationStore((s) => s.cycleSpeed);

  const stop = () => {
    if (isPlaying) togglePlayback();
    scrubTo(0);
  };

  return {
    isPlaying,
    hasAnimation,
    progress,
    speed,
    togglePlayback,
    cycleSpeed,
    scrub: scrubTo,
    stop,
  };
}
