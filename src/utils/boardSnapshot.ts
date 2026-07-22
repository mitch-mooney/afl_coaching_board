import type { Player } from '../models/PlayerModel';
import type { MovementPath } from '../models/PathModel';
import type { Annotation } from '../store/annotationStore';
import type { PlayPhase } from '../models/PlayModel';

/**
 * boardSnapshot — the canonical shape of a board's content, and the adapters
 * that serialize it. This module is PURE: it owns the `BoardSnapshot` type and
 * the mappings to/from the two persisted formats, and imports no stores, so
 * store-free layers (the Dexie migration, sharingService) can depend on it
 * without pulling the UI store graph in. The store-touching capture()/restore()
 * live in `boardSnapshotIO`. See CONTEXT.md — "Board snapshot".
 *
 * Scope is deliberately the four slices a Play persists today; ball, scoreboard,
 * and cones are a later additive decision (they are not yet captured anywhere).
 */

/** Camera framing captured in a snapshot — the broadcast pose, without POV state. */
export interface BoardCamera {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

/** The live board content — the four slices a Play persists. */
export interface BoardSnapshot {
  players: Player[];
  paths: MovementPath[];
  annotations: Annotation[];
  camera: BoardCamera | null;
}

// ── Persistence adapter: BoardSnapshot ↔ PlayPhase ──────────────────────────
// A PlayPhase is the persisted shape (field names `playerPositions`/`cameraState`
// plus phase identity). The stored format is unchanged, so old Plays load as-is;
// this adapter is the one place the field-name mapping lives.

/** Wrap a snapshot as a persisted PlayPhase (renames to the stored field names). */
export function toPhase(snap: BoardSnapshot, identity: { id: string; label: string }): PlayPhase {
  return {
    id: identity.id,
    label: identity.label,
    playerPositions: snap.players,
    paths: snap.paths,
    annotations: snap.annotations,
    cameraState: snap.camera,
  };
}

/** Read a persisted PlayPhase back into a snapshot (tolerates legacy gaps). */
export function fromPhase(phase: PlayPhase): BoardSnapshot {
  return {
    players: phase.playerPositions ?? [],
    paths: phase.paths ?? [],
    annotations: (phase.annotations ?? []) as Annotation[],
    camera: phase.cameraState ?? null,
  };
}

// ── Wire adapter: BoardSnapshot ↔ SharePayload ──────────────────────────────
// The shared-link payload is a *flat* shape (camera split into three fields)
// plus share metadata (name/quarter/label). This is the one place that mapping
// lives — previously the flatten was in sharingService and the un-flatten was
// hand-rolled (and dropped `paths`) at each restore site.

/** Share-link metadata that travels alongside the board content. */
export interface ShareMeta {
  name: string;
  quarter: string | null;
  label: string | null;
}

/** The flat payload stored in a shared-link record (`shared_playbooks.playbook_data`). */
export interface SharePayload extends ShareMeta {
  playerPositions: Player[];
  paths: MovementPath[];
  annotations: Annotation[];
  cameraPosition: [number, number, number] | null;
  cameraTarget: [number, number, number] | null;
  cameraZoom: number;
}

/** Flatten a snapshot into the shared-link wire shape. */
export function toShareData(snap: BoardSnapshot, meta: ShareMeta): SharePayload {
  return {
    name: meta.name,
    playerPositions: snap.players,
    paths: snap.paths,
    annotations: snap.annotations,
    cameraPosition: snap.camera?.position ?? null,
    cameraTarget: snap.camera?.target ?? null,
    cameraZoom: snap.camera?.zoom ?? 1,
    quarter: meta.quarter ?? null,
    label: meta.label ?? null,
  };
}

/**
 * Read a shared-link payload back into a snapshot. Reads `paths` (the legacy
 * restore sites forgot to, silently dropping movement paths from shared plays)
 * and re-nests the flat camera fields.
 */
export function fromShareData(data: SharePayload): BoardSnapshot {
  return {
    players: data.playerPositions ?? [],
    paths: data.paths ?? [],
    annotations: (data.annotations ?? []) as Annotation[],
    camera:
      data.cameraPosition && data.cameraTarget
        ? { position: data.cameraPosition, target: data.cameraTarget, zoom: data.cameraZoom ?? 1 }
        : null,
  };
}
