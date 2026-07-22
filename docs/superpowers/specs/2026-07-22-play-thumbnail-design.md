# Play Thumbnail — Design

**Date:** 2026-07-22
**Branch:** `feat/board-snapshot-module`

## Goal

Fill the placeholder thumbnail area in each `PlayCard` (in `PlayLibrary.tsx`) with a
real, at-a-glance visual of the play: a top-down tactical schematic — an oval field
with team-coloured dots for players, a dot for the ball, and thin lines for the
movement paths.

The thumbnail renders the play's **end state** via `boardAt(phase, 1)`: tokens and the
ball sit at their path ends while the path polylines (drawn from the unchanged paths)
show how they got there. This is the first store-free consumer of `boardAt` — no live
stores, no WebGL, just math → SVG — and it stays consistent with the shared viewer,
which also renders the end state.

## Non-goals

- No cones or annotations (players + ball + paths only).
- No 3D / perspective / jerseys — an abstract top-down schematic is more legible at
  ~100px and far cheaper (a WebGL context per grid card is a non-starter).
- No caching / precompute / stored image. SVG is cheap enough to compute on render.
- No interactivity (no play/scrub) — a single static frame.

## Architecture

Two new units plus one integration point.

### 1. `src/utils/thumbnailProjection.ts` — pure, store-free

The deep part: all the geometry behind one call. Given a `BoardSnapshot` and a target
viewBox, produce flat 2D draw primitives.

```ts
export interface ThumbnailViewBox {
  width: number;
  height: number;
  padding: number; // inset in viewBox units so dots near the boundary aren't clipped
}

export interface ThumbnailPrimitives {
  field: { cx: number; cy: number; rx: number; ry: number };
  players: { x: number; y: number; color: string }[];
  ball: { x: number; y: number } | null;
  paths: { points: [number, number][] }[];
}

export function projectSnapshot(
  snap: BoardSnapshot,
  viewBox: ThumbnailViewBox,
): ThumbnailPrimitives;
```

**Projection.** World positions are `[x, y, z]`; the thumbnail ignores `y` (up) and maps
`(x, z)` top-down:

- x (field length, `FIELD_CONFIG.length = 165`) → horizontal, long axis.
- z (field width, `FIELD_CONFIG.width = 135`) → vertical.

Let `L = FIELD_CONFIG.length`, `W = FIELD_CONFIG.width`, and the drawable box be
`[padding, width - padding] × [padding, height - padding]`. A world point maps as:

```
sx = padding + ( x / L + 0.5 ) * (width  - 2*padding)
sy = padding + ( z / W + 0.5 ) * (height - 2*padding)
```

`field` is the oval that exactly fills the drawable box: `cx = width/2`, `cy = height/2`,
`rx = (width - 2*padding)/2`, `ry = (height - 2*padding)/2`.

The viewBox itself is chosen proportional to the field so the oval is undistorted, e.g.
`width = 200`, `height = round(200 * W / L)`; the SVG element then scales this into the
260×100 card slot with `preserveAspectRatio="xMidYMid meet"` (letterboxed, centred).

- `players`: one point per `snap.players` entry, carrying `player.color` as `color`.
- `ball`: `snap.ball` projected, or `null` when `snap.ball` is null.
- `paths`: one polyline per `snap.paths` entry **with ≥ 2 keyframes**; `points` are the
  projected keyframe positions in order. Paths with < 2 keyframes are omitted.

The function reads nothing from stores and mutates nothing.

### 2. `src/components/UI/PlayThumbnail.tsx` — thin presentational SVG

```ts
export function PlayThumbnail({ play }: { play: Play }): JSX.Element;
```

- Reads `play.phases[0]` (the single phase used today). If absent, renders just the
  field oval.
- Computes `boardAt(fromPhase(phase), 1)` to get the end-state snapshot, then
  `projectSnapshot(endState, VIEWBOX)`.
- Renders an `<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet">` containing:
  - `<ellipse>` for the field (subtle stroke, no fill — the card already has a green
    gradient backdrop behind it).
  - one `<polyline>` per path (thin, semi-transparent stroke, no fill).
  - one `<circle>` per player, filled with its `color`.
  - one `<circle>` for the ball, if present: a small white fill with a thin dark stroke,
    so it reads against both the dark backdrop and the coloured player dots (team colours
    like white/red would otherwise blend with a brown ball).
- No stores, no state, no effects — a pure function of `play`.

Module-level constant `VIEWBOX: ThumbnailViewBox` (e.g. `{ width: 200, height: 164,
padding: 12 }` — 164 ≈ 200 × 135/165). Marker radii are constants tuned for the viewBox.

### 3. Integration — `src/components/UI/PlayLibrary.tsx`

Inside the existing 100px thumbnail box (currently lines ~186–241), replace the empty
placeholder rectangle (`<div style={{ ...width: 80, height: 60, border... }} />`, line
~189) with `<PlayThumbnail play={play} />`. Everything else in the box — the dark green
radial-gradient backdrop, the video badges, the clip-duration strip — is unchanged. The
thumbnail sits between the backdrop and the overlays.

## Data flow

```
Play
  └─ phases[0] : PlayPhase
       └─ fromPhase()          → BoardSnapshot           (utils/boardSnapshot)
            └─ boardAt(·, 1)    → end-state BoardSnapshot (utils/boardPlayback)
                 └─ projectSnapshot(·, VIEWBOX) → ThumbnailPrimitives (utils/thumbnailProjection)
                      └─ <svg> ellipse + polylines + circles           (PlayThumbnail)
```

## Edge cases

| Case | Behaviour |
|---|---|
| `play.phases` empty / `phases[0]` undefined | Render the field oval only (recognisable empty board). |
| No players | Field oval, no player dots. |
| `ball` null (legacy / no ball) | No ball dot. |
| Path with < 2 keyframes | No polyline for it. |
| Player position outside the oval | Still projected linearly (may sit slightly outside the ellipse stroke); acceptable — no clamping. |

## Testing

`projectSnapshot` gets store-free unit tests in
`src/utils/__tests__/thumbnailProjection.test.ts`:

- World origin `(0,0)` → viewBox centre.
- World extremes `(±L/2, ±W/2)` → the padded box corners.
- `player.color` carried through to the projected point.
- `ball: null` → `field`/`players` present, `ball === null`.
- A 2-keyframe path → a 2-point polyline with the expected projected endpoints.
- A 1-keyframe (or empty) path → omitted from `paths`.

`PlayThumbnail` is a thin SVG render; it is left to visual verification. A live browser
check needs the app running with saved Plays, so verification for this feature is
typecheck + `projectSnapshot` unit tests + a note that the SVG itself was not
browser-verified.

## File map

| File | Change |
|---|---|
| `src/utils/thumbnailProjection.ts` | New — `projectSnapshot` + types (pure). |
| `src/utils/__tests__/thumbnailProjection.test.ts` | New — projection unit tests. |
| `src/components/UI/PlayThumbnail.tsx` | New — SVG component. |
| `src/components/UI/PlayLibrary.tsx` | Swap the placeholder rectangle for `<PlayThumbnail>`. |

## Commit plan

1. `feat: add projectSnapshot — pure top-down thumbnail projection` (helper + tests).
2. `feat: add PlayThumbnail SVG component and use it in PlayLibrary cards` (component + integration).
