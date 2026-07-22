import { useFrame } from '@react-three/fiber';
import { useAnimationStore } from '../store/animationStore';
import { collectEntityPaths, positionEntitiesAtProgress } from '../utils/boardScrub';

/**
 * usePathPlayback - Drives the draw-and-play animation.
 *
 * Each drawn path (one per player, one for the ball) is played back along a
 * single shared 0..1 progress clock in animationStore. The clock advances at
 * `speed`, scaled so the longest path finishes exactly at progress = 1; shorter
 * paths reach their end earlier and hold.
 *
 * Positions are only driven while playing — when paused or stopped the tokens
 * stay put, so the coach can keep dragging players freely during setup. (The
 * board scrubber calls `scrubTo` in `utils/boardScrub.ts`, which positions
 * entities directly while paused.)
 *
 * This replaces the former scripted-event engine (useAnimationPlayback): there
 * are no multi-phase events, just the paths the coach draws on the board.
 */

export function usePathPlayback(): void {
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const speed = useAnimationStore((state) => state.speed);
  const loop = useAnimationStore((state) => state.loop);

  // Advance and position while playing.
  useFrame((_, delta) => {
    if (!isPlaying) return;

    const entityPaths = collectEntityPaths();
    if (entityPaths.length === 0) return;

    const globalDurationSec = Math.max(...entityPaths.map((e) => e.path.duration));
    if (globalDurationSec <= 0) return;

    const current = useAnimationStore.getState().progress;
    const next = current + (delta * speed) / globalDurationSec;

    if (next >= 1) {
      positionEntitiesAtProgress(1, entityPaths);
      if (loop) {
        // Restart from the beginning on the next frame.
        useAnimationStore.getState().setProgress(0);
      } else {
        // setProgress(>=1) flips playbackState to paused and pins progress at 1.
        useAnimationStore.getState().setProgress(1);
      }
      return;
    }

    positionEntitiesAtProgress(next, entityPaths);
    useAnimationStore.getState().setProgress(next);
  });
}
