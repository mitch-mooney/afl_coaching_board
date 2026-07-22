import { useAnimationStore } from '../store/animationStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { pathHasMovement } from './pathAnimation';
import { positionsAtProgress, type EntityPath } from './boardPlayback';

export type { EntityPath };

/** Collect the current movement paths for all players and the ball. */
export function collectEntityPaths(): EntityPath[] {
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
export function positionEntitiesAtProgress(progress: number, entityPaths: EntityPath[]): void {
  const playerUpdates: PlayerUpdate[] = [];
  for (const { id, kind, position } of positionsAtProgress(entityPaths, progress)) {
    if (kind === 'player') {
      playerUpdates.push({ playerId: id, position });
    } else {
      useBallStore.getState().updateBallPosition(position);
    }
  }

  if (playerUpdates.length > 0) {
    usePlayerStore.getState().updateMultiplePlayers(playerUpdates);
  }
}

/**
 * Scrub the board to an absolute progress (0..1): reposition every entity for
 * that progress from the current paths, then record it in animationStore. Safe
 * to call while paused (unlike the playing useFrame loop).
 */
export function scrubTo(progress: number): void {
  const clamped = Math.max(0, Math.min(1, progress));
  positionEntitiesAtProgress(clamped, collectEntityPaths());
  useAnimationStore.getState().setProgress(clamped);
}
