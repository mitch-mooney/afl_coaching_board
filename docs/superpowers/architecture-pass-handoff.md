# Architecture Pass — Handoff / Pick-up Note

> **Purpose:** resume the deferred §7 architecture pass in a fresh session. Read this top-to-bottom,
> then pick a remaining wave and run the workflow below. Last updated 2026-07-24; `main` tip `f23de2e`
> (local `main` is a few commits ahead of `origin` — push when ready).
>
> **STATUS: the architecture pass is substantially complete.** All audit R-themes (R2–R6) are done or
> explicitly declined (see the done table). What's left is optional/deferred (below), not core pass work.

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
| R6 wave 1 — dead video-persistence | removed the verified-dead persistence surface from `videoStore` (7 zero-caller actions incl. the cascade + its `window.confirm`, the `videoBlobs` table, playStore orphans); killed the `window.confirm`-in-store smell by deletion (−~200 lines) | `7a8989d` |
| R2 — cameraStore math tests | **re-scoped:** Dexie-injection seam DECLINED as YAGNI (fake-indexeddb already provides the test seam); instead added characterization tests for cameraStore's untested pinch/pan/zoom/preset math (5→18 tests, no source change) | `d8f3768` |
| R6 wave 2 — useVideoPlayback pure core | extracted the buffer math into tested `videoBuffer.ts` + deduped inline frame math onto `videoUtils.timeToFrame`/`frameToTime` (removed private `ASSUMED_FRAME_RATE`); structural sub-hook split declined for this slice | `b2208e7` |
| R6 wave 3 — shared video-element sync | deduped the verbatim `<video>`-to-store sync effect (VideoWorkspace + VideoPiP) behind a tested `useVideoElementSync` hook (`syncVideoElement` core); literal single-element consolidation declined (different tabs/DOM, draggable PiP) | `f23de2e` |

## What's left (all optional / deferred — core pass is done)

The R-themes are complete. Nothing below is required; each is a discretionary follow-up. If you pick
one, run the same workflow.

- **`useVideoPlayback` structural sub-hook split** (deferred from R6 wave 2) — split the imperative
  shell (rAF loop / transport commands / DOM-event wiring) into sub-hooks. Build-verified-only (no
  `renderHook`), higher regression risk, modest structural gain. Likely not worth it; do only if the
  hook keeps growing.
- **MainLayout JSX-blob + orchestration split** (deferred from R3 wave 3) — the two big inline JSX
  blobs (tab switcher, linked-video chip bar) → components; lifecycle effects → hooks. Pure
  build-verified moves.
- ~~**PRODUCT DECISION: video↔play linking**~~ **SETTLED + REBUILT (`66f5d90`).** Root cause was a
  single missing call — `VideoUploader` never ran `saveVideoMetadata` on import, so
  `currentSavedVideoId` stayed null and "Link to Play" always refused. Fixed with one
  `await saveVideoMetadata()` in the load handler; linking + chip + filters + clip-share now work
  end-to-end within a session. **Still pending: a manual runtime smoke** (import → link → chip → share)
  — couldn't be driven automatically (R3F tab-freeze). Out of scope (noted): cross-session video *blob*
  storage, `videos`-row dedup, delete-metadata UI.
- **TrainingMode repair** — rotation model triple-divergent + broken, `timerStore.tick` never driven,
  no session persistence. This is **feature work, not the architecture pass.**

### R2 — DONE (and the DI seam was declined)
- **Resolved (`d8f3768`).** The **Dexie-injection seam was declined as YAGNI**: `src/test/setup.ts`
  imports `fake-indexeddb/auto`, so the singleton Dexie stores are already testable against a real
  in-memory IndexedDB (playStore/videoStore/playbookStore/appDatabaseMigration all exercise real Dexie
  CRUD), and the canonical spec had deferred DI. The real gap — `cameraStore`'s untested pinch/pan/zoom
  math — was closed with characterization tests (5→18, no source change).
- If a *future* need for DI arises (e.g., swapping the DB backend, or per-test DB isolation that
  fake-indexeddb can't give), revisit then — but it's not warranted for testability alone.

### R6 — video ownership scattered
- **Wave 1 DONE** (`7a8989d`): the store's `window.confirm` + dead Dexie persistence are gone. Key
  finding from that wave: the video-metadata **write path (`saveVideoMetadata`) is unwired**, so the
  video↔play *linking* feature is effectively non-functional (`savedVideos` always empty; PlayLibrary's
  `videoDb.videos.get` always misses). Deciding to **rebuild or fully remove** that linking feature is a
  product call, not yet made — worth surfacing before further video work.
- **Wave 2 DONE** (`b2208e7`): extracted `useVideoPlayback`'s pure core (buffer math → `videoBuffer.ts`;
  frame-math dedup onto `videoUtils`). The **structural sub-hook split** (rAF loop / transport commands /
  DOM-event wiring into sub-hooks) was **declined** for that slice — it's build-verified-only (no
  `renderHook`) and higher risk; still available as an optional later wave if wanted.
- **Wave 3 DONE** (`f23de2e`): deduped the verbatim `<video>`-to-store sync effect (VideoWorkspace +
  VideoPiP) behind a tested `useVideoElementSync` hook. Literal single-element consolidation was
  **declined** — the elements live on different tabs/DOM subtrees and PiP is draggable, so merging to
  one `<video>` would need portaling a shared element around (big rework, low payoff).
- **All three R6 waves done.** Remaining video items are the optional `useVideoPlayback` split and the
  video↔play-linking product decision (both in "What's left" above).
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
