// Australian Football Field Specifications
// Based on official AFL specifications from:
// https://en.wikipedia.org/wiki/Australian_rules_football_playing_field
//
// Everything here is an **Absolute marking**: identical at every ground in the
// country and never scaled. A narrow ground is not a scaled-down MCG; it is the
// same markings with the boundary pulled in tighter, so the 50 m arc sits closer
// to the wing.
//
// The boundary itself — the one thing that *does* vary per ground — is NOT here.
// It comes from the Active Venue as a Boundary (see utils/fieldGeometry and
// docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md). Do not add a
// per-venue value to this object.

export const FIELD_MARKINGS = {
  // Goal lines: straight and 19.2 m (21 yd) long
  goalLineLength: 19.2, // meters

  // Goal squares: 6.4 m × 9 m (7 yd × 10 yd) in front of each goal-face
  goalSquareWidth: 6.4, // meters (width of goal square)
  goalSquareDepth: 9, // meters (depth from goal line)

  // Nine-metre line: imaginary continuation of kick-off line
  // Radial markings outside boundary indicate where it crosses
  nineMetreLineDistance: 9, // meters from goal line

  // Blue dots: 15 m (16 yd) in front of the centre of each kick-off line
  blueDotDistance: 15, // meters from goal line

  // Center square: 50 m × 50 m (55 yd × 55 yd)
  centerSquareSize: 50, // meters

  // Center circles: two concentric circles of 3 m (3.3 yd) and 10 m (11 yd) diameter
  // Inner circle: 3m diameter = 1.5m radius
  // Outer circle: 10m diameter = 5m radius
  centerCircleInnerRadius: 1.5, // meters (3m diameter / 2)
  centerCircleOuterRadius: 5, // meters (10m diameter / 2)

  // Fifty-metre arcs: circular arc at each end, 50 m (55 yd) from centre of goal-line
  fiftyMetreArcRadius: 50, // meters from centre of goal-line

  // Goal posts: spaced 6.4 m (7 yd) apart
  goalPostSpacing: 6.4, // meters between goal posts
  goalPostHeight: 6, // meters (typical height, not specified in Wikipedia)

  // Behind posts: 6.4 m (7 yd) on either side of goal posts, 5 metres (16 ft) in height
  behindPostSpacing: 6.4, // meters from goal post to behind post
  behindPostHeight: 5, // meters (16 ft)

  // Scale factor for 3D scene (1 unit = 1 meter)
  scale: 1,
} as const;
