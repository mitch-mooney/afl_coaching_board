# 05 — Out of bounds, and Pull inside boundary

**What to build:** A coach switches to Saturday's tighter ground and is told, plainly, that
three of their players and one **MovementPath** no longer fit. They can pull them inside with
one tap, look at the adapted version, and undo it. Or leave it — a play that does not fit is a
legitimate thing to look at, and seeing that your wingers don't fit is the information they
came for.

Everything about this ticket is a variation on one rule from the ADR: **never correct the play
silently.** The whole reason positions stay in absolute metres is that rescaling would move a
centre-square player out of the centre square. Having refused to reshape plays automatically,
the app must not reshape them accidentally either — so there is **no fit on load**, **no clamp
during playback**, and nothing written to storage until the coach saves. Each of those is a
place where being helpful would quietly reintroduce the rejected model one layer down.

Playback is the one that will feel wrong to implement. An out-of-bounds path plays exactly as
authored, walking a player out over the apron. That is correct: it is a true statement about a
route that does not fit this ground, it is unambiguous, and nothing in the data has changed —
switching back to the wider Venue restores the play perfectly.

**MovementPath keyframes are in scope and matter more than the static positions.** A play
whose paths leave the ground looks completely fine standing still and only fails when the
coach presses play in front of the team.

**Annotations are never out of bounds.** They are inert markup and may point off-ground
deliberately; moving an endpoint would distort a shape the coach drew on purpose.

**Blocked by:** 02 (Venues to switch between), 03 (a rendered boundary to be outside of).

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md`, "The ground" — **Out of bounds**, **Pull inside boundary**,
**Boundary**, **Active Venue**; "Board content" — **MovementPath**, **Annotation**. Spec:
`.scratch/venue/spec.md`. ADR: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

- [ ] Two pure functions take `(snapshot, boundary)`: one reporting what falls outside, one
      returning a snapshot with that content pulled inside. Neither reads a store.
- [ ] Scope is players, the ball, cones and MovementPath keyframes. Annotations are never
      counted and never moved, including one drawn well outside the boundary.
- [ ] The out-of-bounds set is **derived, never stored** — it appears the instant the Active
      Venue changes and clears the instant it is resolved. No dirty flag.
- [ ] The coach is shown how many entities are outside, so "one winger is a metre out" is
      distinguishable from "half the structure doesn't fit".
- [ ] "Pull inside boundary" moves them in one tap and is undoable like any drag.
- [ ] Nothing is persisted until the coach saves the Play.
- [ ] Opening a Play that does not fit leaves it **unchanged** — no auto-fit.
- [ ] Playback runs an out-of-bounds path exactly as authored, unclamped.
- [ ] Switching back to the wider Venue restores the play exactly, because no data changed.
- [ ] Pulling inside leaves in-bounds content byte-identical.
- [ ] Tests cover the report's membership, the Annotation exclusion, and the byte-identical
      pass-through. `boardPlayback`'s tests are the prior art for the pure half; the IO half
      follows `boardScrub` and is not unit-tested.
