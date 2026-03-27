# AFL Coaching Board — Video + Magnet Board Intersection Design

**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Incremental enhancement positioning the AFL Coaching Board app at the intersection of a physical magnet board and a video analysis tool. Builds on the existing Board/Video tab architecture without restructuring routes, stores, or the 3D scene.

---

## User and Context

- **Primary user:** Single coach, iPad or laptop
- **Sharing:** Links sent to players/coaches — animated plays with source video clip
- **Workflow:** Video-first — import footage → find moment → diagram on board → share

---

## Core Feature: Video-to-Board Linking

### Board tab — entry point button

A "🎬 Link Video Moment" button rendered as a **DOM overlay** (not inside the R3F Canvas) in `MainLayout.tsx`, floating at the bottom-centre of the field area.

Visibility conditions:
- `editorTab === 'board'`
- `activeScenarioId !== null`
- `scenario.linkedVideoMoment` is absent (hidden when a link already exists)

Behaviour on click:
- If `videoStore.isLoaded === false`: switches `editorTab` to `'video'` — the Video tab's empty state / import prompt handles guiding the user to import footage
- If `videoStore.isLoaded === true`: switches `editorTab` to `'video'` at the current playhead position

---

### Video tab — Link to Scenario action bar

When `editorTab === 'video'` AND `activeScenarioId !== null` AND `videoStore.isLoaded === true`, `VideoWorkspace.tsx` renders a **"Link to Scenario" action bar** as a horizontal strip **below the video playback controls and above the VideoTimeline component** — i.e. as an additional row between the main video area and the timeline scrubber.

The action bar contains (left to right):
1. **"▶ Set Start"** button — on click, records the current `videoStore.currentTime` as `pendingStart`; turns teal and shows "Start: 14:22" when set
2. **"■ Set End"** button — on click, records current time as `pendingEnd`; turns teal and shows "End: 14:48" when set; if `pendingEnd < pendingStart`, they are automatically swapped
3. **Quarter picker** — segmented: Q1 / Q2 / Q3 / Q4 / ET (optional selection)
4. **Label text field** — placeholder "Event label…", max 40 chars (optional)
5. **"🎬 Link to Scenario"** confirm button — disabled (greyed) until both `pendingStart` and `pendingEnd` are set AND `endTime - startTime >= 1`

On confirm:
- Writes `LinkedVideoMoment` to the scenario via `scenarioStore.updateScenario()`
- Clears `pendingStart` / `pendingEnd` from local component state
- Switches `editorTab` back to `'board'`

If `activeScenarioId === null` or `videoStore.isLoaded === false`, the action bar is not rendered.

---

### Board tab — linked chip bar

After linking, a teal chip bar is rendered between the top nav and the canvas in `MainLayout.tsx`:

```
● VIDEO LINKED    Q3 · 14:22 — 14:48    [▶ Preview]  [✕]
```

- **▶ Preview**: switches to Video tab, seeks to `startTime`
- **✕**: shows "Remove video link?" confirm dialog → on confirm, clears `scenario.linkedVideoMoment`

Three chip states depending on runtime conditions:

| State | Display | When |
|---|---|---|
| Linked & available | `● VIDEO LINKED  Q3 · 14:22—14:48  [▶ Preview] [✕]` | `videoId` exists in VideoImportDB metadata AND `isLoaded === true` |
| Linked but not loaded | `⚪ Video not loaded — [Load video]` | `videoId` metadata record exists in VideoImportDB but `isLoaded === false` (session reset) |
| Linked but missing | `⚠ Video unavailable — [Unlink]` | `videoId` metadata record absent from VideoImportDB (video was deleted) |

"Load video" navigates to Video tab so the coach can re-import the file. `isLoaded` is session-only — the video file is not automatically re-hydrated from IndexedDB on page load; the coach must re-import each session.

---

## Data Model

```ts
interface LinkedVideoMoment {
  videoId: number;       // ++id PK from VideoImportDB.videos (metadata table)
  startTime: number;     // seconds from video start
  endTime: number;       // seconds from video start; always > startTime
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ET';
  label?: string;        // max 40 chars
}
```

**Linking is scenario-level** — one `LinkedVideoMoment` per scenario (not per phase). The moment represents the game situation the whole scenario is based on.

**`AFLPlaybookDB` version 3 → 4.** (Confirmed: the live codebase is at version 3, defined in `src/store/playbookStore.ts`.) The `scenarios` table schema string is unchanged (no new Dexie index needed — `linkedVideoMoment` is stored as an unindexed JSON column on each scenario row). The version bump is still required to register the schema change with Dexie even when no new indexes are added. No migration function is needed because the field is optional and existing rows will simply have `undefined`.

The existing `videoBlobId` field on some scenario records is unrelated (legacy attachment feature) and coexists without conflict.

**Filter chip implementation:** The "🎬 Linked" filter chip in ScenarioLibrary filters in-memory over `useScenarioStore().scenarios` — no Dexie index is required.

---

## Orphaned Link Handling

**On video delete:** The video delete action (in videoStore) must first query `AFLPlaybookDB.scenarios` for any scenarios where `linkedVideoMoment.videoId` matches. These are two separate Dexie databases (`VideoImportDB` and `AFLPlaybookDB`) so a cross-database atomic transaction is not possible. The operations are performed **sequentially**:

1. Show confirmation: "This video is linked to [N] scenario(s): [names]. Deleting it will remove the video link. Continue?"
2. On confirm: clear `linkedVideoMoment` from all affected scenarios in `AFLPlaybookDB`
3. Then delete the video entry from `VideoImportDB`
4. If step 3 fails: scenarios are already unlinked (safe — no orphan)
5. If step 2 fails: show an error and abort — the video is NOT deleted

This ordering (unlink first, then delete video) ensures the app is never left with a broken link due to a partial failure. The "⚠ Video unavailable" chip state provides a runtime safety net for any residual orphans (e.g. from manual DB manipulation).

---

## Sharing Architecture

Clip extraction via FFmpeg WASM is **in scope** (the infrastructure already exists in `ffmpegConverter.ts`).

### Supabase not configured

If Supabase is not configured (`!isSupabaseConfigured()`), the Share button shows a tooltip or inline notice: "Video sharing requires Supabase. Your board diagram will be shared without the video clip." FFmpeg extraction must **not** run if upload will fail — the extraction check must happen before the FFmpeg call.

### Share flow (Supabase configured, linkedVideoMoment present)

1. Coach taps **Share** on Board tab
2. Sharing dialog opens; detects `linkedVideoMoment` present
3. Dialog shows "Preparing clip…" progress indicator while FFmpeg runs
4. FFmpeg extracts `startTime → endTime` as MP4 from the stored video blob
5. If extracted clip > 10 MB: inline error in the dialog — "Clip too large to share. Try a shorter segment or a lower-quality source recording." Share is cancelled; coach must shorten the range or proceed without video (a "Share board only" fallback button is shown)
6. Clip MP4 uploaded to the existing `shared-videos` Supabase Storage bucket → stored in the `video_url` column of `shared_playbooks` (the existing `SharedPlaybook.video_url` field — no DB schema change needed)
7. Coach receives the share link as normal

New function: `shareScenarioWithClip(scenarioId: number, clipBlob: Blob): Promise<{ token: string; url: string } | null>` in `sharingService.ts`. Existing `sharePlaybook()` is unchanged.

### `playbook_data` shape for scenario shares

`shareScenarioWithClip()` serialises the **first phase** of the scenario (index 0) into `playbook_data`. The clip URL is stored in the top-level `video_url` column, not inside `playbook_data`:

```ts
// playbook_data (stored in DB column)
{
  name: scenario.name,
  playerPositions: phase.playerPositions,
  paths: phase.paths,                  // new vs existing sharePlaybook() shape
  annotations: phase.annotations,     // new vs existing sharePlaybook() shape
  cameraPosition: phase.cameraState?.position,
  cameraTarget: phase.cameraState?.target,
  cameraZoom: phase.cameraState?.zoom,
  quarter?: string,                    // from linkedVideoMoment
  label?: string,                      // from linkedVideoMoment
}
// video_url column (top-level, existing DB field)
// → Supabase Storage public URL for the extracted clip MP4
```

The shared viewer reads `video_url` from the `SharedPlaybook` record for the video element `src`. This is consistent with how the existing `SharedPlaybook.video_url` field already works.

Multi-phase playback is not supported in the shared viewer (v1). The viewer shows a single static board snapshot followed by a single animation playback.

### Share flow (no linkedVideoMoment)

Sharing works exactly as before via the existing `sharePlaybook()` function. No change.

---

## Shared Viewer (full replacement)

`SharedPlaybookViewer.tsx` is a **full replacement**. The current implementation immediately redirects to `/?loadShared=` and renders nothing; it is entirely replaced.

The new implementation is a **standalone page component** at `/shared/:token`. It renders its **own independent R3F `<Canvas>`** with its own Three.js scene — it does not reuse `MainLayout`, does not render `SkyDome`, and has no editing controls. The cinematic dark scene is set up from scratch within this component.

### Step 1 — Video (when `video_url` present)

- Minimal dark header: scenario title + "Shared by [Coach Name]" + teal "● WATCH CLIP" badge
- `<video autoPlay playsInline>` using `video_url`
- Bottom-left broadcast overlay: `{quarter} · {label}` (shown only when at least one is present)
- Teal-to-blue gradient progress bar at bottom of video element
- **Auto-advance:** 2 seconds after the `video` `ended` event fires, transition to Step 2. Countdown shows "Board diagram in 2…" (with a cancel / "Stay on clip" link)
- "Skip to board →" button triggers the transition immediately
- If `video_url` absent: Step 1 is skipped entirely, Step 2 is shown on load

### Step 2 — Dark cinematic board

The R3F Canvas uses:
- Background colour `#020a02`
- No `SkyDome`
- Player tokens rendered with a soft point light glow effect (or equivalent CSS box-shadow on DOM labels)
- Path arrows in teal (`#00d4aa`) and blue (`#0099ff`) with a Three.js bloom post-processing pass (or a simple emissive material as a simpler fallback)
- Camera position loaded from `phase.cameraState`
- Player positions and paths loaded from `phase.playerPositions` and `phase.paths`

Header badge changes from teal "● WATCH CLIP" to blue "● BOARD".

Playback controls: dark pill overlay at bottom — `⟨⟨  [▶]  ⟩⟩  |  0:00 / 0:08`

Below controls:
- `[🎬 Replay clip]` — transitions back to Step 1 (only shown when `video_url` present)
- `[↺ Replay all]` — replays from Step 1 (or from start of board animation if no clip)

---

## Visual Direction: Pro Analytics

| Role | Value |
|---|---|
| App background | `#0f0f1a` |
| Surface (cards, panels) | `#13132a` |
| Border default | `#1e1e3f` |
| Border interactive | `#2a2a55` |
| Accent teal | `#00d4aa` |
| Accent blue | `#0099ff` |
| CTA gradient | `linear-gradient(135deg, #00d4aa, #0099ff)` |
| Team A ring | `#1565c0` / `#42a5f5` |
| Team B ring | `#c62828` / `#ef5350` |
| Text primary | `#ffffff` |
| Text secondary | `#8888aa` |
| Text muted | `#4444aa` |
| Shared viewer bg | `#050510` |
| Cinematic field bg | `#020a02` |

**UI patterns:**
- Teal dot + uppercase label for status badges
- Gradient CTAs for primary actions
- Dashed borders for empty/prompt states
- Glow effects on tokens and paths in shared viewer only
- Editor field retains its existing bright green appearance

---

## Home Screen (ScenarioLibrary.tsx)

1. **Pro Analytics theme** applied throughout
2. **Video chip on linked cards**: teal "● VIDEO LINKED" badge top-right + clip duration strip at bottom of card thumbnail
3. **Unlinked cards**: dashed "+ link video" prompt (low contrast) top-right
4. **Filter chips** above grid: All / 🎬 Linked / Board only (in-memory filter)
5. **Roster pill** pinned at bottom of scroll area using `style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}` for iPad safe-area support; supplements (does not replace) the existing "Team Rosters" header button

---

## Components Affected

| Component | Change |
|---|---|
| `ScenarioLibrary.tsx` | Pro Analytics theme, video chip on cards, filter chips, safe-area roster pill |
| `MainLayout.tsx` | Pro Analytics top bar, linked chip bar (3 states), "Link Video Moment" DOM overlay |
| `VideoWorkspace.tsx` | "Link to Scenario" action bar (below playback controls, above timeline) |
| `SharedPlaybookViewer.tsx` | Full replacement — standalone cinematic viewer with own R3F Canvas |
| `scenarioStore.ts` | `LinkedVideoMoment` interface; `AFLPlaybookDB` version 3→4 (no new index) |
| `videoStore.ts` | Expose `currentTime`; cascade unlink-before-delete on video removal |
| `sharingService.ts` | `shareScenarioWithClip()` with FFmpeg extraction + Supabase upload |

---

## Out of Scope

- Video tagging/bookmarking library (multiple clips per video)
- Drawing directly on paused video frames
- Side-by-side synced video + board timeline
- Multi-phase playback in the shared viewer (v1 shows first phase only)
- Multiple linked moments per scenario
