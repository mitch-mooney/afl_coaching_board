import { useFrame } from '@react-three/fiber';
import { useAnimationStore } from '../store/animationStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import {
  getPositionAtProgressWithEasing,
  easeInOut,
  pathHasMovement,
} from '../utils/pathAnimation';
import { MovementPath } from '../models/PathModel';

/**
 * usePathPlayback - Drives the draw-and-play animation.
 *
 * Each drawn path (one per player, one for the ball) is played back along a
 * single shared 0..1 progress clock in animationStore. The clock advances at
 * `speed`, scaled so the longest path finishes exactly at progress = 1; shorter
 * paths reach their end earlier and hold.
 *
 * Positions are only driven while playing — when paused or stopped the tokens
 * stay put, so the coach can keep dragging players freely during setup. (A
 * board scrubber, once added, would call positionEntitiesAtProgress directly.)
 *
 * This replaces the former scripted-event engine (useAnimationPlayback): there
 * are no multi-phase events, just the paths the coach draws on the board.
 */

interface EntityPath {
  path: MovementPath;
  kind: 'player' | 'ball';
  id: string;
}

/** Collect the current movement paths for all players and the ball. */
function collectEntityPaths(): EntityPath[] {
  const players = usePlayerStore.getState().players;
  const { getPathByEntity } = usePathStore.getState();
  const entityPaths: EntityPath[] = [];

  for (const player of players) {
    const path = getPathByEntity(player.id, 'player');
    if (path && pathHasMovement(path)) {
      entityPaths.push({ path, kind: 'player', id: player.id });
    }
  }

  const ball = useBallStore.getState().ball;
  if (ball) {
    const ballPath = getPathByEntity(ball.id, 'ball');
    if (ballPath && pathHasMovement(ballPath)) {
      entityPaths.push({ path: ballPath, kind: 'ball', id: ball.id });
    }
  }

  return entityPaths;
}

/**
 * Position every entity for a given global progress (0..1). The longest path
 * maps directly to [0,1]; each other path advances in real time alongside it
 * and clamps at its own end.
 */
function positionEntitiesAtProgress(progress: number, entityPaths: EntityPath[]): void {
  if (entityPaths.length === 0) return;

  const globalDurationSec = Math.max(...entityPaths.map((e) => e.path.duration));
  if (globalDurationSec <= 0) return;

  const elapsedSec = Math.min(1, Math.max(0, progress)) * globalDurationSec;

  const playerUpdates: PlayerUpdate[] = [];
  for (const entity of entityPaths) {
    const localProgress =
      entity.path.duration > 0 ? Math.min(1, elapsedSec / entity.path.duration) : 0;
    const position = getPositionAtProgressWithEasing(entity.path, localProgress, easeInOut);
    if (entity.kind === 'player') {
      playerUpdates.push({ playerId: entity.id, position });
    } else {
      useBallStore.getState().updateBallPosition(position);
    }
  }

  if (playerUpdates.length > 0) {
    usePlayerStore.getState().updateMultiplePlayers(playerUpdates);
  }
}

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
