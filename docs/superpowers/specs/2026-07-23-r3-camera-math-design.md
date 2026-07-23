# R3 Wave — POV camera math seam

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R3** ("pure math trapped in R3F
> god-components"). This is the second R3 wave (after `dragMath` — Scene interaction math). Scoped
> to the **POV follow-camera geometry** trapped in `CameraController`. The pinch/pan/zoom math
> (`cameraStore`) and `MainLayout` are separate clusters, deferred.
> **Vocabulary:** deep module / pure leaf = behaviour behind a small interface at a clean seam.
> The in-repo models to emulate are `boardSnapshot` and the just-shipped `dragMath` (pure math in
> one tested file; the engine-coupled application stays in the component).

## Context — what the audit found

`CameraController.tsx` (233 lines) is an R3F god-component: it wires OrbitControls, touch/wheel
listeners, gesture routing, and a per-frame POV follow-camera. Most of its math is already at a
clean seam — pinch/pan/zoom live in `cameraStore` actions (`applyPinchZoom`, `applyTwoFingerPan`,
`setPOVDistance`), and gesture detection lives in the tested `useGestures` hook.

The exception is the **POV follow-camera geometry**, inlined in the `useFrame` block
(`CameraController.tsx:175–217`) and **untested** (`cameraStore.test.ts` covers only POV *slot*
state, not this math). Given a followed player's pose it computes where the camera should sit and
what it should look at:

```
directionX = sin(rotation);  directionZ = cos(rotation)
cameraX = px - directionX * povDistance;  cameraY = py + povHeight;  cameraZ = pz - directionZ * povDistance
lookAtX = px + directionX * 5;            lookAtY = py + 1;           lookAtZ = pz + directionZ * 5
```

The result is then smoothed onto the live camera via `lerp`/`slerp`. The pure geometry (player
pose → camera pose) is trapped inside the frame loop and cannot be unit-tested. This wave lifts it
into a pure, tested leaf.

## Goals

1. One pure, unit-tested home for the POV follow-camera geometry — the frame loop no longer inlines it.
2. Make the magic constants (`5` look-ahead, `1` look-up) named and covered by tests.

## Non-goals (explicitly deferred)

- The pinch/pan/zoom math in `cameraStore` (`applyPinchZoom` / `applyTwoFingerPan` / `setPOVDistance`)
  — already at the store seam; adding its tests is a separate (later) item.
- OrbitControls configuration, touch/wheel event handlers, gesture routing.
- The `lerp` / `slerp` smoothing (the `0.1` factor, the `up` vector, quaternion/matrix work) — that
  is animation, not geometry; it stays in the component.
- `MainLayout` orchestration — a later R3 wave.
- Any behaviour change. This is a **behaviour-preserving** extraction: same runtime output.

---

## Design

### New module `src/utils/cameraMath.ts`

Pure leaf, sibling to `dragMath.ts` / `fieldGeometry.ts`. Plain-number in, plain-number out —
fully unit-testable, no THREE or R3F dependency.

```ts
/** How far ahead of the player (world units) the POV camera looks. */
export const POV_LOOK_AHEAD = 5;
/** Height (world units) of the look-target above the player. */
export const POV_LOOK_UP = 1;

export interface PovPose {
  /** Where the camera should sit. */
  position: [number, number, number];
  /** The point the camera should look at. */
  lookAt: [number, number, number];
}

/**
 * POV-follow camera pose: the camera sits behind + above the player along their
 * facing and looks ahead in that direction. rotation = 0 faces +z, so
 * directionX = sin(rotation), directionZ = cos(rotation).
 */
export function povCameraPose(
  playerPosition: [number, number, number],
  playerRotation: number,
  povHeight: number,
  povDistance: number,
): PovPose;
```

Body — transcribed verbatim from `CameraController.tsx:187–199`:

```ts
export function povCameraPose(playerPosition, playerRotation, povHeight, povDistance) {
  const [px, py, pz] = playerPosition;
  const directionX = Math.sin(playerRotation);
  const directionZ = Math.cos(playerRotation);
  return {
    position: [
      px - directionX * povDistance,
      py + povHeight,
      pz - directionZ * povDistance,
    ],
    lookAt: [
      px + directionX * POV_LOOK_AHEAD,
      py + POV_LOOK_UP,
      pz + directionZ * POV_LOOK_AHEAD,
    ],
  };
}
```

### Consumer — `CameraController.useFrame`

The pure pose computation moves out; the R3F-coupled *application* (lerp/slerp smoothing) stays.
Replace the inline direction/camera/lookAt arithmetic (`CameraController.tsx:184–205`) with:

```ts
const { position: camPos, lookAt } = povCameraPose(
  player.position,
  player.rotation,
  povHeight,
  povDistance,
);

// Smoothly interpolate camera position for smoother following
camera.position.lerp(new THREE.Vector3(...camPos), 0.1);

// Create a target point and smoothly look at it
const targetPoint = new THREE.Vector3(...lookAt);
```

Everything after `targetPoint` (the quaternion/`lookMatrix`/`slerp` smoothing and
`updateProjectionMatrix`) is unchanged. Allocation count is identical to today (the old code
already did `new THREE.Vector3(cameraX, cameraY, cameraZ)` and `new THREE.Vector3(lookAtX, …)`), so
runtime behaviour is byte-identical. The `povHeight` / `povDistance` / `player` reads and the POV
guards (`isPovActive`, `activePovPlayerId`, `getPlayer`) are untouched.

### Testing

`src/utils/__tests__/cameraMath.test.ts` — **characterization** tests pinning the current formulas:

- rotation `0` (faces +z), player `[0, 0, 0]`, height `3`, distance `10`
  → `position` `[0, 3, -10]`, `lookAt` `[0, 1, 5]`. (exact — sin 0 = 0, cos 0 = 1)
- rotation `Math.PI / 2` (faces +x), player `[0, 0, 0]`, height `3`, distance `10`
  → `position[0]` ≈ `-10`, `position[2]` ≈ `0`; `lookAt[0]` ≈ `5`, `lookAt[2]` ≈ `0`
  (`toBeCloseTo` — `cos(π/2)` ≈ 6e-17). `position[1]` = `3`, `lookAt[1]` = `1` exact.
- non-origin player `[10, 2, -4]`, rotation `0`, height `3`, distance `10`
  → `position` `[10, 5, -14]`, `lookAt` `[10, 3, 1]` (offsets track the player).
- `POV_LOOK_AHEAD === 5`, `POV_LOOK_UP === 1`.

## Build sequence (for the plan)

1. Add `src/utils/cameraMath.ts` (`povCameraPose` + constants) with the characterization suite → green.
2. Repoint `CameraController.useFrame` onto `povCameraPose`; typecheck + build green; confirm the
   inline `directionX`/`cameraX`/`lookAtX` arithmetic is gone.

Two tiny commits, build-green between.

## Risks

- **Formula drift** during extraction — the only real risk. Mitigated by writing the characterization
  tests first and matching the current numbers exactly (direction sign convention, the `5`/`1`
  constants, the `−direction·distance` behind-the-player offset).
- **Over-reach into the smoothing code** — the lerp/slerp/quaternion block must stay in the
  component. The extraction stops at producing `camPos` / `lookAt` tuples.

## Testing strategy

TDD: `cameraMath` ships with its failing-first characterization suite. The full vitest run OOMs
all-at-once on Windows (pre-existing) — run the touched suite targeted (`cameraMath`), and cover the
`CameraController` repoint with `npx tsc --noEmit` + `npm run build` (it has no component-level test).
