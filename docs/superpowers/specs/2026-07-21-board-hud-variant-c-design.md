# Board HUD — Variant C thumb-pod skin (§6a) — design

> **Status:** Approved design, ready for implementation plan.
> **Source:** Lean-scope decision doc §6 ("one IA, four on-board concerns Setup/Draw/Animate/Camera; tablet → Variant C thumb-zone"). Prototype primary source: branch `prototype/board-layout-4`, `src/prototypes/board-layout/VariantC.tsx`.
> **Branch:** `lean/live-coaching-first`. Builds on §5a/§5b (Play/Playbook rename + nav). Follows §5b-ii.

## §6 decomposition (recorded here; this spec is §6a only)

§6 replaces the scattered on-board command surface (the all-sizes `MobileMenu`, the `MainLayout` top-bar cluster, `AnnotationToolbar`, `CameraDock`) with the four mode-concerns across two responsive skins. It is sliced:

- **§6a (this spec)** — mode-concern **control wiring** + the **Variant C** thumb-pod skin, at all viewports. Retire the migrated legacy surfaces. Hamburger shrinks to globals.
- **§6b** — the **Variant B** desktop left-rail skin + responsive B/C selection (pointer + viewport). Reuses §6a's per-concern control wiring.
- **§6c** — global drawer + a home for per-Play share (the orphaned `sharingService.sharePlayWithClip`) + final `Toolbar.tsx` retirement + duplicate-control cleanup (two label controls, two roster-import paths).

Tablet-first ordering chosen because the product north star is iPad live coaching.

## Goal (§6a)

Replace the board's scattered chrome with a thumb-reachable HUD: two bottom-corner fan pods (Setup left, Camera right) and a central Play FAB with a drag-to-scrub arc — wired to the real stores over the real R3F board — usable one-handed on an iPad in landscape.

## Approach

Variant C has **no single "active mode"**: it is chrome that opens/closes fans and calls existing store actions. So §6a introduces **no new `boardMode` enum**. It reuses existing state:

- `uiStore.boardSubMode: 'setup' | 'draw'` — already drives movement-path recording in `Player.tsx` (drag in `draw` records a path; `setup` only repositions). The Setup fan's "Draw path" pill toggles it.
- `annotationStore` (tool/colour/thickness/clear/text-placement), `cameraStore` (presets + follow-cam POV), `animationStore` (play/scrub/speed), `pathStore`, `playerStore`, `ballStore`.

The shared "core" that §6b (the B rail) will reuse is the **per-concern store-wiring** kept in small focused components — not a shared mode-state. That abstraction stays YAGNI until §6b needs it.

Rejected: introducing a 4-way `boardMode` now (C never has a single active mode — it would be dead state); keeping the old layout on desktop while C runs on touch (two live command surfaces = more conditional complexity, riskier §6a). Decision: **C at all viewports** until §6b's responsive rail lands.

## Scope

### In scope
- New `src/components/Board/hud/` overlay: `BoardHud` shell + `SetupPod`, `CameraPod`, `PlayFab`, and an annotate palette surface.
- Wire the four concerns to real stores (control map below).
- Surface two latent (store-exists, no-UI) controls: the **scrub arc** (`animationStore.progress` → `positionEntitiesAtProgress`) and **playback speed** (`animationStore.cycleSpeed`).
- Retire the migrated legacy surfaces (delete/gut list below).
- Shrink the hamburger/`MobileMenu` to globals only (save, video import/clear, sign out, help, match) — its mode-related sections are removed.

### Out of scope
- §6b (Variant B rail + responsive selection) and §6c (global drawer, share home, `Toolbar.tsx` deletion, duplicate cleanup).
- Latent controls **deferred**: POV follow-distance slider (`setPOVDistance`), loop (`toggleLoop`), scoreboard show/hide (`toggleScoreboard`).
- True first-person "what they see" POV — **"POV" surfaces the existing follow-cam relabeled**; no new render.
- The `handleCreateBallPath` hardcoded +30/+20 test path (dev scaffolding — not surfaced).

## The three thumb zones

All three sit along the bottom within thumb reach, honouring iPad safe-area (`bottom: calc(… + env(safe-area-inset-bottom))`). HUD renders only when `editorTab === 'board'` (matching today's `CameraDock` gating). Opening one pod's fan closes the other (mutually exclusive, as in the prototype).

### Setup pod — bottom-left fan
Entry button 👥 SETUP; fan (column-reverse) contains:
- **Formation presets** — `playerStore.applyFormation(id)` + `uiStore.setActiveFormationId` (the 3 presets from `FormationPresetBar`, incl. re-apply of the active one).
- **Teams / jerseys** — opens the existing team-selector flow (`playerStore.setTeamPreset`; seeds `matchStore` home/away names as today).
- **Labels** — `playerStore.cycleLabelMode` (reads `labelMode` for the current label; this is the single surviving label control).
- **Reset players** — `playerStore.resetPlayers`.
- **Give / Release ball** — `ballStore.assignBallToPlayer` (possession).
- **Draw path** (toggle) — `uiStore.toggleBoardSubMode`; highlighted (amber) when `boardSubMode === 'draw'`. While active, dragging tokens records movement paths. Includes **Clear paths** — `pathStore.clearPaths` (disabled when no paths).
- **Annotate** — opens the annotation palette (see below).
- **Import roster…** — opens the existing inline roster-import dialog.

### Annotate palette (opened from the Setup fan)
A compact palette exposing the current `AnnotationToolbar` behaviour:
- Tool select — line / arrow / circle / rectangle / text / measure via `annotationStore.setSelectedTool(tool | null)` (toggling a tool off returns to no-draw).
- Colour — the 6 presets (`setSelectedColor`).
- Thickness — 1–10 (`setThickness`), hidden for text/measure (as today).
- Clear annotations — `clearAnnotations`.
- Text placement flow preserved (`pendingTextPoint` → `addAnnotation`).

### Camera pod — bottom-right fan
Entry button 🎥 (label flips CAM ⇄ POV when a follow-cam slot is active); fan contains:
- **Broadcast** (default) — `cameraStore.switchToBroadcast` / `setPresetView('top')`.
- **Preset angles** — Top / Sideline / End-to-end (`setPresetView`), Reset camera (`resetCamera`).
- **POV #n** — the two assignable follow-cam slots: assign via the existing POV player selector (`setPovPlayer`), activate (`setActivePovSlot`), and **Exit POV** (`switchToBroadcast`). Framed as "what #n sees" but backed by the follow-cam.

### Play FAB — bottom-centre
- **Play / pause** — `animationStore.togglePlayback` (Space keyboard shortcut still bound via `useAnimationControlShortcuts`).
- **Drag-to-scrub arc** — a 270° ring around the FAB bound to `animationStore.progress`; dragging sets progress and calls `positionEntitiesAtProgress(progress)` so the board reflects the scrub (the board scrubber `usePathPlayback.ts` notes as "once added").
- **Speed** — `animationStore.cycleSpeed` (0.25–2×), shown as a small `1×` chip near the FAB.
- Enabled only when `animationStore.hasAnimation` (dimmed/disabled otherwise), so an empty board shows an inert FAB.

## Retire (delete or gut after logic moves)

- **Delete:** `src/components/UI/FormationPresetBar.tsx`, `src/components/UI/LabelToggle.tsx`, `src/components/UI/AnnotationToolbar.tsx`, `src/components/UI/CameraDock.tsx`.
- **Gut in `MainLayout.tsx`:** the top-bar board-controls cluster (Setup/Draw toggle + `FormationPresetBar` + `LabelToggle`, ~lines 323–337); mount `BoardHud` instead. Keep the `← Plays` back button, board/video tab switch, linked-video chip, Canvas, and PiP.
- **Gut in `Toolbar.tsx` / `MobileMenu`:** remove the mode-related sections (Reset players, Labels, Import roster, Auto-assign, Teams, Play/Pause, Stop, camera presets, Follow-cam, Clear paths, position select, ball give/release) now that they live in pods. **Keep** the global sections (Save Playbook, Video import/clear, Sign out, Help, Match setup + scoreboard) — these move in §6c. `Toolbar.tsx` is NOT deleted in §6a.

Annotation was always-mounted (even on the video tab); §6a drops it on the video tab (vestigial there — `VideoWorkspace` is a plain review surface).

## Files

- Create: `src/components/Board/hud/BoardHud.tsx`, `SetupPod.tsx`, `CameraPod.tsx`, `PlayFab.tsx`, `AnnotatePalette.tsx`.
- Modify: `src/components/Layout/MainLayout.tsx` (mount `BoardHud`, remove the migrated top-bar cluster + `CameraDock`/`AnnotationToolbar` mounts), `src/components/UI/Toolbar.tsx` (remove migrated `MobileMenu` sections).
- Delete: `FormationPresetBar.tsx`, `LabelToggle.tsx`, `AnnotationToolbar.tsx`, `CameraDock.tsx`.
- Extract shared arc-geometry helpers (`arcPath`/`polar` from the prototype) into a small util for `PlayFab`.

## Verification

No React Testing Library in the repo, so no component unit tests. Pure arc-geometry helpers get a Vitest unit test (they're pure math). Otherwise:

- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. (Full Vitest suite OOMs on Windows — run only new/changed test files.)
- **Runtime smoke (blocked by the Supabase `/login` gate in this env — needs a signed-in session):**
  1. Board shows two thumb pods + a central Play FAB; the old top-bar Setup/Draw toggle, `FormationPresetBar`, `LabelToggle`, `AnnotationToolbar`, `CameraDock` are gone.
  2. Setup fan: apply a formation → tokens move; toggle Draw path → drag a token records a path; Annotate → draw an arrow; Clear works.
  3. Play FAB: with a drawn path, play animates; drag the scrub arc → tokens reposition to that progress; speed chip cycles.
  4. Camera fan: Broadcast ↔ POV #n switches the view; Exit POV returns to broadcast.
  5. Opening one pod closes the other; safe-area spacing correct in landscape; no console errors.
  6. Hamburger still opens and Save/Video/Sign-out/Help/Match still work.

## Interfaces (for the plan)

- Consumes existing store actions (verbatim names): `playerStore` (`applyFormation`, `setActiveFormationId` [uiStore], `setTeamPreset`, `cycleLabelMode`, `resetPlayers`), `ballStore.assignBallToPlayer`, `uiStore.toggleBoardSubMode`/`boardSubMode`, `pathStore.clearPaths`, `annotationStore` (`setSelectedTool`, `setSelectedColor`, `setThickness`, `clearAnnotations`, `addAnnotation`, `pendingTextPoint`), `cameraStore` (`switchToBroadcast`, `setPresetView`, `resetCamera`, `setPovPlayer`, `setActivePovSlot`, `povPlayer1Id`/`povPlayer2Id`/`activePovSlot`), `animationStore` (`togglePlayback`, `isPlaying`, `progress`, `setProgress`, `cycleSpeed`, `speed`, `hasAnimation`, `positionEntitiesAtProgress`).
- Produces: `BoardHud` (mounted by `MainLayout` when `editorTab === 'board'`) + its pod/FAB/palette children; a pure arc-geometry util.
