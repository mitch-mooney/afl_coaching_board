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
/** How far into its quadrant a tower is aimed, as a fraction of the semi-axes. */
const POOL_REACH = 0.42;
/**
 * The brightness at the middle of a pool, in the units of a three.js
 * directional light (the day rig's sun was 1.4). Held fixed rather than the
 * tower's intensity, so a bigger ground's pools are no dimmer for its towers
 * standing further off.
 */
const POOL_ILLUMINANCE = 1.5;

/** Corners in the order the shadow pair is picked from: a diagonal first. */
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
];

/**
 * The four light towers for a ground, the main source of light on it.
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
    const target: Vec3 = [sx * boundary.semiX * POOL_REACH, 0, sz * boundary.semiZ * POOL_REACH];
    const distanceSquared = position.reduce((sum, p, axis) => sum + (p - target[axis]) ** 2, 0);
    return {
      position,
      target,
      intensity: POOL_ILLUMINANCE * distanceSquared,
      angle: 0.55,
      penumbra: 0.75,
      castShadow: i < 2,
    };
  });
}

/**
 * The fill under the towers: a hemisphere light dropped low, so the ground
 * between the pools falls dark and the pools read as pools. Sky side Steel,
 * ground side Turf.
 */
export const nightFill = {
  sky: palette.steel,
  ground: palette.turf,
  intensity: 0.35,
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
