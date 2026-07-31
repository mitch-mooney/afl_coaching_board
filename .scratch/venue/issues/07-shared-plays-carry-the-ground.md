# 07 — Shared Plays carry the ground they were designed on

**What to build:** A coach shares a Play designed at their 152 × 118 ground. The coach who
opens the link sees it on that ground, labelled with its name — the spacing the author
intended, not a reinterpretation of it.

This is the one place the "**Active Venue** is app-wide, not per-Play" rule needs care. It is a
statement about *your* app. A shared link crosses into someone else's, where your Active Venue
does not exist — and positions in absolute metres are meaningless without the boundary they
were drawn against. Rendered on a stranger's 170 × 141 ground, a play designed for a tight
ground looks like everyone is standing far too narrow, with nothing on screen to explain why.

So the payload carries the ground as **render context, not Play content**. The Play is still
positions in metres; the Venue rides alongside as "what this was designed against". Nothing
about per-Play Venues is being reintroduced — a shared link is a different thing from a saved
Play.

The two entry points differ, deliberately. **Viewing** a shared link renders on the sender's
dimensions. **Restoring** one into your own board keeps **your** Active Venue — a link must
never silently reconfigure app-wide state — and surfaces what does not fit via ticket 05,
which is the honest answer and the same thing the coach learns about their own plays.

Nothing is auto-imported into the recipient's Venue list. A link adding rows to your data is
not acceptable; a "save this ground" tap may earn its place later.

Links shared before this feature existed carry no venue fields and fall back to Standard
ground 165 × 135 — which is exactly what they *were* authored at, so every existing link
renders precisely as it always has. That correctness is free; make sure a test says so.

**Blocked by:** 05 (restoring into your own board must be able to surface what doesn't fit).

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md` — **SharePayload**, **Play**, **Active Venue**, **Venue**, **Out of
bounds**. Spec: `.scratch/venue/spec.md`. ADR:
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`, "Sharing".

- [ ] The share payload carries the Venue's name and Boundary dimensions as optional fields.
- [ ] The shared viewer renders on the **sender's** dimensions.
- [ ] The viewer shows which ground the Play was designed at, including its name.
- [ ] Restoring a shared Play into your own board keeps **your** Active Venue and does not
      change it.
- [ ] A restored Play that does not fit surfaces the out-of-bounds count like any other.
- [ ] No Venue is added to the recipient's list.
- [ ] A payload with no venue fields renders at Standard ground 165 × 135 — pre-existing links
      are byte-identical to today.
- [ ] Round-trip and legacy-fallback tests extend the existing share-adapter suite, following
      the "legacy flat camera" tests already there.
