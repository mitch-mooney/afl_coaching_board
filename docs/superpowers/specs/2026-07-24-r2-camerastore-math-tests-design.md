# R2 Wave — cameraStore math characterization tests

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R2** ("shallow stores / Dexie
> singleton no seam"). Exploration **re-scoped** this wave: the shallow-store half was already done
> by the `playStore` gateway, and the **Dexie-injection seam is YAGNI** — `fake-indexeddb/auto` (in
> `src/test/setup.ts`) already makes the singleton Dexie stores testable, and the canonical spec
> explicitly deferred a DB-injection interface. The one genuine remaining R2 gap is `cameraStore`'s
> **untested pinch/pan/zoom math**. This wave closes that with characterization tests only.

## Context — what the audit + exploration found

- **Dexie-injection seam — declined (YAGNI).** `src/test/setup.ts` imports `fake-indexeddb/auto`, so
  `AppDatabase`/`db` and `VideoDatabase`/`videoDb` singletons run against a real in-memory IndexedDB
  in tests. The store suites (playStore, videoStore, playbookStore, appDatabaseMigration) already
  exercise real Dexie CRUD. Introducing DI would add ceremony for a testability benefit that already
  exists — and the canonical spec said "keep the singleton for now." Out of scope.
- **Real gap: `cameraStore` math is untested.** `cameraStore.test.ts` covers only the dual-POV slot
  state (5 tests). The math actions — `applyPinchZoom`, `applyTwoFingerPan`, `setPOVDistance`,
  `focusOnPlayer`, `setPresetView` — have **no tests**. These are pure store state-transitions with
  clamping/offset math worth pinning (they complement the `dragMath`/`cameraMath` characterization
  suites from the R3 waves).

## Goals

1. Add characterization tests pinning the current behaviour of `cameraStore`'s five untested math
   actions, so a future refactor can't silently drift the formulas.

## Non-goals

- The Dexie-injection seam (declined — YAGNI).
- Any `cameraStore` **code** change — this is a test-only wave; behaviour is unchanged.
- The trivial setters (`setZoom`, `setCameraPosition`, `setCameraTarget`, `resetCamera`, POV-slot
  actions already covered).

---

## Design

Append five `describe` blocks to `src/store/__tests__/cameraStore.test.ts`, importing the
already-exported clamp constants (`MIN_ZOOM`, `MAX_ZOOM`, `MIN_POV_DISTANCE`, `MAX_POV_DISTANCE`).
Expected values are hand-derived from the formulas (verified against `cameraStore.ts`), not read off
the implementation.

- **`applyPinchZoom(zoomFactor, initialZoom)`** = `clamp(initialZoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)`:
  - `(2, 1)` → `zoom = 2`
  - clamp-max: `(10, 1)` → `zoom = MAX_ZOOM` (4)
  - clamp-min: `(0.1, 1)` → `zoom = MIN_ZOOM` (0.5)
  - uses `initialZoom`, not current: `(2, 1.5)` → `zoom = 3`
- **`applyTwoFingerPan(delta, initPos, initTarget)`** — `panScale = 0.5`, negated (`worldDelta = -delta *
  0.5`), applied to `position` and `target`, y unchanged:
  - `({x:100, y:50}, [0,50,150], [0,0,0])` → `position = [-50, 50, 125]`, `target = [-50, 0, -25]`
  - (documents drag-right → camera-left via the negation)
- **`setPOVDistance(d)`** = `clamp(d, MIN_POV_DISTANCE, MAX_POV_DISTANCE)`:
  - `20` → `povDistance = 20`; `1` → `3`; `100` → `40`
- **`focusOnPlayer([x,y,z])`** → `target = [x, y, z]`, `position = [x+20, 30, z+30]`:
  - `[10, 0, -5]` → `target = [10, 0, -5]`, `position = [30, 30, 25]`
- **`setPresetView(view)`** → `target [0,0,0]`, `zoom 1`, `activePovSlot null`, and:
  - `'top'` → `position [0,200,0]`; `'sideline'` → `position [0,50,150]`; `'end-to-end'` → `position [150,50,0]`
  - clears an active POV slot: set `activePovSlot` first, call `setPresetView('top')`, assert it's `null`

Use `toEqual` for the exact integer tuples/values (no floats involved — all inputs chosen to land on
exact results).

## Testing / verification

These are **characterization** tests: they pass against the current code (green on first run, not
red-first — there is no code change to drive). They are genuine (hand-derived expected values,
independent of the implementation), so a formula change would fail them. The existing 5 POV-slot
tests stay; the file goes 5 → ~19 tests.

- `npx vitest run src/store/__tests__/cameraStore.test.ts` → all green.
- `npx tsc --noEmit` → clean.
- (No `npm run build` needed — test-only, no source change — but harmless to run.)

## Risks

- **Characterization drift** — if any expected value doesn't match current behaviour the test fails
  immediately on first run; fix the expected value to match the code (do NOT change `cameraStore.ts`).
- **State leakage between tests** — the existing `beforeEach` resets POV-slot fields; the new tests
  either supply absolute inputs (pinch/pan/povDistance/focus/preset all set absolute values or take
  init params) or set the needed precondition inline (the preset-clears-slot case), so no additional
  reset is required. If a test proves order-dependent, extend the `beforeEach` reset.

## Testing strategy

Test-only wave — no TDD red phase (characterization). The full vitest run OOMs all-at-once on Windows
(pre-existing); run `cameraStore.test.ts` targeted.
