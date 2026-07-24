# R6 Wave 2 — Extract useVideoPlayback's pure core

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R6** ("video ownership scattered; the
> 762-line `useVideoPlayback` god-hook"). Exploration found the hook is ~90% imperative glue (rAF/
> frame-callback time-sync, `video.play()`/`.currentTime=`, ~120 lines of DOM event wiring) wrapped
> around a **small pure core** (buffer math + frame conversions). This wave extracts that core into a
> tested leaf and dedups the frame math onto `videoUtils`. The **structural sub-hook split is
> declined** for this slice (imperative, unit-untestable — no `renderHook` — higher risk).

## Context — what the audit + exploration found

- Two module-level helpers in the hook compute buffering: `getBufferedRanges(video)` (reads
  `video.buffered`) and `calculateBufferedPercent(video)` (sum of buffered range lengths ÷ duration,
  capped at 100). The **percent math is pure** once the `video.buffered`/`video.duration` reads are
  separated; it's **untested** today.
- The hook re-derives frame math inline that already exists in `videoUtils`:
  `currentFrame = Math.floor(currentTime * ASSUMED_FRAME_RATE)` is exactly `timeToFrame(currentTime)`
  (`videoUtils.timeToFrame = Math.floor(time * 30)`), and the two `stepFrame` bodies'
  `frames * (1/ASSUMED_FRAME_RATE)` is `frameToTime(frames)` (`= frames / 30`). `timeToFrame` is
  bit-identical; `frames/30` vs `frames*(1/30)` are exactly equal at every reachable call site (all
  callers pass `frames = 1`) and differ by at most ~1 ULP (~1e-16 s — far below one frame, clamped on
  seek) otherwise. `clampTime` is already imported from `videoUtils`.

## Goals

1. Move the buffer math into a pure, unit-tested `videoBuffer.ts` leaf (adds coverage to the hook's
   one computational concern).
2. Dedup the inline frame conversions onto `videoUtils.timeToFrame`/`frameToTime` (removing the
   hook's private `ASSUMED_FRAME_RATE`).

## Non-goals (declined / deferred)

- **Declined for this slice:** splitting the imperative shell into sub-hooks (time-sync / transport /
  DOM-event wiring). Build-verified-only, higher regression risk — a later wave if desired.
- The rAF/frame-callback loop, the transport commands (`play`/`pause`/`seek`/`setRate`/volume), and
  the DOM event-listener effect stay in the hook.
- Any behaviour change. This is a **behaviour-preserving** extraction + dedup.

---

## Design

### 1. New `src/utils/videoBuffer.ts`

```ts
export interface BufferedRange {
  start: number;
  end: number;
}

/** Adapter: read a video element's buffered TimeRanges as plain {start,end} objects. */
export function getBufferedRanges(video: HTMLVideoElement): BufferedRange[] {
  const ranges: BufferedRange[] = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
  }
  return ranges;
}

/**
 * Percentage (0..100) of the video duration that is buffered — sum of the
 * buffered range lengths over duration, capped at 100. Returns 0 when duration
 * is 0/falsy or nothing is buffered.
 */
export function calculateBufferedPercent(ranges: BufferedRange[], duration: number): number {
  if (!duration || duration === 0) return 0;
  if (ranges.length === 0) return 0;
  let total = 0;
  for (const range of ranges) total += range.end - range.start;
  return Math.min((total / duration) * 100, 100);
}
```

`getBufferedRanges` moves verbatim (typed with `BufferedRange`). `calculateBufferedPercent` is the
current body made **pure** — it takes `ranges + duration` instead of reading them off the element.

### 2. `useVideoPlayback.ts` repoint

- Delete the local `getBufferedRanges` and `calculateBufferedPercent` definitions (and their doc
  comments); import both from `../utils/videoBuffer`.
- Add `frameToTime, timeToFrame` to the existing `videoUtils` import.
- At the 4 buffer-state sites (`handleCanPlay`, `handleCanPlayThrough`, `handleProgress`, and the
  already-buffered init block), change `calculateBufferedPercent(video)` →
  `calculateBufferedPercent(getBufferedRanges(video), video.duration)`. The adjacent
  `bufferedRanges: getBufferedRanges(video)` line is unchanged (literal behaviour-preservation — each
  site still reads `video.buffered` twice, exactly as today).
- Frame dedup: `currentFrame` → `timeToFrame(currentTime)`; in both `stepFrame` bodies, drop
  `const frameDuration = 1 / ASSUMED_FRAME_RATE` and use `frameToTime(frames)` in the `clampTime(...)`
  call; delete the now-unused `const ASSUMED_FRAME_RATE = 30`.

`BufferState.bufferedRanges` (typed `Array<{start; end}>`) is structurally identical to
`BufferedRange[]`, so no type friction. `DEFAULT_BUFFER_STATE` and the `BufferState` interface stay in
the hook.

### 3. Testing

`src/utils/__tests__/videoBuffer.test.ts`:
- `calculateBufferedPercent`: empty ranges → 0; `duration` 0 → 0; single range `[{0,50}]`/100 → 50;
  multiple `[{0,25},{50,75}]`/100 → 50; caps at 100 (`[{0,200}]`/100 → 100).
- `getBufferedRanges`: one test with a faked `video.buffered` (`{ length, start(i), end(i) }`) → the
  expected `[{start,end}]` array.

The hook repoint has no unit test (no `renderHook`); it's covered by `tsc` + `build`.

## Build sequence (for the plan)

1. Add `src/utils/videoBuffer.ts` + its test → green.
2. Repoint `useVideoPlayback.ts` (buffer import + 4 call sites + frame dedup + delete
   `ASSUMED_FRAME_RATE`); `tsc` + `build` green; confirm `ASSUMED_FRAME_RATE` and the local buffer
   helpers are gone from the hook.

## Risks

- **Frame-dedup drift** — mitigated: `timeToFrame` is bit-identical to `Math.floor(t*30)`;
  `frameToTime(frames)=frames/30` equals the old `frames*(1/30)` exactly at every reachable call site
  (callers pass `frames=1`) and differs by ≤1 ULP (~1e-16 s, negligible + seek-clamped) otherwise.
  Both are already unit-tested in `videoUtils`.
- **Buffer-math drift** — the extracted `calculateBufferedPercent` reproduces the original guards
  (`!duration`, empty ranges) and formula exactly; the new tests pin it.
- **Double `video.buffered` read** at each site is preserved (not "optimized"), keeping the change a
  pure move.

## Testing strategy

TDD for the pure `videoBuffer` helpers (failing test first). The full vitest run OOMs all-at-once on
Windows (pre-existing) — run `videoBuffer.test.ts` targeted; cover the hook repoint with
`npx tsc --noEmit` + `npm run build`.
