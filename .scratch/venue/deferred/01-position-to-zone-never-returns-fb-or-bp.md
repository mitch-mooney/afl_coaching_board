# 01 — `positionToZone` never returns `FB` or `BP`

**What to build:** `positionToZone` (`utils/fieldGeometry.ts:67`) documents nine zones and
can only ever return seven. Every deep defender reports as `CHB`/`HBF`.

The forward end is written as a two-tier check in the correct order — `x >= 48` (FF/FP)
first, then `x >= 28` (CHF/HFF). The back end is written in the **wrong** order: `x <= -28`
at line 98 returns `CHB` or `HBF` for everything behind the half-back line, so the
`x <= -48` branch at line 105 is unreachable and `FB`/`BP` can never be produced.

The visible effect is in the drop-zone position auto-suggest (`Player.tsx:265`): drag a
player into the goal square and the app suggests centre half back.

Found while grilling ADR 0002 (Venue). Kept out of that work deliberately so the Venue
change stays a pure refactor of *which* thresholds are used, not a change to *what they
return*. Do this one first or last, not tangled in the middle.

**Blocked by:** None — can start immediately.

**Status:** done — commit `c3ebe6f`, PR #22. Outcome recorded at the bottom of this file.

Vocabulary: `CONTEXT.md`. Related: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`,
which changes these same thresholds — forward/back anchored to the goal line, lateral
relative to half-width. If that work has already landed, the constants below will read as
distances from goal rather than `x` from centre; the ordering bug is the same either way.

- [x] A test pins the current wrong behaviour first: a point deep in the defensive goal
      square returns `CHB` today. (The Venue wave left these pinned as `KNOWN BUG:` cases;
      they were flipped to the correct claims and confirmed red before the fix.)
- [x] The back-end checks are reordered so the deeper band is tested first, mirroring the
      forward end.
- [x] `FB` is returned for a deep, central defensive position; `BP` for a deep, wide one.
- [x] `CHB`/`HBF` still returned for the half-back band — the reorder must not swallow them.
- [x] The doc comment's zone table matches what the function actually returns.

## Outcome

Done as specified — no deviations. Commit `c3ebe6f`, PR #22.

The Venue work had already landed when this was done, so the constants read as distances from
goal, exactly as the ticket anticipated. The ordering bug was the same either way.

Three things worth carrying forward:

- **The change is provably confined to the back half.** Brute-forced old vs. new at 0.1 m
  resolution across tight (150×110), Standard (165×135) and wide (175×141) grounds: the only
  outputs that change are `CHB→FB`, `CHB→BP`, `HBF→BP`. Nothing in the forward half, `W`, `C`
  or `R` moved at any input. Structurally, not just empirically — both moved branches are gated
  `x < 0`, and the block still sits below the wing/centre/midfield checks, so their priority is
  untouched. `W` and `R` both require `!withinHalfForwardDepth` and full-forward depth is a
  subset of it, so the moved branch can never compete with them; `C` needs `|x| < 15` while the
  moved branch needs `|x| >= semiX - 34.5` (≥ 40.5 m even at the tightest ground) — disjoint.

- **The doc comment's zone table was rewritten into branch order, and now says so.** The rows
  genuinely overlap — `CHF`'s condition is true of every `FF` point, `R`'s of every `C` point —
  so the table is only correct under a first-match-wins rule the old version never stated while
  reading as if it were geographic. Anyone editing this function should keep that note.

- **The Venue wave's two `KNOWN BUG:` pins are gone**, replaced by the correct claims plus three
  guards: FB/BP reachable at all three grounds, the half-back band not swallowed by the reorder,
  and both ends splitting their deep band at the same distance out from goal. One added test
  asserts `isPointInField` before asserting the zone — an earlier draft used a point that was
  outside the ellipse and so described a drag no user could perform.
