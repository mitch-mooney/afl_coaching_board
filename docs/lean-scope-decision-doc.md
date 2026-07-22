# Lean-Scope Decision Doc — AFL Coaching Board

> **Status:** Hand-off. This is the artifact a build session executes from.
> **Source:** Wayfinder map [#1](https://github.com/mitch-mooney/afl_coaching_board/issues/1) and its resolved tickets [#2](https://github.com/mitch-mooney/afl_coaching_board/issues/2) (keyboard), [#3](https://github.com/mitch-mooney/afl_coaching_board/issues/3) (persistence), [#4](https://github.com/mitch-mooney/afl_coaching_board/issues/4) (layout). Prototype on branch `prototype/board-layout-4`.

## Why this exists — the north star

Refocus the app on **live coaching**: a coach on a tablet at training or on match day, where **speed and touch-friendliness dominate**. Session/play **prep** is the strong second use case; **save/share playbooks stays**.

**The blade:** if a feature doesn't serve *fast tactical setup* or a *demonstration payoff*, it's a cut candidate. One nuance — the **"feel" axis**: some cosmetic features earn their place through immersion/context rather than interaction (the always-on scoreboard mirrors what a real player sees and drives urgency). Weigh feel, not just utility.

**Net effect:** roughly **~8,000 lines removed** — two animation engines collapse to one, two persistence models collapse to one, and dead modules go. This deletion *is* the highest-leverage architecture work (via the deletion test), which is why the architecture pass is deferred until after the lean (see [Sequencing](#execution-sequencing)).

All paths below are relative to `src/`. Line counts are approximate.

---

## 1. CUT — what dies

### 1.1 Video: calibration / field-over-video overlay — ✅ done
Aligning the 3D field onto imported video. **User decision during execution: PIP-only video review, but preserve video-moment marking/linking** (it turned out `VideoWorkspace` also held `handleLinkToScenario`, a kept feature feeding §5, not just calibration).

| File | ~LoC | Action |
|---|---|---|
| `components/VideoImport/PerspectiveCalibration.tsx` | 685 | ✅ deleted |
| `components/VideoImport/CalibrationGrid.tsx` | 541 | ✅ deleted |
| `components/VideoImport/VideoBackgroundPlane.tsx` | 340 | ✅ deleted |
| `components/VideoImport/VideoCanvas.tsx` | 481 | ✅ deleted (the 3D overlay) |
| `store/videoStore.ts` | (shared) | ✅ removed `PerspectiveSettings` + all perspective actions + `displayMode` (+ its persistence) |
| `components/VideoImport/VideoWorkspace.tsx` | (reworked) | ✅ **kept, slimmed** — reworked from the 3D-overlay calibration workspace into a plain `<video>` review surface that retains the timeline + moment-marking/linking. Video tab shows it; PiP overlays the board tab. |

### 1.2 Video: trimming — ✅ done
| File | ~LoC | Action |
|---|---|---|
| `components/VideoImport/VideoTrimmer.tsx` | 208 | ✅ deleted |
| `components/VideoImport/VideoUploader.tsx` | 745 | ✅ removed the trim step (video loads → uploader closes → PiP) |
| `utils/ffmpegConverter.ts` (`trimAndConvertVideo`) | — | **KEPT** — used by §5 per-Play share clip |

### 1.3 Video: MP4 export & board screen-recording — ✅ done
| File | ~LoC | Action |
|---|---|---|
| `hooks/useVideoRecorder.ts` | 123 | delete (board `captureStream` recorder) |
| `hooks/useVideoExport.ts` | 764 | delete |
| `components/VideoImport/VideoExporter.tsx` | 703 | delete (`VideoExporter`, `VideoExporterCompact`) |
| `utils/ffmpegConverter.ts` | 117 | delete (`convertWebMToMP4`, `trimAndConvertVideo`, `ConversionProgress`) |
| `utils/__tests__/videoUtils.test.ts` | — | trim/verify scope |

**Couplings to untangle:** `Toolbar.tsx` imports `useVideoRecorder` (lines 10, 45 — `toggleRecording`); `VideoWorkspace.tsx` mounts `VideoExporter` (lines 6, 615); `services/sharingService.ts` imports `trimAndConvertVideo`. Once export is gone, the FFmpeg WASM dependency, COOP/COEP headers (`vite.config.ts`), and the ~1.77 MB bundle pressure all ease.

### 1.4 Video: concert-mode (video ↔ animation sync) — ✅ done
All surgical — no standalone concert file exists.

| File | Action |
|---|---|
| `store/videoStore.ts` | remove `isSyncedWithAnimation` flag + sync actions (~lines 119, 165) |
| `components/Layout/MainLayout.tsx` | remove concert-sync effect (`concertSyncRef`, ~lines 172–189) |
| `components/VideoImport/VideoWorkspace.tsx` | remove concert toggle UI (~lines 95, 318–331) |
| `components/VideoImport/VideoPiP.tsx` | **KEEP file:** strip the sync toggle only (~lines 37, 440, 488) |
| `components/UI/HelpScreen.tsx`, `components/UI/OnboardingTour.tsx` | update copy references (line 39 / lines 22–23) |

### 1.5 Animation: the scripted Event / timeline engine → done (phase B)
The CUT animation engine — distinct from the KEPT draw-and-play path system (§3.1). ~1,900 lines.

> **Correction applied during execution.** The doc assumed a standalone
> draw-and-play *player* engine already existed and that `useAnimationPlayback`
> was part of it (kept, decouple in place). Investigation showed the opposite:
> **players only ever animated through the event engine** — `useAnimationPlayback`
> IS that engine (every branch gated on `isEventMode` + an active event), and
> `Player.tsx` never moved players along a path. Deleting §1.5 literally would
> have left players static during Play. Per the user's decision, a minimal
> replacement was built first, then the engine cut.

| File | ~LoC | Action |
|---|---|---|
| `store/eventStore.ts` | 360 | ✅ deleted |
| `components/UI/EventEditor.tsx` | 718 | ✅ deleted |
| `components/UI/EventTimeline.tsx` | 596 | ✅ deleted (was rendered in `MainLayout`) |
| `utils/trajectoryGeneration.ts` | 153 | ✅ deleted in phase A (orphaned) |
| `models/EventModel.ts` | 269 | ✅ deleted (`KickType` relocated to `BallModel.ts`) |
| `hooks/useAnimationPlayback.ts` | 427 | ✅ deleted (it WAS the event engine, not a kept path engine) |

**Replacement built:** `hooks/usePathPlayback.ts` — a minimal single-path player+ball
playback loop on a shared 0..1 progress clock (scaled to the longest path), using
the kept `getPositionAt*` helpers. Wired via `PlayerManager`'s `AnimationDriver`,
which also keeps `animationStore.hasAnimation` in sync with drawn paths (it was
never set before, so Play was inert). `animationStore`, `Ball`, `Player`, `Path`,
`uiStore`, `Toolbar`, `MainLayout` decoupled from the event system. Typecheck +
build pass; **still needs in-app runtime verification** (draw a path → Play →
players animate).

### 1.6 Dead code (cleanest deletes — no external importers)
| File | ~LoC | Action |
|---|---|---|
| `components/UI/FormationSelector.tsx` | 630 | delete (orphaned; only pairs with formationStore) |
| `store/formationStore.ts` | 146 | delete (orphaned pair) |
| `components/UI/HelpOverlay.tsx` | 364 | delete (duplicate/dead; `MainLayout` renders `HelpScreen.tsx`) |

_Verify before touching formation **presets**: `types/Formation.ts`, `data/formations.ts`, `components/UI/FormationPresetBar.tsx` are still live and formation presets are a **KEEP**. Delete only the `FormationSelector` + `formationStore` pair, not the preset data._

### 1.7 Keyboard: dead code (narrow — see §4 for the keep/fix)
| Target | Action |
|---|---|
| `store/keyboardStore.ts` (~227) | delete (fully orphaned) |
| `hooks/useKeyboardShortcuts.ts` (~953) | **surgical:** remove `performRedo` (line 613) + no-op `performUndo` stub (602); redo bindings `edit-redo-shift-z` (676–681), `edit-redo-y` (687–692); never-registered `Ctrl+S` `edit-save` stub (634, 650, 712) |
| `types/shortcuts.ts` (~134) | trim `onSave`/`onUndo`/`onRedo` from handler types; keep the rest |

### 1.8 Persistence: legacy Playbook layer — ✅ done (functional retirement)
> Executed in 4 build-green commits. `PlaybookPanel` + `SharePlaybookDialog` deleted; `usePlaybook.saveCurrentScenario` repointed to `scenarioStore` (was writing the dead flat `playbooks` table) and its `loadScenario` dropped; `playbookSync.ts` + the `sharePlaybook` writer deleted (kept `getSharedPlaybook` + `shareScenarioWithClip`); `Playbook` interface + `usePlaybookStore` removed and the Dexie class moved to `store/appDatabase.ts` (was `playbookStore.ts`), keeping `playbookDB`, the `AFLPlaybookDB` name, and the v1–v4 chain byte-identical (dead `playbooks` table retained as the v3 migration source). The `Scenario`→`Play` rename + net-new Playbook-as-collection model (§5) remain as the feature-shaped follow-on.

The current flat "Playbook" is dead-weight from a half-done v3 migration (`playbooks → scenarios` ran, but the whole Playbook stack was left active and diverging). See §5 for the replacement model.

| File | ~LoC | Action |
|---|---|---|
| `store/playbookStore.ts` → `Playbook` interface + `usePlaybookStore` | (7–20 + store) | delete these parts. **Do NOT delete the file** — the `PlaybookDatabase extends Dexie` class + `playbookDB` singleton (line 22+, incl. the v3 upgrade) live here and are shared by `scenarioStore`, `rosterStore`, `videoStore`. Consider splitting the Dexie class into its own module. |
| `components/UI/PlaybookPanel.tsx` | 375 | delete (rendered `MainLayout.tsx` line 587) |
| `services/playbookSync.ts` | 91 | delete (`uploadPlaybook`, cloud `playbooks` table) |
| `services/sharingService.ts` → `sharePlaybook` + `SharedPlaybook` | (of 199) | delete the whole-playbook share path; keep per-Play share (§5) |
| `components/UI/SharePlaybookDialog.tsx` | 106 | delete |
| `components/Shared/SharedPlaybookViewer.tsx` | — | replace with per-Play viewer at `/shared/:token` (App.tsx line 43) |

**Keep-for-migration (mark, do not delete):**
- `hooks/usePlaybook.ts` (~67) — needs rework to point at scenarios/Plays instead of `usePlaybookStore`/`uploadPlaybook`, but the module stays. Consumed by `Toolbar.tsx` (lines 11, 46).
- `PlaybookDatabase` / `playbookDB` (Dexie class inside `playbookStore.ts`).
- Migration path: post-v3 playbooks → Plays via existing mapping (`playbookStore.ts:46–65` + `paths: []`); existing scenarios → the default **"My Plays"** playbook; carry `videoBlobId` / `linkedVideoMoment.videoId` refs through. **No data loss.**

---

## 2. KEEP — what stays (untouched or lightly)

- **Annotations** — `store/annotationStore.ts` + Scene annotation rendering. Apple-Pencil drawing (`isPenDrawing`) stays.
- **Formation presets** — `FormationPresetBar.tsx`, `data/formations.ts`, `types/Formation.ts` (distinct from the cut `FormationSelector`).
- **Camera presets** — the 1/2/3 broadcast views (`cameraStore`, `CameraController`).
- **Onboarding / help** — `HelpScreen.tsx`, `OnboardingTour.tsx` (revisit copy after the redesign; see map "Not yet specified").
- **Video import + basic playback + PIP** — `VideoUploader.tsx` (minus trim step), `PlaybackControls.tsx`, `VideoTimeline.tsx`, `VideoPiP.tsx` (minus concert toggle), `hooks/useVideoPlayback.ts`, kept slices of `videoStore.ts`, and `VideoWorkspace.tsx` as the playback shell (minus calibration sidebar + exporter).
- **Roster / players** — `rosterStore`, `playerStore`, jersey textures, skin-tone/positions.

---

## 3. AMPLIFY — what gets promoted, and how

Amplify targets: **3D core player movement**, **draw-and-play animation transport**, **POV cam**. Plus **scoreboard (keep + simplify)**.

### 3.1 Draw-and-play path animation transport (the kept engine)
The surviving animation system. Amplify = **surface Play / Stop / scrub transport onto the board** (mode-gated inside Animate — see §6), not buried in the drawer.

| File | ~LoC | Role |
|---|---|---|
| `store/pathStore.ts` | 138 | `MovementPath`/keyframe CRUD |
| `models/PathModel.ts` | 178 | `MovementPath`, `Keyframe`, factories |
| `utils/pathAnimation.ts` | 304 | `getPositionAtTime`, `samplePathPositions`, `pathHasMovement` |
| `components/Scene/Path.tsx` | 357 | path line + waypoints |
| `hooks/usePathPlayback.ts` | ~140 | ✅ NEW — the playback loop (replaced the event-only `useAnimationPlayback`) |
| `store/animationStore.ts` | ~300 | transport: `play`/`pause`/`stop`/`togglePlayback`, `speed`, `progress`/`setProgress` (✅ event coupling removed) |

### 3.2 POV / follow-cam
Amplify = make POV a **first-class Camera mode** with a "this is what the ruckman sees" framing — a demonstration payoff, not a buried toggle. Broadcast is the default within the Camera mode.

- `store/cameraStore.ts` (~188) — `povPlayer1Id`, `povPlayer2Id`, `activePovSlot`, `povHeight/Distance`, `setPovPlayer`, `clearPov`, `switchToBroadcast`, `setPOVSettings`
- `components/Scene/CameraController.tsx` (~233), `components/UI/CameraDock.tsx`, POV bindings in `Player.tsx`

### 3.3 Scoreboard (keep + simplify)
Earns its place on the **feel axis** — always-on immersion/context. Amplify = keep it visible; **strip heavy match-setup editing to the minimum that feeds it.**

- `components/Scene/Scoreboard.tsx` (~114), `store/matchStore.ts` (~47, `AFLScore`, `formatAFLScore`, `showScoreboard`)
- Match-setup editor currently inside `Toolbar.tsx` (`showMatchSetup`, lines 83, 19–21, 91–94) — reduce, then relocate into the Setup mode (§6).

### 3.4 3D core player movement
The board itself — kept and central; the layout (§6) puts move/draw one tap away in Setup/Draw modes.

---

## 4. Keyboard shortcuts — keep + fix + make discoverable

**Not a cut.** Keyboard is a real workflow for desk/home prep users. Keep a curated Tier-2 set, make it all work, make it discoverable.

| Key | Action | Change |
|---|---|---|
| `Ctrl/Cmd+Z` | Undo | wire to real undo (dead stub today; menu undo exists via `historyStore`) |
| `Space` | Play/Pause animation | **re-point** from the cut Event timeline → surviving draw-and-play transport (§3.1) |
| `Esc` | Deselect / close dialog | keep |
| `Delete`/`Backspace` | Remove selected annotation | new binding |
| `S L A C R T` | Annotation tools | keep |
| `1 2 3` | Camera views | keep |
| `?` | Open shortcuts/help | keep **+ add an on-screen button** so tablet users reach help too |

**Discoverability mechanism:** wire the Help screen to the live shortcut registry (`getGroupedShortcuts`, `formatShortcutKeys` become live). **No remapping/customization UI** — bindings stay hardcoded. **Redo dropped for now** (`historyStore` is undo-only; adding redo is out of scope for the lean). Deletions per §1.7.

---

## 5. Persistence — the new hierarchy (ubiquitous language)

- **Play** = the individual saved board (positions, paths, annotations, camera, phases, `linkedVideoMoment`, roster FKs). This is today's `Scenario` — **rename `Scenario` → `Play`** (`scenarioStore`, `ScenarioModel`, `/scenario/:id` → `/play/:id`). Functional retirement of legacy Playbook can land first; the rename is a follow-on sweep. The doc commits to **Play / Playbook** as the ubiquitous language.
- **Playbook** = a **named collection of Plays** (net-new). Built via **containment**: each Play carries exactly one `playbookId`. A default **"My Plays"** playbook exists so quick-save + migration are frictionless. Reuse-across-books is a future *"duplicate Play into another Playbook"* action — not a many-to-many join model.
- **Sharing** consolidates onto the **Play**: per-Play `/shared/:token` via the existing `shareScenarioWithClip` path (captures **paths + optional clip** — an improvement over the legacy share that dropped paths). **Whole-Playbook sharing deferred** (noted, not built).

Survivor files: `store/scenarioStore.ts` (~71), `models/ScenarioModel.ts` (~37), `components/UI/ScenarioLibrary.tsx` (+ tests) — all rename to Play.

---

## 6. Target amplified layout — one IA, two ergonomic skins

**One information architecture, four on-board concerns: Setup / Draw / Animate / Camera.** These replace the hamburger drawer as the *primary* command surface. The ~913-line `components/UI/Toolbar.tsx` monolith (roster/label controls + transport + match-setup + POV, plus cut deps `useVideoRecorder`/`usePlaybook`) **redistributes** into the four concerns. A drawer survives only for rare/global actions (roster import, reset, share) — not the everyday flow.

**Two skins, chosen responsively (pointer + viewport):**

- **Desktop / laptop → Variant B, left mode rail.** A vertical rail of the four modes; selecting a mode swaps a contextual panel; the board stays uncluttered because only the active mode's controls show.
- **Tablet (touch, landscape) → Variant C, thumb-zone.** Same four concerns as two bottom-corner thumb pods (Setup fan left, Camera/POV fan right) + a central **Play FAB** with a drag-to-scrub arc — reachable without shifting grip on an iPad.
- Rule of thumb: coarse pointer / narrow-ish landscape → C; fine pointer / wide → B. Exact breakpoint is an execution detail.

**Settled behaviors:**
- **Animation transport is mode-gated, not always-on** — inside **Animate** (B) / behind the central Play FAB (C). `Space` still toggles play/pause.
- **POV is a first-class Camera mode** ("what they see"); Broadcast is the default within it.
- **Core setup** (formation presets, teams, labels, move/draw) is one tap away in the Setup mode/pod.
- **Navigation** (from #3): landing shifts from a flat board list to **Playbook library → open a Playbook → its Plays**. Quick-save into "My Plays" without choosing a book stays painless. Per-Play share affordance needs a home in the layout.

**Variant A (always-on broadcast HUD) rejected** — too much permanent chrome for a coach whose primary job is fast setup. Salvage from A already folded into B/C: transport stays visually prominent *once in Animate*, and the camera-as-switcher framing lives in Camera mode.

**Primary source:** throwaway prototype on branch `prototype/board-layout-4` (route `/prototype/board-layout?variant=A|B|C`, dev-only — not folded into `main`).

---

## 7. Execution sequencing

1. **Run the lean first** — the cuts in §1 (start with the fully-orphaned deletes in §1.6/§1.7, then the decouple-then-delete work in §1.5, then the shared-file surgery in §1.1/§1.4/§1.8).
2. **Then** run `/improve-codebase-architecture` on the **survivors** — scoped to the surviving core. **Do not run it before the lean:** a pass beforehand would deepen code that is about to be deleted. Deferred, not re-litigated.
3. Persistence rework (§5) and layout build (§6) are the substantive feature-shaped execution that follows the deletions.

---

## 8. Cross-cut files & risks (read before editing)

- **Surgical, not deletable** (appear in both CUT and KEEP): `store/videoStore.ts`, `components/VideoImport/VideoWorkspace.tsx`, `components/VideoImport/VideoCanvas.tsx`, `components/UI/Toolbar.tsx`, `store/playbookStore.ts` (Dexie class stays).
- **Top risk:** `hooks/useAnimationPlayback.ts` + `store/animationStore.ts` are the kept path engine but are **coupled to the cut `eventStore`** via the `isEventMode` branch. Decoupling is the main execution hazard in the whole lean — do it deliberately, with the animation transport (§3.1) verified working on the path system before eventStore is removed.
- **Cleanest deletes** (zero external importers, do these first for momentum): `utils/trajectoryGeneration.ts`, `store/keyboardStore.ts`, `components/UI/FormationSelector.tsx` + `store/formationStore.ts`, `components/UI/HelpOverlay.tsx`.
- **Verify before deleting:** formation preset data (`types/Formation.ts`, `data/formations.ts`) is KEEP — only the `FormationSelector`/`formationStore` pair is dead.

---

## Deferred (out of this lean, tracked on map #1)

- Whole-Playbook sharing (one link for a named collection).
- "Duplicate Play into another Playbook" action.
- Onboarding/help copy revisit (after the amplified layout ships).
- **Out of scope entirely:** new feature development, and rebuilding any cut feature "better" — a re-add is a fresh effort.
