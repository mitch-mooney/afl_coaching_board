import { describe, it, expect, beforeEach } from 'vitest';
import { undoBoard } from '../useBoardUndo';
import { useHistoryStore, createStateSnapshot } from '../../store/historyStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnnotationStore } from '../../store/annotationStore';
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

  it('reverts interleaved annotation + player edits together', () => {
    useAnnotationStore.getState().addAnnotation(arrow()); // edit 1
    recordPlayerMove([5, 0, 5]); // edit 2

    // NOTE: historyStore.undo()'s stack-return logic is intentionally out of
    // scope (spec Wave 1c). This asserts the fix itself: annotations travel
    // through undo alongside players instead of being silently ignored.
    undoBoard();

    expect(usePlayerStore.getState().players[0].position).toEqual([0, 0, 0]);
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('does not record annotation mutations while recording is paused', () => {
    useHistoryStore.getState().pauseRecording();

    useAnnotationStore.getState().addAnnotation(arrow());

    expect(useHistoryStore.getState().past).toHaveLength(0);
    // the annotation itself is still applied — only the history record is skipped
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });
});
