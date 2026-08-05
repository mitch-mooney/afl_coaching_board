# The Tool rail sits on the left; the Mode rail moves to the right

## Status

accepted

Amended 2026-08-05 by a design grilling (issue #40, on wayfinding map #24): **where a HUD
surface starts under the linked-video bar turns on whether that surface is anchored to a
control.** `ToolRail` clears the bar unconditionally; the ground popover's column meets it and
overlays it, and the reason is a property of the two surfaces rather than a preference. This
ADR gains the rule because it is the ADR that owns where HUD surfaces sit; the decision it
records is not built yet and ships with the popover. See "Where a HUD surface starts under the
linked-video bar" below.

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

## Where a HUD surface starts under the linked-video bar

*Added by the 2026-08-05 amendment (issue #40).*

`ToolRail` starts at `calc(env(safe-area-inset-top, 0px) + 96px)`, with a comment saying why:
*"Clear the editor top bar, and the linked-video bar beneath it"* (`ToolRail.tsx:111-112`).
That is an **unconditional** line. `LinkedVideoBar` renders only when the open Play has a
linked video, and the rail pays 7px of permanent clearance for a band most Plays do not have,
in exchange for never having to know whether this one does.

The ground popover's column (issue #27, variant A) is the second surface to meet that bar, and
it takes the opposite answer: **it starts at the bottom of the top-bar row and overlays the
bar.** The rule that separates them:

> **Unanchored chrome clears the linked-video bar unconditionally. Anchored chrome meets it
> and overlays it.**

`ToolRail` has no element it must appear to emanate from, so an unconditional line costs it
nothing and buys it total ignorance of the bar. A popover is anchored, and reading as attached
to the chip that opened it is not decoration — it is what tells the coach which control they
are inside. Clearing the bar would buy the column the rail's ignorance at the price of a 45px
gap between the chip and its own top edge on **every Play without a linked video**, which is
most of them. The rail's rule is right for the rail and wrong here, and the difference is a
property of the surface. Without this note, two surfaces disagree about the same bar with no
stated cause.

### The overlay is licensed, and the licence has a limit

`LinkedVideoBar` carries a readout that cannot change while the popover is open, and two
controls — **▶ Preview**, which navigates to the Video tab, and **✕ Unlink**, which detaches
the video — that are both leave-this-task actions with no business inside a ground compare.
Losing that band for the duration of an open popover costs the coach nothing they were using.

What is licensed is covering a **readout**. Covering **controls** is a different claim, and
the limit is the rule the build holds:

> The column may cover the bar's readout; it may never cover the bar's controls.

The geometry that keeps it true: the column's left edge is fixed, because the hamburger, "←
Plays" and the tab switcher are all fixed-width and the ground name grows rightward off a
left-aligned column — so its right edge sits at roughly 628 on every device. The bar's controls
are `marginLeft: 'auto'`, so they start at roughly `width − 150`. Those meet at about **780px**
of viewport width. Landscape clears by 250px or more; portrait by ~55px. The iPad **mini** at
744pt portrait does not clear, and is outside the target device class — an exclusion decided,
not one that fell out of a number nobody checked. If a sub-780 width ever comes into scope the
answer is not a breakpoint inside the popover; it is retiring the full-width band (issue #45).

### 56 is not a magic number, and the column should hang off it

`LinkedVideoBar` sits at `safe-top + 56px`, and **56 is exactly `pt-3` (12) plus the top-bar
row's height** — 44, set by the hamburger's `w-11 h-11` tap target (`HamburgerIcon.tsx:80`).
The bar was placed flush under the row. The column measures an 8px gap from the *chip's* bottom
instead, and the chip is 34px centred in that 44px row, so it lands at 59: a **3px lip of bar
shows above the column's rounded top corner**. Of everything the overlap produces, that is the
one part that reads as a mistake rather than as depth — a stray stripe of another surface
emerging from behind a corner.

The fix hangs the column off the same line the bar does: **`alignSelf: 'stretch'` on the chip's
anchor** so it spans the row's full 44px, after which `top: 100%` lands on 56 with no constant
and no `env()` expression of the column's own. It also needs **`alignItems: 'center'` on that
anchor**, or the 34px chip stretches to 44 and issue #25's settled chip geometry changes
silently. The column then reads as a drawer pulled from the video band rather than a panel
dropped through it, and it inherits whatever the top bar does about the safe-area inset for
free — the two agree by construction rather than by a shared constant.

Two artifacts of the overlap are **left alone**: the bar's bottom hairline is interrupted where
the column crosses it, and the column's top ~30px composites two near-identical
`rgba(13,13,26,0.86–0.88)` layers into an opaque band above a translucent body. Both are what
every overlay on this HUD already does to whatever is under it. Removing them would mean either
hiding the bar while the popover is open — chrome conditional on popover state, which this rule
exists to avoid — or making the column the only opaque surface in a HUD built on glass.

### The one thing that can still separate them

`EditorTopBar.tsx:19` carries `pt-safe-top`, which is not a class: absent from `index.css`, and
`tailwind.config.js` has an empty `theme.extend` and no plugins. The top bar therefore ignores
the safe-area inset while both surfaces flanking it — `LinkedVideoBar` at `+56` and `ToolRail`
at `+96`, the only two `env(safe-area-inset-top)` reads in the codebase — honour it. Today's
target runs as a Safari page with no `apple-mobile-web-app-capable` meta, where the inset is 0
and everything coincides, so nothing looks wrong. Once the column hangs off the row, that dead
class is the **only** remaining thing that can put the column's top edge and the bar's out of
agreement. Filed as issue #44.

### Rejected

- **The column starts below the bar when one is present.** Makes the column's origin
  conditional on Play content: in a compare loop across Plays, the popover opens at a different
  y depending on which one is loaded. Dead once the overlay is licensed — it existed only to
  protect something that does not need protecting.
- **The bar yields** — shifts, shrinks or hides while the popover is open. Same objection in a
  worse form: chrome that moves in response to an unrelated surface's state, with a band
  reappearing at the top of the screen mid-compare.
- **Nothing to fix, because the bar may not reach that far left.** False. `LinkedVideoBar` is
  `left: 0; right: 0` (`LinkedVideoBar.tsx:17-18`) — a full-width band with its own background.
  The horizontal overlap was never in doubt.
- **The column clears the bar at `ToolRail`'s 96.** The anchored/unanchored rule above is
  exactly the argument against it.

Worth recording that **overlay was already the behaviour**, not a change anyone chose: the bar
is `zIndex: 25`, `EditorTopBar` is `z-30` and — being positioned with a z-index — its own
stacking context, so the column at `zIndex: 40` inside it has always painted above the bar.
What this amendment decides is that the overlay is *correct*, and moves its top edge 3px so it
looks it.
