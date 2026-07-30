# The pen authors, the finger manipulates

## Status

accepted

## Context

The board had two independent modal axes and no arbiter between them: `boardSubMode`
(`'setup' | 'draw'`, deciding whether a player drag repositioned or recorded a path) and
`annotationStore.selectedTool` (deciding whether the board was a drawing surface). Both
were reached by opening a pod and tapping through a fan, so switching between "move a
player" and "mark up the board" cost a menu trip every time — unworkable during a live
coaching session on an iPad.

Worse, the two axes contradicted each other. `useAnnotationInteraction` attached listeners
to the canvas for *any* pointer type once a tool was armed, while `Player.tsx` only
suppressed dragging for `pointerType === 'pen'`. A finger-drag on a player with a tool
armed therefore did both: moved the player *and* drew an annotation from the same stroke.
A pen/finger split was half-built and had never been finished.

## Decision

The input device is the only modal axis. **A pen with a tip armed authors; a finger always
manipulates and never authors.** A pen with no tip armed behaves as a finger.

Concretely:

- Touch input is excluded from authoring entirely. Pen and mouse author; touch does not.
- The set of Pen tips gains `Path`, which turns a stroke into a `MovementPath`. A Path
  stroke must begin on the entity it belongs to.
- `boardSubMode` is deleted. Path authoring is a tip, not a board state.
- The Ball comes under the same contract. It previously recorded a path on *every* drag
  without consulting `boardSubMode`; it now only gains a path from a Path-tip stroke.
- Tips live on an always-visible tool rail, so arming one is never a menu trip.

## Considered options

- **Pen always draws, no arming required.** Rejected: it costs the ability to use the pen
  as a pointer, which matters for selecting players for POV and for training-mode cone
  placement.
- **Arming a tool locks the board for all input** (symmetric: neither pen nor finger moves
  players). Simplest to explain, but it is precisely the modal behaviour being escaped.
- **Touch draws, but only off-player.** Preserves finger annotation on Pencil-less devices,
  at the cost of a rule that is hard to predict mid-session.

## Consequences

- **A device with no stylus cannot annotate.** This is a deliberate, accepted cost: an
  Apple Pencil is part of the coaching kit. If that stops being true, the escape hatch is a
  setting that re-enables touch authoring — not a change to the contract.
- **Authored path durations change.** Duration was derived from elapsed drag time
  (`max(2, elapsed)`), which was roughly plausible for slow finger drags but bottoms out at
  the 2s floor for fast pen flicks — a 40m run in 2s is ~20 m/s, faster than any human.
  Duration is now derived from distance at a running pace, so a stroke's *shape* comes from
  the pen and its *timing* comes from physics. Deliberately, how fast you flick no longer
  means anything.
- **Existing saved Plays are unaffected** — this changes authoring only, not the stored
  `MovementPath` shape.
- A new Path stroke replaces that entity's existing path on stroke *completion*, not
  silently at stroke *start* as `boardSubMode: 'draw'` did, so an abandoned stroke no longer
  destroys good work.
