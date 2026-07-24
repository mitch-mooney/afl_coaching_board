# R6 Wave 3 — Shared video-element sync

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R6** ("video ownership scattered; 3
> `<video>` elements"). Exploration re-framed the tractable win: literal single-element
> consolidation is **declined** (the elements live on different tabs / DOM subtrees and PiP is
> draggable — merging them needs portaling a shared element around, a big rework for little gain).
> The real smell is the **verbatim-duplicated element-sync effect** between `VideoWorkspace` and
> `VideoPiP`. This wave dedups it behind one shared, testable hook.

## Context — what the audit + exploration found

There are four `<video>` sites with distinct roles:
- `VideoUploader` — `createElement('video')` metadata probe; sets `videoStore.videoElement` (the media
  source owner). Not a playback view.
- `VideoWorkspace` — the Video-tab `<video>`, synced to the store.
- `VideoPiP` — the Board-tab overlay `<video>`, synced to the store (draggable/resizable).
- `SharedPlaybookViewer` — a separate public page with its own independent player.

`VideoWorkspace` (`68–85`) and `VideoPiP` (`71–91`) each hand-roll the **same** effect: reconcile
their local `<video>` to the store's playback state — copy `videoElement.src`, `play()`/`pause()` on
the `isPlaying` transition, seek when `|el.currentTime − currentTime| > 0.5`, apply `volume`/`isMuted`
— with identical deps `[videoElement, isPlaying, currentTime, volume, isMuted]`. Verbatim Duplicated
Code.

## Goals

1. One shared, testable home for the "reconcile a `<video>` to the store playback state" logic,
   consumed by both `VideoWorkspace` and `VideoPiP`. No component hand-rolls the sync effect.

## Non-goals (declined / deferred)

- **Declined:** merging the playback elements into a single `<video>` (different tabs/DOM subtrees,
  draggable PiP — a large, risky rework; two lightweight mirrored elements is a reasonable pattern).
- `SharedPlaybookViewer`'s player (separate public page) and the `VideoUploader` probe (media-source
  owner) — untouched.
- Any behaviour change. Behaviour-preserving (the two effects are identical, so the shared hook
  reproduces both exactly).

---

## Design

### New `src/hooks/useVideoElementSync.ts`

A testable imperative core + a thin hook (mirrors the `videoBuffer` / `dragMath` shape).

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
 * drifted > 0.5s from the target, and applies volume/mute. Errors from play()
 * (autoplay policy) are swallowed, matching the current behaviour.
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

`syncVideoElement`'s body is the two effects' body verbatim; the hook's guard (`!el || !videoElement`)
and dep array match both originals exactly (the `videoRef` dep is added — a stable ref, so it does not
change the run cadence).

### Consumers

**`VideoWorkspace.tsx`** and **`VideoPiP.tsx`** each:
- add `useVideoElementSync(videoRef);` (near the other hooks, after `videoRef` is declared),
- delete their local sync `useEffect` (Workspace `68–85`, PiP `71–91`),
- import `useVideoElementSync` from `../../hooks/useVideoElementSync`,
- remove any of the `videoElement` / `isPlaying` / `currentTime` / `volume` / `isMuted` store selectors
  that are **only** used by the deleted effect (verify per selector with `git grep -c` in the file — if
  a selector appears only on its `const … = useVideoStore(…)` line, drop it; most are also used by the
  controls/JSX and stay). The hook subscribes to what it needs independently.

### Testing

`src/hooks/__tests__/useVideoElementSync.test.ts`: unit-test `syncVideoElement` with a mock element
(`{ src, paused, currentTime, volume, muted, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn() }`):
- sets `src` only when different (no write when equal);
- calls `play()` when `isPlaying && paused`, `pause()` when `!isPlaying && !paused`, neither when
  already in the target state;
- sets `currentTime` only when `|drift| > 0.5` (not when within 0.5);
- always applies `volume` and `muted`.

The hook + component repoints are build-verified (no `renderHook`).

## Build sequence (for the plan)

1. Add `src/hooks/useVideoElementSync.ts` + its test → green.
2. Repoint `VideoWorkspace` (add hook, delete effect, prune orphaned selectors); `tsc` + `build` green.
3. Repoint `VideoPiP` (same); `tsc` + `build` green; confirm neither component still hand-rolls a
   `videoRef.current.play()`/`.currentTime =` sync effect.

## Risks

- **Type of `videoRef`** — components declare `useRef<HTMLVideoElement>(null)`; the hook param is
  `RefObject<HTMLVideoElement | null>` (matching `useVideoPlayback`'s convention). These are
  assignable; `tsc` confirms.
- **Over-pruning selectors** — only remove a selector proven unused by grep; when in doubt keep it
  (a redundant subscription is harmless; a removed-but-used one breaks the build, which `tsc` catches).
- **Behaviour** — the two effects are identical, so the shared hook is exact for both; the added
  `videoRef` dep is a stable ref and doesn't change effect cadence.

## Testing strategy

TDD for the pure `syncVideoElement` (failing test first, mock element). The full vitest run OOMs
all-at-once on Windows (pre-existing) — run `useVideoElementSync.test.ts` targeted; cover the two
component repoints with `npx tsc --noEmit` + `npm run build`.
