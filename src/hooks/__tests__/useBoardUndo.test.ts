import { describe, it, expect, beforeEach } from 'vitest';
import { undoBoard } from '../useBoardUndo';
import { useHistoryStore, createStateSnapshot } from '../../store/historyStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { usePathStore } from '../../store/pathStore';
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

  it('does not record annotation mutations while recording is paused', () => {
    useHistoryStore.getState().pauseRecording();

    useAnnotationStore.getState().addAnnotation(arrow());

    expect(useHistoryStore.getState().past).toHaveLength(0);
    // the annotation itself is still applied — only the history record is skipped
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });
});
