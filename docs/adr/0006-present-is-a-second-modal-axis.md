# Present is a second modal axis

## Status

accepted (facelift grilling, 2026-10-25; decided, not built)

## Context

ADR 0001 made the input device the board's only modal axis, and CONTEXT.md repeats it: the
contract "lives in the user's hand rather than in app state". That was written to kill
`boardSubMode`, an app-state toggle that changed what a drag meant.

The facelift grilling decided the board is designed first for the room: the coach showing
a Play to players on a TV. In front of the room, the coach still needs to teach in the
moment. They pause, draw over the frame, drag the half-back to where he should have run,
and turn a Lens on. That is a what-if, not authoring. If a three-quarter-time scribble
quietly changed the saved Play, the coach would find out next week.

## Decision

**Present** is a state of the board, and it is a second modal axis. The input contract still
decides *what* a gesture makes: a pen with a tip armed authors, and a finger manipulates.
Present decides *whether it is kept*. Inside Present everything the contract produces lands
in the **Present sketch**, a disposable layer that is not a Board edit. It records nothing
and saves nothing, and it is discarded when playback resumes or the coach leaves Present.
Lens toggles made while presenting belong to the sketch too.

The board signals Present at all times, with a tinted frame or edge, so the coach never
has to wonder whether what they are doing is kept.

## Considered options

- **Read-only Present.** No modal axis is added, but the coach must leave Present to show
  anything, so the teaching moment moves into the editor, where every change is saved.
- **Full editing with less chrome.** No new axis, but every three-quarter-time sketch
  becomes a saved change to the Play.
- **Present as a separate viewer**, close to `SharedPlaybookViewer`, so the editor's contract
  stays untouched. Rejected: a coach who spots a real fix mid-meeting would have to reload
  the Play to edit it, and the viewer would have to grow every rendering feature the board
  has.

## Consequences

- ADR 0001's "the input device is the only modal axis" no longer holds as written. Its
  pen/finger rule is unchanged; it now has a sibling. CONTEXT.md's Input contract entry says
  so.
- `boardEdit` gains a caller that must *not* record. The CONTEXT rule already covers it,
  because a write is a Board edit only when the coach is changing the Play, and in Present
  they are not.
