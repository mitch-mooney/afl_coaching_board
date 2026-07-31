# 01 — Close the ADR 0001 camera violation

**What to build:** A coach with a Pen tip armed can move the camera with a finger. Today they
cannot — camera control is switched off entirely whenever a tip is armed, so reframing the
board mid-session means disarming the tip and re-arming it afterwards. That is the modal
behaviour the Input contract exists to abolish, and it shipped as a recorded violation.

After this ticket the contract holds in all four cases: a finger orbits whether or not a tip is
armed; a pen with a tip armed authors and never moves the view; a pen with no tip armed orbits
like a finger; a right-drag still pans.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`. Decision and rejected alternatives:
`docs/adr/0004-camera-control-is-gated-per-pointer-type.md`.

- [ ] A finger drag orbits the camera while a Pen tip is armed.
- [ ] A pen Stroke with a tip armed authors and does not move the camera.
- [ ] A pen with no tip armed orbits the camera.
- [ ] A right-drag pans the camera, unchanged.
- [ ] Camera control is still fully disabled while dragging a player, in POV mode, and during
      pinch and two-finger pan.
- [ ] The rule is expressed by reusing the Input contract's existing intent function — no
      second definition of "would this pointer author", and no new state or Stroke-lifecycle
      tracking.
- [ ] The renderer-specific button mapping stays in the camera layer, so the Input contract
      module keeps its type-only imports.
- [ ] New cases in the existing input-contract suite cover all four rows above.
- [ ] Typecheck and production build clean.

> **Do not "simplify" this to a single enabled flag.** The shorter form looks equivalent and
> silently restores the violation. That is the entire reason ADR 0004 exists — read it before
> touching this.
