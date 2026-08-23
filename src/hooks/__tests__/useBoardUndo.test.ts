import { describe, it, expect, beforeEach } from 'vitest';
import { undoBoard, redoBoard } from '../useBoardUndo';
import { useHistoryStore } from '../../store/historyStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { usePathStore } from '../../store/pathStore';
import { useCameraStore } from '../../store/cameraStore';
import { editBoard, beginEdit } from '../../utils/boardEdit';
import { pullBoardInsideBoundary } from '../useOutOfBounds';
import { boundaryOf, outOfBounds } from '../../utils/fieldGeometry';
import { hasBeenPulledInside, PULL_INSIDE_BOUNDARY_LABEL } from '../../components/Board/hud/fitReadout';
import { capture } from '../../utils/boardSnapshotIO';
import type { Player } from '../../models/PlayerModel';

const player = (position: [number, number, number], rotation = 0): Player => ({
  id: 'team1-player-1',
  teamId: 'team1',
  position,
  rotation,
  color: '#0066cc',
});

const arrow = () => ({
  type: 'arrow' as const,
  points: [[0, 0], [1, 1]],
  color: '#ff0000',
});

// What every Annotation surface does — the Pen tip's stroke, the Text field's
// commit and the Setup controls' Clear annotations — through the module every
// coach edit goes through.
const addAnnotationEdit = () => {
  editBoard('Add annotation', () => {
    useAnnotationStore.getState().addAnnotation(arrow());
  });
};

// What Player.tsx's drag-end site does: begin the edit when the drag starts,
// mutate through the plain store setter, commit when it ends. Exercising the
// same module the real site calls — not a hand-rolled mimic of it — is what
// lets this catch a defect like the rotation one below, where a snapshot
// built by hand at the call site quietly used the wrong value.
const dragPlayerTo = (to: [number, number, number]) => {
  const edit = beginEdit('Move player');
  usePlayerStore.getState().setPlayers([player(to)]);
  edit.commit();
};

beforeEach(() => {
  usePlayerStore.getState().setPlayers([player([0, 0, 0])]);
  useAnnotationStore.getState().setAnnotations([]);
  usePathStore.getState().setPaths([]);
  useConeStore.getState().setCones([]);
  useHistoryStore.getState().clearHistory();
});

describe('undo with annotations', () => {
  it('undoes an added annotation', () => {
    addAnnotationEdit();
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);

    undoBoard();

    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('restores a moved player on undo (regression)', () => {
    dragPlayerTo([5, 0, 5]);

    undoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
  });

  it('records the live annotations at the player-move push site', () => {
    addAnnotationEdit();
    dragPlayerTo([5, 0, 5]);

    const past = useHistoryStore.getState().past;
    // The move entry's before-board carried the annotation, not an empty board.
    expect(past[past.length - 1].before.annotations).toHaveLength(1);
    expect(past[past.length - 1].before.annotations[0].type).toBe('arrow');
  });

  it('walks back through interleaved annotation + player edits one press at a time', () => {
    addAnnotationEdit(); // edit 1
    dragPlayerTo([5, 0, 5]); // edit 2

    undoBoard(); // takes back the drag
    undoBoard(); // takes back the annotation

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('undoes the most recent edit, not the one before it', () => {
    // undo() used to return past[length - 2], so a second undo's worth of
    // history came back on the first press: the annotation added before the
    // drag vanished along with the drag. One press, one edit.
    addAnnotationEdit(); // edit 1
    dragPlayerTo([5, 0, 5]); // edit 2

    undoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it('undoes an edit that moved the ball, cones and path keyframes too', () => {
    // What Pull inside boundary records: the whole board it was made against,
    // because returning only the players would leave the ball, the cones and the
    // path keyframes where the pull put them.
    useBallStore.getState().setBall({ id: 'ball-1', position: [0, 0, 0], color: '#8B4513', size: 0.3 });
    useConeStore.getState().setCones([{ id: 'c1', position: [0, 0, 60] }]);
    usePathStore.getState().setPaths([{
      id: 'lead',
      entityId: 'team1-player-1',
      entityType: 'player',
      keyframes: [
        { timestamp: 0, position: [0, 0, 0] },
        { timestamp: 1, position: [0, 0, 62] },
      ],
      duration: 1,
      startTimeOffset: 0,
    }]);

    // Preceded by an ordinary drag, because a whole-board edit is almost never
    // the first thing a coach does: it has to survive being one entry deep in
    // the stack, not just being the only one.
    dragPlayerTo([5, 0, 5]);

    editBoard('Pull inside boundary', () => {
      useBallStore.getState().updateBallPosition([1, 0, 1]);
      useConeStore.getState().setCones([{ id: 'c1', position: [0, 0, 55] }]);
      usePathStore.getState().updatePath('lead', {
        keyframes: [
          { timestamp: 0, position: [0, 0, 0] },
          { timestamp: 1, position: [0, 0, 55] },
        ],
      });
    });

    undoBoard();

    expect(useBallStore.getState().ball?.position).toEqual([0, 0, 0]);
    expect(useConeStore.getState().cones[0].position).toEqual([0, 0, 60]);
    expect(usePathStore.getState().paths[0].keyframes[1].position).toEqual([0, 0, 62]);
  });

  it('makes Pull inside boundary one undoable edit that leaves the camera where it was', () => {
    // The whole of what the readout's remedy promises: everything comes inside,
    // one press of undo puts it all back, and the viewpoint never moves — the
    // coach is watching the Boundary change under a play that holds still, so a
    // camera that jumped would cost them the comparison they came for.
    const tight = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });
    usePlayerStore.getState().setPlayers([player([0, 0, 60])]);
    useConeStore.getState().setCones([{ id: 'c1', position: [0, 0, 62] }]);
    useBallStore
      .getState()
      .setBall({ id: 'ball-1', position: [0, 0, 58], color: '#8B4513', size: 0.3 });
    usePathStore.getState().setPaths([{
      id: 'lead',
      entityId: 'team1-player-1',
      entityType: 'player',
      keyframes: [
        { timestamp: 0, position: [0, 0, 0] },
        { timestamp: 1, position: [0, 0, 61] },
      ],
      duration: 1,
      startTimeOffset: 0,
    }]);
    useCameraStore.getState().setCameraPosition([12, 30, 40]);
    useCameraStore.getState().setCameraTarget([3, 0, 4]);

    pullBoardInsideBoundary(tight);

    expect(outOfBounds(capture(), tight).count).toBe(0);
    expect(useCameraStore.getState().position).toEqual([12, 30, 40]);
    expect(useCameraStore.getState().target).toEqual([3, 0, 4]);

    undoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 60]);
    expect(useConeStore.getState().cones[0].position).toEqual([0, 0, 62]);
    expect(useBallStore.getState().ball?.position).toEqual([0, 0, 58]);
    expect(usePathStore.getState().paths[0].keyframes[1].position).toEqual([0, 0, 61]);
    // One edit, one undo: the stack is empty again rather than holding a second
    // entry for the same tap.
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('marks the pull it records, and the marker travels with undo and redo', () => {
    // What the Fit readout's memory is read from (ADR 0005). The pull's entry
    // carries the label every entry carries, so the signal is a predicate over
    // `past` — undo moves the entry to `future` and the memory clears on its
    // own, redo brings both back. No flag in a store, no listener, and nothing
    // to keep in step.
    const tight = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });
    usePlayerStore.getState().setPlayers([player([0, 0, 60])]);

    // An ordinary drag first: it is the same entry shape and must not be
    // mistaken for a pull, or the memory would be a dirty flag.
    dragPlayerTo([0, 0, 60]);
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(false);

    pullBoardInsideBoundary(tight);
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(true);

    undoBoard();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(false);
    expect(useHistoryStore.getState().future[0].label).toBe(PULL_INSIDE_BOUNDARY_LABEL);

    // The store's redo and nothing more: redo has no affordance in the app —
    // no shortcut, no control — so this covers the marker travelling with the
    // entry, which is all the marker is asked to do.
    useHistoryStore.getState().redo();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(true);
  });

  it('needs three undos after three pulls, because pulls are not coalesced', () => {
    // Three grounds, each tighter than the last, each pull its own entry. The
    // memory stays true while any of them remains and clears exactly when the
    // last is reversed.
    usePlayerStore.getState().setPlayers([player([0, 0, 60])]);
    for (const width of [110, 100, 90]) {
      pullBoardInsideBoundary(boundaryOf({ boundaryLength: 150, boundaryWidth: width }));
    }
    expect(useHistoryStore.getState().past).toHaveLength(3);

    undoBoard();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(true);
    undoBoard();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(true);
    undoBoard();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(false);
    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 60]);
  });

  it('records nothing when the Annotation store is written without a surface', () => {
    // The store no longer records on its own behalf: only a caller knows whether
    // the coach did it. The same action serves a coach's clear and a restore
    // putting a board back, which is why recording used to need pausing.
    useAnnotationStore.getState().addAnnotation(arrow());

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it('records nothing while restoring a board', () => {
    // Undo's own restore writes the same store actions a coach's edit does. It
    // leaves no entry behind because the record sits at the surface, not in the
    // store — nothing has to be paused for the duration.
    addAnnotationEdit();

    undoBoard();

    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
  });
});

describe('the rotation-facing bug (regression)', () => {
  it('restores which way a dragged player was facing, not just where they stood', () => {
    usePlayerStore.getState().setPlayers([player([0, 0, 0], 0)]);

    const edit = beginEdit('Move player');
    // A drag auto-rotates the player to face the direction of travel — the
    // move and the facing happen inside the same gesture.
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [5, 0, 5]);
    usePlayerStore.getState().updatePlayerRotation('team1-player-1', 2.4);
    edit.commit();

    undoBoard();

    const restored = usePlayerStore.getState().players[0];
    expect(restored.position).toEqual([0, 0, 0]);
    expect(restored.rotation).toBe(0);
  });
});

describe('the ball-drag bug (regression)', () => {
  it('returns the ball to where it was dragged from', () => {
    useBallStore.getState().setBall({ id: 'ball-1', position: [0, 0.5, 0], color: '#8B4513', size: 0.3 });

    const edit = beginEdit('Move ball');
    useBallStore.getState().updateBallPosition([10, 0.5, 10]);
    edit.commit();

    expect(useBallStore.getState().ball?.position).toEqual([10, 0.5, 10]);

    undoBoard();

    expect(useBallStore.getState().ball?.position).toEqual([0, 0.5, 0]);
  });
});

describe('a drag that ends where it started', () => {
  it('leaves no entry, so undo takes back the edit before it', () => {
    addAnnotationEdit();

    const edit = beginEdit('Move player');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [9, 0, 9]);
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [0, 0, 0]);
    edit.commit();

    expect(useHistoryStore.getState().past).toHaveLength(1);

    undoBoard();

    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });
});

describe('newly-undoable edits swept in by this ticket', () => {
  it('undoes a drawn movement path', () => {
    editBoard('Draw movement path', () => {
      usePathStore.getState().addPath({
        id: 'lead',
        entityId: 'team1-player-1',
        entityType: 'player',
        keyframes: [
          { timestamp: 0, position: [0, 0, 0] },
          { timestamp: 1, position: [0, 0, 10] },
        ],
        duration: 1,
        startTimeOffset: 0,
      });
    });

    expect(usePathStore.getState().paths).toHaveLength(1);

    undoBoard();

    expect(usePathStore.getState().paths).toHaveLength(0);
  });

  it('undoes a placed cone', () => {
    editBoard('Place cone', () => {
      useConeStore.getState().addCone([1, 0, 1]);
    });

    expect(useConeStore.getState().cones).toHaveLength(1);

    undoBoard();

    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('undoes a removed cone', () => {
    useConeStore.getState().setCones([{ id: 'c1', position: [1, 0, 1] }]);
    useHistoryStore.getState().clearHistory();

    editBoard('Remove cone', () => {
      useConeStore.getState().removeCone('c1');
    });

    expect(useConeStore.getState().cones).toHaveLength(0);

    undoBoard();

    expect(useConeStore.getState().cones).toHaveLength(1);
  });

  it('undoes Clear paths, the same as Clear annotations beside it', () => {
    usePathStore.getState().setPaths([{
      id: 'lead',
      entityId: 'team1-player-1',
      entityType: 'player',
      keyframes: [
        { timestamp: 0, position: [0, 0, 0] },
        { timestamp: 1, position: [0, 0, 10] },
      ],
      duration: 1,
      startTimeOffset: 0,
    }]);
    useHistoryStore.getState().clearHistory();

    editBoard('Clear paths', () => usePathStore.getState().clearPaths());

    expect(usePathStore.getState().paths).toHaveLength(0);

    undoBoard();

    expect(usePathStore.getState().paths).toHaveLength(1);
  });

  it('leaves no entry for an edit that changes nothing, like a formation re-applied', () => {
    editBoard('Apply formation', () => {
      usePlayerStore.getState().updatePlayerPosition('team1-player-1', [0, 0, 0]);
    });

    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});

describe('undone Annotations come back as themselves', () => {
  it('keeps creation identity and magnify size/zoom, rather than dropping them', () => {
    const before = useAnnotationStore.getState().annotations;
    editBoard('Add annotation', () => {
      useAnnotationStore.getState().setAnnotations([
        ...before,
        {
          id: 'mag-1',
          type: 'magnifying-glass',
          points: [[1, 1]],
          color: '#ffffff',
          magnifySize: 3,
          magnifyZoom: 2,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    });

    editBoard('Remove annotation', () => {
      useAnnotationStore.getState().setAnnotations([]);
    });

    undoBoard();

    const [restored] = useAnnotationStore.getState().annotations;
    expect(restored.id).toBe('mag-1');
    expect(restored.magnifySize).toBe(3);
    expect(restored.magnifyZoom).toBe(2);
    expect(restored.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });
});

describe('redoBoard', () => {
  it('restores the after-board of the most recently undone edit', () => {
    dragPlayerTo([5, 0, 5]);
    undoBoard();
    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);

    redoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([5, 0, 5]);
  });

  it('does nothing when there is nothing to redo', () => {
    redoBoard();
    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
  });
});
