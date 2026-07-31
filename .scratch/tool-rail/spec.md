# Spec — Tool rail, and closing the ADR 0001 camera violation

**Status:** ready-for-agent

Wave C of the iPad input-model rework. Waves A and B are on `feat/input-contract`.
Decisions recorded in `docs/adr/0001-pen-authors-finger-manipulates.md`,
`docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`,
`docs/adr/0004-camera-control-is-gated-per-pointer-type.md`. Vocabulary in `CONTEXT.md`.

## Problem Statement

A coach running a live session on an iPad, Apple Pencil in hand, cannot switch between
marking up the board and moving players without a trip through a menu. ADR 0001 established
that the Pen tips belong on an always-visible **Tool rail** precisely so that arming a tip is
never a menu trip — but the rail was never built. The Path tip currently arms from an interim
item buried in the Setup fan, and the Annotation tips live in a palette that must be opened
from a second Setup-fan item. Arming a tip therefore still costs the menu trip the contract
was meant to abolish.

Worse, the board currently ships a contract it does not honour. `CameraController` disables
all camera control whenever a Pen tip is armed, so **a finger cannot move the camera while
the pen is armed** — a direct contradiction of "the finger manipulates", recorded as a known
violation when the contract landed. Mid-session, the coach must disarm the tip to reframe the
board, then re-arm it, which is the modal behaviour ADR 0001 exists to escape.

Two smaller faults compound it. In the Rail **HUD skin** the **Mode rail** paints over the
hamburger, so the global menu appears unreachable. And the Path tip has no keyboard shortcut,
because the shortcut layer predates Path being a tip — so on desktop the one tip that is not
an Annotation cannot be armed from the keyboard.

## Solution

An always-visible **Tool rail** on the left edge, present in both HUD skins, carrying all
seven Pen tips and the current colour. Arming a tip is one tap, always, from anywhere.

Camera control stops being gated on whether a tip is armed and is instead gated per pointer
type, so a finger orbits the camera at all times while the pen authors — the contract as
written, with no mode to escape.

The Mode rail moves to the right edge to make room, which also uncovers the hamburger; the
hamburger itself folds into the editor top bar as an icon. `AnnotatePalette` and the
`↗ Annotate…` Setup-fan item are deleted, their surviving concerns rehomed.

## User Stories

1. As a coach mid-session, I want the Pen tips visible at all times, so that arming one never
   costs a trip through a menu.
2. As a coach, I want to arm any of the six Annotation tips from the Tool rail, so that I can
   mark up the board without opening a palette.
3. As a coach, I want to arm the Path tip from the same rail as the Annotation tips, so that
   authoring a MovementPath is not a different kind of action from drawing an arrow.
4. As a coach, I want the armed tip to be visually obvious on the rail, so that I know what my
   next Stroke will become before I make it.
5. As a coach, I want to disarm the current tip by tapping it again, so that returning the pen
   to a pointer is as cheap as arming was.
6. As a coach, I want the current colour shown on the rail in that colour, so that I can see
   at a glance what I am about to draw with.
7. As a coach, I want to change colour from a popover on the rail, so that the rail stays thin
   and does not eat the field.
8. As a coach, I want thickness to live in that same popover, so that a setting I choose once
   does not occupy permanent space.
9. As a coach with the pen armed, I want a one-finger drag to orbit the camera, so that I can
   reframe the board without disarming my tip.
10. As a coach, I want a pen Stroke with a tip armed to author and never move the camera, so
    that drawing does not fight the view.
11. As a coach, I want a pen with no tip armed to behave as a finger, so that the pen is still
    usable as a pointer for selecting players.
12. As a coach, I want a right-drag to keep panning the camera, so that the existing desktop
    gesture is unchanged.
13. As a coach previewing an animation, I want to keep annotating, so that I can mark up a
    moving diagram.
14. As a coach previewing an animation, I want the Path tip unavailable, so that I cannot
    author a path against players that are mid-flight.
15. As a coach, I want the disabled Path tip to look disabled during playback, so that it does
    not read as a broken button.
16. As a coach, I want my armed tip to survive pressing play, so that previewing mid-authoring
    does not cost me the tip I was using.
17. As a coach, I want the Tool rail in the same place in both HUD skins, so that muscle memory
    transfers when the skin changes.
18. As a right-handed coach resting my hand on the glass, I want the Tool rail away from where
    my palm lands, so that I do not silently re-arm a tip while drawing.
19. As a coach in the Rail skin, I want the hamburger reachable, so that I can open the global
    menu.
20. As a coach, I want the hamburger in the editor top bar with the other navigation, so that
    every navigation affordance is in one strip.
21. As a coach on a desktop, I want a keyboard shortcut for the Path tip, so that all seven
    tips are equally reachable.
22. As a coach, I want pressing a tip's shortcut twice to leave it armed, so that shortcuts are
    idempotent.
23. As a coach, I want Clear annotations beside Clear paths, so that the two bulk-clear actions
    live together.
24. As a coach placing a text Annotation, I want the text field to appear near where I tapped,
    so that I am not looking across the screen while typing.
25. As a coach, I want the Tool rail only on the Board tab, so that it does not intrude on
    Video or Training.
26. As a coach, I want the rail to respect the iPad safe area, so that the bottom tip is not
    under the home indicator.
27. As a developer, I want the camera rule expressed through the input contract, so that the
    contract has one definition and not two.
28. As a developer, I want the Path-during-playback rule as a pure function, so that it is
    testable without rendering.
29. As a developer, I want the rail's disabled state and the authoring guard to consult the
    same rule, so that they cannot disagree.

## Implementation Decisions

**Tool rail placement.** Left edge, both HUD skins, anchored below the editor top bar and
running to the safe-area bottom inset. Board tab only. In the Rail skin the Mode rail moves to
the right edge — position only, no redesign. Rationale and rejected alternatives in ADR 0003;
the deciding argument is that an accidental Mode rail tap opens a visible panel whereas an
accidental Tool rail tap silently re-arms a tip.

**One rail component, both skins.** The Tool rail is not something a HUD skin varies, so it is
rendered once for both rather than implemented per skin.

**Rail contents.** Seven tips (six Annotation kinds plus Path); a current-colour button
rendered in the current colour, opening a popover holding the colour swatches and the
thickness control. A Tool rail button arms an instrument and never opens a panel — the
colour button is the sole exception and is not a tip.

**`AnnotatePalette` is deleted**, along with the `↗ Annotate…` Setup-fan item and the interim
`✏ Path tip` Setup-fan item. Its five concerns are rehomed: tips and colour to the rail;
thickness into the colour popover; **Clear annotations to the Setup panel** beside the existing
Clear paths; the **text-entry field stays transient near the tap point**, no longer owned by a
deleted component.

**Hamburger folds into the editor top bar** as an icon, freeing the left edge. This also
resolves the z-index collision that makes it unreachable in the Rail skin.

**Camera gating.** `isAnnotating` is removed from the global disable entirely. The pen/mouse
half of OrbitControls is gated alone, leaving the touch half permanently live. OrbitControls
routes `pointerType === 'touch'` to the touch handlers and pen/mouse to the mouse handlers, so
its own split already matches the contract. The rule reuses `authoringIntent` rather than
introducing a parallel definition — the `three`-specific mapping stays in the camera layer so
the contract module keeps its type-only imports. `isDraggingPlayer`, `isPovActive`,
`isPinching` and `isPanning` remain globally disabling. **This must not be "simplified" back
to a single enabled flag** — see ADR 0004.

**Playback rule.** A new pure predicate in the input contract answers whether a given tip can
be armed given playback state: Path is unavailable while an animation plays, everything else is
unaffected. The armed tip is **not** cleared on play. Both the rail's disabled state and the
stroke-authoring guard consult this one predicate, so they cannot drift.

**Keyboard shortcuts.** The tip-selection shortcut layer is widened from Annotation kinds to
the full tip set so Path can be armed from the keyboard. Existing idempotency behaviour —
pressing a tip's key twice leaves it armed rather than toggling — is preserved.

## Testing Decisions

A good test here asserts **external behaviour through the contract's public functions**, not
the shape of the components that consume them. The rail's markup, the popover's open state and
the Mode rail's coordinates are all implementation detail and are deliberately untested.

**One seam: the input contract module.** It is pure, dependency-free and already has a test
file — prior art is the existing input-contract and path-authoring suites added in wave B.

- **Camera gating** adds cases to the existing `authoringIntent` suite covering the four rows
  of the ADR 0004 table: finger with a tip armed manipulates; pen with a tip armed authors; pen
  with no tip armed manipulates; non-primary button manipulates. No new function is introduced.
- **The playback predicate** gets its own cases: Path blocked while playing, Path allowed when
  stopped, every Annotation tip allowed in both states.
- **The keyboard shortcut** widening is covered at the existing shortcut-registry seam, prior
  art in the shortcut-suppression suite: the Path key arms Path, and pressing it twice leaves
  Path armed.

**No component tests.** This repo has no React Testing Library or R3F test harness — every
existing test is pure-logic or store-level. Standing one up is a larger decision than this
wave and is explicitly declined. The rail UI, the Mode rail move, the hamburger fold and the
`AnnotatePalette` deletion are verified by typecheck, production build, and the on-device iPad
smoke.

## Out of Scope

- **Any Mode rail redesign.** It is known clutter and gets its own pass, better informed once
  the Tool rail has been used live. This wave moves it and nothing else.
- **A handedness flip setting**, and **palm-rejection hardening** (rejecting pointer events
  whose size suggests a palm). Both deferred until the iPad smoke says whether the left edge is
  also palm-exposed. `hudPreferenceStore` is the obvious home if a flip is ever needed.
- **Persisting the armed tip** across reloads. It resets to none today and that stays.
- **Venue, stadium, and player silhouette** — items 2 to 4 of the ship order, behind this wave.
- **TrainingMode repair**, unrelated feature work.

## Further Notes

The camera fix has no dependency on the Tool rail and could ship on its own. It is the only
part of this wave with correctness stakes — the branch currently ships a contract it does not
honour — so if the rail work stretches, splitting it out is a clean cut.

The hamburger z-index collision is a **code-level finding, not yet confirmed at runtime**:
the Mode rail sits at a higher stacking order than the hamburger and covers it. Whoever picks
this up should confirm it on the device before treating the fold into the top bar as a bug fix
rather than a tidy-up.

Nothing in this wave has had an on-device iPad smoke, and neither did waves A or B. For a
pen/finger input model that smoke is the acceptance test that matters; typecheck, build and the
pure-seam suites are necessary but not sufficient.
