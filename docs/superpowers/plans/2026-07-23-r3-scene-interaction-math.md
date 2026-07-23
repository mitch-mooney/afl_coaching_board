# R3 Scene Interaction Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the pure drag geometry inlined in `Player.tsx` / `Ball.tsx` into a pure, unit-tested `dragMath.ts` leaf plus a thin `snapPointerToField` adapter, with no behaviour change.

**Architecture:** New pure-leaf module `src/utils/dragMath.ts` holds three plain-number/THREE-math functions (`intersectGroundPlane`, `facingRotation`, `dragRotation`) and one thin scene adapter (`snapPointerToField`) that composes raycast + intersect + `snapToField`. `Player.tsx` and `Ball.tsx` drop their inline raycast/rotation blocks and call the module. This mirrors the in-repo `boardSnapshot` (pure leaf) + `boardSnapshotIO` (adapter) model.

**Tech Stack:** TypeScript, React Three Fiber, THREE.js, Zustand, Vitest (jsdom env).

## Global Constraints

- **Behaviour-preserving refactor.** Runtime output must be identical to the current inline math. Characterization tests pin the current formulas exactly (strict `>` thresholds, recentering arithmetic, `snapToField` compose order).
- **THREE math runs headless** under the vitest `jsdom` environment — `Ray`, `Vector3`, `Vector2` construct fine in tests.
- **`snapToField(x, z): [number, number]`** already exists in `src/utils/fieldGeometry.ts` and clamps to field bounds — reuse it, do not reimplement.
- **Full vitest run OOMs on Windows** (pre-existing) — run touched suites targeted; verify the two component repoints with `npx tsc --noEmit` + `npm run build`.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `dragMath.ts` pure leaf + adapter

**Files:**
- Create: `src/utils/dragMath.ts`
- Test: `src/utils/__tests__/dragMath.test.ts`

**Interfaces:**
- Consumes: `snapToField(x: number, z: number): [number, number]` from `../utils/fieldGeometry`.
- Produces (relied on by Tasks 2 & 3):
  - `ROTATION_SENSITIVITY: number` (= `0.01`)
  - `FACING_MIN_DISTANCE: number` (= `0.3`)
  - `intersectGroundPlane(ray: THREE.Ray): [number, number] | null`
  - `facingRotation(from: [number, number, number], to: [number, number, number], minDistance?: number): number | null`
  - `dragRotation(startRotation: number, startClientX: number, pointerX: number, viewportWidth: number, sensitivity?: number): number`
  - `snapPointerToField(pointer: THREE.Vector2, camera: THREE.Camera, raycaster: THREE.Raycaster): [number, number] | null`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/dragMath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Ray, Vector3 } from 'three';
import {
  intersectGroundPlane,
  facingRotation,
  dragRotation,
  ROTATION_SENSITIVITY,
  FACING_MIN_DISTANCE,
} from '../dragMath';

describe('intersectGroundPlane', () => {
  it('returns the [x, z] where a downward ray meets y=0', () => {
    const ray = new Ray(new Vector3(5, 10, 3), new Vector3(0, -1, 0));
    expect(intersectGroundPlane(ray)).toEqual([5, 3]);
  });

  it('returns null for a ray parallel to the ground plane', () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(1, 0, 0));
    expect(intersectGroundPlane(ray)).toBeNull();
  });

  it('returns null for a ray pointing away from the plane (t < 0)', () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, 1, 0));
    expect(intersectGroundPlane(ray)).toBeNull();
  });
});

describe('facingRotation', () => {
  it('faces +z as rotation 0', () => {
    expect(facingRotation([0, 0, 0], [0, 0, 1])).toBe(Math.atan2(0, 1));
  });

  it('faces +x as atan2(1, 0)', () => {
    expect(facingRotation([0, 0, 0], [1, 0, 0])).toBe(Math.atan2(1, 0));
  });

  it('faces -z as atan2(0, -1)', () => {
    expect(facingRotation([0, 0, 0], [0, 0, -1])).toBe(Math.atan2(0, -1));
  });

  it('returns null for a sub-threshold move', () => {
    expect(facingRotation([0, 0, 0], [0, 0, 0.2])).toBeNull();
  });

  it('returns null at exactly the threshold (strict >)', () => {
    expect(facingRotation([0, 0, 0], [0, 0, FACING_MIN_DISTANCE])).toBeNull();
  });
});

describe('dragRotation', () => {
  it('is a no-op when the pointer sits at the recentred start', () => {
    // startClientX at viewport centre, pointer at NDC centre → zero delta
    expect(dragRotation(0, 500, 0, 1000)).toBe(0);
  });

  it('applies sensitivity to the recentred screen delta', () => {
    // clientX = 0.5 * 1000/2 = 250; deltaX = 250 - (500 - 500) = 250
    // 1 + 250 * 0.01 = 3.5
    expect(dragRotation(1, 500, 0.5, 1000)).toBeCloseTo(3.5, 10);
  });

  it('exposes the default sensitivity constant', () => {
    expect(ROTATION_SENSITIVITY).toBe(0.01);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/dragMath.test.ts`
Expected: FAIL — `Failed to resolve import "../dragMath"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/dragMath.ts`:

```ts
import { Plane, Ray, Vector2, Vector3, Camera, Raycaster } from 'three';
import { snapToField } from './fieldGeometry';

/** Rotation applied per recentred screen-pixel during right-drag. */
export const ROTATION_SENSITIVITY = 0.01;
/** A drag step must exceed this (metres) before it sets a facing direction. */
export const FACING_MIN_DISTANCE = 0.3;

// Module-scoped scratch — avoids the per-frame Vector3/Plane allocation the
// inline callers used to do.
const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0); // y = 0
const scratchHit = new Vector3();

/**
 * Intersect a ray with the ground plane (y = 0). Returns the [x, z] hit, or
 * null when the ray is parallel to the plane or points away from it.
 */
export function intersectGroundPlane(ray: Ray): [number, number] | null {
  const hit = ray.intersectPlane(GROUND_PLANE, scratchHit);
  return hit ? [hit.x, hit.z] : null;
}

/**
 * Facing rotation for a drag step: atan2(dx, dz) once the move exceeds
 * minDistance, else null (too small to determine a direction).
 */
export function facingRotation(
  from: [number, number, number],
  to: [number, number, number],
  minDistance: number = FACING_MIN_DISTANCE,
): number | null {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist > minDistance ? Math.atan2(dx, dz) : null;
}

/**
 * Right-drag rotation: horizontal screen delta → new absolute rotation.
 * viewportWidth is passed in (was window.innerWidth) so this is pure.
 */
export function dragRotation(
  startRotation: number,
  startClientX: number,
  pointerX: number,
  viewportWidth: number,
  sensitivity: number = ROTATION_SENSITIVITY,
): number {
  const clientX = (pointerX * viewportWidth) / 2;
  const deltaX = clientX - (startClientX - viewportWidth / 2);
  return startRotation + deltaX * sensitivity;
}

/**
 * Snap the current pointer onto the field: raycast from the camera, intersect
 * the ground plane, snap to field bounds. Returns [x, z] or null. The caller
 * owns y (players sit at 0, the ball at AFL_BALL.length).
 */
export function snapPointerToField(
  pointer: Vector2,
  camera: Camera,
  raycaster: Raycaster,
): [number, number] | null {
  raycaster.setFromCamera(pointer, camera);
  const point = intersectGroundPlane(raycaster.ray);
  if (!point) return null;
  return snapToField(point[0], point[1]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/dragMath.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

> Note: `snapPointerToField` has no unit test by design — it is a three-line adapter whose only logic (`intersectGroundPlane`) is already covered, and a headless camera-projection test is degenerate for a straight-down view. It is exercised by the Task 2 / Task 3 consumer builds.

- [ ] **Step 6: Commit**

```bash
git add src/utils/dragMath.ts src/utils/__tests__/dragMath.test.ts
git commit -m "refactor: add dragMath pure Scene-interaction leaf + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Route `Ball.tsx` drag through `snapPointerToField`

**Files:**
- Modify: `src/components/Scene/Ball.tsx` (import line 3; raycast block 88–94)

**Interfaces:**
- Consumes: `snapPointerToField` from `../../utils/dragMath` (Task 1).
- Produces: nothing new — behaviour-preserving repoint.

- [ ] **Step 1: Replace the `three` import (Ball.tsx line 3)**

`Vector3` and `Plane` are used only in the raycast block being removed; `Mesh` stays (`useRef<Mesh>`).

Change:
```ts
import { Mesh, Vector3, Plane } from 'three';
```
to:
```ts
import { Mesh } from 'three';
```

- [ ] **Step 2: Add the dragMath import**

After the existing `import { snapToField } from '../../utils/fieldGeometry';` line (~line 10), add:
```ts
import { snapPointerToField } from '../../utils/dragMath';
```

> `snapToField` may now be unused in `Ball.tsx`. If `npx tsc --noEmit` in Step 4 reports it unused, remove that import line too; if other code in the file still uses it, leave it.

- [ ] **Step 3: Replace the raycast block**

Replace this block (currently ~lines 87–98):
```ts
    if (isDragging) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [x, z] = snapToField(intersection.x, intersection.z);
        const newPos: [number, number, number] = [x, AFL_BALL.length, z];
```
with:
```ts
    if (isDragging) {
      const field = snapPointerToField(state.pointer, camera, raycaster);

      if (field) {
        const [x, z] = field;
        const newPos: [number, number, number] = [x, AFL_BALL.length, z];
```

Leave everything after `const newPos ...` (movement recording, path logic, closing braces) unchanged.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If it flags `snapToField` or `raycaster`/`camera` as unused, resolve per Step 2's note — but `camera` and `raycaster` are still passed to `snapPointerToField`, so they remain used.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built` with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Scene/Ball.tsx
git commit -m "refactor: route Ball drag through snapPointerToField

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Route `Player.tsx` drag / rotation through `dragMath`

**Files:**
- Modify: `src/components/Scene/Player.tsx` (import line 4; rotation block 133–140; drag block 143–171)

**Interfaces:**
- Consumes: `snapPointerToField`, `dragRotation`, `facingRotation` from `../../utils/dragMath` (Task 1).
- Produces: nothing new — behaviour-preserving repoint.

- [ ] **Step 1: Remove the `three` value import (Player.tsx line 4)**

`Vector3` and `Plane` are used only in the raycast block being removed. Delete the whole line:
```ts
import { Vector3, Plane } from 'three';
```

- [ ] **Step 2: Add the dragMath import**

After the existing `import { snapToField, positionToZone } from '../../utils/fieldGeometry';` line (~line 12), add:
```ts
import { snapPointerToField, dragRotation, facingRotation } from '../../utils/dragMath';
```

> `snapToField` may now be unused in `Player.tsx`. If `npx tsc --noEmit` in Step 5 reports it unused, drop it from the `fieldGeometry` import (keep `positionToZone` if still used); otherwise leave the import as-is.

- [ ] **Step 3: Replace the right-drag rotation block (currently ~lines 133–140)**

Replace:
```ts
    // Handle rotation (right-click drag)
    if (isRotating && rotationStartRef.current) {
      const clientX = state.pointer.x * window.innerWidth / 2;
      const deltaX = clientX - (rotationStartRef.current.clientX - window.innerWidth / 2);
      const rotationDelta = deltaX * 0.01; // Sensitivity factor
      const newRotation = rotationStartRef.current.startRotation + rotationDelta;
      updatePlayerRotation(player.id, newRotation);
    }
```
with:
```ts
    // Handle rotation (right-click drag)
    if (isRotating && rotationStartRef.current) {
      const newRotation = dragRotation(
        rotationStartRef.current.startRotation,
        rotationStartRef.current.clientX,
        state.pointer.x,
        window.innerWidth,
      );
      updatePlayerRotation(player.id, newRotation);
    }
```

- [ ] **Step 4: Replace the drag + auto-face block (currently ~lines 143–171)**

Replace:
```ts
    if (isDragging && !isRotating) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [x, z] = snapToField(intersection.x, intersection.z);
        const newPos: [number, number, number] = [x, 0, z];
        updatePlayerPosition(player.id, newPos);

        // Auto-rotate player to face movement direction
        if (prevDragPos.current) {
          const deltaX = newPos[0] - prevDragPos.current[0];
          const deltaZ = newPos[2] - prevDragPos.current[2];
          const moveDist = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

          // Only update rotation if moved enough to determine direction
          if (moveDist > 0.3) {
            const newRotation = Math.atan2(deltaX, deltaZ);
            updatePlayerRotation(player.id, newRotation);
            prevDragPos.current = newPos;
          }
        } else {
          prevDragPos.current = newPos;
        }
```
with:
```ts
    if (isDragging && !isRotating) {
      const field = snapPointerToField(state.pointer, camera, raycaster);

      if (field) {
        const [x, z] = field;
        const newPos: [number, number, number] = [x, 0, z];
        updatePlayerPosition(player.id, newPos);

        // Auto-rotate player to face movement direction. prevDragPos only
        // advances when a facing is actually applied — matching the old logic.
        if (prevDragPos.current) {
          const newRotation = facingRotation(prevDragPos.current, newPos);
          if (newRotation !== null) {
            updatePlayerRotation(player.id, newRotation);
            prevDragPos.current = newPos;
          }
        } else {
          prevDragPos.current = newPos;
        }
```

Leave everything after this (the `lastRecordedPos` movement-recording block and closing braces) unchanged.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Resolve any unused-import flag per Step 2's note.

- [ ] **Step 6: Verify no component still inlines the ground-plane raycast**

Run: `git grep -n "intersectPlane" src/components`
Expected: no matches (the only two call sites are now gone).

- [ ] **Step 7: Build + run the pure suite**

Run: `npm run build`
Expected: `✓ built`, no errors.

Run: `npx vitest run src/utils/__tests__/dragMath.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 8: Commit**

```bash
git add src/components/Scene/Player.tsx
git commit -m "refactor: route Player drag/rotation through dragMath

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code, not the number.
- This wave changes no behaviour; there are no new component tests because `Player.tsx` / `Ball.tsx` have none today and adding R3F component harnesses is out of scope. Confidence comes from the `dragMath` characterization suite plus a clean typecheck + build of both consumers.
- Out of scope (do not touch): `CameraController` pinch/pan, `MainLayout`, undo/history-push sites, drag lifecycle, refs, and pointer-event wiring.
