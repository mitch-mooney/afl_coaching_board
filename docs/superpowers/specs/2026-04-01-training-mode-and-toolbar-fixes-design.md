# Training Mode Redesign + Toolbar Fixes — Design Spec

**Date:** 2026-04-01  
**Status:** Approved

---

## Overview

Three feedback items from plan.md:

1. **Training Mode** — redesign the panel to a split layout (session plan list + drill detail), with drills visually represented on the 3D board via ghost player positions and auto-placed cones.
2. **Playback bar persists** — `EventTimeline` stays visible when switching from an Event back to the Training tab.
3. **Annotation toolbar in wrong place** — `AnnotationToolbar` renders unconditionally during video import, appearing over useful screen real estate.

---

## 1. Training Mode UI Redesign

### Layout

`TrainingSessionEditor` becomes a split layout:

**Left panel — Session plan list**
- Session name input at top
- Drill rows: `#`, name, duration (mins), player count badge, active/queued status indicator, remove button
- Clicking a row selects the drill and shows its detail in the right panel
- "Add Drill +" button expands an inline drill library drawer below the list (searchable, filterable by category — same data as current `drillLibrary.ts`)
- Session timer + total duration display at the bottom of the panel

**Right panel — Drill detail**
- Shown when a drill is selected from the session list
- Displays: name, category badge, difficulty, player count, equipment list, step-by-step instructions
- "▶ Set up on Board" button — pushes ghost player positions + cones to the 3D field and switches to the Board tab

### State changes

`uiStore.ts` currently has broken draft state (invalid TypeScript). It gets cleaned up and two fields added:

```ts
activeDrillId: string | null
setActiveDrillId: (id: string | null) => void
```

The `TrainingSessionEditor` reads `activeDrillId` to know which drill to show in the right panel.

---

## 2. Board Drill Visualization

### Approach: Algorithmic positions (Option 1)

A utility function `getDrillBoardLayout(drill: Drill)` returns:

```ts
interface DrillBoardLayout {
  playerPositions: Array<{ x: number; z: number; team: 'A' | 'B' }>;
  conePositions: Array<{ x: number; z: number }>;
}
```

No changes to `drillLibrary.ts` required.

### Field zone by category

| Category | Zone |
|---|---|
| `attack`, `goal-kicking` | Forward 50 |
| `defence` | Back 50 |
| `rucking` | Centre circle |
| `marking`, `kicking`, `ball-handling`, `fitness` | Centre ground |

### Player positions

- Count = `drill.playersRequired`
- Arranged in a grid/arc within the zone
- Split evenly into team A (blue ghost) and team B (orange ghost)
- Uses existing `playerStore.setPreviewPositions()` — already renders dashed circles on the 3D field

### Cones

- Only placed if `drill.equipment.includes('cones')`
- 4–6 cones in a rectangle/channel pattern within the zone
- Uses existing `coneStore` — clears existing cones first, then adds new positions

### "Set up on Board" action sequence

1. `getDrillBoardLayout(drill)` — compute positions
2. `playerStore.setPreviewPositions(positions)` — show ghost players
3. If cones: clear existing cones, add drill cone positions
4. `uiStore.setEditorTab('board')` — switch to board so the coach sees the result immediately

---

## 3. Toolbar Fixes

### Fix 1 — EventTimeline persists across tabs

**Location:** `MainLayout.tsx` line ~645  
**Fix:** Wrap `<EventTimeline />` with `editorTab === 'board' &&`

```tsx
{editorTab === 'board' && <EventTimeline />}
```

### Fix 2 — AnnotationToolbar appears during video import

**Location:** `MainLayout.tsx` line ~640  
**Fix:** Wrap `<AnnotationToolbar />` with `editorTab === 'board' &&`

```tsx
{editorTab === 'board' && <AnnotationToolbar />}
```

---

## Files Affected

| File | Change |
|---|---|
| `src/store/uiStore.ts` | Fix broken TypeScript, add `activeDrillId` / `setActiveDrillId` |
| `src/components/Layout/MainLayout.tsx` | Guard `EventTimeline` + `AnnotationToolbar` with `editorTab === 'board'` |
| `src/components/TrainingMode/TrainingSessionEditor.tsx` | Full redesign — split layout |
| `src/utils/drillBoardLayout.ts` | New file — `getDrillBoardLayout()` utility |

---

## Out of Scope

- Persisting drill board layouts across sessions
- Editing the drill library from within the app
- Adding explicit per-drill player positions to `drillLibrary.ts` (can be done later as Option 3 upgrade)
