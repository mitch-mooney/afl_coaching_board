# Architecture Pass — Handoff / Pick-up Note

> **Purpose:** resume the deferred §7 architecture pass in a fresh session. Read this top-to-bottom,
> then pick a remaining wave and run the workflow below. Last updated 2026-07-23; `main` tip `97a8341`.

## Where things stand

The pass runs on the **current whole app** (§5/§6/board-snapshot/TrainingMode all shipped first). It
attacks the root causes found in a 6-subsystem deep-module audit, one tight, behaviour-preserving
(or explicitly behaviour-fixing) **wave** at a time. Each wave = its own branch → spec → plan →
subagent-driven implementation → merge → push.

**Done + merged + pushed to `origin/main`:**

| Slice | What it did | Tip |
|---|---|---|
| Wave 0 + Wave 1 (canonical board-state) | dead-code delete; `playStore` = single Plays-table gateway; `modeStore`→`boardSnapshotIO`; minimal undo annotation fix | (earlier) |
| R3 wave 1 — `dragMath` | extracted duplicated pointer→field raycast + rotation math out of `Player.tsx`/`Ball.tsx` into pure tested `src/utils/dragMath.ts` | — |
| R3 wave 2 — `cameraMath` | extracted POV follow-camera geometry out of `CameraController.useFrame` into pure tested `src/utils/cameraMath.ts` | — |
| R3 wave 3 — MainLayout leaves | `SkyDome`+crowd texture → `src/components/Scene/SkyDome.tsx`; deduped `formatVideoTime` → shared `videoUtils` export + test | — |
| R4 — transport controls | deduped `PlayFab`↔`TransportBar` bindings behind `src/components/Board/hud/useTransportControls.ts` | — |
| R5 — shortcut suppression | replaced dead `[role=dialog]` DOM sniff with `uiStore.overlayOpenCount` + `useOverlayOpen` hook + tested `isBlockedByOverlay` predicate; wired 9 blocking modals | `97a8341` |

**`origin/main` is up to date** (nothing unpushed as of the last push).

## Remaining waves (pick one)

### R2 — Dexie-injection seam / shallow-store residue
- The **shallow-store** half is largely done: `playStore` is now the single gateway to the `scenarios`
  (Plays) Dexie table.
- What's left: the app still uses **singleton Dexie instances** with no injection seam
  (`playbookDB`, `VideoImportDB`, etc.). The canonical spec explicitly deferred "introducing a
  DB-injection interface for Dexie (later; keep the singleton for now)." A wave here would introduce a
  narrow DB seam so stores/services depend on an interface, not the singleton — improving testability.
- Also loose: **`cameraStore`'s pinch/pan/zoom math** (`applyPinchZoom`/`applyTwoFingerPan`/
  `setPOVDistance`) is untested store-seam logic (not trapped in a god-component, just uncovered) — a
  cheap characterization-test add, could ride along or be its own tiny slice.
- **Risk/appraisal:** the Dexie-injection seam is real but easy to over-engineer. Scope it tightly
  (likely one DB and its store) and check YAGNI. Confirm it's worth doing before a big injection refactor.

### R6 — video ownership scattered
- Video is the messiest subsystem: **three `<video>` elements**, a **762-line god-hook**
  (`useVideoPlayback.ts`), and `videoStore` **fusing transport + Dexie persistence + `window.confirm`**.
- Candidate slices (do NOT try all at once): (a) pull `window.confirm` out of the store; (b) split the
  god-hook's concerns; (c) consolidate the `<video>` elements / single-owner playback. Each is its own
  wave.
- **Note:** R4 already *declined* unifying `animationStore`↔`videoStore` transport (different mediums).
  R6 is about video's *internal* ownership mess, not unifying it with the board clock.

### Deferred/declined (record, don't silently redo)
- **MainLayout** still has two large inline JSX blobs (tab switcher, linked-video chip bar → components)
  and lifecycle orchestration effects (→ hooks). Deliberately deferred as *future* MainLayout slices.
- **Declined:** full Command abstraction unifying keyboard↔HUD action defs (R5) — speculative.
- **Declined:** `animationStore`↔`videoStore` transport unification (R4) — different mediums.
- **Deferred bugs (worth a ticket, frozen verbatim in current code):**
  - `videoUtils.formatVideoTime` rounds seconds → renders `"0:60"` at ~59.6s.
  - `animationStore.stop()` (sets `'stopped'`, zeroes progress, no board reposition) diverges from the
    UI stop (`scrubTo(0)` reposition + `'paused'` via `togglePlayback`).
- **TrainingMode repair** (rotation model triple-divergent + broken, `timerStore.tick` never driven, no
  session persistence) is **feature work, not this pass.**

## The workflow to repeat (per wave)

1. **Brainstorm** (`superpowers:brainstorming`): explore the actual code first; scope honestly (flag
   over-engineering risk; behaviour-preserving vs. behaviour-fix); use `AskUserQuestion` for the scope
   decision; present a design; get approval.
2. **Spec** → `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`; self-review; commit; user reviews.
3. **Plan** (`superpowers:writing-plans`) → `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`; tiny
   build-green-between tasks with exact code; self-review; commit.
4. **Implement** (`superpowers:subagent-driven-development`): branch `arch/<topic>` off `main`; fresh
   **haiku** implementer per task (code is in the brief → transcription), **sonnet** task-reviewer each,
   **opus** whole-branch review at the end. Track in `.superpowers/sdd/progress.md` (the ledger).
5. **Finish** (`superpowers:finishing-a-development-branch`): verify → ff-merge to `main` → delete
   branch. Then update memory + this doc. **Push only when the user says so.**

## Facts & gotchas (carry these in)

- **Full `vitest run` OOMs on Windows** (pre-existing). Run touched suites **targeted**. Some heavy
  single files OOM even in isolation — `videoUtils.test.ts` (103 tests) and (mildly) others: use
  `npx vitest run <file> -t "<name>"` and `NODE_OPTIONS=--max-old-space-size=6144` to isolate.
- **Verify component/JSX/hook waves with `npx tsc --noEmit` + `npm run build`** (no `renderHook` in the
  repo — no `@testing-library/react`); pure utils/stores get real unit tests.
- **Enumerate blocking overlays by layout (`fixed inset-0` sweep), not by `*Modal`/`*Dialog` filename** —
  R5 missed the inline `VideoUploader` modal that way; the opus final review caught it.
- **The opus whole-branch review is worth it** — it has caught real completeness gaps the per-task
  reviews and the plan missed.
- SDD helper scripts live at
  `C:/Users/mitch/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.1/skills/subagent-driven-development/scripts/`
  (`task-brief PLAN N`, `review-package BASE HEAD`).

## Pointers

- **Living status in memory:** `architecture-pass.md` (full wave-by-wave detail), `MEMORY.md` (index).
- **SDD ledger:** `.superpowers/sdd/progress.md` (per-task commits, reviews, decisions — the recovery map).
- **Source design doc:** `docs/lean-scope-decision-doc.md` §7.
- **Original slice spec:** `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md`.
- All wave specs/plans: `docs/superpowers/specs/2026-07-23-*` and `docs/superpowers/plans/2026-07-23-*`.
