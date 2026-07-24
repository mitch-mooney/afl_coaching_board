# R2 cameraStore Math Characterization Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the current behaviour of `cameraStore`'s five untested math actions with characterization tests — no source change.

**Architecture:** Append five `describe` blocks to the existing `src/store/__tests__/cameraStore.test.ts`, importing `cameraStore`'s already-exported clamp constants. Expected values are hand-derived from the formulas in `src/store/cameraStore.ts` (verified), so they are genuine regression guards, not tautologies.

**Tech Stack:** TypeScript, Zustand, Vitest (jsdom env).

## Global Constraints

- **Test-only wave — do NOT modify `src/store/cameraStore.ts` or any other source file.** If any expected value below does not match current behaviour, the fix is to correct the *test's expected value* to match the code, never to change the store.
- **Characterization, not TDD:** these tests pass on first run (green — there is no code change to drive them red first). That is expected and correct.
- Use `toEqual` for the exact integer tuples/values (all inputs are chosen to land on exact results — no floats).
- **Full vitest run OOMs on Windows** (pre-existing) — run `cameraStore.test.ts` targeted.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Add cameraStore math characterization tests

**Files:**
- Modify: `src/store/__tests__/cameraStore.test.ts` (extend the import; append 5 describe blocks)

**Interfaces:**
- Consumes: `useCameraStore` (already imported); the exported constants `MIN_ZOOM`, `MAX_ZOOM`, `MIN_POV_DISTANCE`, `MAX_POV_DISTANCE` from `../cameraStore`.
- Produces: no runtime surface — tests only.

- [ ] **Step 1: Extend the import line**

Change the existing top import:
```ts
import { useCameraStore } from '../cameraStore';
```
to:
```ts
import { useCameraStore, MIN_ZOOM, MAX_ZOOM, MIN_POV_DISTANCE, MAX_POV_DISTANCE } from '../cameraStore';
```

- [ ] **Step 2: Append the five describe blocks**

Add at the end of `src/store/__tests__/cameraStore.test.ts` (after the existing `dual-POV slots` describe):

```ts
describe('applyPinchZoom', () => {
  it('multiplies the initial zoom by the pinch factor', () => {
    useCameraStore.getState().applyPinchZoom(2, 1);
    expect(useCameraStore.getState().zoom).toBe(2);
  });

  it('clamps to MAX_ZOOM', () => {
    useCameraStore.getState().applyPinchZoom(10, 1);
    expect(useCameraStore.getState().zoom).toBe(MAX_ZOOM);
  });

  it('clamps to MIN_ZOOM', () => {
    useCameraStore.getState().applyPinchZoom(0.1, 1);
    expect(useCameraStore.getState().zoom).toBe(MIN_ZOOM);
  });

  it('uses the passed initialZoom, not the current zoom', () => {
    useCameraStore.getState().applyPinchZoom(2, 1.5);
    expect(useCameraStore.getState().zoom).toBe(3);
  });
});

describe('applyTwoFingerPan', () => {
  it('applies a negated, half-scaled screen delta to position and target (y unchanged)', () => {
    useCameraStore
      .getState()
      .applyTwoFingerPan({ x: 100, y: 50 }, [0, 50, 150], [0, 0, 0]);
    const s = useCameraStore.getState();
    // worldDeltaX = -100 * 0.5 = -50 ; worldDeltaZ = -50 * 0.5 = -25 ; y untouched
    expect(s.position).toEqual([-50, 50, 125]);
    expect(s.target).toEqual([-50, 0, -25]);
  });
});

describe('setPOVDistance', () => {
  it('sets a distance within range', () => {
    useCameraStore.getState().setPOVDistance(20);
    expect(useCameraStore.getState().povDistance).toBe(20);
  });

  it('clamps below MIN_POV_DISTANCE', () => {
    useCameraStore.getState().setPOVDistance(1);
    expect(useCameraStore.getState().povDistance).toBe(MIN_POV_DISTANCE);
  });

  it('clamps above MAX_POV_DISTANCE', () => {
    useCameraStore.getState().setPOVDistance(100);
    expect(useCameraStore.getState().povDistance).toBe(MAX_POV_DISTANCE);
  });
});

describe('focusOnPlayer', () => {
  it('targets the player and offsets the camera by [+20, 30, +30]', () => {
    useCameraStore.getState().focusOnPlayer([10, 0, -5]);
    const s = useCameraStore.getState();
    expect(s.target).toEqual([10, 0, -5]);
    expect(s.position).toEqual([30, 30, 25]);
  });
});

describe('setPresetView', () => {
  it('top: overhead position, origin target, zoom 1', () => {
    useCameraStore.getState().setPresetView('top');
    const s = useCameraStore.getState();
    expect(s.position).toEqual([0, 200, 0]);
    expect(s.target).toEqual([0, 0, 0]);
    expect(s.zoom).toBe(1);
  });

  it('sideline: position [0,50,150]', () => {
    useCameraStore.getState().setPresetView('sideline');
    expect(useCameraStore.getState().position).toEqual([0, 50, 150]);
  });

  it('end-to-end: position [150,50,0]', () => {
    useCameraStore.getState().setPresetView('end-to-end');
    expect(useCameraStore.getState().position).toEqual([150, 50, 0]);
  });

  it('clears an active POV slot', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-1');
    expect(useCameraStore.getState().activePovSlot).toBe(1);
    useCameraStore.getState().setPresetView('top');
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });
});
```

- [ ] **Step 3: Run the suite to verify it passes**

Run: `npx vitest run src/store/__tests__/cameraStore.test.ts`
Expected: PASS — the existing 5 POV-slot tests + the ~14 new ones all green (characterization: green on first run).

> If any new test FAILS, the expected value doesn't match current behaviour — correct the **test's**
> expected value to match `src/store/cameraStore.ts`. Do NOT change the store.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (the imported constants exist and are exported).

- [ ] **Step 5: Commit**

```bash
git add src/store/__tests__/cameraStore.test.ts
git commit -m "test: characterize cameraStore pinch/pan/zoom + preset math

Pins applyPinchZoom (clamp), applyTwoFingerPan (negated half-scaled delta),
setPOVDistance (clamp), focusOnPlayer (offset), and setPresetView (presets +
POV-slot clear). Test-only; no cameraStore change.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- This is a test-only wave — `src/store/cameraStore.ts` and all other source files stay untouched.
- The `setPresetView` "clears an active POV slot" test uses `setPovPlayer` (already exercised by the
  existing POV-slot describe) as the precondition — it's a real store action, not a mock.
- No `npm run build` step is needed (no source change), though running it is harmless.
