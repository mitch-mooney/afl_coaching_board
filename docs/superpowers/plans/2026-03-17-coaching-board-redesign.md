# Coaching Board Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the app from a playbook-centric tool into a scenario-first coaching board at the intersection of magnet board and video review, with correct AFL formations, dual-POV cameras, team rosters, Setup/Draw workflow, and an onboarding tour.

**Architecture:** Three top-level screens (Home/Scenario Library, Scenario Editor with Board+Video tabs, Team Rosters). The existing `AFLPlaybookDB` is upgraded to v3 with `scenarios` and `teamRosters` tables; old playbooks are migrated on upgrade. State refactors (labelMode, dual-POV) happen before any UI work.

**Tech Stack:** React + React Three Fiber, Zustand, Dexie.js v3 upgrade, Vitest, Tailwind CSS, react-router-dom v6.

---

## Coordinate Convention Reference

> **Read carefully before touching any formation data.**

`formations.ts` raw position data uses this convention:
- **`x`** = lateral / wing axis (positive = right wing, negative = left wing)
- **`z`** = longitudinal / goal axis (positive = Team 1 attacking goal, negative = Team 1 defending goal)

These are applied to 3D world coordinates via `createTeamPositions` as:
```
3D position = [pos.z, 0, pos.x]
```
So: **3D X-axis = goal-to-goal**, **3D Z-axis = wing-to-wing**.

Team 1 goal lines: raw `z = ±82.5` → 3D `x = ±82.5`
Field width: raw `x = ±67.5` → 3D `z = ±67.5`
Centre square: raw `|x| ≤ 25, |z| ≤ 25`
50m arc boundary from centre: `82.5 − 50 = 32.5` → Team 1 forwards must have raw `z > 32.5`

**Clock-face on centre circle** (12 o'clock faces Team 1's defending goal = raw z negative):
- 6 o'clock = toward attacking goal → raw `z = +5`
- 3 o'clock = right wing → raw `x = +5`
- 9 o'clock = left wing → raw `x = -5`

**Kick-in pressing** (Team 1 presses Team 2's kick-in; Team 2's defending goal is at raw `z = +82.5`):
- 20m from Team 2's goal → raw `z = +62.5`
- 35m → raw `z = +47.5`
- 52m → raw `z = +30.5`

**Kick-in kicking** (Team 1 kicks in from own goal at raw `z = -82.5`):
- Kicker (FB in goal square) → raw `z ≈ -78`
- 20m from own goal → raw `z = -62.5`
- 40m from own goal → raw `z = -42.5`
- 55m from own goal → raw `z = -27.5`

**Interchange bench** (off-field): follow existing pattern `{ x: -60, z: -75 }` through `{ x: -30, z: -75.75 }`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/models/ScenarioModel.ts` | Create | Scenario + ScenarioPhase types |
| `src/models/RosterModel.ts` | Create | RosterPlayer + TeamRoster types |
| `src/store/playbookStore.ts` | Modify | Upgrade DB to v3 (scenarios + teamRosters tables + migration) |
| `src/store/scenarioStore.ts` | Create | Scenario CRUD using playbookDB |
| `src/store/rosterStore.ts` | Create | TeamRoster CRUD + PlayHQ import |
| `src/store/playerStore.ts` | Modify | Replace showPlayerNames/showPositionNames → labelMode |
| `src/store/cameraStore.ts` | Modify | Replace povMode/povPlayerId → povPlayer1Id/povPlayer2Id/activePovSlot |
| `src/store/uiStore.ts` | Modify | Add boardSubMode + editorTab |
| `src/data/formations.ts` | Modify | Fix centre-bounce, add kick-in presets, export KICK_IN_PRESSING + KICK_IN_KICKING |
| `src/App.tsx` | Modify | Add /scenario/:id and /rosters routes |
| `src/components/Layout/MainLayout.tsx` | Modify | Board/Video tab bar, Setup/Draw toggle, scenario save/load |
| `src/components/UI/ScenarioLibrary.tsx` | Create | Home screen — scenario grid + New Scenario |
| `src/components/UI/RosterLibrary.tsx` | Create | Roster list + PlayHQ import dialog |
| `src/components/UI/PlayHQImportDialog.tsx` | Create | Paste + URL fetch import dialog |
| `src/components/UI/CameraDock.tsx` | Create | Broadcast / POV1 / POV2 switcher |
| `src/components/UI/LabelToggle.tsx` | Create | number / name / position cycle button |
| `src/components/UI/FormationPresetBar.tsx` | Create | Centre Bounce / Kick-in buttons in Board tab |
| `src/components/UI/OnboardingTour.tsx` | Create | 5-step first-run overlay |
| `src/components/UI/HelpScreen.tsx` | Create | Help reference screen |
| `src/store/__tests__/scenarioStore.test.ts` | Create | Scenario CRUD tests |
| `src/store/__tests__/rosterStore.test.ts` | Create | Roster + PlayHQ parse tests |
| `src/store/__tests__/playerStore.test.ts` | Create | labelMode tests |
| `src/store/__tests__/cameraStore.test.ts` | Create | dual-POV slot tests |
| `src/store/__tests__/uiStore.test.ts` | Create | boardSubMode + editorTab tests |
| `src/data/__tests__/formations.test.ts` | Create | Formation coordinate tests |
| `src/models/__tests__/ScenarioModel.test.ts` | Create | Type shape tests |
| `src/models/__tests__/RosterModel.test.ts` | Create | Type shape tests |

---

## Task 1: Data Models

**Files:**
- Create: `src/models/ScenarioModel.ts`
- Create: `src/models/RosterModel.ts`
- Create: `src/models/__tests__/ScenarioModel.test.ts`
- Create: `src/models/__tests__/RosterModel.test.ts`

- [ ] **Step 1: Write failing tests for ScenarioModel**

```ts
// src/models/__tests__/ScenarioModel.test.ts
import { describe, it, expect } from 'vitest';
import type { Scenario, ScenarioPhase } from '../ScenarioModel';

describe('ScenarioModel', () => {
  it('Scenario has required fields', () => {
    const s: Scenario = {
      name: 'Centre bounce press',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [],
    };
    expect(s.name).toBe('Centre bounce press');
    expect(s.phases).toHaveLength(0);
  });

  it('ScenarioPhase has required fields', () => {
    const p: ScenarioPhase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    };
    expect(p.id).toBe('phase-1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/models/__tests__/ScenarioModel.test.ts
```
Expected: FAIL — `Cannot find module '../ScenarioModel'`

- [ ] **Step 3: Create ScenarioModel.ts**

```ts
// src/models/ScenarioModel.ts
import type { Player } from './PlayerModel';
import type { MovementPath } from './PathModel';

export interface ScenarioPhase {
  id: string;
  label: string;
  playerPositions: Player[];
  paths: MovementPath[];
  annotations: unknown[];       // typed further when annotations model is stable
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  } | null;
}

export interface Scenario {
  id?: number;                  // Dexie auto-increment integer
  name: string;
  createdAt: string;            // ISO timestamp
  updatedAt: string;
  // FK to TeamRoster.id (Dexie integer PK — simpler than UUID strings)
  team1RosterId: number | null;
  team2RosterId: number | null;
  phases: ScenarioPhase[];
  videoBlobId?: number;
  tags?: string[];
}
```

- [ ] **Step 4: Run to verify pass**

```
npx vitest run src/models/__tests__/ScenarioModel.test.ts
```

- [ ] **Step 5: Write failing tests for RosterModel**

```ts
// src/models/__tests__/RosterModel.test.ts
import { describe, it, expect } from 'vitest';
import type { RosterPlayer, TeamRoster } from '../RosterModel';

describe('RosterModel', () => {
  it('RosterPlayer has id, number, name', () => {
    const p: RosterPlayer = { id: 'uuid-1', number: 23, name: 'Smith J' };
    expect(p.id).toBe('uuid-1');
    expect(p.number).toBe(23);
  });

  it('TeamRoster has players array', () => {
    const r: TeamRoster = {
      teamName: 'Hawks',
      createdAt: new Date().toISOString(),
      players: [],
    };
    expect(r.players).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run to verify failure**

```
npx vitest run src/models/__tests__/RosterModel.test.ts
```

- [ ] **Step 7: Create RosterModel.ts**

```ts
// src/models/RosterModel.ts
export interface RosterPlayer {
  id: string;             // stable UUID (crypto.randomUUID)
  number: number;
  name: string;
  position?: string;      // AFL position code e.g. 'CHF'
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface TeamRoster {
  id?: number;            // Dexie auto-increment
  teamName: string;
  createdAt: string;
  players: RosterPlayer[];
}
```

- [ ] **Step 8: Run to verify pass**

```
npx vitest run src/models/__tests__/RosterModel.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/models/ScenarioModel.ts src/models/RosterModel.ts \
        src/models/__tests__/ScenarioModel.test.ts src/models/__tests__/RosterModel.test.ts
git commit -m "feat: add ScenarioModel and RosterModel type definitions"
```

---

## Task 2: Dexie v3 Upgrade + scenarioStore + rosterStore

**Goal:** Upgrade the existing `AFLPlaybookDB` (currently v2) to v3 by adding `scenarios` and `teamRosters` tables and migrating existing playbooks → scenarios. Create `scenarioStore` and `rosterStore` that import the shared upgraded DB.

**Files:**
- Modify: `src/store/playbookStore.ts` (add v3, export `playbookDB`)
- Create: `src/store/scenarioStore.ts`
- Create: `src/store/rosterStore.ts`
- Test: `src/store/__tests__/scenarioStore.test.ts`
- Test: `src/store/__tests__/rosterStore.test.ts`

- [ ] **Step 1: Write failing tests for scenarioStore**

```ts
// src/store/__tests__/scenarioStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useScenarioStore, scenarioTable } from '../scenarioStore';

beforeEach(async () => {
  await scenarioTable.clear();
  useScenarioStore.setState({ scenarios: [], activeScenarioId: null });
});

describe('scenarioStore', () => {
  it('creates a scenario and persists it', async () => {
    const { createScenario } = useScenarioStore.getState();
    const id = await createScenario('Test Scenario');
    const all = useScenarioStore.getState().scenarios;
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Test Scenario');
    expect(typeof id).toBe('number');
  });

  it('updates a scenario', async () => {
    const { createScenario, updateScenario } = useScenarioStore.getState();
    const id = await createScenario('Original');
    await updateScenario(id, { name: 'Updated' });
    expect(useScenarioStore.getState().scenarios[0].name).toBe('Updated');
  });

  it('deletes a scenario', async () => {
    const { createScenario, deleteScenario } = useScenarioStore.getState();
    const id = await createScenario('To Delete');
    await deleteScenario(id);
    expect(useScenarioStore.getState().scenarios).toHaveLength(0);
  });

  it('loads scenarios from DB', async () => {
    const { createScenario, loadScenarios } = useScenarioStore.getState();
    await createScenario('Persisted');
    useScenarioStore.setState({ scenarios: [] });
    await loadScenarios();
    expect(useScenarioStore.getState().scenarios).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/store/__tests__/scenarioStore.test.ts
```
Expected: FAIL — `Cannot find module '../scenarioStore'`

- [ ] **Step 3: Read `src/store/playbookStore.ts` in full, then add v3**

Open `src/store/playbookStore.ts`. Locate the `PlaybookDatabase` class constructor. Add:

```ts
// After the existing version(2).stores(...) call, add version 3:
this.version(3).stores({
  // Keep v2 playbooks schema unchanged
  playbooks: '++id, name, createdAt, videoBlobId',
  // New tables
  scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId',
  teamRosters: '++id, teamName, createdAt',
}).upgrade(async (tx) => {
  // Migrate existing playbooks → scenarios (one-time)
  const playbooks = await tx.table('playbooks').toArray();
  for (const p of playbooks) {
    const createdAt =
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt);
    await tx.table('scenarios').add({
      name: p.name,
      createdAt,
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [
        {
          id: 'phase-1',
          label: 'Phase 1',
          playerPositions: p.playerPositions ?? [],
          paths: [],
          annotations: p.annotations ?? [],
          cameraState: p.cameraPosition
            ? { position: p.cameraPosition, target: p.cameraTarget, zoom: p.cameraZoom }
            : null,
        },
      ],
      videoBlobId: p.videoBlobId,
    });
  }
});
```

Also add `scenarios` and `teamRosters` table declarations to the class (alongside the existing `playbooks!: Table<Playbook>`):

```ts
// In PlaybookDatabase class body:
import type { Scenario } from '../models/ScenarioModel';
import type { TeamRoster } from '../models/RosterModel';

// Add these table declarations:
scenarios!: Table<Scenario, number>;
teamRosters!: Table<TeamRoster, number>;
```

Then export the db instance at the bottom of `playbookStore.ts`:
```ts
// ADD this export (the existing const db = new PlaybookDatabase() already exists):
export { db as playbookDB };
```

- [ ] **Step 4: Create scenarioStore.ts**

```ts
// src/store/scenarioStore.ts
import { create } from 'zustand';
import { playbookDB } from './playbookStore';
import type { Scenario } from '../models/ScenarioModel';

// Export the table reference so tests can clear it directly
export const scenarioTable = playbookDB.scenarios;

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: number | null;
  loadScenarios: () => Promise<void>;
  createScenario: (name: string) => Promise<number>;
  updateScenario: (id: number, patch: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: number) => Promise<void>;
  setActiveScenario: (id: number | null) => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: [],
  activeScenarioId: null,

  loadScenarios: async () => {
    const scenarios = await scenarioTable.orderBy('createdAt').reverse().toArray();
    set({ scenarios });
  },

  createScenario: async (name) => {
    const now = new Date().toISOString();
    const id = await scenarioTable.add({
      name,
      createdAt: now,
      updatedAt: now,
      team1RosterId: null,
      team2RosterId: null,
      phases: [],
    });
    await get().loadScenarios();
    return id as number;
  },

  updateScenario: async (id, patch) => {
    await scenarioTable.update(id, { ...patch, updatedAt: new Date().toISOString() });
    await get().loadScenarios();
  },

  deleteScenario: async (id) => {
    await scenarioTable.delete(id);
    await get().loadScenarios();
    if (get().activeScenarioId === id) set({ activeScenarioId: null });
  },

  setActiveScenario: (id) => set({ activeScenarioId: id }),
}));
```

- [ ] **Step 5: Run scenarioStore tests**

```
npx vitest run src/store/__tests__/scenarioStore.test.ts
```

- [ ] **Step 6: Write failing tests for rosterStore**

```ts
// src/store/__tests__/rosterStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useRosterStore, rosterTable, parsePlayHQText } from '../rosterStore';

beforeEach(async () => {
  await rosterTable.clear();
  useRosterStore.setState({ rosters: [] });
});

const SAMPLE = `#\tPlayers\tPP\tG
23\tSmith J (c)\t3\t2
7\tJones M (vc)\t2\t1
15\tBrown K\t4\t0`;

describe('parsePlayHQText', () => {
  it('parses three players from sample', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players).toHaveLength(3);
  });

  it('parses number and name', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players[0].number).toBe(23);
    expect(players[0].name).toBe('Smith J');
  });

  it('detects captain marker', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players[0].isCaptain).toBe(true);
    expect(players[1].isViceCaptain).toBe(true);
    expect(players[2].isCaptain).toBeFalsy();
  });

  it('assigns unique string UUIDs', () => {
    const players = parsePlayHQText(SAMPLE);
    const ids = players.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
    expect(typeof ids[0]).toBe('string');
  });

  it('ignores header row', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players.every((p) => !isNaN(p.number))).toBe(true);
  });
});

describe('rosterStore CRUD', () => {
  it('creates and loads a roster', async () => {
    const { createRoster, loadRosters } = useRosterStore.getState();
    await createRoster('Hawks', []);
    await loadRosters();
    expect(useRosterStore.getState().rosters[0].teamName).toBe('Hawks');
  });

  it('deletes a roster', async () => {
    const { createRoster, deleteRoster, loadRosters } = useRosterStore.getState();
    const id = await createRoster('Swans', []);
    await deleteRoster(id);
    await loadRosters();
    expect(useRosterStore.getState().rosters).toHaveLength(0);
  });
});
```

- [ ] **Step 7: Run to verify failure**

```
npx vitest run src/store/__tests__/rosterStore.test.ts
```

- [ ] **Step 8: Create rosterStore.ts**

```ts
// src/store/rosterStore.ts
import { create } from 'zustand';
import { playbookDB } from './playbookStore';
import type { TeamRoster, RosterPlayer } from '../models/RosterModel';

export const rosterTable = playbookDB.teamRosters;

// ── PlayHQ parser ──────────────────────────────────────────────────────────────

export function parsePlayHQText(raw: string): RosterPlayer[] {
  const lines = raw.trim().split('\n');
  const players: RosterPlayer[] = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 2) continue;
    const num = parseInt(cols[0].trim(), 10);
    if (isNaN(num)) continue; // skip header
    let name = cols[1].trim();
    let isCaptain = false;
    let isViceCaptain = false;
    if (name.endsWith('(c)')) {
      isCaptain = true;
      name = name.replace(/\s*\(c\)\s*$/, '');
    }
    if (name.endsWith('(vc)')) {
      isViceCaptain = true;
      name = name.replace(/\s*\(vc\)\s*$/, '');
    }
    players.push({ id: crypto.randomUUID(), number: num, name, isCaptain, isViceCaptain });
  }
  return players;
}

// ── PlayHQ URL fetch (5s timeout, falls back gracefully) ──────────────────────

export async function fetchPlayHQRoster(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface RosterState {
  rosters: TeamRoster[];
  loadRosters: () => Promise<void>;
  createRoster: (teamName: string, players: RosterPlayer[]) => Promise<number>;
  updateRoster: (id: number, patch: Partial<TeamRoster>) => Promise<void>;
  deleteRoster: (id: number) => Promise<void>;
}

export const useRosterStore = create<RosterState>((set, get) => ({
  rosters: [],

  loadRosters: async () => {
    const rosters = await rosterTable.orderBy('createdAt').reverse().toArray();
    set({ rosters });
  },

  createRoster: async (teamName, players) => {
    const id = await rosterTable.add({ teamName, createdAt: new Date().toISOString(), players });
    await get().loadRosters();
    return id as number;
  },

  updateRoster: async (id, patch) => {
    await rosterTable.update(id, patch);
    await get().loadRosters();
  },

  deleteRoster: async (id) => {
    await rosterTable.delete(id);
    await get().loadRosters();
  },
}));
```

- [ ] **Step 9: Run rosterStore tests to verify pass**

```
npx vitest run src/store/__tests__/rosterStore.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/store/playbookStore.ts src/store/scenarioStore.ts src/store/rosterStore.ts \
        src/store/__tests__/scenarioStore.test.ts src/store/__tests__/rosterStore.test.ts
git commit -m "feat: upgrade AFLPlaybookDB to v3 with scenarios/teamRosters + migrate playbooks"
```

---

## Task 3: playerStore — labelMode refactor

**Files:**
- Modify: `src/store/playerStore.ts`
- Test: `src/store/__tests__/playerStore.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/store/__tests__/playerStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';

beforeEach(() => { usePlayerStore.setState({ labelMode: 'number' }); });

describe('labelMode', () => {
  it('defaults to number', () => {
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });

  it('setLabelMode changes mode', () => {
    usePlayerStore.getState().setLabelMode('name');
    expect(usePlayerStore.getState().labelMode).toBe('name');
  });

  it('cycleLabelMode goes number→name→position→number', () => {
    const s = usePlayerStore.getState();
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('name');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('position');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/store/__tests__/playerStore.test.ts
```

- [ ] **Step 3: Modify playerStore.ts**

Read `src/store/playerStore.ts` in full first.

In the state interface, remove `showPlayerNames: boolean` and `showPositionNames: boolean` (and their toggle actions). Add:
```ts
  labelMode: 'number' | 'name' | 'position';
  setLabelMode: (mode: 'number' | 'name' | 'position') => void;
  cycleLabelMode: () => void;
```

In the store initializer:
```ts
  labelMode: 'number',
  setLabelMode: (mode) => set({ labelMode: mode }),
  cycleLabelMode: () => {
    const order: Array<'number' | 'name' | 'position'> = ['number', 'name', 'position'];
    const cur = get().labelMode;
    set({ labelMode: order[(order.indexOf(cur) + 1) % order.length] });
  },
```

- [ ] **Step 4: Update all consumers** (use the Grep tool to search, not shell grep)

Search for: `showPlayerNames`, `showPositionNames`, `togglePlayerNames`, `togglePositionNames`

For each hit, replace:
- `showPlayerNames` → `labelMode === 'name'`
- `showPositionNames` → `labelMode === 'position'`
- `togglePlayerNames()` or `togglePositionNames()` → `cycleLabelMode()`

- [ ] **Step 5: Verify pass**

```
npx vitest run src/store/__tests__/playerStore.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/store/playerStore.ts src/store/__tests__/playerStore.test.ts
git commit -m "refactor: replace showPlayerNames/showPositionNames with labelMode in playerStore"
```

---

## Task 4: cameraStore — dual-POV refactor

**Files:**
- Modify: `src/store/cameraStore.ts`
- Test: `src/store/__tests__/cameraStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/store/__tests__/cameraStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore } from '../cameraStore';

beforeEach(() => {
  useCameraStore.setState({ povPlayer1Id: null, povPlayer2Id: null, activePovSlot: null });
});

describe('dual-POV slots', () => {
  it('sets POV player for slot 1 and activates it', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    const s = useCameraStore.getState();
    expect(s.povPlayer1Id).toBe('player-abc');
    expect(s.activePovSlot).toBe(1);
  });

  it('sets POV player for slot 2 and activates it', () => {
    useCameraStore.getState().setPovPlayer(2, 'player-xyz');
    expect(useCameraStore.getState().povPlayer2Id).toBe('player-xyz');
    expect(useCameraStore.getState().activePovSlot).toBe(2);
  });

  it('clearPov removes player and resets slot if active', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    useCameraStore.getState().clearPov(1);
    expect(useCameraStore.getState().povPlayer1Id).toBeNull();
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });

  it('switchToBroadcast resets activePovSlot', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    useCameraStore.getState().switchToBroadcast();
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });

  it('setActivePovSlot switches between slots', () => {
    useCameraStore.getState().setPovPlayer(1, 'p1');
    useCameraStore.getState().setPovPlayer(2, 'p2');
    useCameraStore.getState().setActivePovSlot(2);
    expect(useCameraStore.getState().activePovSlot).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/store/__tests__/cameraStore.test.ts
```

- [ ] **Step 3: Read `src/store/cameraStore.ts` in full, then modify**

Remove: `povMode: boolean`, `povPlayerId: string | null`, `enablePOV()`, `disablePOV()`.
Keep: `povHeight: number`, `povDistance: number`, `setPOVSettings()`.

Add:
```ts
  povPlayer1Id: string | null;
  povPlayer2Id: string | null;
  activePovSlot: 1 | 2 | null;
  setPovPlayer: (slot: 1 | 2, playerId: string) => void;
  clearPov: (slot: 1 | 2) => void;
  setActivePovSlot: (slot: 1 | 2 | null) => void;
  switchToBroadcast: () => void;
```

Initializer additions:
```ts
  povPlayer1Id: null,
  povPlayer2Id: null,
  activePovSlot: null,

  setPovPlayer: (slot, playerId) => {
    if (slot === 1) set({ povPlayer1Id: playerId, activePovSlot: 1 });
    else set({ povPlayer2Id: playerId, activePovSlot: 2 });
  },
  clearPov: (slot) => {
    const clearSlot1 = slot === 1;
    const isActive = get().activePovSlot === slot;
    set({
      ...(clearSlot1 ? { povPlayer1Id: null } : { povPlayer2Id: null }),
      ...(isActive ? { activePovSlot: null } : {}),
    });
  },
  setActivePovSlot: (slot) => set({ activePovSlot: slot }),
  switchToBroadcast: () => set({ activePovSlot: null }),
```

- [ ] **Step 4: Update all consumers** (use the Grep tool to search)

Search for: `povMode`, `povPlayerId`, `enablePOV`, `disablePOV`

Replace:
- `povMode` → `activePovSlot !== null`
- `enablePOV(id)` → `setPovPlayer(1, id)` (slot 1 for legacy single-POV callers)
- `disablePOV()` → `switchToBroadcast()`
- `povPlayerId` → `activePovSlot === 1 ? povPlayer1Id : povPlayer2Id`

Key file to update: `src/components/Scene/CameraController.tsx` — read it and update to use `activePovSlot`, `povPlayer1Id`, `povPlayer2Id`:
```ts
const activePovPlayerId =
  activePovSlot === 1 ? povPlayer1Id :
  activePovSlot === 2 ? povPlayer2Id : null;
```

- [ ] **Step 5: Verify pass**

```
npx vitest run src/store/__tests__/cameraStore.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/store/cameraStore.ts src/store/__tests__/cameraStore.test.ts \
        src/components/Scene/CameraController.tsx
git commit -m "refactor: replace single POV with dual-slot POV in cameraStore"
```

---

## Task 5: Setup/Draw Sub-Mode + Editor Tab State

**Files:**
- Modify: `src/store/uiStore.ts`
- Test: `src/store/__tests__/uiStore.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/store/__tests__/uiStore.test.ts  (append to existing or create)
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

beforeEach(() => {
  useUIStore.setState({ boardSubMode: 'setup', editorTab: 'board' });
});

describe('boardSubMode', () => {
  it('defaults to setup', () => {
    expect(useUIStore.getState().boardSubMode).toBe('setup');
  });

  it('toggleBoardSubMode cycles setup→draw→setup', () => {
    useUIStore.getState().toggleBoardSubMode();
    expect(useUIStore.getState().boardSubMode).toBe('draw');
    useUIStore.getState().toggleBoardSubMode();
    expect(useUIStore.getState().boardSubMode).toBe('setup');
  });
});

describe('editorTab', () => {
  it('defaults to board', () => {
    expect(useUIStore.getState().editorTab).toBe('board');
  });

  it('setEditorTab switches to video', () => {
    useUIStore.getState().setEditorTab('video');
    expect(useUIStore.getState().editorTab).toBe('video');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/store/__tests__/uiStore.test.ts
```

- [ ] **Step 3: Modify uiStore.ts**

Read `src/store/uiStore.ts` first. Add to state interface and initializer:
```ts
  boardSubMode: 'setup' | 'draw';
  setBoardSubMode: (mode: 'setup' | 'draw') => void;
  toggleBoardSubMode: () => void;
  editorTab: 'board' | 'video';
  setEditorTab: (tab: 'board' | 'video') => void;
```

```ts
  boardSubMode: 'setup',
  setBoardSubMode: (mode) => set({ boardSubMode: mode }),
  toggleBoardSubMode: () =>
    set((s) => ({ boardSubMode: s.boardSubMode === 'setup' ? 'draw' : 'setup' })),
  editorTab: 'board',
  setEditorTab: (tab) => set({ editorTab: tab }),
```

- [ ] **Step 4: Gate path creation on Draw mode**

Read the component that creates paths on player drag (likely `src/components/Scene/Player.tsx`). In the drag-end handler, add:

```ts
import { useUIStore } from '../../store/uiStore';
// ...
const boardSubMode = useUIStore.getState().boardSubMode;
if (boardSubMode !== 'draw') {
  // Setup mode: update position only, do not create path
  return;
}
// existing path-creation code follows
```

- [ ] **Step 5: Verify pass**

```
npx vitest run src/store/__tests__/uiStore.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/store/uiStore.ts src/store/__tests__/uiStore.test.ts \
        src/components/Scene/Player.tsx
git commit -m "feat: add Setup/Draw boardSubMode and editorTab to uiStore; gate paths to Draw mode"
```

---

## Task 6: Fix AFL Formations Data

**Files:**
- Modify: `src/data/formations.ts`
- Test: `src/data/__tests__/formations.test.ts`

> **Verify convention before editing:** In `formations.ts` raw data, `x = wing` and `z = goal` (Team 1 attacks at positive z, defends at negative z). Applied to 3D as `[pos.z, 0, pos.x]` so `3D position[0] = pos.z (goal axis)` and `3D position[2] = pos.x (wing axis)`.

- [ ] **Step 1: Write failing tests**

```ts
// src/data/__tests__/formations.test.ts
import { describe, it, expect } from 'vitest';
import {
  getFormationById,
  PRE_BUILT_FORMATIONS,
} from '../formations';
import type { PlayerPosition } from '../../types/Formation';

// Helper: get Team 1 3D position by role
function getTeam1Pos(formationId: string, role: string): PlayerPosition {
  const f = getFormationById(formationId);
  if (!f) throw new Error(`Formation ${formationId} not found`);
  const p = f.positions.find((pos) => pos.teamId === 'team1' && pos.role === role);
  if (!p) throw new Error(`Role ${role} not found in ${formationId}`);
  return p;
}

// Helpers to read back formation-data values from 3D position
// 3D position = [pos.z, 0, pos.x], so:
function rawZ(p: PlayerPosition) { return p.position[0]; }  // formation z = goal axis
function rawX(p: PlayerPosition) { return p.position[2]; }  // formation x = wing axis

describe('CENTRE_BOUNCE formation', () => {
  it('Ruck (R) is at centre (both axes ≈ 0)', () => {
    // After fix: role 'Rk' or 'R' for ruck — adapt to actual role name used
    const rk = getTeam1Pos('centre-bounce', 'R');
    expect(rawZ(rk)).toBeCloseTo(0, 0);
    expect(rawX(rk)).toBeCloseTo(0, 1);
  });

  it('Centre (C) is at 6 o\'clock (+z ≈ 5)', () => {
    const c = getTeam1Pos('centre-bounce', 'C');
    expect(rawZ(c)).toBeCloseTo(5, 0);
    expect(rawX(c)).toBeCloseTo(0, 1);
  });

  it('RR is at 3 o\'clock (+x ≈ 5)', () => {
    const rr = getTeam1Pos('centre-bounce', 'RR');
    expect(rawZ(rr)).toBeCloseTo(0, 0);
    expect(rawX(rr)).toBeCloseTo(5, 0);
  });

  it('RO is at 9 o\'clock (-x ≈ -5)', () => {
    const ro = getTeam1Pos('centre-bounce', 'RO');
    expect(rawZ(ro)).toBeCloseTo(0, 0);
    expect(rawX(ro)).toBeLessThan(-4);
  });

  it('Wings are on centre square boundary (|x| ≈ 25)', () => {
    const wl = getTeam1Pos('centre-bounce', 'W');
    // Just verify the first wing found is at |x| ≈ 25
    expect(Math.abs(rawX(wl))).toBeCloseTo(25, 1);
  });

  it('FF is inside 50m arc (z > 32.5)', () => {
    const ff = getTeam1Pos('centre-bounce', 'FF');
    expect(rawZ(ff)).toBeGreaterThan(32.5);
  });

  it('FB is inside own 50m arc (z < -32.5)', () => {
    const fb = getTeam1Pos('centre-bounce', 'FB');
    expect(rawZ(fb)).toBeLessThan(-32.5);
  });
});

describe('KICK_IN_PRESSING formation', () => {
  it('is included in PRE_BUILT_FORMATIONS', () => {
    expect(PRE_BUILT_FORMATIONS.find((f) => f.id === 'kick-in-pressing')).toBeTruthy();
  });

  it('FF (Line 1) is 20m from opposition goal (z ≈ 62.5)', () => {
    const ff = getTeam1Pos('kick-in-pressing', 'FF');
    expect(rawZ(ff)).toBeCloseTo(62.5, 0);
  });

  it('CHF (Line 2) is 35m from opposition goal (z ≈ 47.5)', () => {
    const chf = getTeam1Pos('kick-in-pressing', 'CHF');
    expect(rawZ(chf)).toBeCloseTo(47.5, 0);
  });

  it('C (Line 3) is 52m from opposition goal (z ≈ 30.5)', () => {
    const c = getTeam1Pos('kick-in-pressing', 'C');
    expect(rawZ(c)).toBeCloseTo(30.5, 0);
  });
});

describe('KICK_IN_KICKING formation', () => {
  it('is included in PRE_BUILT_FORMATIONS', () => {
    expect(PRE_BUILT_FORMATIONS.find((f) => f.id === 'kick-in-kicking')).toBeTruthy();
  });

  it('FB (kicker) is near own goal (z < -70)', () => {
    const fb = getTeam1Pos('kick-in-kicking', 'FB');
    expect(rawZ(fb)).toBeLessThan(-70);
  });

  it('FF (receiver) is in forward half (z > 32.5)', () => {
    const ff = getTeam1Pos('kick-in-kicking', 'FF');
    expect(rawZ(ff)).toBeGreaterThan(32.5);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```
npx vitest run src/data/__tests__/formations.test.ts
```
Expected: FAIL — CENTRE_BOUNCE clock positions wrong; kick-in formations don't exist yet.

- [ ] **Step 3: Fix CENTRE_BOUNCE_TEAM1_POSITIONS in formations.ts**

Find `CENTRE_BOUNCE_TEAM1_POSITIONS` (around line 348) and replace the midfield section:

```ts
// Replace midfield (Centre square players) section with clock-face:
{ x:  0,   z:  0,    role: 'R',   rotation: 0 },            // Ruck: centre
{ x:  0,   z:  5,    role: 'C',   rotation: 0 },            // Centre: 6 o'clock (toward attacking goal)
{ x:  5,   z:  0,    role: 'RR',  rotation: -Math.PI / 2 }, // Ruck-Rover: 3 o'clock
{ x: -5,   z:  0,    role: 'RO',  rotation:  Math.PI / 2 }, // Rover: 9 o'clock
// Wings on centre square boundary (x = ±25)
{ x: -25,  z:  0,    role: 'W',   rotation:  Math.PI / 2 }, // Wing Left
{ x:  25,  z:  0,    role: 'W',   rotation: -Math.PI / 2 }, // Wing Right
```

Keep the defence and forward sections (they're already correctly inside the 50m arcs). Only change the midfield block as above.

- [ ] **Step 4: Add KICK_IN_PRESSING formation**

After the existing `CENTRE_BOUNCE` const, add:

```ts
const KICK_IN_PRESSING_TEAM1_POSITIONS = [
  // Line 1: 20m from Team 2's goal (z = +82.5 - 20 = +62.5)
  // Team 1 presses toward Team 2's defending goal (positive z for Team 1)
  { x: -12, z:  62.5, role: 'FP',  rotation: Math.PI },
  { x:   0, z:  62.5, role: 'FF',  rotation: Math.PI },
  { x:  12, z:  62.5, role: 'FP',  rotation: Math.PI },
  // Line 2: 35m from Team 2's goal (z = +47.5)
  { x: -22, z:  47.5, role: 'HFF', rotation: Math.PI },
  { x:  -7, z:  47.5, role: 'CHF', rotation: Math.PI },
  { x:   7, z:  47.5, role: 'R',   rotation: Math.PI }, // Ruck (pressing)
  { x:  22, z:  47.5, role: 'HFF', rotation: Math.PI },
  // Line 3: 52m from Team 2's goal (z = +30.5)
  { x: -30, z:  30.5, role: 'W',   rotation: Math.PI / 2 },
  { x: -15, z:  30.5, role: 'RR',  rotation: Math.PI },
  { x:   0, z:  30.5, role: 'C',   rotation: Math.PI },
  { x:  15, z:  30.5, role: 'RO',  rotation: Math.PI },
  { x:  30, z:  30.5, role: 'W',   rotation: -Math.PI / 2 },
  // Back 3+3: hold near Team 1's centre-square in defensive half
  { x: -28, z:   8,   role: 'HBF', rotation: 0 },
  { x:   0, z:   8,   role: 'CHB', rotation: 0 },
  { x:  28, z:   8,   role: 'HBF', rotation: 0 },
  { x: -18, z:  20,   role: 'BP',  rotation: 0 },
  { x:   0, z:  22,   role: 'FB',  rotation: 0 },
  { x:  18, z:  20,   role: 'BP',  rotation: 0 },
  // Interchange
  { x: -60, z: -75,   role: 'INT', rotation: 0 },
  { x: -50, z: -75.25,role: 'INT', rotation: 0 },
  { x: -40, z: -75.5, role: 'INT', rotation: 0 },
  { x: -30, z: -75.75,role: 'INT', rotation: 0 },
];

const KICK_IN_PRESSING: Formation = {
  id: 'kick-in-pressing',
  name: 'Kick-in (Pressing)',
  description: 'Team 1 presses Team 2\'s kick-in in 3 lines at 20m, 35m, 52m from goal with a 3+3 defensive hold.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', KICK_IN_PRESSING_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(KICK_IN_PRESSING_TEAM1_POSITIONS)),
  ],
};
```

- [ ] **Step 5: Add KICK_IN_KICKING formation**

```ts
const KICK_IN_KICKING_TEAM1_POSITIONS = [
  // Kicker: FB in goal square (~5m from goal line)
  { x:   0, z: -78,    role: 'FB',  rotation: 0 },
  // BPs: ±45° angle, 20m from own goal (z = -82.5 + 20 = -62.5, x = ±14)
  { x: -14, z: -68,    role: 'BP',  rotation: 0 },
  { x:  14, z: -68,    role: 'BP',  rotation: 0 },
  // Cluster 40m from own goal (z = -82.5 + 40 = -42.5)
  { x: -20, z: -42.5,  role: 'W',   rotation: Math.PI / 2 },
  { x:  -7, z: -42.5,  role: 'C',   rotation: 0 },
  { x:   7, z: -42.5,  role: 'RR',  rotation: 0 },
  { x:  20, z: -42.5,  role: 'W',   rotation: -Math.PI / 2 },
  // Cluster 55m from own goal (z = -82.5 + 55 = -27.5)
  { x: -25, z: -27.5,  role: 'HBF', rotation: 0 },
  { x:  -8, z: -27.5,  role: 'CHB', rotation: 0 },
  { x:   8, z: -27.5,  role: 'R',   rotation: 0 }, // Ruck
  { x:  25, z: -27.5,  role: 'HBF', rotation: 0 },
  // Forward 2-1-2-1 diamond (receiving in Team 1's forward half)
  { x: -25, z:  18,    role: 'HFF', rotation: Math.PI },
  { x:  25, z:  18,    role: 'HFF', rotation: Math.PI },
  { x:   0, z:  30,    role: 'CHF', rotation: Math.PI },
  { x: -20, z:  50,    role: 'FP',  rotation: Math.PI },
  { x:  20, z:  50,    role: 'FP',  rotation: Math.PI },
  { x:   0, z:  60,    role: 'FF',  rotation: Math.PI },
  // Rover near mid-field
  { x:   0, z: -15,    role: 'RO',  rotation: 0 },
  // Interchange
  { x: -60, z: -75,    role: 'INT', rotation: 0 },
  { x: -50, z: -75.25, role: 'INT', rotation: 0 },
  { x: -40, z: -75.5,  role: 'INT', rotation: 0 },
  { x: -30, z: -75.75, role: 'INT', rotation: 0 },
];

const KICK_IN_KICKING: Formation = {
  id: 'kick-in-kicking',
  name: 'Kick-in (Kicking)',
  description: 'Team 1 takes the kick-in: FB kicker in goal square, BPs at ±45°, midfield clusters at 40m & 55m, forward 2-1-2-1 diamond.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', KICK_IN_KICKING_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(KICK_IN_KICKING_TEAM1_POSITIONS)),
  ],
};
```

- [ ] **Step 6: Add new formations to PRE_BUILT_FORMATIONS array**

```ts
export const PRE_BUILT_FORMATIONS: Formation[] = [
  STANDARD_SETUP,
  ZONE_DEFENSE,
  PRESS,
  SPREAD,
  FLOOD,
  MAN_ON_MAN,
  CENTRE_BOUNCE,
  KICK_IN_PRESSING,   // ADD
  KICK_IN_KICKING,    // ADD
];
```

- [ ] **Step 7: Run tests to verify pass**

```
npx vitest run src/data/__tests__/formations.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/data/formations.ts src/data/__tests__/formations.test.ts
git commit -m "feat: fix centre-bounce clock-face midfield positions and add kick-in preset formations"
```

---

## Task 7: App Routing

**Files:**
- Modify: `src/App.tsx`

Add routes before implementing the components that use them, so TypeScript errors guide which components need to exist.

- [ ] **Step 1: Read `src/App.tsx` in full**

- [ ] **Step 2: Add new routes**

Import and add:
```tsx
import { ScenarioLibrary } from './components/UI/ScenarioLibrary';
import { RosterLibrary } from './components/UI/RosterLibrary';

// Replace the existing '/' route with:
<Route path="/" element={<ProtectedRoute><ScenarioLibrary /></ProtectedRoute>} />
// Add:
<Route path="/scenario/:id" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
<Route path="/rosters" element={<ProtectedRoute><RosterLibrary /></ProtectedRoute>} />
```

Keep `/login` and `/shared/:token` unchanged.

Create empty placeholder files immediately so the build doesn't break:

```tsx
// src/components/UI/ScenarioLibrary.tsx  (placeholder — completed in Task 10)
export function ScenarioLibrary() { return <div>Loading…</div>; }
```

```tsx
// src/components/UI/RosterLibrary.tsx  (placeholder — completed in Task 11)
export function RosterLibrary() { return <div>Loading…</div>; }
```

```tsx
// src/components/UI/HelpScreen.tsx  (placeholder — completed in Task 12)
export function HelpScreen({ onClose }: { onClose: () => void }) { return null; }
```

```tsx
// src/components/UI/OnboardingTour.tsx  (placeholder — completed in Task 12)
export function OnboardingTour() { return null; }
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx \
        src/components/UI/ScenarioLibrary.tsx \
        src/components/UI/RosterLibrary.tsx \
        src/components/UI/HelpScreen.tsx \
        src/components/UI/OnboardingTour.tsx
git commit -m "feat: add /scenario/:id and /rosters routes with placeholder screens"
```

---

## Task 8: Camera Dock + Label Toggle + Formation Preset Bar

**Files:**
- Create: `src/components/UI/CameraDock.tsx`
- Create: `src/components/UI/LabelToggle.tsx`
- Create: `src/components/UI/FormationPresetBar.tsx`

- [ ] **Step 1: Create CameraDock.tsx**

```tsx
// src/components/UI/CameraDock.tsx
import { useCameraStore } from '../../store/cameraStore';
import { usePlayerStore } from '../../store/playerStore';

export function CameraDock() {
  const { activePovSlot, povPlayer1Id, povPlayer2Id, switchToBroadcast, setActivePovSlot } =
    useCameraStore();
  const players = usePlayerStore((s) => s.players);

  const label = (id: string | null) => {
    if (!id) return '—';
    const p = players.find((pl) => pl.id === id);
    return p?.number ? `#${p.number}` : '•';
  };

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
    ${active ? 'bg-amber-500 text-black' : 'bg-black/60 text-white/80 hover:bg-black/80'}`;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex gap-2 z-30"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button onClick={switchToBroadcast} className={btnClass(activePovSlot === null)}>
        TV
      </button>
      <button
        onClick={() => setActivePovSlot(1)}
        title={!povPlayer1Id ? 'Click a player to assign POV 1' : undefined}
        className={btnClass(activePovSlot === 1)}
      >
        POV1 {label(povPlayer1Id)}
      </button>
      <button
        onClick={() => setActivePovSlot(2)}
        title={!povPlayer2Id ? 'Click a player to assign POV 2' : undefined}
        className={btnClass(activePovSlot === 2)}
      >
        POV2 {label(povPlayer2Id)}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create LabelToggle.tsx**

```tsx
// src/components/UI/LabelToggle.tsx
import { usePlayerStore } from '../../store/playerStore';

const LABELS = { number: '#', name: 'Name', position: 'Pos' } as const;

export function LabelToggle() {
  const { labelMode, cycleLabelMode } = usePlayerStore();
  return (
    <button
      onClick={cycleLabelMode}
      title={`Player labels: ${labelMode}`}
      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-black/60
                 text-white/80 hover:bg-black/80 transition-colors min-w-[52px]"
    >
      {LABELS[labelMode]}
    </button>
  );
}
```

- [ ] **Step 3: Update player label rendering**

Read `src/components/Scene/Player.tsx`. Find the label render logic that reads `showPlayerNames` / `showPositionNames`. Replace with:

```ts
const labelMode = usePlayerStore((s) => s.labelMode);
// label text:
const labelText =
  labelMode === 'name'     ? (player.playerName ?? String(player.number ?? '')) :
  labelMode === 'position' ? (player.positionName ?? '') :
  String(player.number ?? '');
```

- [ ] **Step 4: Create FormationPresetBar.tsx**

```tsx
// src/components/UI/FormationPresetBar.tsx
import { usePlayerStore } from '../../store/playerStore';
import { getFormationById, getTeamPositions } from '../../data/formations';

const PRESETS = [
  { id: 'centre-bounce',    label: 'Centre Bounce' },
  { id: 'kick-in-pressing', label: 'Kick-in Press' },
  { id: 'kick-in-kicking',  label: 'Kick-in Kick' },
];

export function FormationPresetBar() {
  const applyFormation = usePlayerStore((s) => s.applyFormation);

  const handlePreset = (formationId: string) => {
    const formation = getFormationById(formationId);
    if (!formation) return;
    applyFormation(formation);
  };

  return (
    <div className="flex gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => handlePreset(p.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/60
                     text-white/70 hover:bg-black/80 transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Add `applyFormation` to playerStore if not present**

Read `src/store/playerStore.ts`. If `applyFormation(formation: Formation)` doesn't exist, add it:

```ts
import type { Formation } from '../types/Formation';

// In state interface:
applyFormation: (formation: Formation) => void;

// In store:
applyFormation: (formation) => {
  const { players } = get();
  const updatedPlayers = players.map((player) => {
    const match = formation.positions.find(
      (pos) => pos.teamId === player.teamId && pos.playerNumber === player.number
    );
    if (!match) return player;
    return { ...player, position: match.position, rotation: match.rotation ?? player.rotation };
  });
  set({ players: updatedPlayers });
},
```

- [ ] **Step 6: Add Reset Formation button**

In `FormationPresetBar.tsx`, add a Reset button that re-applies the current formation (if tracked) or prompts the user to pick one. For simplicity, track the last-applied preset ID in uiStore:

In `uiStore.ts`, add:
```ts
  activeFormationId: string | null;
  setActiveFormationId: (id: string | null) => void;
```

In `FormationPresetBar.tsx`, update `handlePreset` to save `activeFormationId`, and add:
```tsx
{activeFormationId && (
  <button
    onClick={() => handlePreset(activeFormationId)}
    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/60
               text-amber-300 hover:bg-amber-900/80 transition-colors"
  >
    Reset ↺
  </button>
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/UI/CameraDock.tsx src/components/UI/LabelToggle.tsx \
        src/components/UI/FormationPresetBar.tsx src/components/Scene/Player.tsx \
        src/store/playerStore.ts src/store/uiStore.ts
git commit -m "feat: add CameraDock, LabelToggle, FormationPresetBar with Reset Formation"
```

---

## Task 9: Board / Video Tab UI in MainLayout

**Files:**
- Modify: `src/components/Layout/MainLayout.tsx`

- [ ] **Step 1: Read `src/components/Layout/MainLayout.tsx` in full**

- [ ] **Step 2: Add tab bar and board controls**

Import new components and stores at the top:
```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { CameraDock } from '../UI/CameraDock';
import { LabelToggle } from '../UI/LabelToggle';
import { FormationPresetBar } from '../UI/FormationPresetBar';
import { HelpScreen } from '../UI/HelpScreen';
import { OnboardingTour } from '../UI/OnboardingTour';
```

Add inside `MainLayout()`:
```ts
const { id } = useParams<{ id: string }>();
const navigate = useNavigate();
const editorTab = useUIStore((s) => s.editorTab);
const setEditorTab = useUIStore((s) => s.setEditorTab);
const boardSubMode = useUIStore((s) => s.boardSubMode);
const toggleBoardSubMode = useUIStore((s) => s.toggleBoardSubMode);
const { setActiveScenario } = useScenarioStore();
```

Load scenario on mount:
```ts
useEffect(() => {
  if (id) setActiveScenario(Number(id));
  return () => setActiveScenario(null);
}, [id, setActiveScenario]);
```

- [ ] **Step 3: Add top bar JSX**

In the main return JSX, add a top bar above the canvas container:
```tsx
{/* Top bar */}
<div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 pt-safe-top pt-3
                bg-gradient-to-b from-black/60 to-transparent pb-6 pointer-events-none">
  <div className="flex items-center gap-2 pointer-events-auto">
    <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
      ← Scenarios
    </button>
    {/* Tab switcher */}
    <div className="flex rounded-lg overflow-hidden border border-white/20 ml-2">
      <button
        onClick={() => setEditorTab('board')}
        className={`px-4 py-1.5 text-sm font-medium transition-colors
          ${editorTab === 'board'
            ? 'bg-amber-500 text-black'
            : 'bg-black/40 text-white/70 hover:bg-black/60'}`}
      >
        Board
      </button>
      <button
        onClick={() => setEditorTab('video')}
        className={`px-4 py-1.5 text-sm font-medium transition-colors
          ${editorTab === 'video'
            ? 'bg-amber-500 text-black'
            : 'bg-black/40 text-white/70 hover:bg-black/60'}`}
      >
        Video
      </button>
    </div>
  </div>

  {/* Board controls (right side) */}
  {editorTab === 'board' && (
    <div className="ml-auto flex items-center gap-2 pointer-events-auto">
      <FormationPresetBar />
      <button
        onClick={toggleBoardSubMode}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${boardSubMode === 'draw'
            ? 'bg-green-600 text-white'
            : 'bg-black/60 text-white/70 hover:bg-black/80'}`}
      >
        {boardSubMode === 'setup' ? 'Setup' : '● Draw'}
      </button>
      <LabelToggle />
    </div>
  )}
</div>
```

- [ ] **Step 4: Conditionally render Board vs Video**

Wrap the existing canvas section in `{editorTab === 'board' && (...)}`.

Add after it:
```tsx
{editorTab === 'video' && (
  <div className="absolute inset-0 z-10">
    <VideoWorkspace showFieldOverlay={true} />
    <button
      onClick={() => setEditorTab('board')}
      className="absolute top-4 right-4 z-50 px-4 py-2 rounded-lg
                 bg-amber-500 text-black font-semibold hover:bg-amber-400 text-sm"
    >
      Take to Board →
    </button>
  </div>
)}
```

- [ ] **Step 5: Add CameraDock, HelpScreen, OnboardingTour**

In the DOM-layer section (outside Canvas):
```tsx
{editorTab === 'board' && <CameraDock />}
<OnboardingTour />
{helpOpen && <HelpScreen onClose={() => setHelpOpen(false)} />}
```

Remove the existing `<HelpOverlay />` line (replaced by HelpScreen).

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout/MainLayout.tsx
git commit -m "feat: add Board/Video tab bar, Setup/Draw toggle, CameraDock, and OnboardingTour to MainLayout"
```

---

## Task 10: Scenario Library Home Screen

**Files:**
- Modify: `src/components/UI/ScenarioLibrary.tsx` (replace placeholder)

- [ ] **Step 1: Replace placeholder with full implementation**

```tsx
// src/components/UI/ScenarioLibrary.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenarioStore } from '../../store/scenarioStore';
import { useRosterStore } from '../../store/rosterStore';

export function ScenarioLibrary() {
  const { scenarios, loadScenarios, createScenario, deleteScenario } = useScenarioStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadScenarios();
    loadRosters();
  }, [loadScenarios, loadRosters]);

  const handleNew = async () => {
    const id = await createScenario('New Scenario');
    navigate(`/scenario/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Coaching Board</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/rosters')}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
            >
              Team Rosters {rosters.length > 0 && `(${rosters.length})`}
            </button>
            <button
              onClick={handleNew}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold
                         hover:bg-amber-400 text-sm"
            >
              + New Scenario
            </button>
          </div>
        </div>

        {scenarios.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No scenarios yet</p>
            <p className="text-sm mb-6 text-gray-600">
              Create a scenario to place players and recreate match situations
            </p>
            <button
              onClick={handleNew}
              className="px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400"
            >
              Create your first scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/scenario/${s.id}`)}
                className="bg-gray-900 rounded-xl p-4 cursor-pointer hover:bg-gray-800
                           transition-colors border border-gray-800 hover:border-amber-500/30"
              >
                <h3 className="font-semibold mb-1 truncate">{s.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    {s.phases.length} phase{s.phases.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${s.name}"?`)) deleteScenario(s.id!);
                    }}
                    className="text-xs text-red-500/50 hover:text-red-400 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UI/ScenarioLibrary.tsx
git commit -m "feat: implement Scenario Library home screen"
```

---

## Task 11: Team Roster Library + PlayHQ Import

**Files:**
- Modify: `src/components/UI/RosterLibrary.tsx` (replace placeholder)
- Create: `src/components/UI/PlayHQImportDialog.tsx`

- [ ] **Step 1: Create PlayHQImportDialog.tsx**

```tsx
// src/components/UI/PlayHQImportDialog.tsx
import { useState } from 'react';
import { parsePlayHQText, fetchPlayHQRoster } from '../../store/rosterStore';
import type { RosterPlayer } from '../../models/RosterModel';

interface Props {
  onImport: (teamName: string, players: RosterPlayer[]) => void;
  onClose: () => void;
}

export function PlayHQImportDialog({ onImport, onClose }: Props) {
  const [teamName, setTeamName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RosterPlayer[] | null>(null);

  const handleParse = () => {
    if (!pasteText.trim()) return;
    setPreview(parsePlayHQText(pasteText));
    setFetchError(null);
  };

  const handleFetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    const text = await fetchPlayHQRoster(url);
    setIsFetching(false);
    if (!text) {
      setFetchError('Could not fetch roster. Check the URL or paste the data manually.');
      return;
    }
    setPreview(parsePlayHQText(text));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">Import PlayHQ Roster</h2>

        <label className="block text-sm text-gray-400 mb-1">Team Name *</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Gungahlin Jets U18"
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm mb-4 outline-none
                     focus:ring-2 focus:ring-amber-500"
        />

        <label className="block text-sm text-gray-400 mb-1">Paste PlayHQ data</label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"#\tPlayers\tPP\tG\n23\tSmith J (c)\t3\t2"}
          rows={4}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono mb-2
                     outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleParse}
          className="w-full mb-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
        >
          Parse Pasted Data
        </button>

        <label className="block text-sm text-gray-400 mb-1">Or fetch from PlayHQ URL</label>
        <div className="flex gap-2 mb-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.playhq.com/..."
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none
                       focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleFetch}
            disabled={isFetching || !url.trim()}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm
                       disabled:opacity-50"
          >
            {isFetching ? '…' : 'Fetch'}
          </button>
        </div>
        {fetchError && <p className="text-red-400 text-sm mb-3">{fetchError}</p>}

        {preview && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2">{preview.length} players found:</p>
            {preview.map((p) => (
              <div key={p.id} className="text-sm flex gap-2 py-0.5">
                <span className="text-gray-500 w-6 text-right shrink-0">{p.number}</span>
                <span>{p.name}</span>
                {p.isCaptain && <span className="text-amber-400 text-xs">(c)</span>}
                {p.isViceCaptain && <span className="text-amber-400/70 text-xs">(vc)</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (preview && teamName.trim()) { onImport(teamName.trim(), preview); onClose(); } }}
            disabled={!preview || !teamName.trim()}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm disabled:opacity-50"
          >
            Import Roster
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace RosterLibrary.tsx placeholder**

```tsx
// src/components/UI/RosterLibrary.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRosterStore } from '../../store/rosterStore';
import { PlayHQImportDialog } from './PlayHQImportDialog';
import type { RosterPlayer } from '../../models/RosterModel';

export function RosterLibrary() {
  const { rosters, loadRosters, createRoster, deleteRoster } = useRosterStore();
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadRosters(); }, [loadRosters]);

  const handleImport = async (teamName: string, players: RosterPlayer[]) => {
    await createRoster(teamName, players);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Team Rosters</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm"
          >
            + Import Roster
          </button>
        </div>

        {rosters.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-2">No rosters yet.</p>
            <p className="text-sm">Import a squad from PlayHQ — paste the table or use a URL.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rosters.map((r) => (
              <div
                key={r.id}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{r.teamName}</h3>
                    <p className="text-sm text-gray-500">
                      {r.players.length} players
                      {r.players.find((p) => p.isCaptain) &&
                        ` · c: ${r.players.find((p) => p.isCaptain)!.name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete "${r.teamName}"?`)) deleteRoster(r.id!); }}
                    className="text-sm text-red-500/50 hover:text-red-400 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showImport && (
        <PlayHQImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UI/RosterLibrary.tsx src/components/UI/PlayHQImportDialog.tsx
git commit -m "feat: implement Roster Library and PlayHQ import dialog"
```

---

## Task 12: Onboarding Tour + Help Screen

**Files:**
- Create: `src/components/UI/OnboardingTour.tsx`
- Create: `src/components/UI/HelpScreen.tsx`

- [ ] **Step 1: Create OnboardingTour.tsx**

```tsx
// src/components/UI/OnboardingTour.tsx
import { useState, useEffect } from 'react';

const STEPS = [
  {
    title: 'Welcome to your Coaching Board',
    body: 'Create scenarios to position players and recreate match situations. Switch between board and video in the same session.',
  },
  {
    title: 'Setup vs Draw mode',
    body: 'In Setup mode, drag players freely to position them — no trails. Switch to Draw mode to record movement trails for animation playback.',
  },
  {
    title: 'Three camera views',
    body: 'TV shows the broadcast overhead view. POV 1 & 2 show the game from a specific player\'s perspective. Click a player first to assign them to a POV slot.',
  },
  {
    title: 'Import your squad',
    body: 'Go to Team Rosters to import from PlayHQ — paste the squad table or enter the page URL. Player names then show on the board.',
  },
  {
    title: 'Video & board in concert',
    body: 'Import a match video in the Video tab. Recreate the scenario on the Board. Use Concert Mode in the video toolbar to sync animation playback with the video.',
  },
];

const DONE_KEY = 'afl-onboarding-v1-done';

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(DONE_KEY)) setVisible(true);
  }, []);

  const finish = () => { localStorage.setItem(DONE_KEY, '1'); setVisible(false); };

  if (!visible) return null;

  const cur = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4 pb-10">
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="text-gray-500 hover:text-gray-300 text-sm">
            Skip
          </button>
        </div>
        <h3 className="text-base font-bold mb-2">{cur.title}</h3>
        <p className="text-sm text-gray-400 mb-6">{cur.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-amber-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => { if (step < STEPS.length - 1) setStep((s) => s + 1); else finish(); }}
            className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm"
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create HelpScreen.tsx**

```tsx
// src/components/UI/HelpScreen.tsx
interface Props { onClose: () => void; }

const SECTIONS = [
  {
    heading: 'Getting Started',
    items: [
      { key: 'New Scenario', desc: 'Create a scenario from the home screen. Each scenario stores player positions and movement phases.' },
      { key: 'Team Rosters', desc: 'Import squads from PlayHQ before opening a scenario so players show their names on the board.' },
    ],
  },
  {
    heading: 'The Board',
    items: [
      { key: 'Setup mode', desc: 'Drag players to position them freely. No trails are created.' },
      { key: 'Draw mode', desc: 'Drag players to record movement trails. Press Play to animate.' },
      { key: 'Formations', desc: 'Use Centre Bounce, Kick-in Press, or Kick-in Kick buttons to instantly position all players.' },
      { key: 'Reset ↺', desc: 'Reapplies the last selected formation preset.' },
    ],
  },
  {
    heading: 'Camera Views',
    items: [
      { key: 'TV', desc: 'Default broadcast overhead view. Drag to orbit, pinch/scroll to zoom.' },
      { key: 'POV 1 / POV 2', desc: 'First-person view from a player. Click a player first to assign them to POV 1 or POV 2 slots.' },
    ],
  },
  {
    heading: 'Player Labels',
    items: [
      { key: '# (Number)', desc: 'Shows jersey number on each player.' },
      { key: 'Name', desc: 'Shows surname — requires a roster imported for that team.' },
      { key: 'Pos', desc: 'Shows position code (FB, CHF, etc.) where assigned.' },
    ],
  },
  {
    heading: 'Video & The Board',
    items: [
      { key: 'Video tab', desc: 'Import a match video to review. Use Concert Mode to sync animation playback with the video.' },
      { key: 'Take to Board →', desc: 'Switch from video to board to recreate the scenario you just reviewed.' },
    ],
  },
  {
    heading: 'Keyboard Shortcuts',
    items: [
      { key: 'Space', desc: 'Play / pause animation' },
      { key: 'F', desc: 'Fullscreen (video tab)' },
      { key: '?', desc: 'Toggle this help screen' },
    ],
  },
];

export function HelpScreen({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6
                   border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Help</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-6">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              {section.heading}
            </h3>
            <dl className="space-y-2">
              {section.items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <dt className="text-sm font-medium text-white min-w-[110px] shrink-0">
                    {item.key}
                  </dt>
                  <dd className="text-sm text-gray-400">{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <div className="border-t border-gray-800 pt-4 mt-2">
          <button
            onClick={() => { localStorage.removeItem('afl-onboarding-v1-done'); onClose(); }}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Reset onboarding tour
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UI/OnboardingTour.tsx src/components/UI/HelpScreen.tsx
git commit -m "feat: add OnboardingTour (5-step) and HelpScreen with Reset tour button"
```

---

## Task 13: Scenario Save/Restore

**Files:**
- Modify: `src/components/Layout/MainLayout.tsx`

Save player positions, paths, and annotations to the active scenario's phase 1 when leaving the editor. Restore them when entering.

- [ ] **Step 1: Add save-on-unmount**

In `MainLayout.tsx`, import the necessary stores and add:

```ts
import { scenarioTable } from '../../store/scenarioStore';

const { activeScenarioId, updateScenario } = useScenarioStore();
const players = usePlayerStore((s) => s.players);
const paths = usePathStore((s) => s.paths);
const annotations = useAnnotationStore((s) => s.annotations);
const camera = useCameraStore((s) => ({
  position: s.position as [number, number, number],
  target: s.target as [number, number, number],
  zoom: s.zoom,
}));
```

Save function (called on unmount):
```ts
const savePhase = useCallback(async () => {
  if (!activeScenarioId) return;
  await updateScenario(activeScenarioId, {
    phases: [{
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: players,
      paths,
      annotations,
      cameraState: camera,
    }],
  });
}, [activeScenarioId, players, paths, annotations, camera, updateScenario]);

useEffect(() => {
  return () => { savePhase(); };
}, [savePhase]);
```

- [ ] **Step 2: Add restore-on-mount**

In the existing scenario-load effect (added in Task 9), extend to restore phase state:

```ts
useEffect(() => {
  if (!id) return;
  const numId = Number(id);
  setActiveScenario(numId);
  scenarioTable.get(numId).then((scenario) => {
    if (!scenario) return;
    const phase = scenario.phases[0];
    if (!phase) return;
    if (phase.playerPositions?.length) {
      usePlayerStore.setState({ players: phase.playerPositions });
    }
    if (phase.paths?.length) {
      usePathStore.setState({ paths: phase.paths });
    }
    if (phase.annotations?.length) {
      useAnnotationStore.setState({ annotations: phase.annotations });
    }
    if (phase.cameraState) {
      useCameraStore.setState({
        position: phase.cameraState.position,
        target: phase.cameraState.target,
        zoom: phase.cameraState.zoom,
      });
    }
  });
}, [id]);
```

Read `src/store/pathStore.ts` to confirm the export name (`paths`) before using it.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout/MainLayout.tsx
git commit -m "feat: save and restore scenario phase on editor enter/leave"
```

---

## Task 14: Final Integration Smoke Test

- [ ] **Step 1: Start dev server**

```
npm run dev
```

- [ ] **Step 2: Manual smoke test checklist**

- [ ] Home screen loads at `/` — "No scenarios" state shown
- [ ] "New Scenario" creates a scenario and navigates to `/scenario/1`
- [ ] Board tab active by default; 3D field visible
- [ ] Top bar shows "← Scenarios | Board | Video" tab bar
- [ ] Setup/Draw toggle visible; dragging in Setup creates no trail
- [ ] Switch to Draw; drag a player — trail appears
- [ ] Formation buttons (Centre Bounce, Kick-in Press, Kick-in Kick) place players correctly
- [ ] Centre midfielders are in clock-face positions (C near centre facing attacking goal)
- [ ] Reset ↺ button reapplies last formation
- [ ] Camera dock switches TV → POV1 → TV
- [ ] Label toggle cycles # → Name → Pos → #
- [ ] Video tab switch shows VideoWorkspace
- [ ] "Take to Board →" switches back
- [ ] Team Rosters at `/rosters` loads
- [ ] PlayHQ paste import parses and saves a roster
- [ ] Onboarding tour shown on first visit; dismissed and not shown again
- [ ] Help screen opens; "Reset onboarding tour" re-triggers it
- [ ] Navigate back to home; scenario card shows with updated timestamp

- [ ] **Step 3: Run all tests individually**

```bash
npx vitest run src/models/__tests__/ScenarioModel.test.ts
npx vitest run src/models/__tests__/RosterModel.test.ts
npx vitest run src/store/__tests__/scenarioStore.test.ts
npx vitest run src/store/__tests__/rosterStore.test.ts
npx vitest run src/store/__tests__/playerStore.test.ts
npx vitest run src/store/__tests__/cameraStore.test.ts
npx vitest run src/store/__tests__/uiStore.test.ts
npx vitest run src/data/__tests__/formations.test.ts
```

Expected: All PASS.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete coaching board redesign — scenarios, rosters, dual-POV, formations, Board/Video tabs"
```

---

## Out of Scope (Phase 2)

These spec features are deferred to a follow-up implementation plan:

- **Video Reference Badge** — thumbnail + timecode badge on Board tab when video is linked
- **isOnField toggle** — per-player on/off field toggle in Roster editor
- **Re-sync Roster** — merge updated PlayHQ roster with an existing roster by UUID matching
- **Mode-switch confirmation dialog** — "Clear all paths?" prompt when switching Draw → Setup
- **Roster assignment at scenario creation** — Team 1 / Team 2 picker when creating a new scenario
- **Full contextual hint system** — dismissible first-time banners with localStorage per-hint state
