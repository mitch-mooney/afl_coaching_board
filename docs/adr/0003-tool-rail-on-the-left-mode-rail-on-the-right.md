# The Tool rail sits on the left; the Mode rail moves to the right

## Status

accepted

## Context

ADR 0001 requires the Pen tips to live on an always-visible **Tool rail**, so that arming a
tip is never a trip through a menu. The original sketch put that rail on the **right** edge,
because the Rail HUD skin already owns the left edge with its **Mode rail** (the
Setup / Animate / Camera column that opens a contextual panel).

Two facts, established while designing the rail, made the right edge the wrong choice:

- The coach is **right-handed and rests their hand on the glass** while drawing. For a
  right-hander the palm and forearm sit below and to the right of the pen tip, so a
  right-edge rail lies in the palm's resting zone for nearly every Stroke on the board.
- **The input contract does not protect the rail.** `authoringIntent` governs the board
  canvas; the rail is DOM chrome, and it must accept finger taps or tips could not be armed
  at all. So a resting palm on a rail button is an ordinary tap, with nothing to reject it.

## Decision

The **Tool rail is on the left edge in both HUD skins**, anchored below the top bar and
running to the safe-area bottom inset. In the Rail skin the **Mode rail moves to the right**
— a change of position only, not a redesign.

The deciding argument is **asymmetry of consequence**, not ergonomic preference:

> An accidental Mode rail tap opens a panel — visible, obviously wrong, dismissed with one
> tap. An accidental Tool rail tap **silently re-arms a tip**, and it is not discovered until
> the next Stroke becomes the wrong thing, possibly overwriting a MovementPath.

If one surface must sit in the palm zone, it is the one whose misfires are visible and
cheap. That reasoning survives a change of mind about the Mode rail, and it does not depend
on which edge merely *feels* better.

## Considered options

- **Right edge, palm risk accepted**, mitigated by placing buttons toward the top of the
  edge. Rejected: the mitigation fights the hardware rather than avoiding the problem, and
  the failure it leaves is the silent kind.
- **Right edge plus real palm rejection** — ignore pointer events whose `width`/`height`
  exceed a palm-sized threshold. A genuine fix, but it hand-builds a hardening most apps get
  from the OS, to defend a position chosen for no strong reason.
- **Tool rail on the left in Pods, right in Rail**, avoiding the Mode rail entirely.
  Rejected outright: a rail that moves between skins destroys the muscle memory that makes
  an always-visible rail worth having.
- **A handedness flip setting.** Correct eventually, premature now — there is one user, their
  handedness is known, and `hudPreferenceStore` is an obvious home if it is ever needed.

## Consequences

- The hamburger **folds into `EditorTopBar`** as an icon, because the left edge below the top
  bar now belongs to the Tool rail. This also fixes an apparent existing bug: in the Rail
  skin the Mode rail (`zIndex: 30`) covers the hamburger (`z-10`), so taps in that region hit
  the Mode rail's buttons and the hamburger is unreachable.
- The top bar gains a fourth element, which is tight at phone width. Accepted: the iPad is
  the target device and has room; the phone case wraps.
- Palm rejection and a handedness flip are **deliberately deferred** until an on-device iPad
  smoke says whether they are needed. The escape hatch, if the left edge also turns out to be
  palm-exposed, is the flip setting — not moving the rail back.
- The Mode rail is otherwise **untouched** in this wave. It is known clutter and gets its own
  pass later, better informed once the Tool rail has been used in a live session.
