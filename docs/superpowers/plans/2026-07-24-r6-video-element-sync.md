# R6 Shared Video-Element Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dedupe the verbatim `<video>`-to-store sync effect shared by `VideoWorkspace` and `VideoPiP` behind one testable `useVideoElementSync` hook — with no behaviour change.

**Architecture:** New `src/hooks/useVideoElementSync.ts` — a testable pure-ish `syncVideoElement(el, state)` core + a thin `useVideoElementSync(videoRef)` hook that reads the store and runs the reconcile effect. Both components consume the hook and delete their local effect. Mirrors the `videoBuffer`/`dragMath` shape.

**Tech Stack:** TypeScript, React, Zustand, Vitest (jsdom env).

## Global Constraints

- **Behaviour-preserving.** `syncVideoElement`'s body is the two effects' body verbatim; the hook's guard (`!el || !videoElement`) and dep array match both originals; the added `videoRef` dep is a stable ref and doesn't change cadence.
- **Prune only proven-orphaned selectors** (the grep sets below are exact). Removing a still-used selector breaks the build (`tsc` catches it); keeping a redundant one is harmless.
- **Do NOT** touch `SharedPlaybookViewer`, `VideoUploader`, or attempt to merge the elements into one.
- **Full vitest run OOMs on Windows** (pre-existing) — run `useVideoElementSync.test.ts` targeted; verify the component repoints with `npx tsc --noEmit` + `npm run build` (no `renderHook`).
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `useVideoElementSync` hook + tested `syncVideoElement`

**Files:**
- Create: `src/hooks/useVideoElementSync.ts`
- Test: `src/hooks/__tests__/useVideoElementSync.test.ts`

**Interfaces:**
- Produces (relied on by Tasks 2 & 3):
  - `interface VideoSyncState { src: string; isPlaying: boolean; currentTime: number; volume: number; isMuted: boolean }`
  - `syncVideoElement(el: HTMLVideoElement, state: VideoSyncState): void`
  - `useVideoElementSync(videoRef: React.RefObject<HTMLVideoElement | null>): void`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useVideoElementSync.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { syncVideoElement, type VideoSyncState } from '../useVideoElementSync';

function mockEl(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  return {
    src: '',
    paused: true,
    currentTime: 0,
    volume: 1,
    muted: false,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    ...overrides,
  } as unknown as HTMLVideoElement;
}

const base: VideoSyncState = { src: '', isPlaying: false, currentTime: 0, volume: 1, isMuted: false };

describe('syncVideoElement', () => {
  it('sets src only when it differs', () => {
    const el = mockEl({ src: 'a' });
    syncVideoElement(el, { ...base, src: 'b' });
    expect(el.src).toBe('b');

    const el2 = mockEl({ src: 'a' });
    syncVideoElement(el2, { ...base, src: 'a' });
    expect(el2.src).toBe('a');
  });

  it('does not set src when the target src is empty', () => {
    const el = mockEl({ src: 'a' });
    syncVideoElement(el, { ...base, src: '' });
    expect(el.src).toBe('a');
  });

  it('plays when target is playing and the element is paused', () => {
    const el = mockEl({ paused: true });
    syncVideoElement(el, { ...base, isPlaying: true });
    expect(el.play).toHaveBeenCalledOnce();
    expect(el.pause).not.toHaveBeenCalled();
  });

  it('pauses when target is not playing and the element is playing', () => {
    const el = mockEl({ paused: false });
    syncVideoElement(el, { ...base, isPlaying: false });
    expect(el.pause).toHaveBeenCalledOnce();
    expect(el.play).not.toHaveBeenCalled();
  });

  it('does nothing to play/pause when already in the target play state', () => {
    const playing = mockEl({ paused: false });
    syncVideoElement(playing, { ...base, isPlaying: true });
    expect(playing.play).not.toHaveBeenCalled();
    expect(playing.pause).not.toHaveBeenCalled();

    const pausedEl = mockEl({ paused: true });
    syncVideoElement(pausedEl, { ...base, isPlaying: false });
    expect(pausedEl.play).not.toHaveBeenCalled();
    expect(pausedEl.pause).not.toHaveBeenCalled();
  });

  it('seeks only when drift exceeds 0.5s', () => {
    const drifted = mockEl({ currentTime: 0 });
    syncVideoElement(drifted, { ...base, currentTime: 5 });
    expect(drifted.currentTime).toBe(5);

    const close = mockEl({ currentTime: 5 });
    syncVideoElement(close, { ...base, currentTime: 5.3 });
    expect(close.currentTime).toBe(5);
  });

  it('always applies volume and mute', () => {
    const el = mockEl({ volume: 1, muted: false });
    syncVideoElement(el, { ...base, volume: 0.5, isMuted: true });
    expect(el.volume).toBe(0.5);
    expect(el.muted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useVideoElementSync.test.ts`
Expected: FAIL — `Failed to resolve import "../useVideoElementSync"`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useVideoElementSync.ts`:

```ts
import { useEffect, type RefObject } from 'react';
import { useVideoStore } from '../store/videoStore';

export interface VideoSyncState {
  src: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
}

/**
 * Reconcile a <video> element to the desired playback state. Sets src only when
 * it differs, plays/pauses on the transition, seeks only when the element has
 * drifted > 0.5s from the target, and applies volume/mute. play() rejections
 * (autoplay policy) are swallowed, matching the previous inline behaviour.
 */
export function syncVideoElement(el: HTMLVideoElement, state: VideoSyncState): void {
  if (state.src && el.src !== state.src) el.src = state.src;
  if (state.isPlaying && el.paused) el.play().catch(() => {});
  else if (!state.isPlaying && !el.paused) el.pause();
  if (Math.abs(el.currentTime - state.currentTime) > 0.5) el.currentTime = state.currentTime;
  el.volume = state.volume;
  el.muted = state.isMuted;
}

/**
 * Keep a local <video> element mirrored to the shared videoStore playback state.
 * Used by the Video-tab workspace and the Board-tab PiP overlay.
 */
export function useVideoElementSync(videoRef: RefObject<HTMLVideoElement | null>): void {
  const videoElement = useVideoStore((s) => s.videoElement);
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const currentTime = useVideoStore((s) => s.currentTime);
  const volume = useVideoStore((s) => s.volume);
  const isMuted = useVideoStore((s) => s.isMuted);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoElement) return;
    syncVideoElement(el, { src: videoElement.src, isPlaying, currentTime, volume, isMuted });
  }, [videoRef, videoElement, isPlaying, currentTime, volume, isMuted]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useVideoElementSync.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add src/hooks/useVideoElementSync.ts src/hooks/__tests__/useVideoElementSync.test.ts
git commit -m "feat: add useVideoElementSync hook + tested syncVideoElement core

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Repoint `VideoWorkspace`

**Files:**
- Modify: `src/components/VideoImport/VideoWorkspace.tsx`

**Interfaces:**
- Consumes: `useVideoElementSync` from `../../hooks/useVideoElementSync` (Task 1).

- [ ] **Step 1: Add the import**

Near the other hook imports (e.g. after the `useVideoPlayback` import), add:
```ts
import { useVideoElementSync } from '../../hooks/useVideoElementSync';
```

- [ ] **Step 2: Delete the 4 orphaned store selectors**

These are used ONLY by the sync effect (verified by grep). Delete these lines:
```ts
  const videoElement = useVideoStore((state) => state.videoElement);
```
```ts
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const volume = useVideoStore((state) => state.volume);
  const isMuted = useVideoStore((state) => state.isMuted);
```
KEEP `const currentTime = useVideoStore((state) => state.currentTime);` (used at the pending-start/end buttons).

- [ ] **Step 3: Replace the sync effect with the hook call**

Delete the whole sync effect (the block starting `// Sync the local <video> element with the shared store playback state.` through its closing `}, [videoElement, isPlaying, currentTime, volume, isMuted]);`):
```ts
  // Sync the local <video> element with the shared store playback state.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoElement) return;

    if (videoElement.src && el.src !== videoElement.src) {
      el.src = videoElement.src;
    }
    if (isPlaying && el.paused) {
      el.play().catch(() => {});
    } else if (!isPlaying && !el.paused) {
      el.pause();
    }
    if (Math.abs(el.currentTime - currentTime) > 0.5) {
      el.currentTime = currentTime;
    }
    el.volume = volume;
    el.muted = isMuted;
  }, [videoElement, isPlaying, currentTime, volume, isMuted]);
```
and put in its place:
```ts
  // Keep the local <video> mirrored to the shared store playback state.
  useVideoElementSync(videoRef);
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: clean. (If it flags `useEffect` as now-unused in the import, remove it from the `react` import; if it flags any of the removed selectors as still used, restore that one — but the grep confirmed they aren't.)

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoImport/VideoWorkspace.tsx
git commit -m "refactor: route VideoWorkspace video sync through useVideoElementSync

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Repoint `VideoPiP`

**Files:**
- Modify: `src/components/VideoImport/VideoPiP.tsx`

**Interfaces:**
- Consumes: `useVideoElementSync` from `../../hooks/useVideoElementSync` (Task 1).

- [ ] **Step 1: Add the import**

Near the other hook imports, add:
```ts
import { useVideoElementSync } from '../../hooks/useVideoElementSync';
```

- [ ] **Step 2: Delete the 1 orphaned store selector**

`videoElement` is used ONLY by the sync effect here (verified by grep). Delete:
```ts
  const videoElement = useVideoStore((state) => state.videoElement);
```
KEEP `isPlaying`, `currentTime`, `volume`, `isMuted` (all used by the PiP controls/JSX).

- [ ] **Step 3: Replace the sync effect with the hook call**

Delete the whole sync effect (the block starting `// Sync video element (src, playback, time, volume)` through its closing `}, [videoElement, isPlaying, currentTime, volume, isMuted]);`):
```ts
  // Sync video element (src, playback, time, volume)
  useEffect(() => {
    if (videoRef.current && videoElement) {
      if (videoElement.src && videoRef.current.src !== videoElement.src) {
        videoRef.current.src = videoElement.src;
      }

      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }

      // Apply volume/mute from store
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [videoElement, isPlaying, currentTime, volume, isMuted]);
```
and put in its place:
```ts
  // Keep the local <video> mirrored to the shared store playback state.
  useVideoElementSync(videoRef);
```

- [ ] **Step 4: Typecheck + build + grep**

Run: `npx tsc --noEmit`
Expected: clean. (If `useEffect` is now unused in `VideoPiP`, it is still used by the fullscreen-change effect and others — do NOT remove it unless tsc says so.)

Run: `git grep -n "videoRef.current.play()\|videoRef.current.currentTime =\|el.currentTime = currentTime" src/components/VideoImport/VideoPiP.tsx src/components/VideoImport/VideoWorkspace.tsx`
Expected: no matches (neither component hand-rolls the element sync anymore).

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoImport/VideoPiP.tsx
git commit -m "refactor: route VideoPiP video sync through useVideoElementSync

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- Behaviour is unchanged: `syncVideoElement` is the two effects' body verbatim, and the hook's guard + deps match both.
- The selector-pruning sets are exact (grep-verified): VideoWorkspace drops `videoElement`/`isPlaying`/`volume`/`isMuted` (keeps `currentTime`); VideoPiP drops only `videoElement`. `tsc` will catch an over-removal.
- Out of scope: `SharedPlaybookViewer`, `VideoUploader`, merging elements, and any other effect/logic in the two components (fullscreen, drag/resize, controls).
