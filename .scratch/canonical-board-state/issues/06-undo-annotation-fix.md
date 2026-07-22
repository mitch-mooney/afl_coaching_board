# 06 — Minimal undo annotation fix

**What to build:** Undo silently ignores annotations. The two places that record history pass
an empty annotations array, so adding or moving an annotation is never captured, and undo only
ever restores players. Fix undo so annotation changes are recorded and reverted — keeping the
existing lightweight player+annotation snapshot shape (expanding undo to paths/ball/cones is
deliberately out of scope for this slice).

**Blocked by:** None — can start immediately.

**Status:** done

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1c).

- [ ] The two `pushSnapshot` sites (player drag-end, ball drag-end) record the **real** current annotations instead of an empty array.
- [ ] Annotation mutations (add / remove / clear) record a history snapshot, respecting the paused flag during undo/redo.
- [ ] `useBoardUndo` restores annotations alongside players.
- [ ] Tests: add an annotation → undo → it's gone; move a player → undo → restored (regression); interleaved annotation + player edits undo in order.
- [ ] Out of scope (do not touch): paths/ball/cones/camera in undo, and the `undo()` stack-return logic. Build + history/undo suite green.
