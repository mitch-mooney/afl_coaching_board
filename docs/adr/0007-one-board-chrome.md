# One board chrome on every device

## Status

accepted (facelift grilling, 2026-10-25; built in #97, 2026-10-26). Supersedes the Mode rail
half of ADR 0003. The Tool rail on the left stands.

## Context

The board has two HUD skins: **Pods** on a coarse-pointer device and **Rail** (the Mode rail
plus a contextual panel) on desktop, resolved by `utils/hudSkin.ts`. Every on-board control
exists twice. The facelift adds new controls (Lens switches, the way into Present, the Depth
count), and Present has to pull the chrome back, so each skin would double that work too.
Every on-device smoke so far has run on the iPad in Pods.

## Decision

The board has **one chrome**, designed around the iPad and Present and used with a mouse and
keyboard on desktop. HUD skin is retired as a concept, and the Mode rail goes with the Rail
skin. Each edge has one job:

- **Left, the Tool rail:** changes the board. It is unchanged from ADR 0003, plus **Undo**
  at its foot. Undo is an action, not an instrument, and sits here because it changes the
  board.
- **Right, the View column:** changes how you see the board. It holds the Lens switches and
  the camera views, and nothing in it edits the board.
- **Bottom, the Playback bar:** changes the moment. It holds play, pause and the scrubber,
  plus the way into the Setup sheet (formations, resets, teams, labels, clears, roster
  import).

## Why the right edge is acceptable for the View column

ADR 0003 moved the Tool rail off the right edge because a right-handed coach rests their
palm there, and its deciding argument was asymmetry of consequence. The surface that sits
in the palm zone must be the one whose misfires are visible and cheap. The View column passes
that test the way the Mode rail did. A stray tap turns a Lens on or off, or moves the camera,
and both show on the board at once and are undone with one more tap. It never re-arms
a tip or changes content silently.

A Lens toggled in the editor does change what the Play opens with, because Lens defaults are
saved. That change is still visible the moment it happens, so it stays on the cheap side of
the asymmetry.

## Considered options

- **Redesign both skins.** Rejected: it doubles every facelift ticket and every ticket
  after it.
- **Redesign Pods, restyle Rail.** This was the option if coaches build Plays at a laptop.
  Rejected on the premise that they don't. If that premise turns out wrong, this is the
  decision to revisit.

## Consequences

- `hudSkin.ts`, `hudPreferenceStore` and the Mode rail are removed when this ships.
- ADR 0003's escape hatch, a handedness flip setting, now flips the whole chrome: the Tool
  rail and the View column swap edges together.
