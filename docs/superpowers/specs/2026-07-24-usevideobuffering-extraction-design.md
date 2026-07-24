# Extract useVideoBuffering from useVideoPlayback

> **Status:** Design, ready for implementation-plan.
> **Source:** The optional `useVideoPlayback` structural sub-hook split (deferred from R6 wave 2). A
> coupling analysis showed the sync-loop / transport / DOM-events cluster is **too interlocked** to
> split safely (shared `isSeekingRef`; `startTimeSync`/`stopTimeSync` bridging transport↔events↔loop;
> frame-id refs read by events; no `renderHook` to catch regressions). The **one cleanly-separable
> concern is buffering** — this wave extracts it; the interlocked cluster is left intact by design.

## Context — what the coupling map found

`bufferState` (local `useState`, `useVideoPlayback.ts:114`) is written **only** by the 5 buffering
event handlers inside the big DOM-listener effect (`handleWaiting`/`handleCanPlay`/`handleCanPlayThrough`/
`handleProgress`/`handleStalled`, ~L503–546) plus the "already has buffered data" init block (~L570–578),
and reset in the unmount-cleanup effect. It is **read by nothing internally** and returned as-is. The 5
handlers touch only `video` (from `videoRef`), `setBufferState`, and the already-unit-tested
`videoBuffer` helpers (`calculateBufferedPercent`/`getBufferedRanges`) — **none of the shared refs
(`isSeekingRef`, frame-id refs) or sync functions**. That makes it a clean seam.

By contrast, `handleLoadedMetadata` (L445–452) uses `playbackRate`/`isLooping`/`volume`/`isMuted`, so
those four deps genuinely belong to the big effect and stay with it — the extraction does not disturb
them.

## Goal

Move the buffering concern into a self-contained `useVideoBuffering(videoRef)` hook that owns
`bufferState` and its event wiring, shrinking `useVideoPlayback` and giving buffering one home.

## Non-goals (declined / deferred)

- **Declined:** splitting the sync-loop / transport / DOM-events cluster (too coupled; build-verified-only;
  high regression risk).
- **Left as-is (pre-existing, behaviour-preserving):** the dead `objectUrlRef` (declared + revoked on
  unmount but never assigned) and the double-`startTimeSync`-per-play quirk.
- No change to transport commands, the time-sync loop, the store→element apply effects, or the return
  shape (`bufferState` is still returned, same type).

---

## Design

### New `src/hooks/useVideoBuffering.ts`

```ts
import { useEffect, useState, type RefObject } from 'react';
import { getBufferedRanges, calculateBufferedPercent } from '../utils/videoBuffer';

export interface BufferState {
  isBuffering: boolean;
  bufferedPercent: number;
  bufferedRanges: Array<{ start: number; end: number }>;
  canPlayThrough: boolean;
}

const DEFAULT_BUFFER_STATE: BufferState = {
  isBuffering: false,
  bufferedPercent: 0,
  bufferedRanges: [],
  canPlayThrough: false,
};

/**
 * Owns the buffering state for a <video>: wires the waiting/canplay/canplaythrough/
 * progress/stalled listeners and returns the current BufferState. Extracted from
 * useVideoPlayback — the buffering concern shares nothing with its sync/transport code.
 */
export function useVideoBuffering(videoRef: RefObject<HTMLVideoElement | null>): BufferState {
  const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // ...the 5 handlers verbatim (handleWaiting/handleCanPlay/handleCanPlayThrough/
    //    handleProgress/handleStalled), the 5 addEventListener calls, the
    //    "already has buffered data" init block, and cleanup removing the 5 listeners.

    return () => { /* remove the 5 buffering listeners */ };
  }, [videoRef]);

  return bufferState;
}
```

The handlers, listener names, and init block are the **verbatim** buffering pieces moved out of
`useVideoPlayback`'s big effect. The effect deps are `[videoRef]` (a stable ref) — the buffering
handlers never read the store values the big effect depended on.

### `useVideoPlayback.ts` changes

1. Import `useVideoBuffering` and the `BufferState` type from `./useVideoBuffering`.
2. Replace `const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);` (L114)
   with `const bufferState = useVideoBuffering(videoRef);`.
3. Delete the local `BufferState` interface and `DEFAULT_BUFFER_STATE` (they now live in the new hook).
4. In the big DOM-listener effect, delete: the 5 buffering handler definitions (`handleWaiting`…
   `handleStalled`), their 5 `addEventListener('waiting'|'canplay'|'canplaythrough'|'progress'|'stalled', …)`
   lines, the 5 matching `removeEventListener` lines in the cleanup, and the "Initialize buffer state if
   video already has buffered data" block. **Leave everything else in that effect and its dep array
   unchanged** (`handleLoadedMetadata` + its `playbackRate`/`isLooping`/`volume`/`isMuted` usage, the
   transport/sync handlers, `startTimeSync`/`stopTimeSync`, etc.).
5. Delete the `setBufferState(DEFAULT_BUFFER_STATE)` line from the unmount-cleanup effect (its state now
   lives in the sub-hook; on unmount it's discarded). Keep the rest of that effect.
6. Drop the now-unused imports: `useState` from `react` (bufferState was its only user), and
   `getBufferedRanges`/`calculateBufferedPercent` from `../utils/videoBuffer` (only the buffering
   handlers used them). Keep `BufferState` imported (used by `UseVideoPlaybackReturn`).

`UseVideoPlaybackReturn.bufferState: BufferState` and the returned `bufferState` are unchanged in type
and value.

### Behaviourally-negligible difference (noted)

The buffering listeners now register once (`[videoRef]`) rather than re-registering whenever the big
effect re-ran (on `playbackRate`/`isLooping`/`volume`/`isMuted` changes). The handler closures are
identical and fire identically, so observable behaviour is unchanged; the "already buffered" init block
runs on mount instead of on every such change, which is invisible since `progress` events keep
`bufferState` current. Net effect: fewer redundant listener re-registrations.

## Testing

- The buffer math (`calculateBufferedPercent`) is already unit-tested in `videoBuffer.test.ts` — that
  coverage stands and now backs the sub-hook.
- `useVideoBuffering` is event-listener + `useState` wiring with no pure logic to add; there is no
  `renderHook` in the repo, so it's **build-verified** (`npx tsc --noEmit` + `npm run build`). No new
  unit test.
- Grep guard: after the change, `useVideoPlayback.ts` contains no `setBufferState`, no
  `DEFAULT_BUFFER_STATE`, and no `'waiting'`/`'stalled'` listener strings — all buffering lives in
  `useVideoBuffering.ts`.

## Risks

- **Incomplete move** — a buffering handler or listener left behind (build/grep guard catches a stray
  `setBufferState`/listener string; `tsc` catches a dangling reference).
- **Disturbing the big effect** — the extraction must remove ONLY the buffering handlers/listeners/init
  block; the transport/sync handlers, `handleLoadedMetadata`, and the dep array stay byte-identical.
- **Unused-import fallout** — removing `useState` and the `videoBuffer` imports; `tsc` confirms they're
  truly unused (verified: `useState` only backed `bufferState`; the `videoBuffer` fns only backed the
  buffering handlers).

## Testing strategy

No TDD (imperative hook wiring; the math is already tested). The full vitest run OOMs on Windows
(pre-existing) — run `videoBuffer.test.ts` targeted (confirming the shared math still passes), plus
`tsc` + `build` for the extraction.
