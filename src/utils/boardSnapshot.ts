import type { Player } from '../models/PlayerModel';
import type { MovementPath } from '../models/PathModel';
import type { Ball } from '../models/BallModel';
import type { Cone } from '../store/coneStore';
import type { Annotation } from '../store/annotationStore';
import type { PlayPhase } from '../models/PlayModel';
import { STANDARD_GROUND_DIMENSIONS, STANDARD_GROUND_NAME, type BoundaryDimensions } from '../models/VenueModel';

/**
 * boardSnapshot — the canonical shape of a board's content, and the adapters
 * that serialize it. This module is PURE: it owns the `BoardSnapshot` type, the mappings
 * to/from the two persisted formats, and the comparison that answers whether two boards
 * differ; it imports no stores, so
 * store-free layers (the Dexie migration, sharingService) can depend on it
 * without pulling the UI store graph in. The store-touching capture()/restore()
 * live in `boardSnapshotIO`. See CONTEXT.md — "Board snapshot".
 *
 * Scope: the four board slices a Play persists, plus the ball and cones.
 * Scoreboard/match state is deliberately excluded — it is app-wide match context,
 * not per-Play board content, so capturing it would make restoring a Play clobber
 * the live scoreboard.
 */

/** Camera framing captured in a snapshot — the broadcast pose, without POV state. */
export interface BoardCamera {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

/** The live board content — the slices a Play persists. */
export interface BoardSnapshot {
  players: Player[];
  paths: MovementPath[];
  annotations: Annotation[];
  camera: BoardCamera | null;
  /** The match ball, or null when the board has none (e.g. a legacy Play). */
  ball: Ball | null;
  /** Placed drill cones; an empty list when none. */
  cones: Cone[];
}

// ── The deleted interchange bench ───────────────────────────────────────────

/**
 * The board used to seed 22 a side, the last four of whom stood outside the
 * Boundary as an interchange bench. Issue #29 deleted them rather than exempting
 * them from the out-of-bounds readout, so that out of bounds could stay pure
 * geometry — no exemption list to explain, and a count that reaches 0.
 *
 * `number` is the handle. Every player who can reach a stored Play gets theirs
 * from `createTeamPlayers` as `i + 1`, no UI in `src/` edits it, and it matches
 * the id suffix (`team1-player-19` … `team2-player-22`).
 *
 * `drillBoardLayout` also numbers the players it builds, but those are drill
 * *preview* ghosts held in `previewPositions` and never captured into a
 * snapshot, so they never reach this filter.
 */
const BENCH_NUMBERS = { first: 19, last: 22 } as const;

/** Whether a stored player is one of the four per team that no longer exist. */
export function isInterchangeBench(player: Pick<Player, 'number'>): boolean {
  const { number } = player;
  // A player with no number predates numbering, and is kept: absence of a number
  // is not evidence of a bench place.
  if (typeof number !== 'number') return false;
  return number >= BENCH_NUMBERS.first && number <= BENCH_NUMBERS.last;
}

/**
 * Drop the bench from a stored roster.
 *
 * Applied on every read rather than only in the Dexie migration, because the
 * migration rewrites *this* browser's plays and cannot reach a shared link
 * authored on a client that never ran it. Without this, an old link restores 44
 * players and stands eight of them back outside the Boundary.
 */
export function withoutInterchangeBench(players: Player[]): Player[] {
  return players.some(isInterchangeBench) ? players.filter((p) => !isInterchangeBench(p)) : players;
}

// ── Persistence adapter: BoardSnapshot ↔ PlayPhase ──────────────────────────
// A PlayPhase is the persisted shape (field names `playerPositions`/`cameraState`
// plus phase identity). The stored format is unchanged, so old Plays load as-is;
// this adapter is the one place the field-name mapping lives.

/**
 * Wrap a snapshot as a persisted PlayPhase (renames to the stored field names).
 * `ball` and `cones` are written only when present, so pre-ball/pre-cones Plays
 * (and the v3 migration's legacy rows) keep a byte-identical stored shape with no
 * `ball`/`cones` key.
 */
export function toPhase(snap: BoardSnapshot, identity: { id: string; label: string }): PlayPhase {
  return {
    id: identity.id,
    label: identity.label,
    playerPositions: snap.players,
    paths: snap.paths,
    annotations: snap.annotations,
    cameraState: snap.camera,
    ...(snap.ball ? { ball: snap.ball } : {}),
    ...(snap.cones.length ? { cones: snap.cones } : {}),
  };
}

/**
 * Read a persisted PlayPhase back into a snapshot (tolerates legacy gaps, and
 * drops the deleted interchange bench — see `withoutInterchangeBench`).
 */
export function fromPhase(phase: PlayPhase): BoardSnapshot {
  return {
    players: withoutInterchangeBench(phase.playerPositions ?? []),
    paths: phase.paths ?? [],
    annotations: (phase.annotations ?? []) as Annotation[],
    camera: phase.cameraState ?? null,
    ball: phase.ball ?? null,
    cones: phase.cones ?? [],
  };
}

// ── Wire adapter: BoardSnapshot ↔ SharePayload ──────────────────────────────
// The shared-link payload is a *flat* shape (camera split into three fields)
// plus share metadata (name/quarter/label). This is the one place that mapping
// lives — previously the flatten was in sharingService and the un-flatten was
// hand-rolled (and dropped `paths`) at each restore site.

/**
 * The ground a shared Play was designed on — **render context, not Play content**.
 *
 * A Play is positions in absolute metres, and metres mean nothing without the
 * boundary they were drawn against: rendered on a stranger's wider ground, a play
 * designed for a tight one reads as everyone standing too narrow, with nothing on
 * screen to explain why. So the ground rides alongside the board content rather
 * than inside it. It is deliberately not a Venue — nothing is added to the
 * recipient's list, and their Active Venue is theirs. See ADR 0002, "Sharing".
 */
export interface DesignedGround extends BoundaryDimensions {
  name: string;
}

/**
 * The ground a link means when it says nothing about its ground. Links shared
 * before Venues existed were authored at 165 × 135, so this is not a default —
 * it is the truth about those links. Shared with `venueStore`, which resolves the
 * same ground for the instant before the records have loaded.
 */
export const STANDARD_DESIGNED_GROUND: DesignedGround = {
  name: STANDARD_GROUND_NAME,
  ...STANDARD_GROUND_DIMENSIONS,
};

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
  /** Present only when the shared board had a ball; older links omit it. */
  ball?: Ball | null;
  /** Present only when the shared board had cones; older links omit it. */
  cones?: Cone[];
  /**
   * The sender's ground. Optional for one reason only: links shared before
   * Venues existed carry none. Every link written from here on carries it, so
   * absence dates a link rather than describing one.
   */
  venueName?: string;
  boundaryLength?: number;
  boundaryWidth?: number;
}

/**
 * Flatten a snapshot into the shared-link wire shape.
 *
 * `ground` is a required parameter, not an optional field on `meta`: there is
 * always an Active Venue, so a share path with nothing to say about the ground is
 * a share path that forgot to ask. Letting it pass null would make a modern link
 * indistinguishable from a pre-Venue one, and both would render at Standard
 * ground looking entirely plausible — the exact failure this feature exists to
 * remove.
 */
export function toShareData(
  snap: BoardSnapshot,
  meta: ShareMeta,
  ground: DesignedGround,
): SharePayload {
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
    ...(snap.ball ? { ball: snap.ball } : {}),
    ...(snap.cones.length ? { cones: snap.cones } : {}),
    venueName: ground.name,
    boundaryLength: ground.boundaryLength,
    boundaryWidth: ground.boundaryWidth,
  };
}

/**
 * The ground a shared Play was designed on, as the viewer should render it.
 *
 * A link with no ground predates Venues, so Standard ground is what it was
 * authored at and it renders exactly as it always has. Dimensions that could not
 * describe a ground fall back the same way — a payload is a row in a remote table
 * that this app did not necessarily write, and a zero semi-axis renders nothing
 * at all rather than a ground the recipient can judge.
 *
 * Read separately from `fromShareData` on purpose. The ground is not board
 * content, so it never enters a BoardSnapshot and cannot ride a restore into the
 * recipient's app-wide state.
 */
export function designedGroundOf(data: SharePayload): DesignedGround {
  const { venueName, boundaryLength, boundaryWidth } = data;

  const measured = (metres: number | undefined): metres is number =>
    typeof metres === 'number' && Number.isFinite(metres) && metres > 0;

  if (!measured(boundaryLength) || !measured(boundaryWidth)) return STANDARD_DESIGNED_GROUND;

  return { name: venueName || STANDARD_GROUND_NAME, boundaryLength, boundaryWidth };
}

/**
 * Read a shared-link payload back into a snapshot. Reads `paths` (the legacy
 * restore sites forgot to, silently dropping movement paths from shared plays),
 * re-nests the flat camera fields, and tolerates links that predate the ball/cones.
 *
 * Drops the deleted interchange bench for a reason that does not apply to
 * `fromPhase`: this is the *only* place an old link can be caught. The sender's
 * client may never have run the migration, so the bench arrives over the wire
 * however thoroughly the local database has been rewritten.
 */
export function fromShareData(data: SharePayload): BoardSnapshot {
  return {
    players: withoutInterchangeBench(data.playerPositions ?? []),
    paths: data.paths ?? [],
    annotations: (data.annotations ?? []) as Annotation[],
    camera:
      data.cameraPosition && data.cameraTarget
        ? { position: data.cameraPosition, target: data.cameraTarget, zoom: data.cameraZoom ?? 1 }
        : null,
    ball: data.ball ?? null,
    cones: data.cones ?? [],
  };
}

// ── Comparison: did this edit change anything? ──────────────────────────────

/**
 * Whether each slice a board holds counts as a change to the board.
 *
 * Typed as a record over `BoardSnapshot`'s keys, so that adding a seventh slice
 * to the snapshot fails to compile until this answers for it. A slice the
 * comparison silently forgot would be an edit the coach cannot undo, and that
 * failure is invisible everywhere else.
 *
 * The camera answers no. Undo never moves the camera — restoring an entry nulls
 * it, which is what leaves the coach's framing alone — so a difference in the
 * camera alone is a change the undo stack cannot represent, and recording it
 * would spend an undo press on something the press cannot undo. It is also the
 * one slice the reference short-circuit could never settle: `capture()` builds
 * a fresh camera object every call, so two captures of a board nobody touched
 * never share one.
 */
const COMPARED_SLICES: Record<keyof BoardSnapshot, boolean> = {
  players: true,
  paths: true,
  annotations: true,
  ball: true,
  cones: true,
  camera: false,
};

const CONTENT_SLICES = (Object.keys(COMPARED_SLICES) as (keyof BoardSnapshot)[]).filter(
  (slice) => COMPARED_SLICES[slice],
);

/**
 * Structural equality over board content: the same values, however many objects
 * are holding them.
 *
 * Reference equality is the first question asked at every level, not just the
 * top, because that is what makes the walk cheap — the board stores update
 * immutably, so everything an edit did not touch is literally the same object
 * and settles without being read.
 *
 * `Date` is handled because an Annotation carries its creation time, and two
 * Dates for the same instant are two objects. Everything else in a board is a
 * primitive, an array, or a plain object.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // NaN never equals itself under `===`. No board field should hold one, but a
  // comparison that called a board different from itself would record an edit
  // the coach never made.
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => sameValue(item, b[i]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  // An explicit `undefined` and an absent key describe the same board — releasing
  // the ball may write `assignedPlayerId: undefined` where a fresh ball has no
  // such key — so compare the union of both sides' keys rather than their counts.
  for (const key of Object.keys(right)) {
    if (!(key in left)) keys.push(key);
  }
  return keys.every((key) => sameValue(left[key], right[key]));
}

/**
 * Whether the board changed between two snapshots — the question a Board edit
 * asks on commit, so that a drag ending where it started, or a formation
 * re-applied, costs the coach nothing on the undo stack.
 *
 * Pure, and total over the snapshot's slices: any difference in board content
 * counts, including a player who only turned. Which slices are content, and why
 * the camera is not, is stated once in `COMPARED_SLICES`.
 */
export function boardChanged(before: BoardSnapshot, after: BoardSnapshot): boolean {
  return CONTENT_SLICES.some((slice) => !sameValue(before[slice], after[slice]));
}
