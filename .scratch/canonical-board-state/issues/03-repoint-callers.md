# 03 — Repoint callers onto the playStore gateway (contract)

**What to build:** With the gateway verbs in place, make `playStore` the **only** door to the
Plays table. Every module that currently reaches into `playbookDB.scenarios` / `playTable` or
re-assembles `toPhase(capture(), …)` now calls the gateway instead. When this lands, no
component imports `playTable`, `capture`, or `toPhase`, and the duplicated
"capture-the-board-into-a-Play" ritual exists in exactly one place. Behaviour is unchanged —
this is a pure internal rewiring. (Contract half of the expand→contract begun in ticket 02.)

**Blocked by:** 02 — Add playStore gateway verbs.

**Status:** ready-for-agent

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1a).

- [ ] `usePlaybook` quick-save goes through the gateway; stops importing `capture`/`toPhase`.
- [ ] `MainLayout` autosave-on-unmount uses `saveActiveBoard`; play-load uses `loadPlayBoard`; stops importing `playTable`/`capture`/`toPhase` and no longer indexes `phases[0]`.
- [ ] `sharingService` reads its Play via `getPlay` instead of `playbookDB.scenarios.get`.
- [ ] `playbookStore` book-reassignment calls `reassignBook`.
- [ ] `videoStore` video-delete cascade calls `clearVideoLink`.
- [ ] `playTable` remains exported for tests only; a grep confirms no non-test module imports `playTable`/`capture`/`toPhase`.
- [ ] Full app flows verified unchanged (quick-save, autosave-on-leave, open a Play, share a Play, delete a video, merge/reassign a Playbook); build + affected suites green.

_Note: touches `videoStore.ts` (the `clearVideoLink` cascade region) — coordinate ordering with ticket 01, which touches the `ExportSettings` region of the same file._
