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

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md`, "The ground" — **Boundary**, **Absolute markings**. Spec:
`.scratch/venue/spec.md`. ADR: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`,
whose "Zones" consequence records why the origin moves.

- [ ] Lateral thresholds are fractions of half-width; the same fraction returns the same zone
      at any width.
- [ ] Forward/back thresholds are absolute distances measured from the goal line.
- [ ] A position 34.5 m from goal is full forward at 150 m, 165 m and 175 m alike — the case
      that fails under the rejected centre-anchored reading.
- [ ] At Standard ground, every zone return is **identical** to before this ticket.
- [ ] Tests cover a tight ground, Standard ground and a wide one, written as football claims.
- [ ] `FB`/`BP` remain unreachable — unchanged, still ticketed separately, not touched here.
