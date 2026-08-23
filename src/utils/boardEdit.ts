import { capture } from './boardSnapshotIO';
import { boardChanged, type BoardSnapshot } from './boardSnapshot';
import { useHistoryStore } from '../store/historyStore';

/**
 * boardEdit — the one way a coach's edit becomes undoable.
 *
 * A **Board edit** is a change the coach made to the open board, recorded so it
 * can be undone. A board write the app performs on the coach's behalf — loading
 * a Play, seeding the board, playback, undo's own restore — is not a Board edit
 * and calls neither function below; that rule, not a list of blessed call
 * sites, is what decides whether a given write records.
 *
 * Two shapes cover every edit:
 * - `editBoard` — a mutation that runs and finishes in one call (a tap, a menu
 *   action).
 * - `beginEdit` — a mutation that unfolds over time, begun when the coach's
 *   hand lands and committed when it lifts (a drag).
 *
 * Both ask the same question on completion: did the board actually change?
 * `boardSnapshot.boardChanged` compares the board before against the board
 * after, so a drag that ends where it started, or a menu action re-applying
 * what is already true, costs the coach nothing on the undo stack.
 *
 * Nothing outside this module calls `useHistoryStore.getState().push` — it is
 * the sole writer of `past`.
 */

interface OpenEdit {
  label: string;
  before: BoardSnapshot;
}

/**
 * The one edit currently in progress, if any. A single slot rather than a
 * stack: an edit begun while this is set folds into the open one instead of
 * starting its own, so a tangled interaction — a pod tapped mid-drag with a
 * second finger — produces one entry whose before-board predates all of it,
 * never entries landing out of order.
 */
let openEdit: OpenEdit | null = null;

function commit(edit: OpenEdit): void {
  const after = capture();
  if (boardChanged(edit.before, after)) {
    useHistoryStore.getState().push({ before: edit.before, after, label: edit.label });
  }
}

/**
 * Run a mutation and record it as one edit, labelled for the undo stack.
 *
 * Called while another edit is already open, it just runs the mutation: the
 * open edit's own before/after span already covers it.
 */
export function editBoard(label: string, mutate: () => void): void {
  if (openEdit) {
    mutate();
    return;
  }

  const edit: OpenEdit = { label, before: capture() };
  openEdit = edit;
  mutate();
  openEdit = null;
  commit(edit);
}

/** The open half of a gesture edit — call `commit()` when the coach's hand lifts. */
export interface EditHandle {
  /** Records the edit if the board changed. Idempotent: a second call does nothing. */
  commit: () => void;
}

/**
 * Begin an edit that spans time — the coach's hand landing, some number of
 * writes, then lifting. Returns a handle whose `commit()` closes it.
 *
 * Begun while another edit is already open, the returned handle folds into
 * that one: its own `commit()` does nothing, because only the outermost
 * commit records.
 */
export function beginEdit(label: string): EditHandle {
  if (openEdit) {
    return { commit: () => {} };
  }

  const edit: OpenEdit = { label, before: capture() };
  openEdit = edit;
  let committed = false;

  return {
    commit: () => {
      if (committed) return;
      committed = true;
      openEdit = null;
      commit(edit);
    },
  };
}
