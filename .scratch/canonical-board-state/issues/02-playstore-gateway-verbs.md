# 02 — Add playStore gateway verbs (expand)

**What to build:** `playStore` should be the single place that knows how to turn the live
board into a saved Play and back, and the single owner of the `scenarios` (Plays) table.
This ticket **adds** those verbs beside the existing direct-Dexie access — nothing is
repointed yet, so all current paths keep working and the app behaves identically. The new
API ships fully unit-tested. (Expand half of an expand→contract; ticket 03 does the contract.)

**Blocked by:** None — can start immediately.

**Status:** done (branch arch/canonical-board-state, commit ba3389d)

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1a).

- [x] `saveActiveBoard(id)` — captures the live board, wraps it as the Play's `phase-1`, and updates the Play. The `phase-1` identity literal and the `phases:[]` wrapping live here, nowhere else.
- [x] `loadPlayBoard(id)` — reads a Play and restores its first phase onto the live board.
- [x] `getPlay(id)` — thin read for other callers (e.g. sharing) instead of hitting the table directly.
- [x] `reassignBook(fromId, toId)` — moves all Plays in one Playbook to another (absorbs the reassignment currently in `playbookStore`).
- [x] `clearVideoLink(videoId)` — unlinks the given video from every Play (absorbs the cascade currently in `videoStore`).
- [x] Create path: added `createPlayFromBoard(name, playbookId)` which captures the active board internally, so no caller assembles `toPhase(capture(), …)`. (`createPlay` itself stays capture-free so the "New Play" callers can still make empty Plays.)
- [x] Unit tests: round-trip `saveActiveBoard`→`loadPlayBoard`; `getPlay`; `reassignBook`; `clearVideoLink` (using the existing `playTable`-clearing test setup).
- [x] No caller repointed in this ticket; app behaviour unchanged; build + `playStore` suite green.
