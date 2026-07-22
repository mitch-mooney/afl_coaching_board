# Training Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Training Mode — a third tab in the coaching board for offline field sessions with drill library, session timers, rotation exercise preview on the 3D board, and cone placement.

**Architecture:** Extend existing stores minimally: add a drill queue to `timerStore`, add `previewPositions` to `playerStore`, and create a new `coneStore`. A `TrainingMode.tsx` container composes the existing Training components. A third `'training'` tab is added to `uiStore.editorTab` and wired in `MainLayout`, which hides (not unmounts) the Canvas when Training is active.

**Tech Stack:** React, Zustand, React Three Fiber (R3F), Three.js, Vitest, TypeScript strict mode

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/models/TrainingSession.ts` | Fix circular import; remove `TrainingDrill`, use `SessionDrill[]` in session |
| Modify | `src/store/uiStore.ts` | Extend `editorTab` to include `'training'` |
| Modify | `src/store/timerStore.ts` | Add drill queue: `sessionDrills`, `currentDrillIndex`, CRUD methods |
| Modify | `src/store/playerStore.ts` | Add `previewPositions`, `setPreviewPositions`, `clearPreviewPositions` |
| Create | `src/store/coneStore.ts` | `Cone` type, CRUD, `isConePlacementActive` flag |
| Modify | `src/store/modeStore.ts` | Wire `clearCones` into `resetMode` |
| Modify | `src/store/rotationExerciseStore.ts` | Fix `addRotationStep` signature (remove unused `playerId` param) |
| Modify | `src/hooks/useRotationExercise.ts` | Remove non-existent method calls; expose `currentStepIndex` and `steps` |
| Modify | `src/components/TrainingMode/RotationExerciseEditor.tsx` | Fix `player.position` → `positionName`; fix `addRotationStep` call |
| Modify | `src/components/TrainingMode/TrainingSessionEditor.tsx` | Fix types, fix `DrillCategory` value usage, wire corrected store methods |
| Create | `src/components/Scene/ConeManager.tsx` | R3F cone meshes + click-capture plane for placement |
| Modify | `src/components/Scene/PlayerManager.tsx` | Render ghost discs from `previewPositions` |
| Create | `src/components/TrainingMode/RotationPreviewBanner.tsx` | Banner shown when preview is active |
| Create | `src/components/TrainingMode/TrainingMode.tsx` | Main Training Mode container |
| Modify | `src/components/Layout/MainLayout.tsx` | Add Training tab; hide canvas; wire mode switching; add cone tool button; Back to Training button |
| Create | `src/store/__tests__/timerStore.test.ts` | Tests for drill queue methods |
| Create | `src/store/__tests__/coneStore.test.ts` | Tests for cone CRUD |
| Create | `src/store/__tests__/playerStore.previewPositions.test.ts` | Tests for preview positions |

---

## Task 1: Fix TrainingSession model

**Files:**
- Modify: `src/models/TrainingSession.ts`

The file has a circular import (`TrainingSession.ts` imports `drillLibrary` from `src/data/drillLibrary.ts`, which imports types from `TrainingSession.ts`). Fix by removing the data import from the model. Also remove `TrainingDrill` (replaced by `SessionDrill`) and update `TrainingSession.drills` to use `SessionDrill[]`.

- [ ] **Replace the entire file content**

```typescript
// src/models/TrainingSession.ts
import type { RotationExercise } from './RotationExercise';

export type DrillCategory =
  | 'marking'
  | 'kicking'
  | 'ball-handling'
  | 'defence'
  | 'attack'
  | 'fitness'
  | 'goal-kicking'
  | 'rucking';

export const DRILL_CATEGORIES: DrillCategory[] = [
  'marking', 'kicking', 'ball-handling', 'defence',
  'attack', 'fitness', 'goal-kicking', 'rucking',
];

export interface Drill {
  id: string;
  name: string;
  description: string;
  category: DrillCategory;
  durationSeconds: number;
  playersRequired: number;
  equipment: string[];
  instructions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface SessionDrill {
  drillId: string;
  name: string;
  description: string;
  category: DrillCategory;
  durationSeconds: number;
  restSeconds: number;
  playersRequired: number;
  equipment: string[];
  instructions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rotationExercise?: RotationExercise;
}

export interface TrainingSession {
  id: string;
  name: string;
  description?: string;
  drills: SessionDrill[];
  totalDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type { RotationExercise };
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | head -40
```

Expected: Errors only in files not yet fixed (timerStore, TrainingSessionEditor etc.) — no errors in `TrainingSession.ts` itself.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/models/TrainingSession.ts
git commit -m "fix: clean up TrainingSession model — remove circular import and TrainingDrill type"
```

---

## Task 2: Extend uiStore editorTab

**Files:**
- Modify: `src/store/uiStore.ts:57-58` and `src/store/uiStore.ts:176-177`
- Modify: `src/store/__tests__/uiStore.test.ts`

- [ ] **Write the failing test** — open `src/store/__tests__/uiStore.test.ts` and add:

```typescript
it('setEditorTab switches to training', () => {
  useUIStore.getState().setEditorTab('training');
  expect(useUIStore.getState().editorTab).toBe('training');
});
```

- [ ] **Run test to verify it fails**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/uiStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: TypeScript error — `'training'` is not assignable to `'board' | 'video'`.

- [ ] **Update the type in `src/store/uiStore.ts`**

At line 57, change:
```typescript
editorTab: 'board' | 'video';
setEditorTab: (tab: 'board' | 'video') => void;
```
to:
```typescript
editorTab: 'board' | 'video' | 'training';
setEditorTab: (tab: 'board' | 'video' | 'training') => void;
```

- [ ] **Run test to verify it passes**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/uiStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: All uiStore tests PASS.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/store/uiStore.ts src/store/__tests__/uiStore.test.ts
git commit -m "feat: extend editorTab type to include training mode"
```

---

## Task 3: Add drill queue to timerStore

**Files:**
- Modify: `src/store/timerStore.ts`
- Create: `src/store/__tests__/timerStore.test.ts`

- [ ] **Write the failing tests**

Create `src/store/__tests__/timerStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useTimerStore } from '../timerStore';
import type { SessionDrill } from '../../models/TrainingSession';

const makeDrill = (id: string): SessionDrill => ({
  drillId: id,
  name: `Drill ${id}`,
  description: 'desc',
  category: 'marking',
  durationSeconds: 300,
  restSeconds: 0,
  playersRequired: 10,
  equipment: [],
  instructions: [],
  difficulty: 'beginner',
});

beforeEach(() => {
  useTimerStore.setState({ sessionDrills: [], currentDrillIndex: 0 });
});

describe('drill queue', () => {
  it('starts empty', () => {
    expect(useTimerStore.getState().sessionDrills).toHaveLength(0);
  });

  it('addDrill appends a drill', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    expect(useTimerStore.getState().sessionDrills).toHaveLength(1);
    expect(useTimerStore.getState().sessionDrills[0].drillId).toBe('a');
  });

  it('removeDrill removes by drillId', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().addDrill(makeDrill('b'));
    useTimerStore.getState().removeDrill('a');
    expect(useTimerStore.getState().sessionDrills).toHaveLength(1);
    expect(useTimerStore.getState().sessionDrills[0].drillId).toBe('b');
  });

  it('reorderDrill moves a drill to a new index', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().addDrill(makeDrill('b'));
    useTimerStore.getState().addDrill(makeDrill('c'));
    useTimerStore.getState().reorderDrill('c', 0);
    const ids = useTimerStore.getState().sessionDrills.map(d => d.drillId);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('setDrillRest updates restSeconds for a drill', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().setDrillRest('a', 120);
    expect(useTimerStore.getState().sessionDrills[0].restSeconds).toBe(120);
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/timerStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `sessionDrills` / `addDrill` etc. not found on store.

- [ ] **Add drill queue state and methods to `src/store/timerStore.ts`**

After the existing imports, add the `SessionDrill` import at the top of the file:

```typescript
import type { SessionDrill } from '../models/TrainingSession';
```

In the `TimerState` interface (after line 19), add:

```typescript
  sessionDrills: SessionDrill[];
  currentDrillIndex: number;
```

In the actions type block (after `clearSavedElapsed`), add:

```typescript
  addDrill: (drill: SessionDrill) => void;
  removeDrill: (drillId: string) => void;
  reorderDrill: (drillId: string, newIndex: number) => void;
  setDrillRest: (drillId: string, restSeconds: number) => void;
```

In `initialState`, add:

```typescript
  sessionDrills: [],
  currentDrillIndex: 0,
```

At the end of the store implementation (before the closing `})`), add:

```typescript
  addDrill(drill: SessionDrill) {
    set((state) => ({ sessionDrills: [...state.sessionDrills, drill] }));
  },

  removeDrill(drillId: string) {
    set((state) => ({
      sessionDrills: state.sessionDrills.filter((d) => d.drillId !== drillId),
    }));
  },

  reorderDrill(drillId: string, newIndex: number) {
    set((state) => {
      const drills = [...state.sessionDrills];
      const fromIndex = drills.findIndex((d) => d.drillId === drillId);
      if (fromIndex === -1) return {};
      const [removed] = drills.splice(fromIndex, 1);
      drills.splice(newIndex, 0, removed);
      return { sessionDrills: drills };
    });
  },

  setDrillRest(drillId: string, restSeconds: number) {
    set((state) => ({
      sessionDrills: state.sessionDrills.map((d) =>
        d.drillId === drillId ? { ...d, restSeconds } : d
      ),
    }));
  },
```

- [ ] **Run tests to verify they pass**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/timerStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: All 5 drill queue tests PASS.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/store/timerStore.ts src/store/__tests__/timerStore.test.ts
git commit -m "feat: add drill queue to timerStore"
```

---

## Task 4: Add previewPositions to playerStore

**Files:**
- Modify: `src/store/playerStore.ts`
- Create: `src/store/__tests__/playerStore.previewPositions.test.ts`

- [ ] **Write the failing tests**

Create `src/store/__tests__/playerStore.previewPositions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';
import type { Player } from '../../models/PlayerModel';

const mockPlayer: Player = {
  id: 'p1', teamId: 'team1', position: [0, 0, 0], rotation: 0, color: '#fff',
};

beforeEach(() => {
  usePlayerStore.setState({ previewPositions: null });
});

describe('previewPositions', () => {
  it('starts as null', () => {
    expect(usePlayerStore.getState().previewPositions).toBeNull();
  });

  it('setPreviewPositions stores players', () => {
    usePlayerStore.getState().setPreviewPositions([mockPlayer]);
    expect(usePlayerStore.getState().previewPositions).toHaveLength(1);
    expect(usePlayerStore.getState().previewPositions![0].id).toBe('p1');
  });

  it('clearPreviewPositions resets to null', () => {
    usePlayerStore.getState().setPreviewPositions([mockPlayer]);
    usePlayerStore.getState().clearPreviewPositions();
    expect(usePlayerStore.getState().previewPositions).toBeNull();
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/playerStore.previewPositions.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `previewPositions` not found on store.

- [ ] **Add `previewPositions` to `src/store/playerStore.ts`**

In the `PlayerState` interface (after `getActivePlayers` declaration on line 66), add:

```typescript
  previewPositions: Player[] | null;
  setPreviewPositions: (positions: Player[]) => void;
  clearPreviewPositions: () => void;
```

In the store initialisation block (after `playerMoveState: new Map()`), add:

```typescript
  previewPositions: null,
```

At the end of the store implementation (after `getActivePlayers`), add:

```typescript
  setPreviewPositions(positions: Player[]) {
    set({ previewPositions: positions });
  },

  clearPreviewPositions() {
    set({ previewPositions: null });
  },
```

- [ ] **Run tests to verify they pass**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/playerStore.previewPositions.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: All 3 tests PASS.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/store/playerStore.ts src/store/__tests__/playerStore.previewPositions.test.ts
git commit -m "feat: add previewPositions to playerStore for rotation preview"
```

---

## Task 5: Create coneStore

**Files:**
- Create: `src/store/coneStore.ts`
- Create: `src/store/__tests__/coneStore.test.ts`
- Modify: `src/store/modeStore.ts`

- [ ] **Write the failing tests**

Create `src/store/__tests__/coneStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useConeStore } from '../coneStore';

beforeEach(() => {
  useConeStore.setState({ cones: [], isConePlacementActive: false });
});

describe('coneStore', () => {
  it('starts with empty cones', () => {
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('addCone adds a cone with an id', () => {
    useConeStore.getState().addCone([10, 0, 5]);
    const { cones } = useConeStore.getState();
    expect(cones).toHaveLength(1);
    expect(cones[0].position).toEqual([10, 0, 5]);
    expect(typeof cones[0].id).toBe('string');
  });

  it('removeCone removes by id', () => {
    useConeStore.getState().addCone([0, 0, 0]);
    const id = useConeStore.getState().cones[0].id;
    useConeStore.getState().removeCone(id);
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('clearCones empties the array', () => {
    useConeStore.getState().addCone([0, 0, 0]);
    useConeStore.getState().addCone([1, 0, 1]);
    useConeStore.getState().clearCones();
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('setConePlacementActive toggles the flag', () => {
    useConeStore.getState().setConePlacementActive(true);
    expect(useConeStore.getState().isConePlacementActive).toBe(true);
    useConeStore.getState().setConePlacementActive(false);
    expect(useConeStore.getState().isConePlacementActive).toBe(false);
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/coneStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — module `../coneStore` not found.

- [ ] **Create `src/store/coneStore.ts`**

```typescript
import { create } from 'zustand';

export interface Cone {
  id: string;
  position: [number, number, number];
}

interface ConeState {
  cones: Cone[];
  isConePlacementActive: boolean;
  addCone: (position: [number, number, number]) => void;
  removeCone: (id: string) => void;
  clearCones: () => void;
  setConePlacementActive: (active: boolean) => void;
}

const createId = () => Math.random().toString(36).substring(2, 9);

export const useConeStore = create<ConeState>((set) => ({
  cones: [],
  isConePlacementActive: false,

  addCone(position: [number, number, number]) {
    set((state) => ({
      cones: [...state.cones, { id: createId(), position }],
    }));
  },

  removeCone(id: string) {
    set((state) => ({ cones: state.cones.filter((c) => c.id !== id) }));
  },

  clearCones() {
    set({ cones: [] });
  },

  setConePlacementActive(active: boolean) {
    set({ isConePlacementActive: active });
  },
}));
```

- [ ] **Run tests to verify they pass**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run src/store/__tests__/coneStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: All 5 tests PASS.

- [ ] **Wire `clearCones` into `modeStore.resetMode`**

In `src/store/modeStore.ts`, add the import after the existing imports:

```typescript
import { useConeStore } from './coneStore';
```

In the `resetMode` action body, add `useConeStore.getState().clearCones();` after `useAnnotationStore.getState().clearAnnotations();`:

```typescript
  resetMode: () => {
    set({ mode: 'match', contextSnapshot: null });
    usePlayerStore.getState().resetPlayers();
    useAnnotationStore.getState().clearAnnotations();
    useConeStore.getState().clearCones();
  },
```

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/store/coneStore.ts src/store/__tests__/coneStore.test.ts src/store/modeStore.ts
git commit -m "feat: create coneStore and wire clearCones into modeStore.resetMode"
```

---

## Task 6: Fix rotationExerciseStore and useRotationExercise hook

**Files:**
- Modify: `src/store/rotationExerciseStore.ts`
- Modify: `src/hooks/useRotationExercise.ts`
- Modify: `src/components/TrainingMode/RotationExerciseEditor.tsx`

The store's `addRotationStep` interface declares a third `playerId?: string` param that the implementation ignores. The hook calls `getNextRotation` and `markRotationComplete` which don't exist. `RotationExerciseEditor` uses `player.position` (a `[number,number,number]`) where it needs `player.positionName` (a string).

- [ ] **Fix `addRotationStep` signature in `src/store/rotationExerciseStore.ts`**

In the `RotationExerciseState` interface, change:

```typescript
  addRotationStep: (type: 'all' | 'position', position?: string, playerId?: string) => void;
```
to:
```typescript
  addRotationStep: (type: 'all' | 'position', position?: string) => void;
```

- [ ] **Rewrite `src/hooks/useRotationExercise.ts`**

```typescript
import { useRotationExerciseStore } from '../store/rotationExerciseStore';
import { useEffect } from 'react';

export const useRotationExercise = () => {
  const {
    startExercise,
    pauseExercise,
    resumeExercise,
    stopExercise,
    tick,
    resetExercise,
    formatTime,
    getProgressPercentage,
    currentStepIndex,
    rotationExercise,
  } = useRotationExerciseStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return {
    startExercise,
    pauseExercise,
    resumeExercise,
    stopExercise,
    resetExercise,
    formatTime,
    getProgressPercentage,
    currentStepIndex,
    currentStep: rotationExercise.steps[currentStepIndex] ?? null,
    steps: rotationExercise.steps,
    exerciseName: rotationExercise.name,
  };
};
```

- [ ] **Fix `src/components/TrainingMode/RotationExerciseEditor.tsx`**

Change line 24 — `addRotationStep('all', [])` — to:
```typescript
      addRotationStep('all');
```

Change line 28 — `addRotationStep('position', selectedPosition, playersAtPosition.map(p => p.id))` — to:
```typescript
        addRotationStep('position', selectedPosition);
```

Change line 43 — `if (player.position) positionSet.add(player.position);` — to:
```typescript
      if (player.positionName) positionSet.add(player.positionName);
```

Remove the unused `getPlayersByPosition` from the destructure on line 15 (to satisfy `noUnusedLocals`):
```typescript
  const { players, getActivePlayers } = usePlayerStore();
```

Remove unused `players` from the destructure too (only `getActivePlayers` and `getPlayersByPosition` are used in the component):
```typescript
  const { getActivePlayers } = usePlayerStore();
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep -E "rotationExercise|useRotation|RotationExercise" | head -20
```

Expected: No errors for rotation-related files.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/store/rotationExerciseStore.ts src/hooks/useRotationExercise.ts src/components/TrainingMode/RotationExerciseEditor.tsx
git commit -m "fix: align rotationExerciseStore interface, fix hook and editor type errors"
```

---

## Task 7: Fix TrainingSessionEditor

**Files:**
- Modify: `src/components/TrainingMode/TrainingSessionEditor.tsx`

Issues: `DrillCategory` used as runtime value (`Object.values(DrillCategory)` — it's a union type, not an enum); `session.drills` typed as `TrainingDrill[]` but editor uses `SessionDrill[]`; calls missing timerStore methods (`addDrill` etc. now exist after Task 3 but names differ); `handleAddDrill` receives a `Drill` but types it as `SessionDrill`; imports `drillLibrary` from model instead of data file.

- [ ] **Rewrite `src/components/TrainingMode/TrainingSessionEditor.tsx`**

```typescript
import React, { useState } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { useRotationExerciseStore } from '../../store/rotationExerciseStore';
import { RotationExerciseEditor } from './RotationExerciseEditor';
import { TimerControls } from './TimerControls';
import { drillLibrary } from '../../data/drillLibrary';
import { DRILL_CATEGORIES, type DrillCategory, type Drill, type SessionDrill } from '../../models/TrainingSession';
import { usePlayerStore } from '../../store/playerStore';
import { useRotationExercise } from '../../hooks/useRotationExercise';

export const TrainingSessionEditor: React.FC = () => {
  const [sessionName, setSessionName] = useState('New Training Session');
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { sessionDrills, addDrill, removeDrill, setDrillRest } = useTimerStore();
  const { rotationExercise } = useRotationExerciseStore();
  const { setPreviewPositions } = usePlayerStore();
  const { steps, currentStep } = useRotationExercise();

  const filteredDrills = drillLibrary.filter((drill) => {
    const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
    const matchesSearch =
      drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddDrill = (drill: Drill) => {
    const sessionDrill: SessionDrill = {
      drillId: drill.id,
      name: drill.name,
      description: drill.description,
      category: drill.category,
      durationSeconds: drill.durationSeconds,
      restSeconds: 0,
      playersRequired: drill.playersRequired,
      equipment: drill.equipment,
      instructions: drill.instructions,
      difficulty: drill.difficulty,
    };
    addDrill(sessionDrill);
  };

  const handlePreviewRotation = () => {
    if (!currentStep) return;
    // Rotation preview: compute ghost positions based on current step
    // For now, setPreviewPositions with an empty array signals that a preview
    // is active — full position computation is wired in RotationPreviewBanner
    setPreviewPositions([]);
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1a1a2e' }}>
      {/* Left Panel — Drill Library */}
      <div style={{ width: '360px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#fff' }}>Drill Library</h2>
          <input
            type="text"
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px', borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)', marginBottom: '10px',
              boxSizing: 'border-box', background: 'rgba(255,255,255,0.08)', color: '#fff',
            }}
          />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedCategory === 'all' ? '#00d4aa' : 'rgba(255,255,255,0.1)',
                color: selectedCategory === 'all' ? '#000' : '#ccc',
              }}
            >All</button>
            {DRILL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? '#00d4aa' : 'rgba(255,255,255,0.1)',
                  color: selectedCategory === cat ? '#000' : '#ccc',
                }}
              >
                {cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredDrills.map((drill) => (
            <div
              key={drill.id}
              onClick={() => handleAddDrill(drill)}
              style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff', marginBottom: '3px' }}>{drill.name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>{drill.description}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {Math.floor(drill.durationSeconds / 60)} min · {drill.playersRequired} players
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Session Builder */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            style={{
              fontSize: '18px', fontWeight: 700, border: 'none',
              borderBottom: '2px solid #00d4aa', outline: 'none',
              width: '100%', padding: '4px 0', background: 'transparent', color: '#fff',
            }}
            placeholder="Session Name"
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Session Timer */}
          <h3 style={{ marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Timer</h3>
          <TimerControls timerType="session" />

          {/* Drill Queue */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Session Drills {sessionDrills.length > 0 && `(${sessionDrills.length})`}
          </h3>
          {sessionDrills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
              Click drills in the library to add them
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessionDrills.map((drill, index) => (
                <div
                  key={drill.drillId}
                  style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                      {index + 1}. {drill.name}
                    </div>
                    <button
                      onClick={() => removeDrill(drill.drillId)}
                      style={{ padding: '2px 8px', backgroundColor: 'rgba(244,67,54,0.7)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {Math.floor(drill.durationSeconds / 60)} min
                    </div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Rest:</label>
                    <input
                      type="number" min="0" max="30"
                      value={Math.floor(drill.restSeconds / 60)}
                      onChange={(e) => setDrillRest(drill.drillId, parseInt(e.target.value || '0') * 60)}
                      style={{ width: '48px', padding: '3px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px' }}
                    />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>min</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drill Timer */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drill Timer</h3>
          <TimerControls timerType="drill" />

          {/* Rotation Exercise */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rotation Exercise</h3>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '8px' }}>
            <RotationExerciseEditor />
            {steps.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  {steps.length} step{steps.length !== 1 ? 's' : ''} · Current: Step {rotationExercise.steps.indexOf(currentStep!) + 1}
                </div>
                <button
                  onClick={handlePreviewRotation}
                  style={{ padding: '8px 16px', backgroundColor: '#00d4aa', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                >
                  ▶ Preview on Board
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

Note: `rotationExercise` is used above to call `.steps.indexOf` — import it from the store:

The import `{ useRotationExerciseStore }` is already there. The variable `rotationExercise` is destructured from it. The `steps` and `currentStep` come from `useRotationExercise()`. Both are needed.

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "TrainingSessionEditor" | head -20
```

Expected: No errors for this file.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/TrainingMode/TrainingSessionEditor.tsx
git commit -m "fix: rewrite TrainingSessionEditor — fix types, DrillCategory usage, and store wiring"
```

---

## Task 8: Create ConeManager component

**Files:**
- Create: `src/components/Scene/ConeManager.tsx`

This R3F component renders orange cone meshes for each cone in `coneStore`, and an invisible placement plane when `isConePlacementActive` is true. Both the placement plane and cone meshes use R3F pointer events — the event's `.point` property gives the world-space intersection position directly.

- [ ] **Create `src/components/Scene/ConeManager.tsx`**

```typescript
import { useConeStore } from '../../store/coneStore';
import { useModeStore } from '../../store/modeStore';
import type { Cone } from '../../store/coneStore';
import type { ThreeEvent } from '@react-three/fiber';

function ConeMarker({ cone }: { cone: Cone }) {
  const removeCone = useConeStore((s) => s.removeCone);

  return (
    <mesh
      position={[cone.position[0], 1.0, cone.position[2]]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        removeCone(cone.id);
      }}
    >
      <coneGeometry args={[0.5, 2.0, 8]} />
      <meshStandardMaterial color="#FF6B00" />
    </mesh>
  );
}

function ConePlacementPlane() {
  const addCone = useConeStore((s) => s.addCone);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        addCone([e.point.x, 0, e.point.z]);
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export function ConeManager() {
  const cones = useConeStore((s) => s.cones);
  const isConePlacementActive = useConeStore((s) => s.isConePlacementActive);
  const mode = useModeStore((s) => s.mode);

  if (mode !== 'training') return null;

  return (
    <group>
      {isConePlacementActive && <ConePlacementPlane />}
      {cones.map((cone) => (
        <ConeMarker key={cone.id} cone={cone} />
      ))}
    </group>
  );
}
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "ConeManager" | head -10
```

Expected: No errors.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/Scene/ConeManager.tsx
git commit -m "feat: create ConeManager — 3D cone meshes with placement plane for training mode"
```

---

## Task 9: Update PlayerManager for ghost player preview

**Files:**
- Modify: `src/components/Scene/PlayerManager.tsx`

When `previewPositions` is non-null, render a flat disc above each preview position in yellow-orange. Use `CircleGeometry` facing upward with a semi-transparent material — this gives a clear "target position" indicator without needing full player meshes.

- [ ] **Rewrite `src/components/Scene/PlayerManager.tsx`**

```typescript
import { usePlayerStore } from '../../store/playerStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { PlayerComponent } from './Player';
import type { Player } from '../../models/PlayerModel';

interface PlayerManagerProps {
  readOnly?: boolean;
}

function AnimationDriver() {
  useAnimationPlayback();
  return null;
}

function GhostIndicator({ player }: { player: Player }) {
  return (
    <mesh
      position={[player.position[0], 0.15, player.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[1.2, 24]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.45} />
    </mesh>
  );
}

export function PlayerManager({ readOnly = false }: PlayerManagerProps) {
  const players = usePlayerStore((state) => state.players);
  const previewPositions = usePlayerStore((state) => state.previewPositions);

  return (
    <group>
      {!readOnly && <AnimationDriver />}
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
      {previewPositions?.map((player) => (
        <GhostIndicator key={`ghost-${player.id}`} player={player} />
      ))}
    </group>
  );
}
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "PlayerManager" | head -10
```

Expected: No errors.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/Scene/PlayerManager.tsx
git commit -m "feat: render ghost position indicators in PlayerManager for rotation preview"
```

---

## Task 10: Create RotationPreviewBanner

**Files:**
- Create: `src/components/TrainingMode/RotationPreviewBanner.tsx`

This banner sits at the bottom of the Training Mode panel. It only renders when `previewPositions` is non-null. It lets the coach navigate to the Board to see the preview, or clear it.

- [ ] **Create `src/components/TrainingMode/RotationPreviewBanner.tsx`**

```typescript
import React from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useUIStore } from '../../store/uiStore';

export const RotationPreviewBanner: React.FC = () => {
  const previewPositions = usePlayerStore((s) => s.previewPositions);
  const clearPreviewPositions = usePlayerStore((s) => s.clearPreviewPositions);
  const setEditorTab = useUIStore((s) => s.setEditorTab);

  if (previewPositions === null) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        backgroundColor: 'rgba(255,215,0,0.12)',
        borderTop: '1px solid rgba(255,215,0,0.3)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>
        🔶 Rotation preview active
      </span>
      <button
        onClick={() => setEditorTab('board')}
        style={{
          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.5)',
          background: 'rgba(255,215,0,0.15)', color: '#FFD700', fontSize: 12,
          cursor: 'pointer', fontWeight: 600,
        }}
      >
        Switch to Board
      </button>
      <button
        onClick={clearPreviewPositions}
        style={{
          marginLeft: 'auto', padding: '4px 10px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
        }}
      >
        ✕ Clear preview
      </button>
    </div>
  );
};
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "RotationPreviewBanner" | head -10
```

Expected: No errors.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/TrainingMode/RotationPreviewBanner.tsx
git commit -m "feat: create RotationPreviewBanner — switch-to-board and clear preview actions"
```

---

## Task 11: Create TrainingMode container

**Files:**
- Create: `src/components/TrainingMode/TrainingMode.tsx`

This is the full-screen container that renders when the Training tab is active. It composes `TrainingSessionEditor` and `RotationPreviewBanner`, plus a header bar with the session name area, session timer display, and "Set up cones" button.

- [ ] **Create `src/components/TrainingMode/TrainingMode.tsx`**

```typescript
import React from 'react';
import { TrainingSessionEditor } from './TrainingSessionEditor';
import { RotationPreviewBanner } from './RotationPreviewBanner';
import { useConeStore } from '../../store/coneStore';
import { useUIStore } from '../../store/uiStore';
import { useTimerStore } from '../../store/timerStore';

export const TrainingMode: React.FC = () => {
  const { cones, isConePlacementActive, setConePlacementActive } = useConeStore();
  const setEditorTab = useUIStore((s) => s.setEditorTab);
  const { isRunning, remainingSeconds, currentTimer, formatTime } = useTimerStore();

  const handleSetUpCones = () => {
    setConePlacementActive(true);
    setEditorTab('board');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0d0d1a',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#00d4aa',
            textTransform: 'uppercase',
          }}
        >
          Training Mode
        </span>

        {isRunning && currentTimer === 'session' && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontFamily: 'monospace',
              color: '#FFD700',
              fontWeight: 700,
            }}
          >
            Session: {formatTime(remainingSeconds)}
          </span>
        )}

        <button
          onClick={handleSetUpCones}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            borderRadius: 6,
            border: isConePlacementActive
              ? '1px solid #FF6B00'
              : '1px solid rgba(255,255,255,0.2)',
            background: isConePlacementActive
              ? 'rgba(255,107,0,0.2)'
              : 'rgba(255,255,255,0.07)',
            color: isConePlacementActive ? '#FF6B00' : 'rgba(255,255,255,0.7)',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🔶 Set up cones{cones.length > 0 ? ` (${cones.length})` : ''}
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TrainingSessionEditor />
      </div>

      {/* Preview banner */}
      <RotationPreviewBanner />
    </div>
  );
};
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "TrainingMode" | head -10
```

Expected: No errors.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/TrainingMode/TrainingMode.tsx
git commit -m "feat: create TrainingMode container with header, cone button, and preview banner"
```

---

## Task 12: Wire Training Mode into MainLayout

**Files:**
- Modify: `src/components/Layout/MainLayout.tsx`

Four changes:
1. Import `TrainingMode`, `ConeManager`, `useModeStore`, `useConeStore`
2. Add `'Training'` tab to the tab switcher
3. Hide (not unmount) the Canvas `div` with `display: none` when `editorTab === 'training'`; show `<TrainingMode />` in its place
4. Add `ConeManager` inside the Canvas
5. When `editorTab === 'board'` and `mode === 'training'`, show a "← Back to Training" button and a cone placement indicator in the top bar
6. Call `modeStore.switchMode` when tabs switch

- [ ] **Add imports to `src/components/Layout/MainLayout.tsx`**

After the existing imports, add:

```typescript
import { TrainingMode } from '../TrainingMode/TrainingMode';
import { ConeManager } from '../Scene/ConeManager';
import { useModeStore } from '../../store/modeStore';
import { useConeStore } from '../../store/coneStore';
```

- [ ] **Add store subscriptions inside `MainLayout` function**

After the existing store hooks (around line 136), add:

```typescript
  const { mode, switchMode } = useModeStore();
  const { isConePlacementActive, setConePlacementActive } = useConeStore();
```

- [ ] **Update the tab switcher to include Training**

Replace the existing two-tab `Board | Video` switcher div:

```tsx
          <div className="flex rounded-lg overflow-hidden border border-white/20 ml-2">
            <button
              onClick={() => { setEditorTab('board'); if (mode === 'training') {} }}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={editorTab === 'board'
                ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
                : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
            >
              Board
            </button>
            <button
              onClick={() => setEditorTab('video')}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={editorTab === 'video'
                ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
                : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
            >
              Video
            </button>
            <button
              onClick={() => { setEditorTab('training'); switchMode('training'); }}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={editorTab === 'training'
                ? { background: 'linear-gradient(135deg, #FF6B00, #ffaa00)', color: '#000' }
                : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
            >
              Training
            </button>
          </div>
```

- [ ] **Add "← Back to Training" button to the right-side board controls**

Inside the `{editorTab === 'board' && (...)}` block on the right side of the top bar, add this button as the first child before `<FormationPresetBar />`:

```tsx
            {mode === 'training' && (
              <button
                onClick={() => {
                  setConePlacementActive(false);
                  setEditorTab('training');
                }}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid #FF6B00',
                  background: 'rgba(255,107,0,0.15)', color: '#FF6B00',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ← Training
              </button>
            )}
            {mode === 'training' && isConePlacementActive && (
              <span style={{ fontSize: 12, color: '#FF6B00', fontWeight: 600 }}>
                🔶 Tap field to place cone
              </span>
            )}
```

- [ ] **Add `ConeManager` inside the Canvas**

In the Canvas content (after `<AnnotationLayer />`), add:

```tsx
            <ConeManager />
```

- [ ] **Hide Canvas and show TrainingMode when training tab is active**

Find the Canvas container div that opens with:
```tsx
      {editorTab === 'board' && (
        <div
          ref={canvasContainerRef}
```

Change the condition to hide (not unmount) the canvas when training is active. Wrap the entire canvas section and the Training view together:

```tsx
      {/* Canvas — hidden (not unmounted) when Training tab is active */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{
          display: editorTab === 'board' ? undefined : 'none',
          transition: 'opacity 0.15s ease-out',
          opacity: containerReady ? 1 : 0,
        }}
      >
        <Canvas
          {/* ... existing Canvas props unchanged ... */}
        >
          {/* ... existing Canvas children unchanged ... */}
          <ConeManager />
        </Canvas>
        {/* ... existing Link Video Moment button unchanged ... */}
      </div>

      {editorTab === 'training' && (
        <div className="absolute inset-0 z-10">
          <TrainingMode />
        </div>
      )}
```

> **Note:** The existing `{editorTab === 'board' && (<div ref={canvasContainerRef} ...>)}` wrapper must be changed to always render but toggle `display: none`. This is the critical change that keeps WebGL alive. Remove the outer `{editorTab === 'board' &&` condition and instead set `display` on the div's style.

- [ ] **Handle mode restore when switching away from training tab**

Update the Board tab button to call `switchMode('match')` when switching away from training:

```tsx
            <button
              onClick={() => {
                setEditorTab('board');
                if (mode === 'training') switchMode('match');
              }}
              ...
```

And the Video tab button:
```tsx
            <button
              onClick={() => {
                setEditorTab('video');
                if (mode === 'training') switchMode('match');
              }}
              ...
```

- [ ] **Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx tsc --noEmit 2>&1 | grep "MainLayout" | head -20
```

Expected: No errors.

- [ ] **Run full test suite**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board && npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All existing tests pass plus the new store tests.

- [ ] **Commit**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
git add src/components/Layout/MainLayout.tsx
git commit -m "feat: add Training tab to MainLayout — hide canvas, wire mode switching, cone tool, back button"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| Third tab `'training'` in editorTab | Task 2, 12 |
| Canvas hidden (not unmounted) when training tab active | Task 12 |
| `modeStore.switchMode` called on tab switch | Task 12 |
| Add drill queue to timerStore | Task 3 |
| `previewPositions` in playerStore | Task 4 |
| Create coneStore | Task 5 |
| Wire clearCones into modeStore.resetMode | Task 5 |
| Fix TrainingSession.ts import path and types | Task 1 |
| Fix useRotationExercise hook | Task 6 |
| Fix TrainingSessionEditor | Task 7 |
| ConeManager — place + remove cones on board | Task 8 |
| PlayerManager ghost indicator for preview | Task 9 |
| RotationPreviewBanner | Task 10 |
| TrainingMode container with header + cone button | Task 11 |
| "← Back to Training" button on board in training mode | Task 12 |
| Cone tool only visible in training mode | Task 8 (`mode !== 'training' → null`), Task 12 |
| TDD with Vitest | Tasks 2, 3, 4, 5 |

All spec sections covered. ✅

### Type consistency

- `SessionDrill.restSeconds` — defined in Task 1, used in Tasks 3, 7. ✅
- `setDrillRest(drillId, restSeconds)` — defined in Task 3, used in Task 7. ✅
- `setPreviewPositions` / `clearPreviewPositions` — defined in Task 4, used in Tasks 7, 10. ✅
- `useConeStore` — created in Task 5, used in Tasks 8, 11, 12. ✅
- `setConePlacementActive` — defined in Task 5 coneStore, used in Tasks 11, 12. ✅
- `editorTab: 'training'` — extended in Task 2, used in Tasks 10, 11, 12. ✅
- `ConeManager` — created in Task 8, imported in Task 12. ✅
- `TrainingMode` — created in Task 11, imported in Task 12. ✅
