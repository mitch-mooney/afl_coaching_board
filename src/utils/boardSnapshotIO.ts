import { usePlayerStore } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useCameraStore } from '../store/cameraStore';
import { useBallStore } from '../store/ballStore';
import type { BoardSnapshot } from './boardSnapshot';

/**
 * boardSnapshotIO — the store-touching half of the board snapshot: read the live
 * board out of the four board stores, and write a snapshot back into them. This
 * is the single owner of that store access. The pure serialization adapters live
 * in `boardSnapshot`, which this module (and only this module) bridges to state.
 */

/** Read the current board state from the board stores. */
export function capture(): BoardSnapshot {
  const { position, target, zoom } = useCameraStore.getState();
  return {
    players: usePlayerStore.getState().players,
    paths: usePathStore.getState().paths,
    annotations: useAnnotationStore.getState().annotations,
    camera: { position, target, zoom },
    ball: useBallStore.getState().ball,
  };
}

/**
 * Write a snapshot back into the board stores through their own actions, so each
 * store keeps enforcing its invariants. A null camera or ball is left untouched
 * (matches the legacy restore, which only set what was saved) — so restoring a
 * pre-ball Play leaves the live ball where it is rather than clearing it.
 */
export function restore(snap: BoardSnapshot): void {
  usePlayerStore.getState().setPlayers(snap.players);
  usePathStore.getState().setPaths(snap.paths);
  useAnnotationStore.getState().setAnnotations(snap.annotations);
  if (snap.camera) {
    const camera = useCameraStore.getState();
    camera.setCameraPosition(snap.camera.position);
    camera.setCameraTarget(snap.camera.target);
    camera.setZoom(snap.camera.zoom);
  }
  if (snap.ball) {
    useBallStore.getState().setBall(snap.ball);
  }
}
