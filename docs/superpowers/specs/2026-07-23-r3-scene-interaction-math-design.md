# R3 Wave — Scene interaction math seam

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R3** ("pure math trapped in R3F
> god-components + duplicated raycast/drag"). Scoped this wave to **Scene interaction math only**
> — CameraController pinch/pan and MainLayout orchestration are separate clusters, deferred.
> **Vocabulary:** deep module / pure leaf = behaviour behind a small interface at a clean seam.
> The in-repo model to emulate is `boardSnapshot` (pure leaf) + `boardSnapshotIO` (scene/store
> adapter): pure math in one file, the thin engine-coupled adapter beside it.

## Context — what the audit found

`Player.tsx` (652 lines) and `Ball.tsx` (337 lines) are R3F god-components whose per-frame drag
handlers inline pure geometry:

- **Pointer→field**, duplicated **verbatim** in `Player.tsx:144–153` and `Ball.tsx:88–97`:
  `raycaster.setFromCamera(pointer, camera)` → `ray.intersectPlane(y=0)` → `snapToField(x, z)`.
  Each frame also allocates a fresh `Vector3` × 3 + `Plane`.
- **Auto-face rotation** (`Player.tsx:157–168`): `atan2(dx, dz)` once the drag has moved past a
  threshold.
- **Right-drag rotation** (`Player.tsx:133–139`): screen `deltaX` → rotation delta, coupled to
  `window.innerWidth` — which makes it untestable as written.

The math is correct but trapped: it cannot be unit-tested, and the pointer→field pipeline has
already diverged once (the audit flagged the now-deleted `usePlayerControls.ts` as a diverging
duplicate of `Player.tsx`'s inline drag). This wave lifts the math into a pure, tested leaf.

## Goals

1. One pure, unit-tested home for Scene drag geometry — no component inlines raycast/plane/rotation math.
2. Kill the verbatim pointer→field duplication between `Player` and `Ball`.
3. Detangle the `window.innerWidth` coupling out of the component (pass `viewportWidth` in).

## Non-goals (explicitly deferred)

- `CameraController` pinch/pan/zoom math and `MainLayout` orchestration — later R3 waves.
- Any behaviour change. This is a **behaviour-preserving** extraction: same runtime output.
- Undo / history-push sites, drag lifecycle, refs, and pointer event wiring in Player/Ball —
  untouched. Only the math blocks move.
- Pulling the drag lifecycle into a hook (rejected: hooks aren't unit-testable here — no
  `renderHook` — and a hook re-creates the `usePlayerControls` divergence risk).

---

## Design

### New module `src/utils/dragMath.ts`

Pure leaf, sibling to `fieldGeometry.ts`. THREE's math classes (`Ray`, `Vector2`, `Vector3`,
`Camera`) run headless in node, so the pure functions are fully unit-testable.

```ts
/** Named defaults, so callers don't re-encode magic numbers. */
export const ROTATION_SENSITIVITY = 0.01;
export const FACING_MIN_DISTANCE = 0.3;

/**
 * Intersect a ray with the ground plane (y = 0). Returns the [x, z] hit, or
 * null if the ray is parallel to the plane or points away from it.
 * Uses module-scoped scratch vectors — no per-call allocation.
 */
export function intersectGroundPlane(ray: THREE.Ray): [number, number] | null;

/**
 * Facing rotation for a drag step: atan2(dx, dz) once the move exceeds
 * minDistance, else null (too small to determine a direction).
 */
export function facingRotation(
  from: [number, number, number],
  to: [number, number, number],
  minDistance?: number, // default FACING_MIN_DISTANCE
): number | null;

/**
 * Right-drag rotation: screen-space horizontal delta → new absolute rotation.
 * viewportWidth is passed in (was window.innerWidth) so this is pure.
 */
export function dragRotation(
  startRotation: number,
  startClientX: number,
  pointerX: number,     // NDC pointer.x, range -1..1
  viewportWidth: number,
  sensitivity?: number, // default ROTATION_SENSITIVITY
): number;
```

**Thin scene adapter** (the single engine-coupled line), same file:

```ts
/**
 * Snap the current pointer onto the field: raycast from camera, intersect the
 * ground plane, snap to field bounds. Returns [x, z] or null. y is the
 * caller's concern (players sit at 0, the ball at AFL_BALL.length).
 */
export function snapPointerToField(
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
): [number, number] | null;
// setFromCamera(pointer, camera) → intersectGroundPlane(raycaster.ray) → snapToField(x, z)
```

`snapToField` stays in `fieldGeometry`; `dragMath` composes it. The adapter is trivially correct
(three lines); the tested value lives in the pure functions.

### Consumers

**`Ball.tsx`** (88–97): the raycast block collapses to
```ts
const field = snapPointerToField(state.pointer, camera, raycaster);
if (field) {
  const [x, z] = field;
  const newPos: [number, number, number] = [x, AFL_BALL.length, z];
  updateBallPosition(newPos);
  // ...existing movement-recording unchanged...
}
```
Drop the now-unused `Vector3` / `Plane` imports.

**`Player.tsx`**:
- Drag block (144–153) → `snapPointerToField(...)`, same shape as Ball (y = 0).
- Right-drag rotation (133–139) → `updatePlayerRotation(player.id, dragRotation(startRotation, rotationStartRef.current.clientX, state.pointer.x, window.innerWidth))`. `window.innerWidth` is now read at the call site and passed in, not baked into the math.
- Auto-face (157–168) → `const r = facingRotation(prevDragPos.current, newPos); if (r !== null) { updatePlayerRotation(player.id, r); prevDragPos.current = newPos; }`.
- Drop the now-unused `Vector3` / `Plane` imports (keep `snapToField`/`positionToZone` if still used elsewhere).

### Testing

`src/utils/__tests__/dragMath.test.ts` — **characterization** tests, written against the current
inline formulas *before* the inline code is deleted, so any drift fails:

- `intersectGroundPlane`: a downward ray from above → the expected `[x, z]`; a ray parallel to
  y=0 → `null`; a ray pointing up/away from the plane → `null`.
- `facingRotation`: the four cardinal moves → their known `atan2(dx, dz)` angles; a sub-threshold
  move → `null`.
- `dragRotation`: a known `viewportWidth` + pointer delta → the exact rotation the old formula
  produced (pin the `pointerX * width/2` and `startClientX - width/2` recentering).
- `snapPointerToField` (optional integration): construct a plain `OrthographicCamera` + `Raycaster`
  in node, assert a center-screen pointer maps onto the field. Pure pieces above are the priority;
  keep this only if it's stable headless.

## Build sequence (for the plan)

1. Add `src/utils/dragMath.ts` with the four functions + the characterization test suite → green.
2. Repoint `Ball.tsx` onto `snapPointerToField`; typecheck + build green.
3. Repoint `Player.tsx` (drag, drag-rotation, auto-face); typecheck + build green.
4. Confirm no component inlines `intersectPlane` / `new Plane` for the ground plane; run touched suites.

Each step its own tiny commit, build-green between.

## Risks

- **Formula drift** during extraction is the only real risk. Mitigated by writing the
  characterization tests first and matching the current numbers exactly (including the `dragRotation`
  recentering and the `snapToField` composition order).
- **Import cleanup**: removing `Vector3`/`Plane` from Player/Ball must confirm they're unused
  elsewhere in each file (tsc will catch a miss).

## Testing strategy

TDD: `dragMath` ships with its failing-first characterization suite. The full vitest run OOMs
all-at-once on Windows (pre-existing) — run touched suites targeted (`dragMath`, plus a build to
cover the Player/Ball repoint, which have no component-level unit tests).
