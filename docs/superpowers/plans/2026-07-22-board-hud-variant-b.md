# Board HUD — Variant B rail + responsive B/C selection (§6b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a fine-pointer wide screen, render a left vertical mode rail (Setup / Animate / Camera) with a contextual overlay panel instead of the C thumb pods — same IA, same stores, mouse chrome. Choose B or C automatically from pointer + width, with a persisted manual override. **Additive — no deletions.**

**Architecture:** `BoardHud` becomes a **skin switch**: it resolves `'B' | 'C'` from `resolveSkin(override, isDesktop, coarsePointer)` and renders either the new `RailHud` (B) or `ThumbPodHud` (the current C body, moved out of `BoardHud` unchanged). The per-concern control *logic* currently inlined in `SetupPod`/`CameraPod` is lifted into shared hooks (`useSetupControls`, `useCameraControls`) that return **action descriptors + the modal JSX**; both the C pod and the B panel render the descriptors with their own button chrome and render `{modals}` at top level. Transport is the deliberate exception: C keeps the radial `PlayFab`, B gets a linear `TransportBar`, both writing through the already-shared `boardScrub`/`animationStore`.

> **Why hooks-returning-descriptors, not a shared `<Controls>` component (refines the spec):** the C fan is a `position:absolute` container, so any absolutely-positioned modal/palette (`AnnotatePalette`) rendered *inside* it would resolve against the fan, not the viewport. The hook keeps all wiring in one place while the parent renders the positioned buttons and, separately at top level, `{modals}`. Same single-source-of-truth intent; correct positioning boundary.

**Tech Stack:** TypeScript, React, Zustand, @react-three/fiber (board), Vitest.

## Global Constraints

- **Branch:** `lean/live-coaching-first`. This is §6b (§6a Variant C done; §6c = global drawer + share home + `Toolbar.tsx` deletion + dup cleanup). Do NOT do §6c work here. **No deletions in §6b.**
- **No board-interaction state added.** The rail is a pure panel-switcher; it only sets which panel is visible. All interaction stays on the existing stores (`uiStore.boardSubMode`, `annotationStore`, `cameraStore`, `animationStore`, `pathStore`, `playerStore`, `ballStore`).
- **Parity invariant:** after Task 3's extraction, Variant C must behave byte-for-byte as before. B and C share the same action set + stores; only chrome differs (fan/rounded pill vs rail-panel/rectangular pill; radial vs linear transport).
- **Skin rule:** B iff `override==='B'` OR (`override==='auto'` AND `!coarsePointer` AND `isDesktop`). `isDesktop` = width ≥ 1024 via existing `useResponsive().isDesktop` — **no new width constant**. `coarsePointer` = new `usePointerCoarse()`.
- **Styling:** reuse the prototype's Variant B language (`src/prototypes/board-layout/VariantB.tsx` on branch `prototype/board-layout-4`) — glass rail, teal `#00d4aa` active gradient, amber `#f59e0b` toggles, 68px rail, 250px overlay panel at `top:54 left:80`. Read it with `git show prototype/board-layout-4:src/prototypes/board-layout/VariantB.tsx`.
- **Overlay panel — never a docked/push layout.** No Canvas resize (keeps clear of the `useCanvasResize` render-storm fixed earlier this lean).
- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. Full Vitest suite OOMs on Windows — run only new/changed test files.
- **Git hygiene:** stage explicit paths only, never `git add -A` (untracked `.superpowers/` scratch + a stray `docs/superpowers/plans/2026-03-20-*.md` must not be swept in).
- **Runtime smoke is blocked by the Supabase `/login` gate in this env** — the per-task gate is tsc + build; runtime is verified separately with a signed-in session (see the spec's smoke checklist).

---

## Task 1: Skin resolver util + test

Pure decision function — the unit-test gate for §6b (the repo has no RTL, so the actual rendering is runtime-only).

**Files:**
- Create: `src/utils/hudSkin.ts`
- Test: `src/utils/__tests__/hudSkin.test.ts`

**Interfaces:**
- Produces: `type SkinOverride = 'auto' | 'B' | 'C'`; `type HudSkin = 'B' | 'C'`; `resolveSkin(override: SkinOverride, isDesktop: boolean, coarsePointer: boolean): HudSkin`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/hudSkin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSkin } from '../hudSkin';

describe('resolveSkin', () => {
  it('override B always forces B', () => {
    expect(resolveSkin('B', false, true)).toBe('B');
    expect(resolveSkin('B', true, true)).toBe('B');
  });
  it('override C always forces C', () => {
    expect(resolveSkin('C', true, false)).toBe('C');
    expect(resolveSkin('C', false, false)).toBe('C');
  });
  it('auto → B only when fine pointer AND desktop width', () => {
    expect(resolveSkin('auto', true, false)).toBe('B');
  });
  it('auto → C for a coarse pointer at any width (tablet in landscape)', () => {
    expect(resolveSkin('auto', true, true)).toBe('C');
  });
  it('auto → C for a fine pointer on a narrow screen (small laptop window)', () => {
    expect(resolveSkin('auto', false, false)).toBe('C');
  });
  it('auto → C for coarse + narrow', () => {
    expect(resolveSkin('auto', false, true)).toBe('C');
  });
});
```

- [ ] **Step 2: Run test → verify it fails** (`npx vitest run src/utils/__tests__/hudSkin.test.ts 2>&1 | tail -6`) — FAIL, module not found.

- [ ] **Step 3: Create the util**

```ts
// src/utils/hudSkin.ts
export type SkinOverride = 'auto' | 'B' | 'C';
export type HudSkin = 'B' | 'C';

/**
 * Choose the board-HUD skin. Pointer is the discriminator (a coarse-pointer
 * tablet always gets the thumb pods even at desktop width); width is a backstop
 * so a narrow laptop window doesn't render a cramped rail.
 */
export function resolveSkin(override: SkinOverride, isDesktop: boolean, coarsePointer: boolean): HudSkin {
  if (override === 'B') return 'B';
  if (override === 'C') return 'C';
  return !coarsePointer && isDesktop ? 'B' : 'C';
}
```

- [ ] **Step 4: Test green + gate.** `npx vitest run src/utils/__tests__/hudSkin.test.ts`, then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**
```
git add src/utils/hudSkin.ts src/utils/__tests__/hudSkin.test.ts
git commit -m "feat: resolveSkin — pointer+width board-HUD skin picker (§6b)"
```

---

## Task 2: Selection plumbing — pointer hook + preference store

The two runtime inputs the switch needs beyond width. Both compile unused after this task (build stays green).

**Files:**
- Create: `src/hooks/usePointerCoarse.ts`, `src/store/hudPreferenceStore.ts`

**Interfaces:**
- Produces: `usePointerCoarse(): boolean`; `useHudPreferenceStore` with `{ skinOverride: SkinOverride; setSkinOverride(o); cycleSkinOverride() }`.

- [ ] **Step 1: `usePointerCoarse`**
```ts
// src/hooks/usePointerCoarse.ts
import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';
const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** True when the primary pointer is coarse (touch). Subscribes to changes. */
export function usePointerCoarse(): boolean {
  const [coarse, setCoarse] = useState(() => (supported() ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    if (!supported()) return;
    const mq = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', handler);
    setCoarse(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return coarse;
}
```

- [ ] **Step 2: `hudPreferenceStore`** (localStorage-backed, following the `getInitialMenuPulse` pattern in `uiStore.ts`)
```ts
// src/store/hudPreferenceStore.ts
import { create } from 'zustand';
import type { SkinOverride } from '../utils/hudSkin';

const KEY = 'afl.hud.skinOverride';
const ORDER: SkinOverride[] = ['auto', 'B', 'C'];

function initialOverride(): SkinOverride {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(KEY);
  return v === 'B' || v === 'C' || v === 'auto' ? v : 'auto';
}

interface HudPreferenceState {
  skinOverride: SkinOverride;
  setSkinOverride: (o: SkinOverride) => void;
  cycleSkinOverride: () => void;
}

export const useHudPreferenceStore = create<HudPreferenceState>((set, get) => ({
  skinOverride: initialOverride(),
  setSkinOverride: (o) => {
    try { window.localStorage.setItem(KEY, o); } catch { /* private mode: keep in-memory */ }
    set({ skinOverride: o });
  },
  cycleSkinOverride: () => {
    const next = ORDER[(ORDER.indexOf(get().skinOverride) + 1) % ORDER.length];
    get().setSkinOverride(next);
  },
}));
```

- [ ] **Step 3: Gate** — `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 4: Commit**
```
git add src/hooks/usePointerCoarse.ts src/store/hudPreferenceStore.ts
git commit -m "feat: usePointerCoarse + hudPreferenceStore (localStorage skin override) (§6b)"
```

---

## Task 3: Extract control logic into shared hooks; refactor the C pods (parity-critical)

Lift the Setup and Camera store wiring out of the pods into `useSetupControls` / `useCameraControls`, each returning an ordered **action-descriptor** array + the **modal JSX**. Refactor `SetupPod`/`CameraPod` to render those descriptors (unchanged chrome, unchanged behaviour). Add `panelPill`. **Variant C must look and behave identically after this task.**

**Files:**
- Create: `src/components/Board/hud/useSetupControls.ts`, `src/components/Board/hud/useCameraControls.ts`
- Modify: `src/components/Board/hud/SetupPod.tsx`, `src/components/Board/hud/CameraPod.tsx`, `src/components/Board/hud/podStyles.ts`

**Interfaces:**
```ts
export interface HudAction {
  key: string;
  label: React.ReactNode;      // may be dynamic ("Labels: #", "🏉 Give ball to #7")
  onClick: () => void;
  active?: boolean;            // amber highlight (e.g. Draw path on)
  disabled?: boolean;
  hidden?: boolean;            // e.g. ball buttons when no ball
}
export interface HudControls { actions: HudAction[]; modals: React.ReactNode; }
export function useSetupControls(): HudControls;
export function useCameraControls(): HudControls;
```

- [ ] **Step 1: `panelPill` in `podStyles.ts`** (rectangular, full-width, left-aligned — from the prototype's `pill()`):
```ts
export const panelPill: CSSProperties = {
  padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left', width: '100%',
  border: '1px solid #ffffff22', background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.85)',
};
```

- [ ] **Step 2: `useSetupControls`** — move ALL the store wiring + modal state from `SetupPod.tsx` (lines 21–48, 36–38 state, `applyPreset`, `selectedPlayer`/`assignedPlayer`) into the hook. Reproduce the exact current button order as descriptors: `centre-bounce`, `kick-in-pressing`, `kick-in-kicking` (formations), Teams, Labels, Reset players, Undo (`useBoardUndo`), Draw path (`active: boardSubMode==='draw'`), Clear paths (`disabled: paths.length===0`), Give ball (`hidden: !ball`, `disabled: !selectedPlayerId`), Release ball (`hidden: !(ball && assignedPlayer)`), Annotate…, Import roster…. `modals` = `<TeamSelectModal/> <RosterImportModal/> <AnnotatePalette/>` wired to the hook's local open-state.
```ts
// src/components/Board/hud/useSetupControls.ts  (shape — fill from current SetupPod)
export function useSetupControls(): HudControls {
  // ...all the usePlayerStore/useUIStore/usePathStore/useBallStore/useBoardUndo selectors
  const [showTeams, setShowTeams] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showAnnotate, setShowAnnotate] = useState(false);
  // applyPreset, selectedPlayer, assignedPlayer as today
  const actions: HudAction[] = [
    ...FORMATIONS.map((f) => ({ key: f.id, label: f.label, onClick: () => applyPreset(f.id) })),
    { key: 'teams', label: '🔵🔴 Teams / jerseys', onClick: () => setShowTeams(true) },
    { key: 'labels', label: `Labels: ${LABELS[labelMode]}`, onClick: cycleLabelMode },
    { key: 'reset', label: 'Reset players', onClick: resetPlayers },
    { key: 'undo', label: '↩ Undo', onClick: handleUndo, disabled: !canUndo() },
    { key: 'draw', label: `✏ Draw path${boardSubMode === 'draw' ? ' (on)' : ''}`, onClick: toggleBoardSubMode, active: boardSubMode === 'draw' },
    { key: 'clear', label: 'Clear paths', onClick: clearPaths, disabled: paths.length === 0 },
    { key: 'give', label: `🏉 Give ball${selectedPlayer ? ` to #${selectedPlayer.number}` : ''}`, onClick: () => selectedPlayerId && assignBallToPlayer(selectedPlayerId), hidden: !ball, disabled: !selectedPlayerId },
    { key: 'release', label: `Release ball${assignedPlayer ? ` (#${assignedPlayer.number})` : ''}`, onClick: () => assignBallToPlayer(null), hidden: !(ball && assignedPlayer) },
    { key: 'annotate', label: '↗ Annotate…', onClick: () => setShowAnnotate(true) },
    { key: 'roster', label: 'Import roster…', onClick: () => setShowRoster(true) },
  ];
  const modals = (<>
    <TeamSelectModal open={showTeams} onClose={() => setShowTeams(false)} />
    <RosterImportModal open={showRoster} onClose={() => setShowRoster(false)} />
    <AnnotatePalette open={showAnnotate} onClose={() => setShowAnnotate(false)} />
  </>);
  return { actions, modals };
}
```

- [ ] **Step 3: `useCameraControls`** — same treatment for `CameraPod.tsx` (broadcast, Top, Sideline, End-to-end, Reset camera, POV1 activate `setActivePovSlot(1)`, POV2 activate, Assign POV #1/#2 → `assignSlot` state). `modals` = `<PovSelectModal open={assignSlot!==null} povSlot={assignSlot ?? 1} onClose=… />`. The entry-button CAM/POV label stays in `CameraPod` (reads `activePovSlot`), NOT in the hook. POV activate labels stay dynamic (`👁 POV ${label(povPlayer1Id)}`).

- [ ] **Step 4: Refactor `SetupPod` to consume the hook.** Render a small local `renderAction(a, buttonStyle)` and pass `fanPill`. Keep the fan wrapper + entry button exactly as today. Render `{modals}` **outside** the absolute fan container (top-level sibling), so the palette/modals position against the viewport, not the fan.
```tsx
export function SetupPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { actions, modals } = useSetupControls();
  return (
    <>
      <div style={{ position:'absolute', left:20, bottom:'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display:'flex', flexDirection:'column-reverse', alignItems:'flex-start', gap:10, zIndex:30 }}>
        {open && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:4 }}>
            {actions.filter((a) => !a.hidden).map((a) => renderAction(a, fanPill))}
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize:22 }}>{open ? '✕' : '👥'}</span>
          <span style={{ fontSize:9, fontWeight:700 }}>SETUP</span>
        </button>
      </div>
      {modals}
    </>
  );
}
```
where
```tsx
export function renderAction(a: HudAction, base: CSSProperties) {
  return (
    <button key={a.key} onClick={a.onClick} disabled={a.disabled}
      style={{ ...base, ...(a.active ? { background:'#f59e0b', color:'#000' } : {}), ...(a.disabled ? { opacity:0.4 } : {}) }}>
      {a.label}
    </button>
  );
}
```
Put `renderAction` in `useSetupControls.ts` (or a tiny `hudActions.tsx`) and share it with `CameraPod` + the rail panels.

- [ ] **Step 5: Refactor `CameraPod`** the same way — right-aligned `fanPill` (`{ ...fanPill, textAlign:'right' }`), keep the CAM/POV entry-label logic, render `{modals}` outside the fan container.

- [ ] **Step 6: Parity check + gate.** Read the diff: no store call renamed, no descriptor dropped/reordered vs the originals. `npx tsc --noEmit`, `npm run build`. (Runtime C parity is on the smoke checklist.)

- [ ] **Step 7: Commit**
```
git add src/components/Board/hud/useSetupControls.ts src/components/Board/hud/useCameraControls.ts src/components/Board/hud/SetupPod.tsx src/components/Board/hud/CameraPod.tsx src/components/Board/hud/podStyles.ts
git commit -m "refactor: lift Setup/Camera controls into shared descriptor hooks; C pods consume them (§6b)"
```

---

## Task 4: Linear `TransportBar` (Variant B transport)

The Animate-panel transport. Shares logic with `PlayFab` (both read `animationStore` + call `scrubTo`) but is a horizontal presentation. No shared component — parallel presentational sibling (Q4 exception).

**Files:**
- Create: `src/components/Board/hud/rail/TransportBar.tsx`

- [ ] **Step 1: Build it.** Play/pause (`togglePlayback`), Stop (compose: `if (isPlaying) togglePlayback(); scrubTo(0)` — `animationStore` has no stop/reset action), horizontal scrub `<input type=range min=0 max=1000 value={progress*1000}>` → `scrubTo(v/1000)`, speed chip (`cycleSpeed` → `${speed}×`), and a `${Math.round(progress*100)}%` readout (the store exposes no duration, so show progress %, not fabricated mm:ss). Dim/disable the whole bar when `!hasAnimation`.
```tsx
// src/components/Board/hud/rail/TransportBar.tsx
import { useAnimationStore } from '../../../../store/animationStore';
import { scrubTo } from '../../../../utils/boardScrub';

const TEAL = '#00d4aa';
export function TransportBar() {
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed } = useAnimationStore();
  const stop = () => { if (isPlaying) togglePlayback(); scrubTo(0); };
  const dim = { opacity: hasAnimation ? 1 : 0.4, pointerEvents: hasAnimation ? 'auto' : 'none' } as const;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, ...dim }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={togglePlayback} disabled={!hasAnimation} aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ width:46, height:46, borderRadius:999, border:'none', background:`linear-gradient(135deg, ${TEAL}, #0099ff)`, color:'#000', fontSize:18, cursor:'pointer' }}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={stop} aria-label="Stop" style={{ width:38, height:38, borderRadius:8, border:'1px solid #ffffff22', background:'rgba(0,0,0,0.4)', color:'#fff', cursor:'pointer' }}>■</button>
        <span style={{ fontSize:12, opacity:0.6, fontVariantNumeric:'tabular-nums', marginLeft:'auto' }}>{Math.round(progress * 100)}%</span>
      </div>
      <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrubTo(Number(e.target.value) / 1000)}
        aria-label="Scrub animation" style={{ width:'100%', accentColor:TEAL }} />
      <button onClick={cycleSpeed} aria-label="Playback speed"
        style={{ alignSelf:'flex-start', padding:'4px 12px', borderRadius:999, border:'1px solid #ffffff33', background:'rgba(13,13,26,0.9)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
        Speed {speed}×
      </button>
    </div>
  );
}
```
(Verify `animationStore` field names against `PlayFab.tsx` — `isPlaying`, `hasAnimation`, `progress`, `speed`, `togglePlayback`, `cycleSpeed`.)

- [ ] **Step 2: Gate + commit**
```
git add src/components/Board/hud/rail/TransportBar.tsx
git commit -m "feat: linear TransportBar for the Variant B Animate panel (§6b)"
```

---

## Task 5: `RailHud` — rail + contextual overlay panel

The Variant B shell. Left rail (Setup/Animate/Camera), one overlay panel at a time, click-active-to-collapse, opens collapsed. Compiles but is unmounted until Task 6.

**Files:**
- Create: `src/components/Board/hud/rail/RailHud.tsx`

**Interfaces:** `RailHud()` — self-contained; owns local `mode` state; consumes `useSetupControls`, `useCameraControls`, `renderAction`, `TransportBar`, `panelPill`, `glass`.

- [ ] **Step 1: Build the rail + panel.** Three panels are rendered **inline** (not separate files — each panel body is one line: the controls descriptors or `<TransportBar/>`). Render `{setup.modals}`/`{camera.modals}` at top level, outside the panel container (same positioning reason as the pods). Panel content only when `mode` matches; rail always visible; clicking the active mode toggles it closed.
```tsx
// src/components/Board/hud/rail/RailHud.tsx
import { useState } from 'react';
import { glass, panelPill, TEAL } from '../podStyles';
import { useSetupControls } from '../useSetupControls';
import { useCameraControls } from '../useCameraControls';
import { renderAction } from '../useSetupControls'; // or wherever renderAction lives
import { TransportBar } from './TransportBar';

type Mode = 'setup' | 'animate' | 'camera' | null;
const MODES = [
  { key: 'setup', icon: '👥', label: 'Setup' },
  { key: 'animate', icon: '▶', label: 'Animate' },
  { key: 'camera', icon: '🎥', label: 'Camera' },
] as const;

export function RailHud() {
  const [mode, setMode] = useState<Mode>(null);           // opens collapsed
  const setup = useSetupControls();
  const camera = useCameraControls();
  const toggle = (m: Exclude<Mode, null>) => setMode((cur) => (cur === m ? null : m));

  return (
    <>
      {/* left rail */}
      <div style={{ position:'absolute', top:0, bottom:0, left:0, width:68, ...glass, borderTop:'none', borderBottom:'none', borderLeft:'none', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:10, gap:6, zIndex:30 }}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button key={m.key} onClick={() => toggle(m.key)} aria-pressed={active}
              style={{ width:56, height:56, borderRadius:12, border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                background: active ? `linear-gradient(135deg, ${TEAL}, #0099ff)` : 'transparent', color: active ? '#000' : '#ffffffcc' }}>
              <span style={{ fontSize:20 }}>{m.icon}</span>
              <span style={{ fontSize:9, fontWeight:700 }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* contextual overlay panel */}
      {mode && (
        <div style={{ position:'absolute', top:54, left:80, ...glass, borderRadius:14, padding:12, width:250, zIndex:30, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:11, letterSpacing:'0.12em', opacity:0.55 }}>{mode.toUpperCase()}</div>
          {mode === 'setup' && setup.actions.filter((a) => !a.hidden).map((a) => renderAction(a, panelPill))}
          {mode === 'animate' && <TransportBar />}
          {mode === 'camera' && camera.actions.filter((a) => !a.hidden).map((a) => renderAction(a, panelPill))}
        </div>
      )}

      {/* modals live at top level, outside the positioned panel */}
      {setup.modals}
      {camera.modals}
    </>
  );
}
```
(Export `TEAL` from `podStyles.ts` if not already; it exists there.)

- [ ] **Step 2: Gate + commit**
```
git add src/components/Board/hud/rail/RailHud.tsx
git commit -m "feat: RailHud — left mode rail + collapsing overlay panel (§6b)"
```

---

## Task 6: `BoardHud` skin switch + extract `ThumbPodHud` (B goes live)

Move the current `BoardHud` body (the C pods + FAB) into `ThumbPodHud` unchanged, and turn `BoardHud` into the resolver-driven switch.

**Files:**
- Create: `src/components/Board/hud/ThumbPodHud.tsx`
- Modify: `src/components/Board/hud/BoardHud.tsx`

- [ ] **Step 1: `ThumbPodHud`** — the exact current `BoardHud` body (SetupPod/PlayFab/CameraPod + the `pod` mutual-exclusion state), verbatim, just renamed.
```tsx
// src/components/Board/hud/ThumbPodHud.tsx
import { useState } from 'react';
import { SetupPod } from './SetupPod';
import { CameraPod } from './CameraPod';
import { PlayFab } from './PlayFab';
type Pod = 'setup' | 'camera' | null;
export function ThumbPodHud() {
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

- [ ] **Step 2: `BoardHud` becomes the switch.**
```tsx
// src/components/Board/hud/BoardHud.tsx
import { useResponsive } from '../../../hooks/useResponsive';
import { usePointerCoarse } from '../../../hooks/usePointerCoarse';
import { useHudPreferenceStore } from '../../../store/hudPreferenceStore';
import { resolveSkin } from '../../../utils/hudSkin';
import { ThumbPodHud } from './ThumbPodHud';
import { RailHud } from './rail/RailHud';

export function BoardHud() {
  const { isDesktop } = useResponsive();
  const coarse = usePointerCoarse();
  const override = useHudPreferenceStore((s) => s.skinOverride);
  return resolveSkin(override, isDesktop, coarse) === 'B' ? <RailHud /> : <ThumbPodHud />;
}
```
`MainLayout` already mounts `<BoardHud/>` when `editorTab === 'board'` — no `MainLayout` change needed.

- [ ] **Step 3: Gate.** `npx tsc --noEmit`, `npm run build`. (Runtime: resize/override flips rail↔pods — smoke checklist.)
- [ ] **Step 4: Commit**
```
git add src/components/Board/hud/BoardHud.tsx src/components/Board/hud/ThumbPodHud.tsx
git commit -m "feat: BoardHud resolves B/C skin; extract ThumbPodHud (§6b)"
```

---

## Task 7: Hamburger override toggle

Surface the three-state override in the `MobileMenu` globals: "Board layout: Auto / Rail / Pods".

**Files:**
- Modify: `src/components/UI/MobileMenu.tsx`

- [ ] **Step 1: Read `MobileMenu.tsx`** — find the globals section and the `createMenuItem`/`createMenuSection` helper usage (per project memory). Add a menu item that shows the current override and calls `cycleSkinOverride` on click.
```tsx
const skinOverride = useHudPreferenceStore((s) => s.skinOverride);
const cycleSkinOverride = useHudPreferenceStore((s) => s.cycleSkinOverride);
const skinLabel = skinOverride === 'auto' ? 'Auto' : skinOverride === 'B' ? 'Rail' : 'Pods';
// createMenuItem({ label: `Board layout: ${skinLabel}`, onClick: cycleSkinOverride, icon: '🧭' })
```
Match the surrounding menu-item construction exactly (don't invent an API — mirror the neighbours).

- [ ] **Step 2: Gate + commit**
```
git add src/components/UI/MobileMenu.tsx
git commit -m "feat: hamburger 'Board layout' override — Auto/Rail/Pods (§6b)"
```

---

## Final review & wrap

- [ ] **Whole-slice review** (opus, range `6bb9a6b..HEAD` — spec commit to tip): coherence, parity (C unchanged), no orphans, no accidental deletions, skin rule correct.
- [ ] **Update the SDD ledger** `.superpowers/sdd/progress.md` with a §6b section (per-task status, review verdict).
- [ ] **Runtime smoke** (needs a signed-in session) — the spec's 7-point checklist: rail on fine+wide, collapse, Animate/Camera panels, C unchanged on coarse/narrow, override cycles + persists, resize flip resets panel + preserves playback/camera, no console errors, no Canvas resize storm.
- [ ] **Update memory** `lean-execution.md`: §6b BUILD done; remaining = §6c.

## Deviations from the spec (recorded)

- Shared controls realized as **hooks returning `{ actions, modals }`** rather than `<Controls>` components — required so absolutely-positioned modals/palette render against the viewport, not the C fan's `position:absolute` container. Same single-source intent.
- **No separate `SetupPanel`/`CameraPanel`/`AnimatePanel` files** — the panel bodies are one line each, rendered inline in `RailHud`. Fewer trivial files.
- `TransportBar` shows a **progress %**, not `mm:ss` — `animationStore` exposes no duration; fabricating a clock would be dishonest UI.
