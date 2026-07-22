# Board HUD — Variant C thumb-pod skin (§6a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the board's scattered chrome with a thumb-reachable HUD — Setup fan (bottom-left), Camera fan (bottom-right), and a central Play FAB with a drag-to-scrub arc — wired to the real stores over the real R3F board.

**Architecture:** A new `src/components/Board/hud/` overlay mounted by `MainLayout` when `editorTab === 'board'`. Variant C has no single "active mode": pods open/close fans (mutually exclusive) and call existing store actions. No new `boardMode` enum. Three heavy modal flows (team/jersey selector, POV player assignment, roster import) are extracted verbatim from `Toolbar.tsx` into standalone components the pods reuse. The scrub arc is made functional by extracting `positionEntitiesAtProgress` from `usePathPlayback` into a `scrubTo` helper the FAB can call while paused.

**Tech Stack:** TypeScript, React, Zustand, @react-three/fiber (board), Vitest.

## Global Constraints

- **Branch:** `lean/live-coaching-first`. This is §6a of the §6 layout redesign (§6b = Variant B rail + responsive selection; §6c = global drawer + share home + `Toolbar.tsx` deletion + dup cleanup). Do NOT do §6b/§6c work here.
- **No new store/model/db changes to state shape** except the pure-refactor extraction in Task 2. Pods only *consume* existing store actions (names verified in the design spec's Interfaces block).
- **"POV" = the existing follow-cam relabeled.** No new first-person render.
- **Latent controls surfaced:** scrub arc + speed only. Do NOT add POV-distance, loop, or scoreboard UI.
- **HUD gating:** render only when `editorTab === 'board'` (matches today's `CameraDock`). Honour iPad safe-area: `bottom: calc(1rem + env(safe-area-inset-bottom, 0px))`.
- **Styling:** reuse the prototype's Variant C visual language (`src/prototypes/board-layout/VariantC.tsx` on branch `prototype/board-layout-4`) — dark glass pods, teal `#00d4aa`, amber `#f59e0b` active. Read it with `git show prototype/board-layout-4:src/prototypes/board-layout/VariantC.tsx`.
- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. Full Vitest suite OOMs on Windows — run only new/changed test files.
- **Git hygiene:** stage explicit paths only, never `git add -A` (untracked `.superpowers/` scratch + a stray `docs/superpowers/plans/2026-03-20-*.md` must not be swept in).
- **Runtime smoke is blocked by the Supabase `/login` gate in this env** — the per-task gate is tsc + build; runtime is verified separately with a signed-in session.

---

## Task 1: Arc-geometry util + test

Pure math for the scrub ring, extracted from the prototype so `PlayFab` and a Vitest test can share it.

**Files:**
- Create: `src/utils/arcGeometry.ts`
- Test: `src/utils/__tests__/arcGeometry.test.ts`

**Interfaces:**
- Produces: `polar(cx, cy, r, deg): {x, y}` and `arcPath(cx, cy, r, a0, a1): string` (SVG path string, degrees, sweep-flag 1).

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/arcGeometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { polar, arcPath } from '../arcGeometry';

describe('arcGeometry', () => {
  it('polar maps 0° to the +x axis', () => {
    const p = polar(60, 60, 46, 0);
    expect(p.x).toBeCloseTo(106);
    expect(p.y).toBeCloseTo(60);
  });

  it('polar maps 90° to +y (SVG y-down)', () => {
    const p = polar(60, 60, 46, 90);
    expect(p.x).toBeCloseTo(60);
    expect(p.y).toBeCloseTo(106);
  });

  it('arcPath sets the large-arc flag when the sweep exceeds 180°', () => {
    const big = arcPath(60, 60, 46, 135, 135 + 270); // 270° sweep
    expect(big).toMatch(/^M /);
    expect(big).toContain('A 46 46 0 1 1'); // large-arc=1, sweep=1
  });

  it('arcPath clears the large-arc flag for a small sweep', () => {
    const small = arcPath(60, 60, 46, 135, 135 + 90); // 90° sweep
    expect(small).toContain('A 46 46 0 0 1'); // large-arc=0
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/arcGeometry.test.ts 2>&1 | tail -6`
Expected: FAIL — cannot find module `../arcGeometry`.

- [ ] **Step 3: Create the util**

Create `src/utils/arcGeometry.ts`:

```ts
/** Point on a circle. Degrees, SVG convention (y grows downward). */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = deg * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** SVG arc path from angle a0 to a1 (degrees), drawn clockwise (sweep-flag 1). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx vitest run src/utils/__tests__/arcGeometry.test.ts 2>&1 | tail -6`
Expected: 4 passing.
Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.

- [ ] **Step 5: Commit**

```bash
git add src/utils/arcGeometry.ts src/utils/__tests__/arcGeometry.test.ts
git commit -m "feat: arcGeometry util (polar + arcPath) for scrub ring (§6a)"
```

---

## Task 2: `scrubTo` board-scrub helper (extract from usePathPlayback)

The scrub arc must reposition tokens even when paused. `positionEntitiesAtProgress` + `collectEntityPaths` are currently module-private in `usePathPlayback.ts` and only run inside the playing `useFrame`. Extract them into a store-reading util (no R3F import) and add `scrubTo`, then have `usePathPlayback` import them. Behaviour of playback is unchanged.

**Files:**
- Create: `src/utils/boardScrub.ts`
- Modify: `src/hooks/usePathPlayback.ts`

**Interfaces:**
- Produces: `collectEntityPaths(): EntityPath[]`, `positionEntitiesAtProgress(progress: number, entityPaths: EntityPath[]): void`, `scrubTo(progress: number): void` (positions entities for `progress` from the current paths, then `useAnimationStore.getState().setProgress(progress)`).
- Consumes (moved): the existing helpers verbatim from `usePathPlayback.ts:29-87`.

- [ ] **Step 1: Create the util with the moved helpers + scrubTo**

Create `src/utils/boardScrub.ts` by moving the `EntityPath` interface, `collectEntityPaths`, and `positionEntitiesAtProgress` **verbatim** from `usePathPlayback.ts:29-87` (they read `usePlayerStore`/`usePathStore`/`useBallStore` and call store setters — no `useFrame`/R3F needed), then add `scrubTo`:

```ts
import { useAnimationStore } from '../store/animationStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { getPositionAtProgressWithEasing, easeInOut, pathHasMovement } from './pathAnimation';
import { MovementPath } from '../models/PathModel';

export interface EntityPath {
  path: MovementPath;
  kind: 'player' | 'ball';
  id: string;
}

// ... paste collectEntityPaths (usePathPlayback.ts:36-57) and
//     positionEntitiesAtProgress (usePathPlayback.ts:64-87) verbatim here ...

/**
 * Scrub the board to an absolute progress (0..1): reposition every entity for
 * that progress from the current paths, then record it in animationStore. Safe
 * to call while paused (unlike the playing useFrame loop).
 */
export function scrubTo(progress: number): void {
  const clamped = Math.max(0, Math.min(1, progress));
  positionEntitiesAtProgress(clamped, collectEntityPaths());
  useAnimationStore.getState().setProgress(clamped);
}
```

Note: `pathAnimation` and `PathModel` import paths change from `../utils/` / `../models/` (in the hook) to `./` / `../models/` (in `src/utils/`). Verify the relative paths resolve.

- [ ] **Step 2: Repoint usePathPlayback at the util**

In `src/hooks/usePathPlayback.ts`: delete the local `EntityPath` interface, `collectEntityPaths`, and `positionEntitiesAtProgress` (lines 29-87) and the now-unused imports they needed (`getPositionAtProgressWithEasing`, `easeInOut`, `PlayerUpdate`, `MovementPath`; keep `pathHasMovement` only if still used — it is not after the move, so remove it too). Add:

```ts
import { collectEntityPaths, positionEntitiesAtProgress } from '../utils/boardScrub';
```

The `useFrame` body (lines 95-121) stays identical — it now calls the imported `collectEntityPaths`/`positionEntitiesAtProgress`.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines (watch for unused-import errors in `usePathPlayback.ts`).
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 4: Commit**

```bash
git add src/utils/boardScrub.ts src/hooks/usePathPlayback.ts
git commit -m "refactor: extract boardScrub (collect/position/scrubTo) from usePathPlayback (§6a)"
```

---

## Task 3: `PlayFab` — central Play button + scrub arc + speed

**Files:**
- Create: `src/components/Board/hud/PlayFab.tsx`

**Interfaces:**
- Consumes: `useAnimationStore` (`isPlaying`, `togglePlayback`, `hasAnimation`, `progress`, `speed`, `cycleSpeed`), `scrubTo` (Task 2), `arcPath`/`polar` (Task 1).
- Produces: `PlayFab` (self-positioned, `position: absolute` bottom-centre).

- [ ] **Step 1: Create PlayFab**

Create `src/components/Board/hud/PlayFab.tsx`:

```tsx
// src/components/Board/hud/PlayFab.tsx
import { useAnimationStore } from '../../../store/animationStore';
import { scrubTo } from '../../../utils/boardScrub';
import { arcPath, polar } from '../../../utils/arcGeometry';

const TEAL = '#00d4aa';
const R = 46, SWEEP = 270, START = 135; // matches the prototype ring

export function PlayFab() {
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const hasAnimation = useAnimationStore((s) => s.hasAnimation);
  const progress = useAnimationStore((s) => s.progress);
  const speed = useAnimationStore((s) => s.speed);
  const togglePlayback = useAnimationStore((s) => s.togglePlayback);
  const cycleSpeed = useAnimationStore((s) => s.cycleSpeed);

  const knob = polar(60, 60, R, START + progress * SWEEP);

  return (
    <div
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        width: 120, height: 120, zIndex: 30,
        opacity: hasAnimation ? 1 : 0.4, pointerEvents: hasAnimation ? 'auto' : 'none',
      }}
    >
      <svg width={120} height={120} style={{ position: 'absolute', inset: 0 }}>
        <path d={arcPath(60, 60, R, START, START + SWEEP)} fill="none" stroke="#ffffff30" strokeWidth={6} strokeLinecap="round" />
        <path d={arcPath(60, 60, R, START, START + progress * SWEEP)} fill="none" stroke={TEAL} strokeWidth={6} strokeLinecap="round" />
        <circle cx={knob.x} cy={knob.y} r={8} fill="#fff" stroke={TEAL} strokeWidth={3} />
      </svg>

      <button
        onClick={togglePlayback}
        disabled={!hasAnimation}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{
          position: 'absolute', left: 30, top: 30, width: 60, height: 60, borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${TEAL}, #0099ff)`, color: '#000', fontSize: 26,
          cursor: hasAnimation ? 'pointer' : 'default', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      {/* Scrub — a range input mapped to progress; scrubTo repositions tokens live. */}
      <input
        type="range" min={0} max={1000} value={Math.round(progress * 1000)}
        onChange={(e) => scrubTo(Number(e.target.value) / 1000)}
        aria-label="Scrub animation"
        style={{ position: 'absolute', left: 6, bottom: -22, width: 108, accentColor: TEAL }}
      />

      <button
        onClick={cycleSpeed}
        aria-label="Playback speed"
        style={{
          position: 'absolute', right: -6, top: 6, padding: '2px 8px', borderRadius: 999,
          border: '1px solid #ffffff33', background: 'rgba(13,13,26,0.9)', color: '#fff',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {speed}×
      </button>
    </div>
  );
}
```

(The visible range input is the accessible/robust scrub control mapped over the arc, per the prototype's hidden-range approach. A pointer-drag-on-arc gesture is a §6b polish, not required here.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done` → no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Board/hud/PlayFab.tsx
git commit -m "feat: PlayFab — play/pause + scrub arc + speed (§6a)"
```

---

## Task 4: Extract the three heavy modals from Toolbar into standalone components

`SetupPod`/`CameraPod` reuse these. Extract them **verbatim** (markup + handlers) so behaviour is preserved; Task 8 deletes the originals from `Toolbar.tsx`. Each becomes a controlled component: `{ open, onClose }` props replacing the Toolbar's local `showX` state.

**Files:**
- Create: `src/components/Board/hud/TeamSelectModal.tsx`, `src/components/Board/hud/PovSelectModal.tsx`, `src/components/Board/hud/RosterImportModal.tsx`
- Read (source): `src/components/UI/Toolbar.tsx`

**Interfaces:**
- Produces: `TeamSelectModal({ open, onClose })`, `PovSelectModal({ open, onClose })`, `RosterImportModal({ open, onClose })`.
- Consumes: `playerStore.setTeamPreset` + `matchStore.setHomeTeamName/setAwayTeamName` (team), `cameraStore.setPovPlayer` + `activePovSlot`/players (POV), `playerStore.importRoster`/`autoAssignPositions` (roster).

- [ ] **Step 1: Extract TeamSelectModal**

Create `src/components/Board/hud/TeamSelectModal.tsx`. Move the team-selector modal JSX from `Toolbar.tsx:664-720` and its handlers (the `setTeamPreset` calls + `matchStore.setHomeTeamName`/`setAwayTeamName` seeding at 682-684, 700-702) verbatim into a component with signature `export function TeamSelectModal({ open, onClose }: { open: boolean; onClose: () => void })`. Replace the Toolbar's local `showTeamSelector` open-check with the `open` prop; replace close handlers with `onClose()`. Pull the store hooks it needs (`usePlayerStore` for `setTeamPreset`/`team1PresetId`/`team2PresetId`, `useMatchStore` for the name setters) at the top of the new component. Render `null` when `!open`.

- [ ] **Step 2: Extract PovSelectModal**

Create `src/components/Board/hud/PovSelectModal.tsx` the same way from `Toolbar.tsx:588-661` (the POV player selector). It uses `useCameraStore` (`setPovPlayer`, `activePovSlot`) and `usePlayerStore` players. Signature `{ open, onClose }`; render `null` when `!open`.

- [ ] **Step 3: Extract RosterImportModal**

Create `src/components/Board/hud/RosterImportModal.tsx` from `Toolbar.tsx:490-571` plus the import handlers at `215-226` (`importRoster`, `autoAssignPositions`). Signature `{ open, onClose }`; render `null` when `!open`.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done` → no error lines. (The three new components are not yet mounted anywhere — this step only proves they compile.)
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Board/hud/TeamSelectModal.tsx src/components/Board/hud/PovSelectModal.tsx src/components/Board/hud/RosterImportModal.tsx
git commit -m "refactor: extract Team/POV/Roster modals from Toolbar into hud/ (§6a)"
```

---

## Task 5: `SetupPod` + `AnnotatePalette` (bottom-left fan)

**Files:**
- Create: `src/components/Board/hud/SetupPod.tsx`, `src/components/Board/hud/AnnotatePalette.tsx`, `src/components/Board/hud/podStyles.ts`
- Read (source): `src/components/UI/AnnotationToolbar.tsx`

**Interfaces:**
- Consumes: `playerStore` (`applyFormation`, `cycleLabelMode`, `labelMode`, `resetPlayers`), `uiStore` (`activeFormationId`, `setActiveFormationId`, `boardSubMode`, `toggleBoardSubMode`), `getFormationById` (`data/formations`), `pathStore` (`clearPaths`, `paths`), `ballStore` (`assignBallToPlayer`), `TeamSelectModal`/`RosterImportModal` (Task 4), `AnnotatePalette`.
- Produces: `SetupPod({ open, onToggle })` (fan open state owned by parent `BoardHud` for mutual exclusion), `AnnotatePalette({ open, onClose })`.
- Props contract: `open: boolean` (is this pod's fan open), `onToggle: () => void`.

- [ ] **Step 1: Shared pod styles**

Create `src/components/Board/hud/podStyles.ts` (ported from `VariantC.tsx`):

```ts
import type { CSSProperties } from 'react';

export const TEAL = '#00d4aa';
export const glass: CSSProperties = { background: 'rgba(13,13,26,0.86)', border: '1px solid #ffffff22', backdropFilter: 'blur(6px)' };
export const fanPill: CSSProperties = { ...glass, padding: '9px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left' };

export function podButton(open: boolean): CSSProperties {
  return {
    width: 66, height: 66, borderRadius: 20, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    background: open ? '#f59e0b' : 'rgba(13,13,26,0.9)', color: open ? '#000' : '#fff',
    border: open ? 'none' : '1px solid #ffffff33', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  };
}
```

- [ ] **Step 2: AnnotatePalette**

Create `src/components/Board/hud/AnnotatePalette.tsx` reproducing the current `AnnotationToolbar` behaviour (read `src/components/UI/AnnotationToolbar.tsx` in full first). It must expose, backed by `useAnnotationStore`: tool select (line/arrow/circle/rectangle/text/measure) via `setSelectedTool(tool | null)` (a second tap on the active tool clears it); the 6 colour presets via `setSelectedColor`; thickness 1–10 via `setThickness`, hidden when the tool is `text` or `measure`; `clearAnnotations`. Preserve the text-placement flow (`pendingTextPoint` → `addAnnotation`, `AnnotationToolbar.tsx:57-67, 297-347`). Signature `{ open, onClose }`; render `null` when `!open`; style with `glass`/`fanPill` from `podStyles`. Keep it a compact panel anchored above the Setup pod.

- [ ] **Step 3: SetupPod**

Create `src/components/Board/hud/SetupPod.tsx`. Fan (column-reverse, bottom-left) shown when `open`; the pod button calls `onToggle`. Ported formation/label/reset logic is simple store calls:

```tsx
// src/components/Board/hud/SetupPod.tsx
import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useUIStore } from '../../../store/uiStore';
import { usePathStore } from '../../../store/pathStore';
import { getFormationById } from '../../../data/formations';
import { fanPill, podButton } from './podStyles';
import { AnnotatePalette } from './AnnotatePalette';
import { TeamSelectModal } from './TeamSelectModal';
import { RosterImportModal } from './RosterImportModal';

const FORMATIONS = [
  { id: 'centre-bounce', label: 'Centre Bounce' },
  { id: 'kick-in-pressing', label: 'Kick-in Press' },
  { id: 'kick-in-kicking', label: 'Kick-in Kick' },
];
const LABELS = { number: '#', name: 'Name', position: 'Pos' } as const;

export function SetupPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const applyFormation = usePlayerStore((s) => s.applyFormation);
  const resetPlayers = usePlayerStore((s) => s.resetPlayers);
  const labelMode = usePlayerStore((s) => s.labelMode);
  const cycleLabelMode = usePlayerStore((s) => s.cycleLabelMode);
  const setActiveFormationId = useUIStore((s) => s.setActiveFormationId);
  const boardSubMode = useUIStore((s) => s.boardSubMode);
  const toggleBoardSubMode = useUIStore((s) => s.toggleBoardSubMode);
  const clearPaths = usePathStore((s) => s.clearPaths);
  const paths = usePathStore((s) => s.paths);

  const [showTeams, setShowTeams] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showAnnotate, setShowAnnotate] = useState(false);

  const applyPreset = (id: string) => {
    const f = getFormationById(id);
    if (!f) return;
    applyFormation(f);
    setActiveFormationId(id);
  };

  return (
    <>
      <div style={{ position: 'absolute', left: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {FORMATIONS.map((f) => (
              <button key={f.id} style={fanPill} onClick={() => applyPreset(f.id)}>{f.label}</button>
            ))}
            <button style={fanPill} onClick={() => setShowTeams(true)}>🔵🔴 Teams / jerseys</button>
            <button style={fanPill} onClick={cycleLabelMode}>Labels: {LABELS[labelMode]}</button>
            <button style={fanPill} onClick={resetPlayers}>Reset players</button>
            <button style={{ ...fanPill, background: boardSubMode === 'draw' ? '#f59e0b' : undefined, color: boardSubMode === 'draw' ? '#000' : '#fff' }} onClick={toggleBoardSubMode}>
              ✏ Draw path{boardSubMode === 'draw' ? ' (on)' : ''}
            </button>
            <button style={fanPill} onClick={clearPaths} disabled={paths.length === 0}>Clear paths</button>
            <button style={fanPill} onClick={() => setShowAnnotate(true)}>↗ Annotate…</button>
            <button style={fanPill} onClick={() => setShowRoster(true)}>Import roster…</button>
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '👥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>SETUP</span>
        </button>
      </div>

      <TeamSelectModal open={showTeams} onClose={() => setShowTeams(false)} />
      <RosterImportModal open={showRoster} onClose={() => setShowRoster(false)} />
      <AnnotatePalette open={showAnnotate} onClose={() => setShowAnnotate(false)} />
    </>
  );
}
```

(Give/Release ball: add two `fanPill` buttons calling `useBallStore.getState().assignBallToPlayer(...)` following the current Toolbar handler at `Toolbar.tsx:120-148` — mirror its selected-player resolution. If that handler depends on a selected-player concept not readily available in the pod, surface Give/Release only when a player is selected; otherwise omit the ball buttons and note it as DONE_WITH_CONCERNS for the reviewer to confirm scope.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done` → no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Board/hud/SetupPod.tsx src/components/Board/hud/AnnotatePalette.tsx src/components/Board/hud/podStyles.ts
git commit -m "feat: SetupPod + AnnotatePalette (formations/teams/labels/reset/draw/annotate/roster) (§6a)"
```

---

## Task 6: `CameraPod` (bottom-right fan)

**Files:**
- Create: `src/components/Board/hud/CameraPod.tsx`

**Interfaces:**
- Consumes: `cameraStore` (`switchToBroadcast`, `setPresetView`, `resetCamera`, `setActivePovSlot`, `activePovSlot`, `povPlayer1Id`, `povPlayer2Id`), `playerStore.players` (for POV labels), `PovSelectModal` (Task 4).
- Produces: `CameraPod({ open, onToggle })`.

- [ ] **Step 1: CameraPod**

Create `src/components/Board/hud/CameraPod.tsx`. Right-anchored fan (mirror `flex-end`). Broadcast + preset angles + POV activate/exit are direct store calls (port the `label()` helper + POV activation from `CameraDock.tsx:5-42`); "Assign POV…" opens `PovSelectModal`:

```tsx
// src/components/Board/hud/CameraPod.tsx
import { useState } from 'react';
import { useCameraStore } from '../../../store/cameraStore';
import { usePlayerStore } from '../../../store/playerStore';
import { fanPill, podButton } from './podStyles';
import { PovSelectModal } from './PovSelectModal';

export function CameraPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { activePovSlot, povPlayer1Id, povPlayer2Id, switchToBroadcast, setPresetView, resetCamera, setActivePovSlot } = useCameraStore();
  const players = usePlayerStore((s) => s.players);
  const [showAssign, setShowAssign] = useState(false);

  const label = (id: string | null) => {
    if (!id) return 'unset';
    const p = players.find((pl) => pl.id === id);
    return p?.number ? `#${p.number}` : '•';
  };
  const rightFan: React.CSSProperties = { ...fanPill, textAlign: 'right' };

  return (
    <>
      <div style={{ position: 'absolute', right: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4, alignItems: 'flex-end' }}>
            <button style={rightFan} onClick={switchToBroadcast}>📺 Broadcast</button>
            <button style={rightFan} onClick={() => setPresetView('top')}>Top</button>
            <button style={rightFan} onClick={() => setPresetView('sideline')}>Sideline</button>
            <button style={rightFan} onClick={() => setPresetView('end-to-end')}>End-to-end</button>
            <button style={rightFan} onClick={resetCamera}>Reset camera</button>
            <button style={rightFan} onClick={() => setActivePovSlot(1)}>👁 POV {label(povPlayer1Id)}</button>
            <button style={rightFan} onClick={() => setActivePovSlot(2)}>👁 POV {label(povPlayer2Id)}</button>
            <button style={rightFan} onClick={() => setShowAssign(true)}>Assign POV…</button>
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '🎥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>{activePovSlot ? 'POV' : 'CAM'}</span>
        </button>
      </div>
      <PovSelectModal open={showAssign} onClose={() => setShowAssign(false)} />
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done` → no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Board/hud/CameraPod.tsx
git commit -m "feat: CameraPod — broadcast/presets/POV fan (§6a)"
```

---

## Task 7: `BoardHud` shell + `MainLayout` integration + delete retired surfaces

Compose the pods + FAB, mount in `MainLayout`, and remove the migrated top-bar cluster + the `CameraDock`/`AnnotationToolbar` mounts. Delete the four superseded files.

**Files:**
- Create: `src/components/Board/hud/BoardHud.tsx`
- Modify: `src/components/Layout/MainLayout.tsx`
- Delete: `src/components/UI/FormationPresetBar.tsx`, `src/components/UI/LabelToggle.tsx`, `src/components/UI/AnnotationToolbar.tsx`, `src/components/UI/CameraDock.tsx`

**Interfaces:**
- Consumes: `SetupPod`, `CameraPod`, `PlayFab`.
- Produces: `BoardHud` (owns the mutually-exclusive fan-open state).

- [ ] **Step 1: BoardHud shell**

Create `src/components/Board/hud/BoardHud.tsx`:

```tsx
// src/components/Board/hud/BoardHud.tsx
import { useState } from 'react';
import { SetupPod } from './SetupPod';
import { CameraPod } from './CameraPod';
import { PlayFab } from './PlayFab';

type Pod = 'setup' | 'camera' | null;

export function BoardHud() {
  const [pod, setPod] = useState<Pod>(null);
  return (
    <>
      <SetupPod open={pod === 'setup'} onToggle={() => setPod((p) => (p === 'setup' ? null : 'setup'))} />
      <PlayFab />
      <CameraPod open={pod === 'camera'} onToggle={() => setPod((p) => (p === 'camera' ? null : 'camera'))} />
    </>
  );
}
```

- [ ] **Step 2: Mount BoardHud in MainLayout, remove CameraDock + AnnotationToolbar mounts**

In `src/components/Layout/MainLayout.tsx`, the DOM-layer block (lines 538-541) currently reads:

```tsx
      {/* All DOM-layer UI stays outside */}
      <Toolbar />
      <AnnotationToolbar />
      {editorTab === 'board' && <CameraDock />}
```

Replace with:

```tsx
      {/* All DOM-layer UI stays outside */}
      <Toolbar />
      {editorTab === 'board' && <BoardHud />}
```

Remove the now-unused imports of `AnnotationToolbar` and `CameraDock`, and add `import { BoardHud } from '../Board/hud/BoardHud';`.

- [ ] **Step 3: Remove the migrated top-bar board-controls cluster**

In `src/components/Layout/MainLayout.tsx`, delete the board-controls cluster (lines ~323-337) — the `<div className="ml-auto …">` containing `<FormationPresetBar />`, the Setup/Draw `toggleBoardSubMode` button, and `<LabelToggle />`. Remove the imports of `FormationPresetBar` and `LabelToggle`, and drop the now-unused `boardSubMode`/`toggleBoardSubMode` selectors **only if** nothing else in `MainLayout` uses them (grep first; the linked-video chip and persistence effects do not). Leave the `editorTab` board/video tab switch and the `← Plays` button intact.

- [ ] **Step 4: Delete the four superseded files**

```bash
git rm src/components/UI/FormationPresetBar.tsx src/components/UI/LabelToggle.tsx src/components/UI/AnnotationToolbar.tsx src/components/UI/CameraDock.tsx
```

- [ ] **Step 5: Typecheck + build (catches any missed importer)**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines. If a deleted file still has an importer (e.g. `Toolbar.tsx` or `AnnotationInteractionHandler`), resolve it here — `AnnotationToolbar`'s interaction hook `useAnnotationInteraction` is separate (`AnnotationInteractionHandler` in `MainLayout.tsx:552`) and must remain; only the toolbar *component* is deleted.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Board/hud/BoardHud.tsx src/components/Layout/MainLayout.tsx
git commit -m "feat: mount BoardHud, retire top-bar cluster + CameraDock/AnnotationToolbar/FormationPresetBar/LabelToggle (§6a)"
```

---

## Task 8: Trim `Toolbar.tsx`/`MobileMenu` to globals

Remove the menu sections whose controls now live in the pods, and the three modals extracted in Task 4. Keep the global sections.

**Files:**
- Modify: `src/components/UI/Toolbar.tsx`

**Interfaces:**
- Produces: a `Toolbar` whose `MobileMenu` shows only Save Playbook, Video import/clear, Match setup + scoreboard, Sign out, Help/onboarding. No behaviour change to those.

- [ ] **Step 1: Remove migrated menu sections**

In `src/components/UI/Toolbar.tsx`, remove from the `mobileMenuSections` builder (lines ~235-398) the menu items now owned by the pods: Reset Players, Cycle Labels, Import Roster, Auto-Assign, Teams/Jerseys, Play/Pause, Stop & Reset, camera presets (Top/Sideline/End-to-End, Reset Camera), the Follow-Cam section, Clear Paths, and the ball Give/Release + Add/Remove Ball Path items. Keep: Save Playbook, Video (Import/Clear), Match (Setup + Show/Hide Scoreboard), User (Sign Out), and Help/onboarding triggers.

- [ ] **Step 2: Remove the three extracted modals + the selected-player position row**

Delete from `Toolbar.tsx` the team-selector modal (664-720), POV selector modal (588-661), and roster-import dialog (490-571) now that Task 4 owns them, plus their local `showTeamSelector`/`showPovSelector`/`showRosterImport` state and the trigger handlers that only those removed items used. Remove the selected-player position `<select>` row (411-429) — it is a Setup concern deferred out of the pods for §6a (note it in the report as deferred). Remove any store hooks/handlers left unused after these deletions (tsc will flag them).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines (this step is where unused-symbol errors surface — remove each flagged unused import/handler until clean).
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3` → `built in …`.

- [ ] **Step 4: Commit**

```bash
git add src/components/UI/Toolbar.tsx
git commit -m "refactor: trim Toolbar/MobileMenu to globals; drop migrated sections + modals (§6a)"
```

---

## Self-Review

**Spec coverage:**
- Setup fan (formations/teams/labels/reset/ball/draw-path+clear/annotate/roster) → Task 5 (+ Task 4 for team/roster modals). ✓
- Annotate palette in the Setup pod → Task 5 Step 2. ✓
- Camera fan (broadcast/presets/POV) → Task 6 (+ Task 4 POV modal). ✓
- Play FAB + scrub arc + speed → Task 3; scrub repositions when paused → Task 2 `scrubTo`. ✓
- Latent controls limited to scrub + speed (no POV-distance/loop/scoreboard) → Tasks 3/6 contain none. ✓
- POV = follow-cam relabeled (no new render) → Task 6 uses existing `setActivePovSlot`/`setPovPlayer`. ✓
- Retire FormationPresetBar/LabelToggle/AnnotationToolbar/CameraDock + top-bar cluster → Task 7. ✓
- Hamburger shrunk to globals; Toolbar kept (not deleted) → Task 8. ✓
- HUD gated to `editorTab === 'board'`, safe-area spacing → Task 7 Step 2 + pod styles. ✓
- Arc-geometry unit test → Task 1. ✓
- §6b/§6c explicitly out → Global Constraints; no rail/responsive/drawer/share tasks present. ✓

**Placeholder scan:** Novel/pure pieces (arc util, boardScrub, PlayFab, BoardHud shell, MainLayout edits) carry complete code. The three modal extractions (Task 4) and the AnnotatePalette (Task 5 Step 2) are *verbatim ports* with exact source `file:line` and the exact store calls to preserve — concrete, not vague. No "TBD/handle edge cases/add validation". ✓

**Type consistency:** Pod component contract `{ open, onToggle }` (SetupPod/CameraPod) and modal contract `{ open, onClose }` (Team/Pov/Roster/Annotate) are used identically in `BoardHud`, `SetupPod`, `CameraPod`, and the modal definitions. `scrubTo(progress: number)` / `collectEntityPaths` / `positionEntitiesAtProgress` match between Task 2's util, `usePathPlayback`, and `PlayFab`. Store method names (`applyFormation`, `cycleLabelMode`, `toggleBoardSubMode`, `clearPaths`, `switchToBroadcast`, `setPresetView`, `setActivePovSlot`, `setPovPlayer`, `togglePlayback`, `cycleSpeed`, `setProgress`, `hasAnimation`) match the design spec's verified Interfaces block. ✓

**Known execution risks (flag for implementers/reviewers):**
- Ball Give/Release depends on a selected-player concept (Task 5 Step 3 note) — implementer resolves or defers with a concern.
- `AnnotationToolbar`'s interaction hook (`useAnnotationInteraction`) is separate from the toolbar component and must survive the Task 7 deletion (Task 7 Step 5 note).
- The three ported modals reference `matchStore`/`cameraStore`/`playerStore` handlers that must move with them intact (Task 4).
