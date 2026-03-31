# Training Mode — Design Spec
**Date:** 2026-03-31  
**Status:** Approved

---

## Overview

Training Mode is a distinct mode for offline field sessions. It operates alongside Match Mode in the AFL coaching board app, sharing player positions, annotations, and field state but keeping match-only event data separate. It is accessed via a third tab in `MainLayout` (`Board | Video | Training`).

---

## 1. Architecture

### Mode Toggle

`uiStore.editorTab` is extended from `'board' | 'video'` to `'board' | 'video' | 'training'`.

When the Training tab is activated:
- `modeStore.switchMode('training')` is called — snapshots current player and annotation context
- The 3D Canvas `div` is hidden via `display: none` (not unmounted — preserves WebGL state and player positions)
- `<TrainingMode />` fills the screen

When switching back to Board/Video from Training:
- `modeStore.switchMode('match')` is called — restores snapshotted context
- Canvas `div` is shown again

### What transfers between modes
| State | Match → Training | Training → Match |
|---|---|---|
| Player positions | ✅ Preserved (snapshot) | ✅ Restored |
| Annotations | ✅ Preserved (snapshot) | ✅ Restored |
| Cones | ✅ Persist independently | ✅ Persist independently |
| Event history | ❌ Match-only, not transferred | ❌ Not transferred |
| Training session / drills | ❌ Training-only | ❌ Not transferred |

---

## 2. Store Changes

### `timerStore` additions
```ts
sessionDrills: SessionDrill[]       // ordered drill queue for active session
currentDrillIndex: number           // which drill is active (0-based)
addDrill(drill: SessionDrill): void
removeDrill(drillId: string): void
reorderDrill(drillId: string, newIndex: number): void
setDrillRest(drillId: string, restSeconds: number): void
```

`SessionDrill` is already defined in `TrainingSession.ts`. The drill queue is owned here so it persists across component unmounts.

### `playerStore` additions
```ts
previewPositions: Player[] | null   // ghost positions for rotation preview
setPreviewPositions(positions: Player[]): void
clearPreviewPositions(): void
```

When `previewPositions` is non-null, `PlayerManager` renders a second pass of semi-transparent ghost players at those positions alongside real players. Cleared on Board tab activation or explicit dismiss.

### New `coneStore`
```ts
interface Cone {
  id: string
  position: [number, number, number]
}

cones: Cone[]
addCone(position: [number, number, number]): void
removeCone(id: string): void
clearCones(): void
```

Cones are cleared when `modeStore.resetMode()` is called.

---

## 3. Model Fixes

### `TrainingSession.ts`
- Fix bad import path: `../../data/drillLibrary` → `../data/drillLibrary`
- Remove duplicate/conflicting `SessionDrill` type — keep one canonical definition

### `TrainingSessionEditor.tsx`
- Local session state uses `SessionDrill[]` (not `TrainingDrill[]`)
- Replace calls to `addDrill`, `removeDrill`, `updateDrillOrder`, `addRestPeriod` on `timerStore` with the new canonical method names: `addDrill`, `removeDrill`, `reorderDrill`, `setDrillRest`
- Remove `DrillCategory` used as a value (it's a union type string, not an enum) — replace `Object.values(DrillCategory)` with an explicit array of category strings

### `useRotationExercise.ts`
- Remove calls to `getNextRotation` and `markRotationComplete` (don't exist in store)
- Expose `currentStepIndex` and `rotationExercise.steps` from the store so components can derive the current step

---

## 4. New Components

### `TrainingMode.tsx`
Top-level Training Mode container. Renders:
- Full-screen two-column layout
- Left: `DrillLibrary` (search + category filter)
- Right: session drill queue + `TimerControls` + `RotationExerciseEditor`
- Bottom: `RotationPreviewBanner` (when preview is active)
- Header: session name, session timer, "🔶 Set up cones" button

### `RotationPreviewBanner`
Thin banner at the bottom of `TrainingMode`. Appears when `previewPositions` is non-null.
- Shows: "Rotation preview active"
- Button: "Switch to Board" — sets `editorTab` to `'board'`
- Button: "✕ Clear preview" — calls `playerStore.clearPreviewPositions()`

### `ConeManager` (inside Canvas)
Renders `coneStore.cones` as orange 3D cone meshes using Three.js `ConeGeometry`. Click a cone to remove it. Only rendered when `modeStore.mode === 'training'`.

---

## 5. UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Scenarios  [Board] [Video] [Training]                │  ← top bar
│               Session: "Tuesday Preseason"  [🔶 Cones]  │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   Drill Library      │   Session Drill Queue            │
│   [search input]     │   1. One-on-One Marking  5min ✕  │
│   [All][Marking]...  │      Rest after: 2min            │
│                      │   2. Handball Circuit    8min ✕  │
│   [drill card] →     │      Rest after: 0min            │
│   [drill card] →     │                                  │
│   [drill card] →     │   [Drill Timer: 04:23]           │
│                      │   [▶ Start] [⏭ Skip]             │
│                      │                                  │
│                      │   ── Rotation Exercise ──────    │
│                      │   Step 1: All rotate clockwise   │
│                      │   [▶ Preview on Board]           │
│                      │                                  │
└──────────────────────┴──────────────────────────────────┘
│  🔶 Rotation preview active — [Switch to Board]  [✕]   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Cone Placement UX

- The cone tool appears in the existing `Toolbar` only when `modeStore.mode === 'training'`
- "🔶 Set up cones" button in the Training Mode header switches `editorTab` to `'board'` and activates the cone tool
- When `editorTab === 'board'` and `modeStore.mode === 'training'`, a "← Back to Training" button appears in the top bar alongside the existing Board controls
- Click on the field to place a cone; click an existing cone to remove it
- Cone count shown as a small badge on the "🔶 Set up cones" button

---

## 7. Rotation Preview Flow

1. Coach builds a rotation exercise in `RotationExerciseEditor` (steps already built)
2. Coach taps "▶ Preview on Board" next to a step
3. `useRotationExercise` hook computes target player positions for that step
4. Calls `playerStore.setPreviewPositions(computedPositions)`
5. `RotationPreviewBanner` appears at the bottom of `TrainingMode`
6. Coach taps "Switch to Board" — sees real players + semi-transparent ghost players at preview positions
7. Coach taps "✕ Clear preview" (or switches back to Training) — `clearPreviewPositions()` called

Ghost player rendering: `PlayerManager` maps over `previewPositions` and renders each as a `Player` mesh with `opacity: 0.4` and a distinct tint colour (e.g., yellow). No new 3D component required.

---

## 8. Files Changed / Created

### Modified
- `src/store/timerStore.ts` — add drill queue state + methods
- `src/store/playerStore.ts` — add `previewPositions`, `setPreviewPositions`, `clearPreviewPositions`
- `src/store/modeStore.ts` — wire cone cleanup into `resetMode`
- `src/store/uiStore.ts` — extend `editorTab` type to include `'training'`
- `src/models/TrainingSession.ts` — fix import path, clean up types
- `src/hooks/useRotationExercise.ts` — remove missing method calls, expose `currentStepIndex`
- `src/components/TrainingMode/TrainingSessionEditor.tsx` — fix type mismatches, align with store
- `src/components/Scene/PlayerManager.tsx` — render ghost players from `previewPositions`
- `src/components/UI/Toolbar.tsx` — add cone tool (training mode only)
- `src/components/Layout/MainLayout.tsx` — add Training tab, wire mode switching, "← Back to Training" button

### Created
- `src/store/coneStore.ts`
- `src/components/TrainingMode/TrainingMode.tsx`
- `src/components/TrainingMode/RotationPreviewBanner.tsx`
- `src/components/Scene/ConeManager.tsx`
