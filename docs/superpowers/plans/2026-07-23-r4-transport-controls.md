# R4 Shared Transport-Controls Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dedupe the `PlayFab` ↔ `TransportBar` board-transport bindings behind one shared `useTransportControls` hook, with no behaviour change.

**Architecture:** A new glue hook `src/components/Board/hud/useTransportControls.ts` owns the six `animationStore` bindings both transport UIs need, plus two derived actions (`scrub` = `boardScrub.scrubTo`, `stop` = TransportBar's current pause-then-rewind). `PlayFab` and `TransportBar` consume the hook and keep only their own layout. Mirrors §6b's shared-control-hook pattern.

**Tech Stack:** TypeScript, React, Zustand, Vitest (jsdom env — not exercised here).

## Global Constraints

- **Behaviour-preserving refactor.** Both components must render and behave identically. `stop` stays byte-identical: `if (isPlaying) togglePlayback(); scrubTo(0);`. `scrub` is `scrubTo` directly. The six bound values/actions are unchanged.
- **Individual selectors.** The hook binds each `animationStore` field with its own selector (`useAnimationStore((s) => s.x)`), matching PlayFab's existing pattern; do not use a whole-store destructure.
- **No behaviour from the declined half.** Do not touch `videoStore`, `useVideoPlayback`, or `PlaybackControls` — the animationStore↔videoStore unification is out of scope.
- **Full vitest run OOMs on Windows** (pre-existing). This wave adds no test — verify with `npx tsc --noEmit` + `npm run build`. Neither transport component has a unit test.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Add `useTransportControls` hook

**Files:**
- Create: `src/components/Board/hud/useTransportControls.ts`

**Interfaces:**
- Consumes: `useAnimationStore`, `AnimationSpeed` from `../../../store/animationStore`; `scrubTo` from `../../../utils/boardScrub`.
- Produces (relied on by Tasks 2 & 3):
  - `interface TransportControls { isPlaying: boolean; hasAnimation: boolean; progress: number; speed: AnimationSpeed; togglePlayback: () => void; cycleSpeed: () => void; scrub: (progress01: number) => void; stop: () => void }`
  - `useTransportControls(): TransportControls`

- [ ] **Step 1: Create the hook**

Create `src/components/Board/hud/useTransportControls.ts`:

```ts
import { useAnimationStore, type AnimationSpeed } from '../../../store/animationStore';
import { scrubTo } from '../../../utils/boardScrub';

/**
 * Shared board-transport bindings for the transport widgets (PlayFab, TransportBar).
 * Owns the animationStore bindings + the derived scrub/stop actions; each widget
 * renders its own layout. Mirrors the §6b shared-control-hook pattern.
 */
export interface TransportControls {
  isPlaying: boolean;
  hasAnimation: boolean;
  progress: number; // 0..1
  speed: AnimationSpeed;
  togglePlayback: () => void;
  cycleSpeed: () => void;
  /** Reposition the board to an absolute progress (0..1); works while paused. */
  scrub: (progress01: number) => void;
  /** Pause if playing, then rewind to the start. */
  stop: () => void;
}

export function useTransportControls(): TransportControls {
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const hasAnimation = useAnimationStore((s) => s.hasAnimation);
  const progress = useAnimationStore((s) => s.progress);
  const speed = useAnimationStore((s) => s.speed);
  const togglePlayback = useAnimationStore((s) => s.togglePlayback);
  const cycleSpeed = useAnimationStore((s) => s.cycleSpeed);

  const stop = () => {
    if (isPlaying) togglePlayback();
    scrubTo(0);
  };

  return {
    isPlaying,
    hasAnimation,
    progress,
    speed,
    togglePlayback,
    cycleSpeed,
    scrub: scrubTo,
    stop,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (`useTransportControls` is exported-but-unused at this point — that is fine; TS does not error on unused exports.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Board/hud/useTransportControls.ts
git commit -m "feat: add useTransportControls shared board-transport hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Repoint `PlayFab` onto the hook

**Files:**
- Modify: `src/components/Board/hud/PlayFab.tsx` (imports lines 1–2; selectors lines 9–14; scrub `onChange` line 49)

**Interfaces:**
- Consumes: `useTransportControls` from `./useTransportControls` (Task 1).
- Produces: nothing new — behaviour-preserving repoint.

- [ ] **Step 1: Swap imports**

Replace the first two import lines:
```ts
import { useAnimationStore } from '../../../store/animationStore';
import { scrubTo } from '../../../utils/boardScrub';
```
with:
```ts
import { useTransportControls } from './useTransportControls';
```
Leave `import { arcPath, polar } from '../../../utils/arcGeometry';` unchanged.

- [ ] **Step 2: Replace the six selectors**

Replace lines 9–14:
```ts
  const isPlaying = useAnimationStore((s) => s.isPlaying);
  const hasAnimation = useAnimationStore((s) => s.hasAnimation);
  const progress = useAnimationStore((s) => s.progress);
  const speed = useAnimationStore((s) => s.speed);
  const togglePlayback = useAnimationStore((s) => s.togglePlayback);
  const cycleSpeed = useAnimationStore((s) => s.cycleSpeed);
```
with:
```ts
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub } = useTransportControls();
```

- [ ] **Step 3: Repoint the scrub `onChange`**

In the range input, change:
```ts
        onChange={(e) => scrubTo(Number(e.target.value) / 1000)}
```
to:
```ts
        onChange={(e) => scrub(Number(e.target.value) / 1000)}
```

Leave everything else (the arc SVG, knob, play button, speed pill, layout) unchanged.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: clean (no leftover `useAnimationStore`/`scrubTo` references in PlayFab; `arcPath`/`polar` still used).

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Board/hud/PlayFab.tsx
git commit -m "refactor: route PlayFab through useTransportControls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Repoint `TransportBar` onto the hook

**Files:**
- Modify: `src/components/Board/hud/rail/TransportBar.tsx` (imports lines 1–3; destructure + inline `stop` lines 6–7; scrub `onChange` line 19)

**Interfaces:**
- Consumes: `useTransportControls` from `../useTransportControls` (Task 1). Note the `../` — this file is one directory deeper (`hud/rail/`).
- Produces: nothing new — behaviour-preserving repoint.

- [ ] **Step 1: Swap imports**

Replace the first two import lines:
```ts
import { useAnimationStore } from '../../../../store/animationStore';
import { scrubTo } from '../../../../utils/boardScrub';
```
with:
```ts
import { useTransportControls } from '../useTransportControls';
```
Leave `import { TEAL } from '../podStyles';` unchanged.

- [ ] **Step 2: Replace the destructure + inline `stop`**

Replace lines 6–7:
```ts
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed } = useAnimationStore();
  const stop = () => { if (isPlaying) togglePlayback(); scrubTo(0); };
```
with:
```ts
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub, stop } = useTransportControls();
```

- [ ] **Step 3: Repoint the scrub `onChange`**

In the range input, change:
```ts
      <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrubTo(Number(e.target.value) / 1000)}
```
to:
```ts
      <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrub(Number(e.target.value) / 1000)}
```

Leave everything else (play/stop/speed buttons, `%` display, layout, `dim`) unchanged.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no leftover `useAnimationStore`/`scrubTo` references in TransportBar; `TEAL` still used).

- [ ] **Step 5: Confirm neither transport UI imports the store/scrub directly**

Run: `git grep -n "useAnimationStore\|from '.*boardScrub'" src/components/Board/hud/PlayFab.tsx src/components/Board/hud/rail/TransportBar.tsx`
Expected: no matches (both now go through `useTransportControls`).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Board/hud/rail/TransportBar.tsx
git commit -m "refactor: route TransportBar through useTransportControls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code, not the number.
- No behaviour change; there is no new test because this is a glue hook and the repo has no `renderHook` (no `@testing-library/react`), matching how §6b's control hooks are verified. Confidence comes from a clean typecheck + build and both components rendering identically.
- Out of scope (do not touch): `animationStore`, `videoStore`, `useVideoPlayback`, `PlaybackControls`, `boardScrub`, and each component's layout/SVG.
