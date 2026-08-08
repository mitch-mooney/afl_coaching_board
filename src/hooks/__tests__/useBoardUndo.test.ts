import { describe, it, expect, beforeEach } from 'vitest';
import { undoBoard } from '../useBoardUndo';
import { useHistoryStore, createStateSnapshot } from '../../store/historyStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { usePathStore } from '../../store/pathStore';
import { useCameraStore } from '../../store/cameraStore';
import { pullBoardInsideBoundary } from '../useOutOfBounds';
import { boundaryOf, outOfBounds } from '../../utils/fieldGeometry';
import { hasBeenPulledInside } from '../../components/Board/hud/fitReadout';
import { capture } from '../../utils/boardSnapshotIO';
import type { Player } from '../../models/PlayerModel';

const player = (position: [number, number, number]): Player => ({
  id: 'team1-player-1',
  teamId: 'team1',
  position,
  rotation: 0,
  color: '#0066cc',
});

const arrow = () => ({
  type: 'arrow' as const,
  points: [[0, 0], [1, 1]],
  color: '#ff0000',
});

// Mimic what Player.tsx does at drag-end: record the pre-drag board (with the
// live annotations) then move the player.
const recordPlayerMove = (to: [number, number, number]) => {
  useHistoryStore
    .getState()
    .pushSnapshot(
      createStateSnapshot(
        usePlayerStore.getState().players,
        useAnnotationStore.getState().annotations
      )
    );
  usePlayerStore.getState().setPlayers([player(to)]);
};

beforeEach(() => {
  usePlayerStore.getState().setPlayers([player([0, 0, 0])]);
  useAnnotationStore.getState().setAnnotations([]);
  usePathStore.getState().setPaths([]);
  useConeStore.getState().setCones([]);
  useHistoryStore.getState().resumeRecording();
  useHistoryStore.getState().clearHistory();
});

describe('undo with annotations', () => {
  it('undoes an added annotation', () => {
    useAnnotationStore.getState().addAnnotation(arrow());
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);

    undoBoard();

    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('restores a moved player on undo (regression)', () => {
    recordPlayerMove([5, 0, 5]);

    undoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
  });

  it('records the live annotations at the player-move push site', () => {
    useAnnotationStore.getState().addAnnotation(arrow());
    recordPlayerMove([5, 0, 5]);

    const past = useHistoryStore.getState().past;
    // The move snapshot carried the annotation, not a hardcoded empty array.
    expect(past[past.length - 1].annotations).toHaveLength(1);
    expect(past[past.length - 1].annotations[0].type).toBe('arrow');
  });

  it('walks back through interleaved annotation + player edits one press at a time', () => {
    useAnnotationStore.getState().addAnnotation(arrow()); // edit 1
    recordPlayerMove([5, 0, 5]); // edit 2

    undoBoard(); // takes back the drag
    undoBoard(); // takes back the annotation

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('undoes the most recent edit, not the one before it', () => {
    // undo() used to return past[length - 2], so a second undo's worth of
    // history came back on the first press: the annotation added before the
    // drag vanished along with the drag. One press, one edit.
    useAnnotationStore.getState().addAnnotation(arrow()); // edit 1
    recordPlayerMove([5, 0, 5]); // edit 2

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

    // Preceded by an ordinary drag, because a pull is almost never the first
    // thing a coach does: the whole-board record has to survive being one entry
    // deep in the stack, not just being the only one.
    recordPlayerMove([5, 0, 5]);

    useHistoryStore.getState().pushSnapshot({
      ...createStateSnapshot(
        usePlayerStore.getState().players,
        useAnnotationStore.getState().annotations
      ),
      board: capture(),
    });

    // The pull: everything dragged onto a tighter ground.
    useBallStore.getState().updateBallPosition([1, 0, 1]);
    useConeStore.getState().setCones([{ id: 'c1', position: [0, 0, 55] }]);
    usePathStore.getState().updatePath('lead', {
      keyframes: [
        { timestamp: 0, position: [0, 0, 0] },
        { timestamp: 1, position: [0, 0, 55] },
      ],
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
    // What the Fit readout's memory is read from (ADR 0005). The pull tags its
    // own history entry, so the signal is a predicate over `past` — undo moves
    // the entry to `future` and the memory clears on its own, redo brings both
    // back. No flag in a store, no listener, and nothing to keep in step.
    const tight = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });
    usePlayerStore.getState().setPlayers([player([0, 0, 60])]);

    // An ordinary drag first: it is the same entry shape and must not be
    // mistaken for a pull, or the memory would be a dirty flag.
    recordPlayerMove([0, 0, 60]);
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(false);

    pullBoardInsideBoundary(tight);
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(true);

    undoBoard();
    expect(hasBeenPulledInside(useHistoryStore.getState().past)).toBe(false);
    expect(useHistoryStore.getState().future[0].pulledInside).toBe(true);

    // The store's redo and nothing more: redo has no affordance in the app —
    // no shortcut, no control, no `redoBoard` — so this covers the marker
    // travelling with the entry, which is all the marker is asked to do. Redo
    // putting the *board* back is a separate, pre-existing gap: `future` holds
    // the pre-edit board, so there is nothing recorded for it to re-apply.
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

  it('does not record annotation mutations while recording is paused', () => {
    useHistoryStore.getState().pauseRecording();

    useAnnotationStore.getState().addAnnotation(arrow());

    expect(useHistoryStore.getState().past).toHaveLength(0);
    // the annotation itself is still applied — only the history record is skipped
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });
});
