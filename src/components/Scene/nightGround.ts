/**
 * The night ground: every colour and light the board's ground is drawn with
 * (facelift Spec 1, issue #94).
 *
 * The board is set at a night game under lights, and that is its only look.
 * The scene components (`Field`, `SkyDome`) and both canvases that render them
 * read from here, so the board and the shared-link viewer cannot drift into two
 * grounds. Every colour is a design token or is mixed from them; tune the
 * tokens, not this file.
 */
import { FIELD_MARKINGS } from '../../models/FieldModel';
import { palette } from '../../theme/tokens';

/** `a` moved a fraction `t` of the way towards `b`, as `#rrggbb`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const out = [16, 8, 0].map((shift) => {
    const x = (ca >> shift) & 255;
    const y = (cb >> shift) & 255;
    return Math.round(x + (y - x) * t);
  });
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** `hex` darkened to a fraction `f` of its brightness, as `#rrggbb`. */
export function shade(hex: string, f: number): string {
  const value = parseInt(hex.slice(1), 16);
  const out = [16, 8, 0].map((shift) => Math.round(((value >> shift) & 255) * f));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The mowing stripes, alternating. The dark stripe is Turf itself; the light one
 * sits partway to Turf lit, so the pools under the towers are what reach Turf
 * lit rather than the mowing pattern.
 */
export const turfStripes = [palette.turf, mixHex(palette.turf, palette.turfLit, 0.45)] as const;

type Vec3 = [number, number, number];

/** One of the four light towers: a spotlight standing off a corner of the ground. */
export interface TowerLight {
  position: Vec3;
  /** The point on the ground the tower is aimed at: the middle of its pool. */
  target: Vec3;
  /** Candela, for three's physical lights (inverse-square falloff, `decay` 2). */
  intensity: number;
  /** Half-angle of the beam, in radians. */
  angle: number;
  /** How soft the pool's edge is, 0 to 1. */
  penumbra: number;
  castShadow: boolean;
}

/** Metres the towers stand back from the boundary, beyond the first rows of seats. */
const TOWER_SETBACK = 22;
/** Metres up, the head of a tower. */
const TOWER_HEIGHT = 65;
/**
 * How far into its quadrant a tower is aimed, as a fraction of each semi-axis:
 * further towards the goals than towards the wings, so the pools reach the
 * goal squares (#107).
 */
const POOL_REACH_X = 0.6;
const POOL_REACH_Z = 0.5;
/**
 * The beam's half-angle, as a multiple of the widest angle from its aim to the
 * three places it must light: the centre, the wing on its side and the goal
 * square at its end. Sized off the ground rather than fixed, so a big Venue's
 * wings and goal squares sit as far inside the beam as the Standard's do, and a
 * small one's pools do not swallow the whole ground.
 */
const BEAM_SPREAD = 1.5;
/** How soft the pool's edge is, 0 to 1. */
const BEAM_PENUMBRA = 0.6;
/**
 * The fill's intensity: low, so the towers are the main source and the grass
 * between their pools falls dark. The day rig's fill was 1.1.
 */
const FILL_INTENSITY = 0.8;
/**
 * The light a tower puts on the ground at the middle of its pool, in three.js
 * units. three (r155 on) draws a matte surface at its colour times the light
 * on it over pi, so the tower and the fill together put pi there: the middle
 * of a pool shows the turf as painted, and everything outside the pools sinks
 * below it. Held fixed rather than the tower's intensity, so a bigger ground's
 * pools are no dimmer for its towers standing further off.
 */
const POOL_ILLUMINANCE = Math.PI - FILL_INTENSITY;

/** Corners in the order the shadow pair is picked from: a diagonal first. */
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
];

/** The angle at `from` between the directions to `a` and to `b`, in radians. */
function angleBetween(from: Vec3, a: Vec3, b: Vec3): number {
  const u = a.map((v, i) => v - from[i]);
  const w = b.map((v, i) => v - from[i]);
  const dot = u.reduce((sum, v, i) => sum + v * w[i], 0);
  return Math.acos(Math.min(1, dot / (Math.hypot(...u) * Math.hypot(...w))));
}

/**
 * The four light towers for a ground, the main source of light on it. The
 * pools overlap enough that no part of the field of play falls outside every
 * beam: the grass between them is darker, never dark (#107).
 *
 * Only a diagonal pair casts shadows. Every shadow-casting light renders the
 * scene again each frame, and the day rig cast from one; two diagonal towers
 * give each player the crossed shadows of a night game for one extra pass.
 */
export function towerLights(boundary: { semiX: number; semiZ: number }): TowerLight[] {
  return CORNERS.map(([sx, sz], i) => {
    const position: Vec3 = [
      sx * (boundary.semiX + TOWER_SETBACK),
      TOWER_HEIGHT,
      sz * (boundary.semiZ + TOWER_SETBACK),
    ];
    const target: Vec3 = [sx * boundary.semiX * POOL_REACH_X, 0, sz * boundary.semiZ * POOL_REACH_Z];
    const mustLight: Vec3[] = [
      [0, 0, 0],
      [0, 0, sz * boundary.semiZ * 0.8],
      [sx * (boundary.semiX - FIELD_MARKINGS.goalSquareDepth / 2), 0, 0],
    ];
    const reach = Math.max(...mustLight.map((point) => angleBetween(position, target, point)));
    const distanceSquared = position.reduce((sum, p, axis) => sum + (p - target[axis]) ** 2, 0);
    // The beam strikes the ground at a slant, which spreads its light thinner.
    const cosIncidence = (position[1] - target[1]) / Math.sqrt(distanceSquared);
    return {
      position,
      target,
      intensity: (POOL_ILLUMINANCE * distanceSquared) / cosIncidence,
      angle: BEAM_SPREAD * reach,
      penumbra: BEAM_PENUMBRA,
      castShadow: i < 2,
    };
  });
}

/**
 * The fill under the towers: a hemisphere light dropped low, so the ground
 * between the pools falls dark and the pools read as pools. Its sky side is
 * Floodlight, the towers' light scattered back off the haze; the sky colour
 * multiplies the intensity on every upward face, so a dark one (the night sky
 * itself) would be no fill at all. Ground side Turf.
 */
export const nightFill = {
  sky: palette.floodlight,
  ground: palette.turf,
  intensity: FILL_INTENSITY,
} as const;

/** How many colour steps make up one tier's band of seats. */
const SEAT_STEPS = 5;

/**
 * The grandstand bowl. The stands sit outside the pools, so they recede: the
 * concrete and steel of the chrome rather than the day rig's bright blue seats.
 * Each tier's seats still band from dark (in the shadow of the riser below) to
 * light, which is what reads as rows from a broadcast angle.
 */
export const standColours = {
  /** The floor outside the boundary, under the stands. */
  apron: shade(palette.concrete, 0.45),
  /** Seat rows inner to outer. */
  seats: Array.from({ length: SEAT_STEPS }, (_, i) =>
    mixHex(shade(palette.concrete, 0.75), palette.steel, i / (SEAT_STEPS - 1)),
  ),
  /** The step between tiers. */
  riser: shade(palette.concrete, 0.3),
};

/** The sky dome: a night sky, darkest overhead, with the towers' lamps in it. */
export const skyColours = {
  zenith: shade(palette.concrete, 0.12),
  horizon: shade(palette.concrete, 0.32),
  /** The dome below the horizon, behind the stands. */
  below: shade(palette.concrete, 0.08),
  /** The lamp heads on the towers. */
  lamp: palette.floodlight,
};

/** Fog is the horizon's colour, so far grass fades into the sky without a seam. */
export const fogColour = skyColours.horizon;

/** Chalk: every painted line and the goal posts. */
export const chalk = palette.chalk;

/**
 * The blue dots in front of each goal square. A regulation marking, not chrome,
 * so it keeps the blue it is painted in rather than taking a token, the way the
 * Fit readout's amber keeps its meaning outside the palette.
 */
export const BLUE_DOT = '#0066ff';
