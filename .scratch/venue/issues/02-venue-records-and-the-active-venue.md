# 02 — Venue records, the Active Venue, and the Match panel

**What to build:** A coach can record the grounds they play at and choose which one is
current. From the **Match** section of the global drawer they see their Venues, add one by
name and measured dimensions, edit it after re-measuring, delete one they have left behind,
and tap one to make it the **Active Venue**. Their Venues and their choice are still there
next week.

The board does not change yet — that is ticket 03. What this delivers is the record and the
selection, end to end and demoable on its own.

Venue management goes in the **Match** section, with the scoreboard, rather than Display.
That placement states the decision in the UI: the ground is match context, not a rendering
preference.

Two invariants carry the design. First, **there is always an Active Venue** — a seeded,
un-deletable **Standard ground** at 165 × 135 guarantees it, so no consumer ever needs a null
branch. It is also where a deleted Active Venue, or a stored id naming a record that no longer
exists, falls back to. `playbookStore` already owns exactly this shape of invariant for the
default Playbook; follow it. Second, the Active Venue is a *selection over the record set*,
not data in its own right — so the records persist in the database and the active id in
`localStorage`, the way the HUD skin preference does.

Standard ground must be identifiable in the UI as a generic ground rather than one somebody
measured, or a coach will trust dimensions that were never real.

**Blocked by:** None — can start immediately. Independent of ticket 01; the two do not touch.

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md`, "The ground" — **Venue**, **Boundary dimensions**, **Active Venue**,
**Standard ground**. Spec: `.scratch/venue/spec.md`. ADR:
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

- [ ] A Venue is a name plus `boundaryLength` and `boundaryWidth` in metres. Named in full —
      they describe the playing surface, not the ground's footprint. No unit conversion.
- [ ] Venues persist across reloads; the schema change leaves existing Plays and Playbooks
      readable and untouched. There is no Play migration — stored coordinates are unchanged.
- [ ] "Standard ground" (165 × 135) is seeded on first load, is not re-seeded on later loads,
      and cannot be deleted.
- [ ] The Active Venue survives a reload. An absent or unknown stored id resolves to Standard
      ground rather than throwing.
- [ ] Deleting the Active Venue falls back to Standard ground.
- [ ] Validation **rejects** dimensions where width is greater than or equal to length, or
      either is non-positive — an AFL ground is always longer than it is wide, and
      transposition is the likely data-entry error.
- [ ] Validation **warns but accepts** outside 120–200 m long or 90–170 m wide. The coach
      measured the ground; we did not.
- [ ] Venue create / edit / delete / activate are reachable from the Match section of the
      global drawer, with the active one marked.
- [ ] Standard ground reads in the UI as generic rather than measured.
- [ ] Tests cover the seeding, the un-deletability, both fallbacks, and all three validation
      outcomes. `playbookStore`'s tests are the prior art.
