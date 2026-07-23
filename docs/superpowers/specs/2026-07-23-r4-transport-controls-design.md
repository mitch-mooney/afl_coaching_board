# R4 Wave — Shared transport-controls hook

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R4** ("duplicated transport
> state-machines: animationStore↔videoStore, PlayFab↔TransportBar"). This wave takes the **clean,
> low-risk half** — the `PlayFab ↔ TransportBar` UI duplication — behind one shared control hook.
> The `animationStore ↔ videoStore` state-machine overlap is **explicitly declined** (see below).
> **Vocabulary:** the in-repo model is §6b's shared control hooks (`useSetupControls`,
> `useCameraControls`) — one hook owns the store bindings + derived actions, each pod renders its own
> layout. This wave applies the same idea to the transport widgets.

## Context — what the audit found

The board transport is a clean state machine — `animationStore` (isPlaying/progress/speed/loop/…),
`usePathPlayback` (the frame loop), `boardScrub.scrubTo` (scrub while paused). Two **different**
transport UIs consume it:

- **`PlayFab.tsx`** (variant C) — a radial FAB: play/pause button, an arc progress ring with a
  draggable knob, a range-input scrub, a speed pill.
- **`rail/TransportBar.tsx`** (variant B) — a linear bar: play/pause, a stop button, a
  progress `%`, a range-input scrub, a speed pill.

Both bind the **same six** `animationStore` values/actions (`isPlaying`, `hasAnimation`, `progress`,
`speed`, `togglePlayback`, `cycleSpeed`) and both call `scrubTo`. `TransportBar` additionally
hand-rolls a `stop` (`if (isPlaying) togglePlayback(); scrubTo(0)`). The transport *bindings and
semantics* are duplicated across the two files; only the layout differs.

### Why the `animationStore ↔ videoStore` half is declined

`videoStore` is imperatively bound to an `HTMLVideoElement` — native `video.play()/pause()`,
`currentTime` in **seconds**, plus `volume`/`isMuted`/buffering (`useVideoPlayback` syncs it via
`requestAnimationFrame` and DOM events). `animationStore` is an abstract **0..1 progress clock**
driven by `useFrame`, with discrete speed presets and no media element. They share transport
*vocabulary* (`isPlaying`/`currentTime`/`duration`/seek/step) but essentially no *logic*: `play`
means `video.play()` in one and `set({isPlaying:true})` in the other; `seek` means
`video.currentTime = t` vs `setProgress`. Unifying them would force two genuinely-different mediums
into one abstraction — higher risk than the divergence it removes. Left as intentional divergence;
out of scope for this wave.

## Goals

1. One shared hook owns the board-transport bindings + derived actions (`stop`, `scrub`), consumed by
   both `PlayFab` and `TransportBar`. No transport binding or `stop`/`scrub` logic is duplicated
   across the two UIs.

## Non-goals (explicitly deferred / declined)

- **Declined:** unifying `animationStore` and `videoStore` into one transport state machine
  (different mediums — see above).
- The video transport UI (`PlaybackControls`, `useVideoPlayback`) — untouched.
- Extracting the layout math (PlayFab's arc/knob `polar`, TransportBar's `%`) — that is
  layout-specific, stays in each component.
- Any behaviour change. This is a **behaviour-preserving** extraction.

---

## Design

### New `src/components/Board/hud/useTransportControls.ts`

A pure glue hook (no JSX → `.ts`, unlike §6b's `.tsx` control hooks that carry modals). Note it does
**not** return §6b's `HudControls` action-list shape — the transport UIs are bespoke widgets, not
action lists, so it returns the transport state + actions directly.

```ts
import { useAnimationStore, type AnimationSpeed } from '../../../store/animationStore';
import { scrubTo } from '../../../utils/boardScrub';

export interface TransportControls {
  isPlaying: boolean;
  hasAnimation: boolean;
  progress: number;                    // 0..1
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

  return { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub: scrubTo, stop };
}
```

Individual selectors match `PlayFab`'s existing (tighter) subscription pattern. `scrub` is `scrubTo`
directly; `stop` is `TransportBar`'s current logic, lifted verbatim.

### Consumers

**`PlayFab.tsx`** — replace the six `useAnimationStore` selectors (lines 9–14) with:
```ts
const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub } = useTransportControls();
```
Change the scrub `onChange` from `scrubTo(Number(e.target.value) / 1000)` to
`scrub(Number(e.target.value) / 1000)`. Drop the now-unused `import { useAnimationStore }` and
`import { scrubTo }` lines; add `import { useTransportControls } from './useTransportControls';`.
Keep the `arcPath`/`polar` imports and all layout/SVG.

**`rail/TransportBar.tsx`** — replace the whole-store destructure (line 6) and the inline `stop`
(line 7) with:
```ts
const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub, stop } = useTransportControls();
```
Change the scrub `onChange` to `scrub(...)`. Drop the now-unused `import { useAnimationStore }` and
`import { scrubTo }` lines; add `import { useTransportControls } from '../useTransportControls';`
(note the `../` — TransportBar is one level deeper, in `hud/rail/`). Keep the `TEAL` import and layout.

### Testing

No unit test: `useTransportControls` is a glue hook (store bindings + two trivial derived actions),
and there is no `renderHook` in this repo (no `@testing-library/react`) — the same reason §6b's
control hooks carry no unit test. Verified by `npx tsc --noEmit` + `npm run build`, with both
components rendering identically (same values, same actions).

## Build sequence (for the plan)

1. Add `src/components/Board/hud/useTransportControls.ts`; typecheck (unused-but-exported is fine).
2. Repoint `PlayFab.tsx`; typecheck + build green.
3. Repoint `TransportBar.tsx`; typecheck + build green; confirm no transport UI imports `scrubTo`
   or `useAnimationStore` directly anymore.

Small commits, build-green between. Steps 2–3 could even be one commit, but keeping them separate
keeps each component's repoint independently reviewable.

## Risks

- **`stop` relocation** — must stay byte-identical (`if (isPlaying) togglePlayback(); scrubTo(0)`).
  The hook closes over the same `isPlaying`/`togglePlayback`, so it is equivalent.
- **Import-path depth** — `TransportBar` (in `hud/rail/`) imports the hook via `../useTransportControls`;
  `PlayFab` (in `hud/`) via `./useTransportControls`. `tsc` catches a wrong path.
- **Re-render scope** — `TransportBar` moves from a whole-store subscription to individual selectors.
  This only *narrows* what triggers a re-render; the rendered output is identical. Not a behaviour
  change, but noted.

## Testing strategy

No new unit test (glue hook). The full vitest run OOMs all-at-once on Windows (pre-existing) — this
wave adds no test; verification is `npx tsc --noEmit` + `npm run build` (both transport components
have no component-level tests).
