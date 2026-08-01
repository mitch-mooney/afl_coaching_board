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

**Where the count is shown:** the Venue panel, above the ground list — where the coach has
just switched grounds and is asking whether Saturday's play still fits. The spec's "no board
chrome in v1" rules out a board-level banner, and the play-list marker (ticket 06) is what
catches a play that does not fit while the panel is closed.

**One thing had to be fixed underneath.** `snapToField` projected onto the ellipse with
`cos`/`sin`, which round, so a snapped point could land a few ULPs *outside* the boundary and
fail `isPointInField`. Harmless while snapping only clamped a drag and nothing asked the
question afterwards; fatal here, where dragging a player to the wing would report them off the
ground and Pull inside boundary would leave the notice it had just resolved. Snapping now
insets by 1e-9 of the semi-axes — about 80 nm — and a 360-point sweep at three grounds pins
`isPointInField(snapToField(p))`.

**Undo needed widening, twice.** `StateSnapshot` carried players and annotations only, so
undoing a pull would have returned the players and left the ball, cones and path keyframes
pulled in. It gains an optional `board: BoardSnapshot`, recorded by edits that reach further,
and `restoreBoardSnapshot` puts that board back wholesale through the existing snapshot restore
path. The camera is dropped on the way — it stays outside undo, and a null camera is exactly
what tells `restore()` to leave the live one alone.

That was not enough on its own, and code review caught it. `historyStore.undo()` returned
`past[length - 2]` once the stack was more than one deep — a known off-by-one, pinned by a test
whose own comment deferred it — so the whole-board record was only ever reachable when the pull
was the coach's *first* edit of the session. Adding an annotation and then dragging a player
also meant one undo took both away. Every entry on `past` is the board before one edit, so the
last entry is what undoing that edit restores; `undo()` now returns it. **This changes undo for
the whole app, not just this ticket** — one press now takes back one edit — and it is out of
ticket 05's stated scope. It is here because without it the ticket's undo requirement is not
deliverable: no local workaround exists when the shared layer hands back the wrong snapshot.
The test that pinned the old behaviour now asserts the corrected claim, and a second test pins
the pull-inside record surviving one entry deep. Redo is unwired anywhere in the app, so its
own (pre-existing, untouched) stack semantics have no consumer to break.

- [x] Two pure functions take `(snapshot, boundary)`: one reporting what falls outside, one
      returning a snapshot with that content pulled inside. Neither reads a store.
      `outOfBounds` / `pullInsideBoundary`, alongside the point-level pair in `fieldGeometry`.
- [x] Scope is players, the ball, cones and MovementPath keyframes. Annotations are never
      counted and never moved, including one drawn well outside the boundary.
- [x] The out-of-bounds set is **derived, never stored** — `useOutOfBounds` recomputes from the
      live stores against `useActiveBoundary`, so it appears the instant the Active Venue
      changes and clears the instant it is resolved. No dirty flag.
- [x] The coach is shown how many entities are outside, broken down by kind — "3 players and
      1 path are outside Jubilee Park" rather than a warning triangle.
- [x] "Pull inside boundary" moves them in one tap and is undoable like any drag — see the
      undo note above for what that cost, including the shared off-by-one it had to fix.
- [x] Nothing is persisted until the coach saves the Play. `pullBoardInsideBoundary` reads and
      writes the board stores through the snapshot IO path and never touches Dexie.
- [x] Opening a Play that does not fit leaves it **unchanged** — no auto-fit. Verified by
      inspection: `snapToField` has exactly two call sites, the drag clamp (`dragMath`) and
      stroke authoring, neither on the load path.
- [x] Playback runs an out-of-bounds path exactly as authored, unclamped. Same inspection —
      every `clamp` in `pathAnimation` is on time or progress, never on position.
- [x] Switching back to the wider Venue restores the play exactly, because no data changed.
- [x] Pulling inside leaves in-bounds content byte-identical — asserted by *identity*, not
      value: an entity that already fits is returned by reference.
- [x] Tests cover the report's membership, the Annotation exclusion, and the byte-identical
      pass-through. The IO half is untested as planned, except for undo's new whole-board
      restore, which is a real behaviour claim and is covered in `useBoardUndo.test.ts`.
