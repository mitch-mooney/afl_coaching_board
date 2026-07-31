# 03 — The board renders on the Active Venue

**What to build:** The payoff. A coach selects Saturday's ground and the board becomes that
ground — the boundary moves, the grass and stadium bowl follow it, the goals sit at the new
ends, and the 50 m arcs cut off where the boundary crosses them. The centre square, arcs, goal
squares and posts keep their real dimensions, because they are **Absolute markings** and are
the same at every ground in the country. A narrow ground is not a scaled-down MCG; it is the
same markings with the boundary pulled in tighter, so the 50 m arc sits closer to the wing.

The boundary is drawn as a visible white line. Without it the app has nothing to point at when
it later says content is outside the boundary, and switching to a tighter ground reads as "the
grass got smaller" rather than "this is your ground, and your wingers don't fit on it."

**The camera does not move when the Active Venue changes.** This is deliberate and is the
easiest thing in the ticket to get wrong by being helpful. Holding the viewpoint still while
the boundary changes underneath *is* the comparison the coach is making; refitting the camera
re-normalises it visually and destroys the very information they switched grounds to see.
Preset views do derive from the Active Venue, so tapping "top view" frames the actual ground.

**Blocked by:** 01 (the `Boundary` parameter must exist), 02 (there must be an Active Venue to
read).

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md`, "The ground" — **Active Venue**, **Boundary**, **Absolute
markings**. Spec: `.scratch/venue/spec.md`. ADR:
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

- [ ] Switching the Active Venue changes the rendered ground immediately, with no reload.
- [ ] Editing the Active Venue's dimensions re-renders identically to switching — the same
      path, not a special case.
- [ ] A white boundary line is drawn on the ellipse and visibly moves between grounds.
- [ ] Grass, apron, stadium bowl, goal posts, goal lines, goal squares, nine-metre markers,
      blue dots and the scoreboard's offset all follow the Active Venue.
- [ ] Every Absolute marking keeps its real size at every ground — centre square 50 × 50,
      arcs 50 m from goal, goal square, post spacing.
- [ ] The 50 m arcs clip at the boundary on a narrow ground. The clipping already tests
      against the ellipse; it needs the venue-derived one.
- [ ] Drag clamping and stroke authoring clamp to the **Active Venue's** boundary. A coach can
      still move players freely on a tight ground.
- [ ] Preset views frame the Active Venue.
- [ ] Switching the Active Venue leaves the camera exactly where it was.
- [ ] A React-side resolver supplies the `Boundary`; the geometry functions keep taking it as
      a parameter and keep reading no store.
- [ ] With Standard ground active, the board is unchanged from ticket 01. That equivalence is
      the regression guard — check it before checking anything else.
