import { useAnimationStore } from '../store/animationStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { getPositionAtProgressWithEasing, easeInOut, pathHasMovement } from './pathAnimation';
import { MovementPath } from '../models/PathModel';

export interface EntityPath {
  path: MovementPath;
  kind: 'player' | 'ball';
  id: string;
}

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
