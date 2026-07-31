# 02 — Stage entities outside the boundary (throw-ins, interchange, bench)

**What to build:** Nothing can currently be placed outside the boundary. `snapToField`
clamps every drag (`dragMath.ts:70`) and every stroke waypoint (`useStrokeAuthoring.ts:71`)
to the boundary ellipse.

That blocks real football scenarios. A boundary throw-in is taken from *outside* the line —
so is the ruck contest set up for one. An interchange bench, a player leaving the ground,
and an opposition structure being staged off-field are all unrepresentable for the same
reason.

This is today's behaviour, not a regression. It is ticketed here because Venue work makes it
bite harder: clamping to a *tight* ground pulls entities further in than a coach expects, and
the moment the app starts talking about "inside" and "outside" the boundary, being unable to
put anything outside becomes conspicuous.

**Blocked by:** ADR 0002 Venue work — this must not be smuggled into that change. The Venue
work deliberately keeps the live clamp so it can rely on the invariant *the only ways board
content can be out of bounds are a Venue change or a shared link*. Relaxing the clamp
retires that invariant, so it needs its own design pass.

**Status:** needs-design

Vocabulary: `CONTEXT.md`, "The ground" — **Boundary**, **Out of bounds**, **Pull inside
boundary**. Related: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

Design questions to answer before building:

- [ ] Is off-ground a *position* (drag anywhere, clamp to a wider "staging" ellipse) or a
      *place* (a bench strip with its own semantics)? These give very different models.
- [ ] How does deliberate off-ground content interact with the **Out of bounds** count and
      the "pull inside boundary" affordance? A staged bench player must not be reported as
      not fitting the ground, or the marker becomes noise on every play that uses one.
- [ ] Does the playbook-list "doesn't fit" marker need the same exemption?
- [ ] Does an off-ground position survive a Venue change unmoved, or does it track the
      boundary it was staged relative to?
