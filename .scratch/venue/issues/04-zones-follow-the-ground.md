# 04 — Zones follow the ground

**What to build:** Dropping a player on the wing of a 110 m-wide ground suggests **winger**,
not centre. Today the drop-zone position suggestion uses thresholds calibrated to 135 m of
width, so on a narrow ground almost everyone reads as a winger, and it fails silently — the
suggestion is simply wrong, with nothing to indicate it.

The two axes get different treatment, and the reason is football, not code.

**Lateral thresholds become relative** to the ground. A wing is the outer part of *this*
ground: on a tight ground the wing is closer in, because there is less ground for it to be the
outside of. Expressed as fractions of half-width, calibrated to reproduce today's behaviour at
135 m — wing at `0.444 × semiZ`, the CHF/HFF split at `0.296`, the FF/FP split at `0.222`.

**Forward and back thresholds stay absolute, but are anchored to the goal line** — not to the
centre of the ground, which is where they are measured from today. The top of the 50 is 50 m
from goal at every ground, so the origin has to be the goal line, and the goal line sits at
half the Venue's length. Keeping the current constants measured from centre would mean `x >=
48` is 34.5 m from goal on a 165 m ground but 27 m on a 150 m one — sliding the forward line
relative to the goal, which is exactly the failure that normalising positions was rejected
for. Full forward is within ~35 m of goal; the centre-half-forward band reaches ~55 m; the
back half mirrors. At 165 m these reproduce today's returns exactly.

**Do not fix the zone ordering bug here.** `positionToZone` can never return `FB` or `BP` —
the half-back check catches everything deeper first, so the deep-defensive branch is
unreachable. It is real, it is ticketed at `.scratch/venue/deferred/01`, and it touches these
same lines. That is precisely why it stays out: this change must be a pure substitution of
*which* thresholds are used, not a change to *what* the function returns.

**Blocked by:** 01 (the `Boundary` parameter must exist). Startable in parallel with 03; until
03 lands it is verifiable by test rather than by eye.

**Status:** done — `feat/venue-04-zones`

**Outcome — the thresholds moved, the branch structure did not.** The rewrite is confined to
what each `if` compares against: three lateral constants became fractions of `semiZ`, and the
two forward/back constants became distances out from the goal line, read through a
`metresFromGoal(x, boundary)` helper. Every branch, in the same order, returning the same code
as before. That was the point — a change to *which* thresholds are used, never to *what* the
function returns, so the deferred ordering bug travels through untouched.

Because `metresFromGoal` measures from the **nearer** goal via `|x|`, the two bands
(`deepInsideFifty`, `insideTheHalfLine`) are end-agnostic and the sign of `x` picks the end.
The old code carried the same threshold twice, once per end (`x >= 48` and `x <= -48`); it is
now stated once and mirrored by construction, which is why the back half cannot drift from the
forward half in a later edit.

**The one zone that is neither relative nor goal-anchored is the centre**, on *both* axes.
The centre square is a 50 × 50 **Absolute marking** at the middle of the ground, so 15 m from
the bounce already means the same thing everywhere. The first version of this change scaled the
centre's lateral edge along with the other three lateral thresholds — they happened to share the
value 15 at Standard ground, so every test still passed while a tight ground quietly shrank the
centre square to ±12.2 m and pushed a player standing inside the painted square out of the
centre. Code review caught it; there is now a `CENTRE_ZONE_METRES_FROM_BOUNCE` constant and a
test at three widths. It is the same failure normalising positions was rejected for, arrived at
from the opposite direction, and worth recording because the coincidence hid it.

**Deliberately not done — the short-ground squeeze.** The two treatments meet on a short ground
and the goal-anchored one wins. The half-forward band starts at `semiX - 54.5` out from centre,
so under 139 m of length it reaches inside the middle of the ground and the midfield is squeezed
from both ends: on a 130 m ground `C` survives only within 10.5 m of the bounce, and `W` and `R`
are pinched to the same sliver. At the bottom of the range `venueStore` accepts without even
warning — 120 m — that sliver is 5.5 m, and by about 109 m only the centre line itself is left
(`x === 0` exactly, which neither end branch claims). A coach can reach this without leaving the
accepted range.

It is not special-cased, for two reasons. It is arguably the honest answer — on a ground that
short the arcs really do reach the centre circle — and any rule that made the bands yield to the
midfield would be inventing football this ticket was not asked to decide. Worth a look if a
junior ground that short is ever recorded for real; a proportional floor on the midfield band is
the obvious shape.

**Not changed:** the `positionToZone` call site in `Player.tsx` was already holding an
`useActiveBoundary()` result for drag clamping, so the drop-zone suggestion picked the Active
Venue up by passing it along — one argument and one dependency.

Vocabulary: `CONTEXT.md`, "The ground" — **Boundary**, **Absolute markings**. Spec:
`.scratch/venue/spec.md`. ADR: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`,
whose "Zones" consequence records why the origin moves.

- [x] Lateral thresholds are fractions of half-width; the same fraction returns the same zone
      at any width. `4/9`, `8/27`, `2/9` — exact rather than the spec's 3-s.f. roundings, so
      Standard ground reproduces to the metre rather than to within a centimetre.
- [x] Forward/back thresholds are absolute distances measured from the goal line — 34.5 m and
      54.5 m out, via `metresFromGoal`.
- [x] A position 34.5 m from goal is full forward at 150 m, 165 m and 175 m alike. Under the
      centre-anchored reading the 150 m case returns `CHF`, which is the test that was red.
- [x] At Standard ground, every zone return is **identical** to before this ticket — the
      pre-existing Standard-ground cases passed untouched through both slices.
- [x] Tests cover a tight ground (150 × 110), Standard ground and a wide one (175 × 141),
      written as football claims.
- [x] `FB`/`BP` remain unreachable — pinned at Standard ground as before, and now at the tight
      and wide grounds too, so the deferred fix cannot be made accidentally at one width only.
