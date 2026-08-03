# 02 — Stage entities outside the boundary (throw-ins, off-field staging)

**What to build:** Nothing can currently be placed outside the boundary. `snapToField`
clamps every drag (`dragMath.ts:70`) and every stroke waypoint (`useStrokeAuthoring.ts:71`)
to the boundary ellipse.

That blocks real football scenarios. A boundary throw-in is taken from *outside* the line —
so is the ruck contest set up for one. Staging an opposition structure off-field before
walking it onto the ground is unrepresentable for the same reason.

This is today's behaviour, not a regression. It is ticketed here because Venue work makes it
bite harder: clamping to a *tight* ground pulls entities further in than a coach expects, and
the moment the app starts talking about "inside" and "outside" the boundary, being unable to
put anything outside becomes conspicuous.

**Blocked by:** ADR 0002 Venue work — this must not be smuggled into that change. Relaxing
the clamp retires a real invariant, so it needs its own design pass.

**Status:** needs-design

Vocabulary: `CONTEXT.md`, "The ground" — **Boundary**, **Out of bounds**, **Pull inside
boundary**. Related: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

## The interchange bench is no longer part of this ticket — 2026-08-03

This used to be titled "throw-ins, interchange, bench" and led with an interchange bench as a
motivating case. **There is no bench.** The board is 18 a side; the four interchange players
per team were seed data nobody designed and nobody used. Decided in issue #29, built in
issue #31.

## The invariant this would retire — corrected

An earlier version of this ticket said the Venue work could rely on the invariant *the only
ways board content can be out of bounds are a Venue change or a shared link*.

**That was false when written.** There was a third way, and it predated the entire Venue wave:
the seed formations placed four interchange players per team at `z = 73`, outside a 67.5 m
semi-axis, on every board. So the out-of-bounds readout reported 8 on an untouched board, and
`Pull inside boundary` dragged the bench onto the field.

Found while prototyping the board-level ground chip. The bench was **deleted rather than
exempted** — `outOfBounds` stays pure geometry with no exemption list.

So the invariant is now **true**, for the first time. That is a better position for this ticket
to start from, not a worse one: whoever relaxes the clamp is retiring something real, and can
see exactly what it rests on — 18 a side, nothing seeded outside, both clamps unconditional.

## What issue #29 already answered

This ticket used to ask *"how does deliberate off-ground content interact with the Out of
bounds count and Pull inside boundary? A staged bench player must not be reported as not
fitting the ground, or the marker becomes noise on every play that uses one."*

That was written as a hypothetical about future work. It was describing current behaviour, and
it has been answered: there is no bench, so nothing needs exempting **today**.

But the question returns in full the moment this ticket lands — the first deliberately-staged
throw-in is exactly the "staged content that must not be reported as not fitting" this warned
about. The difference is that it will be content the coach *chose* to put there, which is a far
better basis for a rule than seed data nobody designed.

## Design questions to answer before building

- [ ] Is off-ground a *position* (drag anywhere, clamp to a wider "staging" ellipse) or a
      *place* (a strip with its own semantics)? These give very different models.
- [ ] How does deliberately-staged off-ground content interact with **Out of bounds** and
      **Pull inside boundary**? Note that #29 rejected the exemption-list shape, on the
      grounds that a fit report you have to explain is not a fit report — whatever rule this
      ticket lands on has to answer that objection rather than sidestep it.
- [ ] Does the playbook-list "doesn't fit" marker need the same treatment?
- [ ] Does an off-ground position survive a Venue change unmoved, or does it track the
      boundary it was staged relative to?
- [ ] Does relaxing the clamp reopen anything for the shared viewer, where a link carries
      absolute metres onto a ground the author never saw?
