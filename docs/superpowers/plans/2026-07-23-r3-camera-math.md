# R3 POV Camera Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the POV follow-camera geometry inlined in `CameraController.useFrame` into a pure, unit-tested `cameraMath.ts` leaf, with no behaviour change.

**Architecture:** New pure-leaf module `src/utils/cameraMath.ts` exports `povCameraPose(playerPosition, playerRotation, povHeight, povDistance): PovPose` (plain-number in/out, no THREE dependency) plus the named constants `POV_LOOK_AHEAD`/`POV_LOOK_UP`. `CameraController.useFrame` drops its inline direction/camera/lookAt arithmetic and calls the leaf; the lerp/slerp smoothing stays in the component. Mirrors the just-shipped `dragMath` wave.

**Tech Stack:** TypeScript, React Three Fiber, THREE.js, Zustand, Vitest (jsdom env).

## Global Constraints

- **Behaviour-preserving refactor.** Runtime output must be identical to the current inline math. Characterization tests pin the current formulas exactly: direction sign convention (`directionX = sin(rotation)`, `directionZ = cos(rotation)`), the behind-the-player offset (`− direction · distance`), and the `5` look-ahead / `1` look-up constants.
- **Only the geometry moves.** The `lerp`/`slerp`/quaternion/matrix smoothing (the `0.1` factor, the `new THREE.Vector3(0,1,0)` up vector, `updateProjectionMatrix`) stays in `CameraController`. The extraction stops at producing the `position` / `lookAt` tuples.
- **THREE stays imported** in `CameraController` (`new THREE.Vector3(...)`, `Quaternion`, `Matrix4` are still used). Do not remove the `import * as THREE from 'three'` line.
- **Full vitest run OOMs on Windows** (pre-existing) — run the touched suite targeted; verify the `CameraController` repoint with `npx tsc --noEmit` + `npm run build` (it has no component-level test).
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `cameraMath.ts` pure leaf + tests

**Files:**
- Create: `src/utils/cameraMath.ts`
- Test: `src/utils/__tests__/cameraMath.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no imports beyond `Math`).
- Produces (relied on by Task 2):
  - `POV_LOOK_AHEAD: number` (= `5`)
  - `POV_LOOK_UP: number` (= `1`)
  - `interface PovPose { position: [number, number, number]; lookAt: [number, number, number] }`
  - `povCameraPose(playerPosition: [number, number, number], playerRotation: number, povHeight: number, povDistance: number): PovPose`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/cameraMath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { povCameraPose, POV_LOOK_AHEAD, POV_LOOK_UP } from '../cameraMath';

describe('povCameraPose', () => {
  it('faces +z at rotation 0: camera sits behind (−z), looks ahead (+z)', () => {
    const pose = povCameraPose([0, 0, 0], 0, 3, 10);
    expect(pose.position).toEqual([0, 3, -10]);
    expect(pose.lookAt).toEqual([0, 1, 5]);
  });

  it('faces +x at rotation π/2: camera sits behind (−x), looks ahead (+x)', () => {
    const pose = povCameraPose([0, 0, 0], Math.PI / 2, 3, 10);
    expect(pose.position[0]).toBeCloseTo(-10, 10);
    expect(pose.position[1]).toBe(3);
    expect(pose.position[2]).toBeCloseTo(0, 10);
    expect(pose.lookAt[0]).toBeCloseTo(5, 10);
    expect(pose.lookAt[1]).toBe(1);
    expect(pose.lookAt[2]).toBeCloseTo(0, 10);
  });

  it('tracks a non-origin player, applying height and distance offsets', () => {
    const pose = povCameraPose([10, 2, -4], 0, 3, 10);
    expect(pose.position).toEqual([10, 5, -14]);
    expect(pose.lookAt).toEqual([10, 3, 1]);
  });

  it('exposes the look-ahead and look-up constants', () => {
    expect(POV_LOOK_AHEAD).toBe(5);
    expect(POV_LOOK_UP).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/cameraMath.test.ts`
Expected: FAIL — `Failed to resolve import "../cameraMath"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/cameraMath.ts`:

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
): PovPose {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/cameraMath.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/utils/cameraMath.ts src/utils/__tests__/cameraMath.test.ts
git commit -m "refactor: add cameraMath pure POV-pose leaf + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Route `CameraController.useFrame` through `povCameraPose`

**Files:**
- Modify: `src/components/Scene/CameraController.tsx` (add import; replace the inline POV math block, currently lines 182–205)

**Interfaces:**
- Consumes: `povCameraPose` from `../../utils/cameraMath` (Task 1).
- Produces: nothing new — behaviour-preserving repoint.

- [ ] **Step 1: Add the cameraMath import**

After the existing `import { useGestures } from '../../hooks/useGestures';` line (~line 8), add:
```ts
import { povCameraPose } from '../../utils/cameraMath';
```

Leave the `import * as THREE from 'three';` line intact — `THREE.Vector3`, `THREE.Quaternion`, `THREE.Matrix4` are still used below.

- [ ] **Step 2: Replace the inline POV math block**

Inside the `useFrame` callback, replace this span (currently lines 182–205 — match on the quoted code, not the numbers):
```ts
    const [px, py, pz] = player.position;

    // Always use player's facing rotation for camera direction
    // rotation=0 means facing positive Z, so:
    // directionX = sin(rotation), directionZ = cos(rotation)
    const directionX = Math.sin(player.rotation);
    const directionZ = Math.cos(player.rotation);

    // Position camera behind and above the player
    // Camera is positioned opposite to the direction of movement
    const cameraX = px - directionX * povDistance;
    const cameraY = py + povHeight;
    const cameraZ = pz - directionZ * povDistance;

    // Look ahead of the player in their direction of movement
    const lookAtX = px + directionX * 5;
    const lookAtY = py + 1; // Look slightly above player height
    const lookAtZ = pz + directionZ * 5;

    // Smoothly interpolate camera position for smoother following
    camera.position.lerp(new THREE.Vector3(cameraX, cameraY, cameraZ), 0.1);

    // Create a target point and smoothly look at it
    const targetPoint = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
```
with:
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

Leave everything after `const targetPoint` (the `targetQuaternion` / `lookMatrix` / `slerp` smoothing and `camera.updateProjectionMatrix()`) unchanged, and leave the guards above (`isPovActive`, `activePovPlayerId`, `getPlayer(...)`, `if (!player) return;`) unchanged.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (`px`/`py`/`pz` were only used in the removed block, so no unused-variable leftover; `povHeight`, `povDistance`, `player`, `camera`, `THREE` all remain used.)

- [ ] **Step 4: Confirm the inline arithmetic is gone**

Run: `git grep -n "directionX\|cameraX\|lookAtX" src/components/Scene/CameraController.tsx`
Expected: no matches (the inline direction/camera/lookAt names are gone; the geometry now lives only in the tested leaf).

- [ ] **Step 5: Build + run the pure suite**

Run: `npm run build`
Expected: `✓ built`, no errors.

Run: `npx vitest run src/utils/__tests__/cameraMath.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/Scene/CameraController.tsx
git commit -m "refactor: route CameraController POV follow through cameraMath

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code, not the number.
- This wave changes no behaviour; there is no new component test because `CameraController.tsx` has none today and adding an R3F frame-loop harness is out of scope. Confidence comes from the `cameraMath` characterization suite plus a clean typecheck + build of the consumer.
- Out of scope (do not touch): the `cameraStore` pinch/pan/zoom math, OrbitControls config, touch/wheel handlers, gesture routing, the lerp/slerp smoothing, and `MainLayout`.
