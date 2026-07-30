# Venue is app-wide context; positions stay in absolute metres

## Status

accepted

## Context

`FIELD_CONFIG` (`models/FieldModel.ts`) was a frozen `as const` at 165 × 135 m — dimensions
that match no real ground. Community grounds vary enormously (roughly 150–170 m long,
110–141 m wide), and a play designed with the spacing of a wide ground does not transfer to
a tight one. Coaches need to see a play rendered on the ground they are about to play at.

## Decision

A **Venue** is a user-created record: a name plus boundary dimensions. There is no shipped
preset list — the grounds that matter are community grounds whose dimensions are published
nowhere.

The **Active Venue** is app-wide match context, not per-Play board content — the same
exclusion already applied to the scoreboard, and for the same reason. Setting it re-renders
every Play on that ground.

**Entity positions remain in absolute metres, never normalised to fractions of the field.**

Only boundary length and width vary. Every other marking — centre square, 50 m arcs, goal
square, post spacing — is identical at every ground and stays constant.

## Considered options

- **Normalise positions to fractions of the field.** Rejected, and this is the important
  one: it is the intuitive answer and it is wrong. AFL field markings are almost all
  absolute. Scaling a player's position by ground width would slide a centre-square player
  outside the centre square, and would put "top of the 50" somewhere other than the painted
  50 m arc. A narrow ground is not a scaled-down MCG.
- **Store the Venue on each Play.** Nothing is ever out of bounds, but the playbook
  fragments by ground and you lose the ability to preview a play at this week's venue —
  which was the entire motivation.
- **Silently clamp out-of-bounds entities** via `snapToField`. Never produces an invalid
  board, but a play quietly reshapes itself and the coach ends up teaching a structure they
  did not design.

## Consequences

- A Play authored on a wide ground can place entities outside a narrower Active Venue's
  boundary. This is **surfaced to the coach** with a one-tap "pull inside boundary", never
  corrected silently. Seeing that your wingers don't fit is useful information, not an error.
- `positionToZone` (`utils/fieldGeometry.ts`) currently hardcodes thresholds calibrated to
  165 × 135 and would fail silently — on a 110 m-wide ground, `|z| >= 30` would make almost
  everyone a winger. Its lateral thresholds become relative to Boundary dimensions while its
  forward/back thresholds stay absolute, because that is how the zones are defined in
  football: a wing is the outer part of *this* ground, but the top of the 50 is 50 m from
  goal everywhere.
- The stadium bowl (`Field.tsx`), camera framing, and `thumbnailProjection` all hardcode
  field extents today and must derive them from the Active Venue.
- Saved Plays need no migration — the stored coordinate meaning is unchanged.
