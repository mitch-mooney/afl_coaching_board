# Training Mode Redesign + Toolbar Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Training Mode panel to a split session-list/drill-detail layout with algorithmic board visualization, and fix two toolbar visibility bugs.

**Architecture:** A new `getDrillBoardLayout` utility generates ghost player positions and cone positions algorithmically from drill metadata (category → field zone, `playersRequired` → player count, `equipment` → cones). The Training Mode UI becomes a split layout: session plan list on the left, drill detail + "Set up on Board" on the right. Two single-line guards in `MainLayout` fix the toolbar bugs.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Three.js (coordinate system: x = goal-to-goal ±82.5, z = wing-to-wing ±67.5, y = 0 ground)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/store/uiStore.ts` | Modify | Remove broken draft state; add `activeDrillId` + `setActiveDrillId` |
| `src/components/Layout/MainLayout.tsx` | Modify | Guard `EventTimeline` + `AnnotationToolbar` with `editorTab === 'board'` |
| `src/utils/drillBoardLayout.ts` | Create | `getDrillBoardLayout(drill)` — algorithmic player + cone positions |
| `src/utils/__tests__/drillBoardLayout.test.ts` | Create | Unit tests for the utility |
| `src/components/TrainingMode/TrainingSessionEditor.tsx` | Rewrite | Split layout: session list (left) + drill detail (right) |

---

## Task 1: Fix uiStore.ts

**Files:**
- Modify: `src/store/uiStore.ts`

The store currently has broken TypeScript added at lines 179–200 (invalid `drillConfigMode: 'select' | 'edit'` type expression as a value, reference to undefined `DrillConfiguration` type, missing closing paren). Remove it all and add two clean fields.

- [ ] **Step 1: Add `activeDrillId` to the UIState interface**

In `src/store/uiStore.ts`, find the end of the `UIState` interface (currently ends with `setActiveFormationId`). Add two lines before the closing `}`:

```ts
  // Training Mode: which drill is shown in the detail panel
  activeDrillId: string | null;
  setActiveDrillId: (id: string | null) => void;
```

The interface block should end like:

```ts
  // Active formation preset (last applied formation ID)
  activeFormationId: string | null;
  setActiveFormationId: (id: string | null) => void;

  // Training Mode: which drill is shown in the detail panel
  activeDrillId: string | null;
  setActiveDrillId: (id: string | null) => void;
}
```

- [ ] **Step 2: Replace the broken implementation block**

Find the broken section starting at `// Drill configuration state` (around line 179) and ending at the closing `});` of the `create()` call. Replace it with:

```ts
    // Training Mode: which drill is shown in the detail panel
    activeDrillId: null,
    setActiveDrillId: (id: string | null) => set({ activeDrillId: id }),

    // Active formation preset
    activeFormationId: null,
    setActiveFormationId: (id) => set({ activeFormationId: id }),
  };
});
```

The full tail of the `create()` call (from `boardSubMode` onward) should look like:

```ts
    // Board sub-mode
    boardSubMode: 'setup',
    setBoardSubMode: (mode) => set({ boardSubMode: mode }),
    toggleBoardSubMode: () =>
      set((s) => ({ boardSubMode: s.boardSubMode === 'setup' ? 'draw' : 'setup' })),

    // Playbook panel
    isPlaybookOpen: false,
    togglePlaybook: () => set((s) => ({ isPlaybookOpen: !s.isPlaybookOpen })),
    openPlaybook: () => set({ isPlaybookOpen: true }),
    closePlaybook: () => set({ isPlaybookOpen: false }),

    // Editor tab
    editorTab: 'board',
    setEditorTab: (tab) => set({ editorTab: tab }),

    // Training Mode: which drill is shown in the detail panel
    activeDrillId: null,
    setActiveDrillId: (id: string | null) => set({ activeDrillId: id }),

    // Active formation preset
    activeFormationId: null,
    setActiveFormationId: (id) => set({ activeFormationId: id }),
  };
});
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/mitchellmooney/Documents/Applications/afl_coaching_board
npx tsc --noEmit 2>&1 | grep uiStore
```

Expected: no errors for `uiStore.ts`

- [ ] **Step 4: Commit**

```bash
git add src/store/uiStore.ts
git commit -m "fix: clean up broken draft state in uiStore, add activeDrillId"
```

---

## Task 2: Fix Toolbar Visibility

**Files:**
- Modify: `src/components/Layout/MainLayout.tsx`

Both `<AnnotationToolbar />` and `<EventTimeline />` are rendered unconditionally, making them visible on the Video and Training tabs.

- [ ] **Step 1: Guard AnnotationToolbar**

In `src/components/Layout/MainLayout.tsx`, find:

```tsx
      <AnnotationToolbar />
```

Replace with:

```tsx
      {editorTab === 'board' && <AnnotationToolbar />}
```

- [ ] **Step 2: Guard EventTimeline**

In the same file, find:

```tsx
      {/* Event Timeline (renders when event is active) */}
      <EventTimeline />
```

Replace with:

```tsx
      {/* Event Timeline (renders when event is active, board tab only) */}
      {editorTab === 'board' && <EventTimeline />}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep MainLayout
```

Expected: no output (no errors)

- [ ] **Step 4: Manual verification steps**

Open the app and:
1. Go to Board tab → open an Event (playback bar should appear) → switch to Training tab → playback bar should be gone
2. Go to Video tab → annotation toolbar should not appear in the centre of the screen

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/MainLayout.tsx
git commit -m "fix: hide EventTimeline and AnnotationToolbar on non-board tabs"
```

---

## Task 3: Create getDrillBoardLayout Utility

**Files:**
- Create: `src/utils/drillBoardLayout.ts`
- Create: `src/utils/__tests__/drillBoardLayout.test.ts`

### Field coordinate system reference

```
X-axis: goal-to-goal. Team 1 goal: x = -82.5. Team 2 goal: x = +82.5.
Z-axis: wing-to-wing. ±67.5 at boundaries.
Y = 0 (ground level).

Zones:
  attack/goal-kicking:  centre [55, 0, 0],  xSpread 22, zSpread 18
  defence:              centre [-55, 0, 0], xSpread 22, zSpread 18
  rucking:              centre [0, 0, 0],   xSpread 8,  zSpread 8
  marking/kicking/
  ball-handling/fitness: centre [0, 0, 0],  xSpread 28, zSpread 22
```

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/drillBoardLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getDrillBoardLayout } from '../drillBoardLayout';
import type { Drill } from '../../models/TrainingSession';

const makeDrill = (overrides: Partial<Drill>): Drill => ({
  id: 'test-1',
  name: 'Test Drill',
  description: 'desc',
  category: 'marking',
  durationSeconds: 600,
  playersRequired: 6,
  equipment: [],
  instructions: [],
  difficulty: 'beginner',
  ...overrides,
});

describe('getDrillBoardLayout', () => {
  it('returns the correct number of player positions', () => {
    const drill = makeDrill({ playersRequired: 6 });
    const { playerPositions } = getDrillBoardLayout(drill);
    expect(playerPositions).toHaveLength(6);
  });

  it('splits players evenly between team A and team B', () => {
    const drill = makeDrill({ playersRequired: 6 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const teamA = playerPositions.filter(p => p.teamId === 'team1');
    const teamB = playerPositions.filter(p => p.teamId === 'team2');
    expect(teamA).toHaveLength(3);
    expect(teamB).toHaveLength(3);
  });

  it('handles odd playersRequired — extra player goes to team A', () => {
    const drill = makeDrill({ playersRequired: 5 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const teamA = playerPositions.filter(p => p.teamId === 'team1');
    const teamB = playerPositions.filter(p => p.teamId === 'team2');
    expect(teamA).toHaveLength(3);
    expect(teamB).toHaveLength(2);
  });

  it('each player position has required Player fields', () => {
    const drill = makeDrill({ playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    for (const p of playerPositions) {
      expect(typeof p.id).toBe('string');
      expect(p.position).toHaveLength(3);
      expect(p.position[1]).toBe(0); // y = 0
      expect(p.rotation).toBeDefined();
      expect(p.color).toBeDefined();
    }
  });

  it('returns no cones when equipment has no cones', () => {
    const drill = makeDrill({ equipment: ['footballs'] });
    const { conePositions } = getDrillBoardLayout(drill);
    expect(conePositions).toHaveLength(0);
  });

  it('returns cones when equipment includes cones', () => {
    const drill = makeDrill({ equipment: ['cones'] });
    const { conePositions } = getDrillBoardLayout(drill);
    expect(conePositions.length).toBeGreaterThanOrEqual(4);
  });

  it('places attack drill players in forward 50 (positive x)', () => {
    const drill = makeDrill({ category: 'attack', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allInForward50 = playerPositions.every(p => p.position[0] > 20);
    expect(allInForward50).toBe(true);
  });

  it('places defence drill players in back 50 (negative x)', () => {
    const drill = makeDrill({ category: 'defence', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allInBack50 = playerPositions.every(p => p.position[0] < -20);
    expect(allInBack50).toBe(true);
  });

  it('places rucking drill players near centre', () => {
    const drill = makeDrill({ category: 'rucking', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allNearCentre = playerPositions.every(p => Math.abs(p.position[0]) < 20);
    expect(allNearCentre).toBe(true);
  });

  it('cone positions are valid [x, y, z] tuples with y = 0', () => {
    const drill = makeDrill({ equipment: ['cones'] });
    const { conePositions } = getDrillBoardLayout(drill);
    for (const pos of conePositions) {
      expect(pos).toHaveLength(3);
      expect(pos[1]).toBe(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/__tests__/drillBoardLayout.test.ts 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '../drillBoardLayout'"

- [ ] **Step 3: Create the utility**

Create `src/utils/drillBoardLayout.ts`:

```ts
import type { Drill, DrillCategory } from '../models/TrainingSession';
import type { Player } from '../models/PlayerModel';
import { DEFAULT_TEAM_COLORS } from '../models/PlayerModel';

export interface DrillBoardLayout {
  playerPositions: Player[];
  conePositions: Array<[number, number, number]>;
}

interface ZoneConfig {
  cx: number;  // centre x
  cz: number;  // centre z
  xSpread: number;
  zSpread: number;
}

const ZONE_CONFIG: Record<DrillCategory, ZoneConfig> = {
  attack:        { cx: 55,  cz: 0, xSpread: 22, zSpread: 18 },
  'goal-kicking':{ cx: 55,  cz: 0, xSpread: 22, zSpread: 18 },
  defence:       { cx: -55, cz: 0, xSpread: 22, zSpread: 18 },
  rucking:       { cx: 0,   cz: 0, xSpread: 8,  zSpread: 8  },
  marking:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
  kicking:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
  'ball-handling':{ cx: 0,  cz: 0, xSpread: 28, zSpread: 22 },
  fitness:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
};

/**
 * Distribute N points in a grid inside [cx ± xSpread, cz ± zSpread].
 * Returns [x, z] pairs.
 */
function gridPoints(n: number, cx: number, cz: number, xSpread: number, zSpread: number): [number, number][] {
  if (n === 0) return [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const points: [number, number][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (points.length >= n) break;
      const x = cols === 1 ? cx : cx - xSpread + (c / (cols - 1)) * xSpread * 2;
      const z = rows === 1 ? cz : cz - zSpread + (r / (rows - 1)) * zSpread * 2;
      points.push([x, z]);
    }
  }
  return points;
}

/**
 * Given a drill, return ghost player positions and cone positions
 * for placing on the 3D board.
 *
 * Field coordinates:
 *   x = goal-to-goal (±82.5), z = wing-to-wing (±67.5), y = 0 (ground)
 */
export function getDrillBoardLayout(drill: Drill): DrillBoardLayout {
  const zone = ZONE_CONFIG[drill.category];
  const { cx, cz, xSpread, zSpread } = zone;

  // --- Player positions ---
  const n = drill.playersRequired;
  const teamACount = Math.ceil(n / 2);
  const teamBCount = Math.floor(n / 2);

  // Two sub-grids: team A at cz - zSpread/2, team B at cz + zSpread/2
  const teamAPoints = gridPoints(teamACount, cx, cz - zSpread / 2, xSpread * 0.8, zSpread * 0.35);
  const teamBPoints = gridPoints(teamBCount, cx, cz + zSpread / 2, xSpread * 0.8, zSpread * 0.35);

  const playerPositions: Player[] = [
    ...teamAPoints.map(([x, z], i): Player => ({
      id: `drill-preview-a-${i}`,
      teamId: 'team1',
      position: [x, 0, z],
      rotation: 0,
      color: DEFAULT_TEAM_COLORS.team1,
      number: i + 1,
    })),
    ...teamBPoints.map(([x, z], i): Player => ({
      id: `drill-preview-b-${i}`,
      teamId: 'team2',
      position: [x, 0, z],
      rotation: Math.PI,
      color: DEFAULT_TEAM_COLORS.team2,
      number: i + 1,
    })),
  ];

  // --- Cone positions ---
  const conePositions: Array<[number, number, number]> = [];
  if (drill.equipment.includes('cones')) {
    const cxOff = xSpread * 0.7;
    const czOff = zSpread * 0.7;
    // Four corners
    conePositions.push(
      [cx - cxOff, 0, cz - czOff],
      [cx + cxOff, 0, cz - czOff],
      [cx + cxOff, 0, cz + czOff],
      [cx - cxOff, 0, cz + czOff],
    );
    // Two mid-channel markers
    conePositions.push(
      [cx, 0, cz - czOff],
      [cx, 0, cz + czOff],
    );
  }

  return { playerPositions, conePositions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/__tests__/drillBoardLayout.test.ts 2>&1 | tail -15
```

Expected: all tests pass, no failures

- [ ] **Step 5: Commit**

```bash
git add src/utils/drillBoardLayout.ts src/utils/__tests__/drillBoardLayout.test.ts
git commit -m "feat: add getDrillBoardLayout utility with algorithmic player + cone positions"
```

---

## Task 4: Redesign TrainingSessionEditor

**Files:**
- Rewrite: `src/components/TrainingMode/TrainingSessionEditor.tsx`

Replace the current two-panel (drill library left / session builder right) layout with the approved split layout C: compact session plan list (left) + drill detail panel (right). The drill library becomes an expandable inline drawer at the bottom of the left panel.

- [ ] **Step 1: Rewrite TrainingSessionEditor.tsx**

Replace the entire contents of `src/components/TrainingMode/TrainingSessionEditor.tsx` with:

```tsx
import React, { useState } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { useUIStore } from '../../store/uiStore';
import { useConeStore } from '../../store/coneStore';
import { usePlayerStore } from '../../store/playerStore';
import { TimerControls } from './TimerControls';
import { RotationExerciseEditor } from './RotationExerciseEditor';
import { drillLibrary, getDrillById } from '../../data/drillLibrary';
import { DRILL_CATEGORIES, type DrillCategory, type Drill, type SessionDrill } from '../../models/TrainingSession';
import { getDrillBoardLayout } from '../../utils/drillBoardLayout';

const CATEGORY_COLORS: Record<string, string> = {
  marking: '#4fc3f7',
  kicking: '#81c784',
  'ball-handling': '#ffb74d',
  defence: '#e57373',
  attack: '#ff6b00',
  fitness: '#ce93d8',
  'goal-kicking': '#fff176',
  rucking: '#a5d6a7',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '●',
  intermediate: '●●',
  advanced: '●●●',
};

export const TrainingSessionEditor: React.FC = () => {
  const [sessionName, setSessionName] = useState('New Training Session');
  const [drillLibraryOpen, setDrillLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | 'all'>('all');

  const { sessionDrills, addDrill, removeDrill } = useTimerStore();
  const { activeDrillId, setActiveDrillId } = useUIStore();
  const { setEditorTab } = useUIStore();
  const { clearCones, addCone } = useConeStore();
  const { setPreviewPositions } = usePlayerStore();

  const activeDrill: Drill | undefined = activeDrillId ? getDrillById(activeDrillId) : undefined;

  const filteredDrills = drillLibrary.filter((drill) => {
    const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
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
    setActiveDrillId(drill.id);
    setDrillLibraryOpen(false);
  };

  const handleSetUpOnBoard = () => {
    if (!activeDrill) return;
    const { playerPositions, conePositions } = getDrillBoardLayout(activeDrill);
    setPreviewPositions(playerPositions);
    clearCones();
    conePositions.forEach((pos) => addCone(pos));
    setEditorTab('board');
  };

  const totalMinutes = sessionDrills.reduce(
    (acc, d) => acc + Math.floor(d.durationSeconds / 60),
    0
  );

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1a1a2e' }}>

      {/* ── Left panel: session plan list ── */}
      <div
        style={{
          width: 320,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Session name */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            style={{
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              borderBottom: '2px solid #00d4aa',
              outline: 'none',
              width: '100%',
              padding: '3px 0',
              background: 'transparent',
              color: '#fff',
            }}
            placeholder="Session Name"
          />
        </div>

        {/* Drill list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessionDrills.length === 0 && !drillLibraryOpen && (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 13,
              }}
            >
              No drills yet — tap "Add Drill" below
            </div>
          )}
          {sessionDrills.map((d, index) => {
            const isActive = d.drillId === activeDrillId;
            return (
              <div
                key={d.drillId}
                onClick={() => setActiveDrillId(isActive ? null : d.drillId)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  background: isActive
                    ? 'rgba(255,107,0,0.12)'
                    : 'transparent',
                  borderLeft: isActive
                    ? '3px solid #FF6B00'
                    : '3px solid transparent',
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {index + 1}
                </span>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#FF6B00' : '#fff' }}
                  >
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {Math.floor(d.durationSeconds / 60)} min
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: CATEGORY_COLORS[d.category]
                      ? `${CATEGORY_COLORS[d.category]}22`
                      : 'rgba(255,255,255,0.08)',
                    color: CATEGORY_COLORS[d.category] ?? 'rgba(255,255,255,0.6)',
                  }}
                >
                  {d.playersRequired}p
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDrill(d.drillId);
                    if (isActive) setActiveDrillId(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {/* Drill library drawer */}
          {drillLibraryOpen && (
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ padding: '10px 14px' }}>
                <input
                  type="text"
                  placeholder="Search drills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#fff',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}
                >
                  <button
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background:
                        selectedCategory === 'all'
                          ? '#00d4aa'
                          : 'rgba(255,255,255,0.1)',
                      color: selectedCategory === 'all' ? '#000' : '#ccc',
                    }}
                  >
                    All
                  </button>
                  {DRILL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background:
                          selectedCategory === cat
                            ? CATEGORY_COLORS[cat] ?? '#00d4aa'
                            : 'rgba(255,255,255,0.1)',
                        color: selectedCategory === cat ? '#000' : '#ccc',
                      }}
                    >
                      {cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredDrills.map((drill) => (
                  <div
                    key={drill.id}
                    onClick={() => handleAddDrill(drill)}
                    style={{
                      padding: '9px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background =
                        'rgba(255,255,255,0.05)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                    }
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 2,
                      }}
                    >
                      {drill.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <span>{Math.floor(drill.durationSeconds / 60)} min</span>
                      <span>{drill.playersRequired} players</span>
                      <span style={{ color: CATEGORY_COLORS[drill.category] ?? '#ccc' }}>
                        {DIFFICULTY_LABEL[drill.difficulty]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {sessionDrills.length} drill{sessionDrills.length !== 1 ? 's' : ''} · {totalMinutes} min total
            </span>
            <button
              onClick={() => setDrillLibraryOpen((v) => !v)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid rgba(0,212,170,0.4)',
                background: drillLibraryOpen
                  ? 'rgba(0,212,170,0.2)'
                  : 'rgba(0,212,170,0.08)',
                color: '#00d4aa',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {drillLibraryOpen ? '✕ Close' : '+ Add Drill'}
            </button>
          </div>
          <TimerControls timerType="session" />
        </div>
      </div>

      {/* ── Right panel: drill detail ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeDrill ? (
          <>
            {/* Detail header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${CATEGORY_COLORS[activeDrill.category] ?? '#fff'}22`,
                    color: CATEGORY_COLORS[activeDrill.category] ?? '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {activeDrill.category.replace('-', ' ')}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {DIFFICULTY_LABEL[activeDrill.difficulty]} {activeDrill.difficulty}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {activeDrill.name}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                {activeDrill.description}
              </div>
            </div>

            {/* Detail body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
              {/* Stats row */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                    DURATION
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {Math.floor(activeDrill.durationSeconds / 60)} min
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                    PLAYERS
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#00d4aa' }}>
                    {activeDrill.playersRequired}
                  </div>
                </div>
                {activeDrill.equipment.length > 0 && (
                  <div>
                    <div
                      style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}
                    >
                      EQUIPMENT
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.7)',
                        maxWidth: 140,
                      }}
                    >
                      {activeDrill.equipment.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Instructions
              </div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {activeDrill.instructions.map((step, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.75)',
                      marginBottom: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>

              {/* Rotation exercise (collapsed section) */}
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: 'rgba(0,212,170,0.05)',
                  border: '1px solid rgba(0,212,170,0.15)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  Rotation Exercise
                </div>
                <RotationExerciseEditor />
              </div>
            </div>

            {/* Set up on Board button */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleSetUpOnBoard}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid #FF6B00',
                  background: 'rgba(255,107,0,0.18)',
                  color: '#FF6B00',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                ▶ Set up on Board
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
              gap: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32 }}>🏈</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No drill selected</div>
            <div style={{ fontSize: 12 }}>
              Add a drill from the session plan and tap it to see details and set it up on the board
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep TrainingSessionEditor
```

Expected: no errors

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/TrainingMode/TrainingSessionEditor.tsx
git commit -m "feat: redesign TrainingSessionEditor — split session list + drill detail panel"
```

---

## Task 5: Wire Set up on Board + full test run

This task verifies the integration end-to-end and does a final TypeScript + test sweep.

- [ ] **Step 1: Run the full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass (including the new `drillBoardLayout` tests)

- [ ] **Step 3: Manual integration check**

Launch the app (`npm run dev`) and verify:

1. **Toolbar fix 1:** Open any Scenario → Board tab → add/open an Event → playback bar appears at bottom → switch to Training tab → playback bar is gone
2. **Toolbar fix 2:** Switch to Video tab → annotation toolbar should not appear mid-screen
3. **Training Mode layout:** Training tab shows split layout — session plan list on left, empty state on right
4. **Add drill:** Click "Add Drill" → library drawer expands inline → click a drill → it appears in the session list, detail panel shows on right
5. **Set up on Board:** With a drill selected that has "cones" in equipment → click "▶ Set up on Board" → app switches to Board tab → ghost player circles are visible on the field → orange cones appear in the drill zone

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete training mode redesign + toolbar visibility fixes"
```
