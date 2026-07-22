import type { MovementPath } from '../models/PathModel';
import type { BoardSnapshot } from './boardSnapshot';
import { getPositionAtProgressWithEasing, easeInOut, pathHasMovement } from './pathAnimation';

/**
 * boardPlayback — the pure "where is everything at t" query. Given the entity
 * paths and a global progress (0..1), returns each entity's position at that
 * progress. No stores: the store-reading (collectEntityPaths) and store-writing
 * halves stay in boardScrub — the same pure-vs-IO split as boardSnapshot / boardSnapshotIO.
 */

/** One drawn path bound to the entity that follows it. */
export interface EntityPath {
  path: MovementPath;
  kind: 'player' | 'ball';
  id: string;
}

/** One entity's resolved position at a queried progress. */
export interface EntityPosition {
  id: string;
  kind: 'player' | 'ball';
  position: [number, number, number];
}

/**
 * Where every entity sits at a global progress (0..1). The longest path maps
 * directly to [0,1]; each other path advances in real time alongside it and
 * clamps at its own end. Pure — safe to call from tests, export, and viewers
 * without touching the board stores.
 */
export function positionsAtProgress(entityPaths: EntityPath[], progress: number): EntityPosition[] {
  if (entityPaths.length === 0) return [];

  const globalDurationSec = Math.max(...entityPaths.map((e) => e.path.duration));
  if (globalDurationSec <= 0) return [];

  const elapsedSec = Math.min(1, Math.max(0, progress)) * globalDurationSec;

  return entityPaths.map((entity) => {
    const localProgress =
      entity.path.duration > 0 ? Math.min(1, elapsedSec / entity.path.duration) : 0;
    return {
      id: entity.id,
      kind: entity.kind,
      position: getPositionAtProgressWithEasing(entity.path, localProgress, easeInOut),
    };
  });
}

/**
 * The whole board at a global progress (0..1) — the snapshot-level form of
 * positionsAtProgress. Returns a *new* BoardSnapshot with every player and the
 * ball moved along their own path to their position at `progress`; entities
 * without a (moving) path, and the paths/annotations/camera/cones, are carried
 * through untouched. Pure — no stores, input snapshot never mutated.
 *
 * The entity paths are drawn from the snapshot itself and filtered by
 * pathHasMovement, exactly as the live scrubber's collectEntityPaths does, so
 * boardAt(snap, p) matches what the board would show if scrubbed to p.
 */
export function boardAt(snap: BoardSnapshot, progress: number): BoardSnapshot {
  const entityPaths: EntityPath[] = snap.paths
    .filter(pathHasMovement)
    .map((path) => ({ path, kind: path.entityType, id: path.entityId }));

  const playerPos = new Map<string, [number, number, number]>();
  let ballPos: [number, number, number] | undefined;
  for (const p of positionsAtProgress(entityPaths, progress)) {
    if (p.kind === 'player') playerPos.set(p.id, p.position);
    else ballPos = p.position;
  }

  return {
    ...snap,
    players: snap.players.map((pl) => {
      const pos = playerPos.get(pl.id);
      return pos ? { ...pl, position: pos } : pl;
    }),
    ball: snap.ball && ballPos ? { ...snap.ball, position: ballPos } : snap.ball,
  };
}
