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

**Status:** done — `feat/venue-01-boundary`

**Outcome — the ticket was a two-line change plus the camera.** Ticket 01's `useActiveBoundary`
did its job: making the board follow the Active Venue meant changing that one file from
`return STANDARD_BOUNDARY` to a store read, and the grass, apron, bowl, goals, arcs, scoreboard,
drag clamping and stroke authoring all followed with no edit at all. The only real work was the
camera presets, which were the one consumer of the ground that had never been routed through a
`Boundary`.

**Hands ticket 06 a live problem, deliberately.** Thumbnails resolve the same hook, so they now
project against a Venue's dimensions — through `projectSnapshot`, which still maps `x / length`
into a fixed box. That is the normalisation the ADR rejects, and it was harmless only while the
dimensions were constant; this ticket ends the constancy. It is not a regression — a thumbnail
still draws its players in the right place relative to the ellipse it draws, and pinning
thumbnails to Standard ground instead would have been worse, putting a tight ground's boundary
players outside the drawn oval. But from this commit until 06 lands, two different grounds
render the same *shape* in the play list, which is the one thing a coach scanning the list is
looking for. Ticket 06 already owns the fix (fit the boundary, letterbox the remainder).

**One design decision the ticket did not anticipate:** **preset framing is now a pure function
of the ground, and the standoff has a football meaning.** `setPresetView` used to `set()` three
hardcoded vectors; it now takes a `Boundary` and delegates to `presetCameraPose` in `cameraMath`.
Both oblique presets stand off the centre by `semiX + semiZ`, and the two terms mean different
things in each — the near semi-axis carries the camera clear of the ground, the far one is the
dimension that has to fit across the frame. At Standard ground that is 82.5 + 67.5 = 150, exactly
where those views have always sat, so the presets are unmoved for a coach who never records a
Venue. The `Boundary` is a parameter rather than a store read inside `cameraStore` for the same
reason it is everywhere else in this wave: the compiler names every caller. Top view is the one
preset that cannot use that sum — looking straight down there is no near axis to clear, so both
dimensions must fit at once and it scales with the longer one. Review caught the first version
using the sum there too, which moved the camera *closer* for a ground that was longer but
narrower than Standard — cropping the ends, which is the part that had grown.

Also: `boundaryDimensionsOf` now states the "no Active Venue yet → Standard ground" fallback
once, and both readers use it — the store imperatively and `useActiveBoundary` for React. It was
about to be written a second time in the hook.

**Deliberately not done:** `resetCamera` still returns to the fixed default view. It is the
app's opening viewpoint rather than a "frame this ground" preset, and no checklist item asks for
it — but a coach on a tight ground who taps *Reset camera* gets Standard-ground framing, so it is
worth a look once the presets have been used for real.

Vocabulary: `CONTEXT.md`, "The ground" — **Active Venue**, **Boundary**, **Absolute
markings**. Spec: `.scratch/venue/spec.md`. ADR:
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

- [x] Switching the Active Venue changes the rendered ground immediately, with no reload.
- [x] Editing the Active Venue's dimensions re-renders identically to switching — the same
      path, not a special case. `updateVenue` reloads the records; the resolver is keyed on the
      two measurements, so an edit and a switch reach the board by the identical route.
- [x] A white boundary line is drawn on the ellipse and visibly moves between grounds.
      `FieldBoundary` was already venue-derived from ticket 01; nothing here changed it.
- [x] Grass, apron, stadium bowl, goal posts, goal lines, goal squares, nine-metre markers,
      blue dots and the scoreboard's offset all follow the Active Venue.
- [x] Every Absolute marking keeps its real size at every ground — centre square 50 × 50,
      arcs 50 m from goal, goal square, post spacing. `CenterSquare` and `CenterCircles` take no
      `Boundary` at all, which is the invariant stated in the type.
- [x] The 50 m arcs clip at the boundary on a narrow ground.
- [x] Drag clamping and stroke authoring clamp to the **Active Venue's** boundary.
- [x] Preset views frame the Active Venue.
- [x] Switching the Active Venue leaves the camera exactly where it was — nothing in the change
      writes to `cameraStore` when the Venue changes, and `useActiveBoundary` says so in its
      docstring so a later "helpful" refit has to argue with the comment first.
- [x] A React-side resolver supplies the `Boundary`; the geometry functions keep taking it as
      a parameter and keep reading no store.
- [x] With Standard ground active, the board is unchanged from ticket 01. The seeded Venue is
      165 × 135, so the resolved `Boundary` is the constant every call site used before; the
      preset poses are pinned to their old values by test.

**Verified:** typecheck, build, 479 tests across models/data/hooks/services/components/store/
utils (`utils/videoUtils.test.ts` still OOMs the Node heap on Windows — pre-existing, verified on
pristine `main` during ticket 01). Browser smoke on the dev server: Standard ground seeds on
first load, an Active Venue of 150 × 110 survives a reload and resolves through to the UI, and
the new store subscription inside the R3F tree raises no render-loop or `getSnapshot` warning.

- [ ] **Visual smoke still owed** — the rendered ground has not been *seen* on either device. An
      automated Chrome tab starves rAF, so the WebGL canvas paints black and a screenshot proves
      nothing (recorded finding, and the reason the spec assigns field rendering to the iPad
      smoke rather than to tests). Specifically unverified: that a tight ground reads as tight;
      that the bowl and apron still meet cleanly when the boundary moves; that the 50 m arcs
      clip where they should on a narrow ground rather than leaving a stub; and that a preset
      view frames a tight ground sensibly rather than too close.
