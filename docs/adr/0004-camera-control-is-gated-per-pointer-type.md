# Camera control is gated per pointer type, not by a global `enabled` flag

## Status

accepted

## Context

ADR 0001 says the pen authors and the finger manipulates, and that moving the camera is
manipulation. A finger must therefore be able to orbit the camera **even while a Pen tip is
armed**.

`CameraController` did the opposite. It computed `isAnnotating = armedTip !== null` and fed
that into `shouldDisableControls`, which drove `OrbitControls`' single `enabled` prop. With a
tip armed, *all* camera control died — finger included. This shipped as a known, recorded
violation of ADR 0001 in the wave that introduced the contract.

The obvious repair is to swap the condition: disable while an authoring **Stroke is in
progress** rather than while a tip is armed. That is still a single global flag, and it has a
real flaw — `OrbitControls` receives the pen's first pointer events before the Stroke
registers, so the camera lurches at the start of every Stroke.

## Decision

Do not use a global flag for this at all. `OrbitControls` **already branches on pointer
type** — in `three@0.168`, `onPointerDown` routes `event.pointerType === 'touch'` to the
touch handlers and everything else (pen and mouse) to the mouse handlers, with
`touches.ONE` and `mouseButtons.LEFT` separately configurable.

That split *is* the input contract. So gate the pen/mouse half alone and leave the touch half
permanently live:

```
mouseButtons={{ LEFT: armedTip ? null : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
```

`isAnnotating` is removed from `shouldDisableControls`. The genuinely global cases —
`isDraggingPlayer`, `isPovActive`, `isPinching`, `isPanning` — stay on `enabled`.

Every row of the contract then falls out of configuration, with no new state and no
Stroke-lifecycle tracking:

| Input | Path taken | Result | ADR 0001 |
|---|---|---|---|
| Finger, tip armed | `touches.ONE` | orbits | finger manipulates |
| Pen, tip armed | `mouseButtons.LEFT = null` | authors, no orbit | pen authors |
| Pen, no tip armed | `mouseButtons.LEFT = ROTATE` | orbits | "behaves as a finger" |
| Right-drag | `mouseButtons.RIGHT` | pans | `button !== 0` → manipulate |

## Considered options

- **Gate on "a Stroke is in progress"** via the existing `enabled` prop. Rejected for the
  first-events lurch above, and because it needs Stroke-lifecycle state that nothing else
  wants.
- **Capture-phase interception** — swallow `pointerdown` before `OrbitControls` sees it when
  `authoringIntent()` returns `'author'`. Correct, but hand-rolls what configuration already
  provides, and adds a listener whose ordering relative to `OrbitControls` must be preserved.

## Consequences

- **This looks like an over-complication and must not be "simplified".** `enabled={!isAnnotating}`
  is shorter, reads as equivalent, and silently reintroduces the ADR 0001 violation. That is
  the whole reason this ADR exists; the cost of reversing it is a bug, not rework.
- **A one-finger drag on the board now orbits the camera while a tip is armed.** Previously it
  did nothing. This is what the contract demands and is intended, but it means a stray finger
  with the Pencil in hand moves the camera mid-diagram.
- The behaviour depends on `OrbitControls` continuing to branch on `pointerType`. If a future
  `three` release changes that routing, the contract breaks quietly — the capture-phase option
  above is the fallback.
- Nothing here needs the Tool rail; the fix stands alone and could ship independently.
