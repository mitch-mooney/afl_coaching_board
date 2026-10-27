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

/** A ring of the Stadium, or the Boundary itself: an ellipse on the ground. */
export interface Ring {
  semiX: number;
  semiZ: number;
}

/** One line round the Stadium: how far outside the Boundary it runs, and how high. */
export interface StadiumLine {
  /** Metres outside the Boundary, along both semi-axes. */
  setback: number;
  /** Metres above the grass. */
  height: number;
}

/**
 * The Stadium's shape: one profile swept round the Boundary, the same on every
 * side (#136). Outwards from the Boundary: a flat concrete apron, a low fence, a
 * front wall up to the front row, then a single raked deck rising to the top row.
 * Every line of it is a `stadiumRing`, the Boundary grown by that line's setback.
 */
export interface StadiumShape {
  /** The ground it stands round. */
  boundary: Ring;
  fence: StadiumLine;
  frontRow: StadiumLine;
  topRow: StadiumLine;
  /** Metres of deck between the front row and the top row, along the ground. */
  deckDepth: number;
  /** The deck's slope above the horizontal, in radians. */
  rake: number;
  /** Metres of deck each row of seats takes, along the ground. */
  rowDepth: number;
}

/** The fence round the apron: a few metres out, below a player's waist. */
const FENCE: StadiumLine = { setback: 4, height: 0.9 };
/** The front row, fixed at every ground: out-of-bounds content past it is the backdrop's job, not the stand's. */
const FRONT_ROW: StadiumLine = { setback: 9, height: 1.5 };
/**
 * The deck and the top row's height. Set by the presets' sightlines: from Sideline
 * and End-to-end, at every plausible ground, the line of sight to the near
 * boundary has to clear the top row. The narrow 200 × 90 ground from Sideline is
 * the binding case, so the stand is one deck with no roof.
 */
const DECK_DEPTH = 24;
const TOP_ROW_HEIGHT = 12;
const ROW_DEPTH = 0.8;

/**
 * The Stadium for a ground, from its Boundary alone: no other Venue field, no
 * board content and no camera feeds it.
 */
export function stadiumShape(boundary: Ring): StadiumShape {
  return {
    boundary: { semiX: boundary.semiX, semiZ: boundary.semiZ },
    fence: FENCE,
    frontRow: FRONT_ROW,
    topRow: { setback: FRONT_ROW.setback + DECK_DEPTH, height: TOP_ROW_HEIGHT },
    deckDepth: DECK_DEPTH,
    rake: Math.atan2(TOP_ROW_HEIGHT - FRONT_ROW.height, DECK_DEPTH),
    rowDepth: ROW_DEPTH,
  };
}

/**
 * The order the backdrop draws in. Board content (players, tokens, the ball,
 * cones, paths, annotations, labels) draws after it, at three's default of 0.
 *
 * The Stadium writes no depth, so anything drawn after it draws over it: an
 * out-of-bounds player standing where the seats are stays in plain sight (#139).
 * The sky writes none either, so it goes first. The turf goes before the apron,
 * which covers the corners of the turf's plane outside the Boundary. The apron,
 * with its fence and front wall, goes before the deck that rises over it.
 */
export const backdropOrder = {
  sky: -4,
  turf: -3,
  apron: -2,
  deck: -1,
} as const;

/** The ring `setback` metres outside the Boundary: the Boundary grown along both semi-axes. */
export function stadiumRing(boundary: Ring, setback: number): Ring {
  return { semiX: boundary.semiX + setback, semiZ: boundary.semiZ + setback };
}

/** `hex` with its hue taken out: the grey of the same luma, as `#rrggbb`. */
export function grey(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => (value >> shift) & 255);
  const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  return `#${luma.toString(16).padStart(2, '0').repeat(3)}`;
}

/**
 * The Stadium. A backdrop, so it recedes: greys mixed from the chrome's Concrete
 * and Steel, none brighter than the darkest mowing stripe, so team colours and
 * chalk stay the brightest things on screen (#136). It is unlit, so its shading
 * is baked in: each row of seats is lit over the shadow at its foot, which is
 * what reads as rows from a broadcast angle, and the deck darkens towards the back.
 */
export const standColours = {
  /** The concrete floor from the Boundary out, under the stand. */
  apron: grey(shade(palette.concrete, 0.6)),
  /** The low fence round the apron. */
  fence: grey(palette.concrete),
  /** The wall below the front row. */
  frontWall: grey(shade(palette.concrete, 0.75)),
  /** A row's seats. */
  seat: grey(mixHex(palette.concrete, palette.steel, 0.5)),
  /** The shadow at the foot of each row, cast by the row behind. */
  rowShadow: grey(shade(palette.concrete, 0.55)),
  /** How much of its brightness the top row keeps against the front row. */
  backShade: 0.6,
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
