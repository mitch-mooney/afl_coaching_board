import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { Cone } from '../../store/coneStore';
import type { Annotation } from '../../store/annotationStore';
import { toPhase, fromPhase, toShareData, fromShareData, designedGroundOf } from '../boardSnapshot';
import type { BoardSnapshot, DesignedGround } from '../boardSnapshot';
import { capture, restore } from '../boardSnapshotIO';
import type { PlayPhase } from '../../models/PlayModel';

const aPlayer: Player = {
  id: 'team1-player-1',
  teamId: 'team1',
  position: [10, 0, 5],
  rotation: 0,
  color: '#ffffff',
};
const aPath = createMovementPath('team1-player-1', 'player', [10, 0, 5], [20, 0, 5], 5, 'path-1');
const anAnnotation: Annotation = {
  id: 'a1',
  type: 'arrow',
  points: [[0, 0], [1, 1]],
  color: '#ffff00',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};
const aBall = createBall([3, 0.5, 4], { assignedPlayerId: 'team1-player-1' });
const aCone: Cone = { id: 'cone-1', position: [8, 0, 8] };
const standardGround: DesignedGround = { name: 'Standard ground', boundaryLength: 165, boundaryWidth: 135 };

beforeEach(() => {
  usePlayerStore.setState({ players: [] });
  usePathStore.setState({ paths: [] });
  useAnnotationStore.setState({ annotations: [] });
  useCameraStore.setState({ position: [0, 0, 0], target: [0, 0, 0], zoom: 1 });
  useBallStore.setState({ ball: null });
  useConeStore.setState({ cones: [] });
});

/**
 * The read-side backstop for the deleted interchange bench (#29).
 *
 * The Dexie migration rewrites plays stored in *this* browser. It cannot reach a
 * shared link authored on a client that never ran it, so both read adapters have
 * to drop the bench on the way in — otherwise an old link restores 44 players
 * and puts eight of them back outside the boundary, which is the exact readout
 * the deletion exists to make true.
 */
describe('the bench never survives a read', () => {
  const bench = (number: number): Player => ({
    id: `team1-player-${number}`,
    teamId: 'team1',
    position: [-25, 0, 73.5],
    rotation: 0,
    color: '#ffffff',
    number,
  });
  const onField: Player = { ...aPlayer, number: 7 };
  const stored = [onField, bench(19), bench(20), bench(21), bench(22)];

  it('fromPhase drops players numbered 19 to 22', () => {
    const phase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: stored,
      paths: [],
      annotations: [],
      cameraState: null,
    } as PlayPhase;

    expect(fromPhase(phase).players).toEqual([onField]);
  });

  it('fromShareData drops them too — a link can predate the migration', () => {
    const payload = {
      name: 'Shared Play',
      quarter: null,
      label: null,
      playerPositions: stored,
      paths: [],
      annotations: [],
      cameraPosition: null,
      cameraTarget: null,
      cameraZoom: 1,
    };

    expect(fromShareData(payload).players).toEqual([onField]);
  });

  it('keeps a player with no number — legacy rows predate numbering', () => {
    const unnumbered: Player = { ...aPlayer, id: 'team1-player-x', number: undefined };
    const phase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [unnumbered],
      paths: [],
      annotations: [],
      cameraState: null,
    } as PlayPhase;

    expect(fromPhase(phase).players).toEqual([unnumbered]);
  });

  it('keeps 18 and leaves a 36-player play untouched', () => {
    const full = Array.from({ length: 36 }, (_, i) => ({
      ...aPlayer,
      id: `p-${i}`,
      teamId: (i < 18 ? 'team1' : 'team2') as Player['teamId'],
      number: (i % 18) + 1,
    }));
    const phase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: full,
      paths: [],
      annotations: [],
      cameraState: null,
    } as PlayPhase;

    expect(fromPhase(phase).players).toEqual(full);
  });
});

describe('boardSnapshot.capture', () => {
  it('reads the board slices, including the ball and cones, from their stores', () => {
    usePlayerStore.setState({ players: [aPlayer] });
    usePathStore.setState({ paths: [aPath] });
    useAnnotationStore.setState({ annotations: [anAnnotation] });
    useCameraStore.setState({ position: [1, 2, 3], target: [4, 5, 6], zoom: 2 });
    useBallStore.setState({ ball: aBall });
    useConeStore.setState({ cones: [aCone] });

    const snap = capture();

    expect(snap.players).toEqual([aPlayer]);
    expect(snap.paths).toEqual([aPath]);
    expect(snap.annotations).toEqual([anAnnotation]);
    expect(snap.camera).toEqual({ position: [1, 2, 3], target: [4, 5, 6], zoom: 2 });
    expect(snap.ball).toEqual(aBall);
    expect(snap.cones).toEqual([aCone]);
  });

  it('captures a null ball and empty cones when the board has neither', () => {
    const snap = capture();
    expect(snap.ball).toBeNull();
    expect(snap.cones).toEqual([]);
  });
});

describe('boardSnapshot.restore', () => {
  it('writes the board slices, including the ball and cones, back into their stores', () => {
    restore({
      players: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      camera: { position: [7, 8, 9], target: [1, 1, 1], zoom: 3 },
      ball: aBall,
      cones: [aCone],
    });

    expect(usePlayerStore.getState().players).toEqual([aPlayer]);
    expect(usePathStore.getState().paths).toEqual([aPath]);
    expect(useAnnotationStore.getState().annotations).toEqual([anAnnotation]);
    const cam = useCameraStore.getState();
    expect([cam.position, cam.target, cam.zoom]).toEqual([[7, 8, 9], [1, 1, 1], 3]);
    expect(useBallStore.getState().ball).toEqual(aBall);
    expect(useConeStore.getState().cones).toEqual([aCone]);
  });

  it('leaves the camera untouched when the snapshot camera is null', () => {
    useCameraStore.setState({ position: [5, 5, 5], target: [6, 6, 6], zoom: 9 });

    restore({ players: [], paths: [], annotations: [], camera: null, ball: null, cones: [] });

    const cam = useCameraStore.getState();
    expect([cam.position, cam.target, cam.zoom]).toEqual([[5, 5, 5], [6, 6, 6], 9]);
  });

  it('leaves the ball untouched when the snapshot ball is null', () => {
    useBallStore.setState({ ball: aBall });

    restore({ players: [], paths: [], annotations: [], camera: null, ball: null, cones: [] });

    expect(useBallStore.getState().ball).toEqual(aBall);
  });

  it('sets cones authoritatively — an empty snapshot list clears existing cones', () => {
    useConeStore.setState({ cones: [aCone] });

    restore({ players: [], paths: [], annotations: [], camera: null, ball: null, cones: [] });

    expect(useConeStore.getState().cones).toEqual([]);
  });

  it('round-trips: restore(capture()) preserves the board', () => {
    usePlayerStore.setState({ players: [aPlayer] });
    usePathStore.setState({ paths: [aPath] });
    useAnnotationStore.setState({ annotations: [anAnnotation] });
    useCameraStore.setState({ position: [1, 2, 3], target: [4, 5, 6], zoom: 2 });
    useBallStore.setState({ ball: aBall });
    useConeStore.setState({ cones: [aCone] });

    const snap = capture();
    // Wipe, then restore from the snapshot.
    usePlayerStore.setState({ players: [] });
    usePathStore.setState({ paths: [] });
    useAnnotationStore.setState({ annotations: [] });
    useCameraStore.setState({ position: [0, 0, 0], target: [0, 0, 0], zoom: 1 });
    useBallStore.setState({ ball: null });
    useConeStore.setState({ cones: [] });

    restore(snap);

    expect(usePlayerStore.getState().players).toEqual([aPlayer]);
    expect(usePathStore.getState().paths).toEqual([aPath]);
    expect(useAnnotationStore.getState().annotations).toEqual([anAnnotation]);
    const cam = useCameraStore.getState();
    expect([cam.position, cam.target, cam.zoom]).toEqual([[1, 2, 3], [4, 5, 6], 2]);
    expect(useBallStore.getState().ball).toEqual(aBall);
    expect(useConeStore.getState().cones).toEqual([aCone]);
  });
});

const sampleSnapshot: BoardSnapshot = {
  players: [aPlayer],
  paths: [aPath],
  annotations: [anAnnotation],
  camera: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
  ball: aBall,
  cones: [aCone],
};

describe('boardSnapshot phase adapter', () => {
  it('toPhase renames players→playerPositions, camera→cameraState, and carries ball + cones', () => {
    const phase = toPhase(sampleSnapshot, { id: 'phase-1', label: 'Phase 1' });

    expect(phase).toEqual({
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      cameraState: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
      ball: aBall,
      cones: [aCone],
    });
  });

  it('toPhase omits ball and cones keys when the snapshot has none (byte-identical to legacy Plays)', () => {
    const phase = toPhase({ ...sampleSnapshot, ball: null, cones: [] }, { id: 'p', label: 'l' });

    expect('ball' in phase).toBe(false);
    expect('cones' in phase).toBe(false);
  });

  it('fromPhase reads the legacy nested cameraState, the ball, and cones back into a snapshot', () => {
    const legacyPhase: PlayPhase = {
      id: 'p',
      label: 'l',
      playerPositions: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      cameraState: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
      ball: aBall,
      cones: [aCone],
    };

    expect(fromPhase(legacyPhase)).toEqual(sampleSnapshot);
  });

  it('fromPhase tolerates a null cameraState, a missing ball, and missing cones', () => {
    const phase: PlayPhase = {
      id: 'p',
      label: 'l',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    };

    const snap = fromPhase(phase);
    expect(snap.camera).toBeNull();
    expect(snap.ball).toBeNull();
    expect(snap.cones).toEqual([]);
  });

  it('phase round-trips through toPhase → fromPhase', () => {
    expect(fromPhase(toPhase(sampleSnapshot, { id: 'p', label: 'l' }))).toEqual(sampleSnapshot);
  });
});

describe('boardSnapshot share adapter', () => {
  it('toShareData flattens the camera and carries ball + cones plus share metadata', () => {
    const data = toShareData(sampleSnapshot, { name: 'My Play', quarter: 'Q3', label: 'goal' }, standardGround);

    expect(data).toEqual({
      name: 'My Play',
      playerPositions: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      cameraPosition: [1, 2, 3],
      cameraTarget: [4, 5, 6],
      cameraZoom: 2,
      quarter: 'Q3',
      label: 'goal',
      ball: aBall,
      cones: [aCone],
      venueName: 'Standard ground',
      boundaryLength: 165,
      boundaryWidth: 135,
    });
  });

  it('toShareData omits ball and cones keys when the snapshot has none', () => {
    const data = toShareData({ ...sampleSnapshot, ball: null, cones: [] }, { name: 'x', quarter: null, label: null }, standardGround);

    expect('ball' in data).toBe(false);
    expect('cones' in data).toBe(false);
  });

  it('fromShareData restores paths — regression guard for the shared-restore path drop', () => {
    const data = toShareData(sampleSnapshot, { name: 'x', quarter: null, label: null }, standardGround);

    expect(fromShareData(data).paths).toEqual([aPath]);
  });

  it('fromShareData reads the legacy flat camera fields and defaults a missing ball/cones', () => {
    const legacyFlat = {
      name: 'x',
      playerPositions: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      cameraPosition: [1, 2, 3] as [number, number, number],
      cameraTarget: [4, 5, 6] as [number, number, number],
      cameraZoom: 2,
      quarter: null,
      label: null,
    };

    expect(fromShareData(legacyFlat)).toEqual({ ...sampleSnapshot, ball: null, cones: [] });
  });

  it('fromShareData yields a null camera when the flat fields are absent', () => {
    const data = {
      name: 'x',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraPosition: null,
      cameraTarget: null,
      cameraZoom: 1,
      quarter: null,
      label: null,
    };

    expect(fromShareData(data).camera).toBeNull();
  });

  it('share round-trips through toShareData → fromShareData', () => {
    const data = toShareData(sampleSnapshot, { name: 'x', quarter: null, label: null }, standardGround);

    expect(fromShareData(data)).toEqual(sampleSnapshot);
  });
});

// The ground a Play was designed on rides along as render context, so the coach
// who opens the link sees the spacing the author intended rather than a
// reinterpretation of it on their own ground. See ADR 0002, "Sharing".
describe('boardSnapshot share adapter — the designed ground', () => {
  const kardinia: DesignedGround = { name: 'Kardinia Park', boundaryLength: 152, boundaryWidth: 118 };
  const meta = { name: 'x', quarter: null, label: null };

  it('carries the ground name and its boundary dimensions', () => {
    const data = toShareData(sampleSnapshot, meta, kardinia);

    expect(data.venueName).toBe('Kardinia Park');
    expect(data.boundaryLength).toBe(152);
    expect(data.boundaryWidth).toBe(118);
  });

  it('round-trips the designed ground', () => {
    const data = toShareData(sampleSnapshot, meta, kardinia);

    expect(designedGroundOf(data)).toEqual(kardinia);
  });

  it('reads a link shared before this feature existed as Standard ground', () => {
    const legacy = {
      name: 'x',
      playerPositions: [aPlayer],
      paths: [aPath],
      annotations: [anAnnotation],
      cameraPosition: [1, 2, 3] as [number, number, number],
      cameraTarget: [4, 5, 6] as [number, number, number],
      cameraZoom: 2,
      quarter: null,
      label: null,
    };

    // 165 × 135 is exactly what those links were authored at, so they render as
    // they always have.
    expect(designedGroundOf(legacy)).toEqual(standardGround);
  });

  it('falls back to Standard ground when the dimensions are unusable', () => {
    const halfWritten = {
      ...toShareData(sampleSnapshot, meta, kardinia),
      boundaryWidth: 0,
    };

    expect(designedGroundOf(halfWritten)).toEqual(standardGround);
  });

  it('keeps the sender ground out of the board content — restoring cannot change your Active Venue', () => {
    const data = toShareData(sampleSnapshot, meta, kardinia);

    // A restored snapshot is board content and nothing else, which is what makes
    // "a link never reconfigures app-wide state" true by construction rather
    // than by every restore site remembering to be careful.
    expect(fromShareData(data)).toEqual(sampleSnapshot);
  });
});
