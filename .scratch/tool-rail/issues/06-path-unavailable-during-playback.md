# 06 — Path unavailable during playback

**What to build:** A coach can annotate a moving diagram, but cannot author a MovementPath
against players that are mid-flight.

Annotations are inert markup — drawing a circle over a moving player is a legitimate coaching
gesture and nothing about playback makes it wrong. The Path tip is different in kind: it writes
to the very state playback is reading, and it claims its entity by proximity, so a Path Stroke
authored mid-animation would attach to whatever happens to be nearby at that instant. That is
not merely odd; it is a write during a read of the same state.

So the Path tip alone becomes unavailable while an animation plays, and reads as disabled
rather than silently doing nothing. Every other tip keeps working.

The armed tip is **not** cleared when playback starts — the coach previews mid-authoring often,
and losing the tip on every preview would grate.

**Blocked by:** 03 — the rail is where the disabled state is shown.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`.

- [ ] While an animation plays, the Path tip cannot be armed.
- [ ] While an animation plays, the Path tip renders in a visibly disabled state.
- [ ] While an animation plays, every Annotation tip can still be armed and can author.
- [ ] A tip that was armed before playback started is still armed after playback ends.
- [ ] If Path was armed when playback started, no Path Stroke can be authored until playback
      ends.
- [ ] The rule lives in one pure predicate in the Input contract, taking the tip and playback
      state — the rail's disabled state and the stroke-authoring guard both consult it, so
      they cannot disagree.
- [ ] The predicate is covered by tests: Path blocked while playing, Path allowed when
      stopped, every Annotation tip allowed in both states.
- [ ] Typecheck and production build clean.
