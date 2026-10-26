import type { Boundary } from './fieldGeometry';

/** How far ahead of the player (world units) the POV camera looks. */
export const POV_LOOK_AHEAD = 5;
/** Height (world units) of the look-target above the player. */
export const POV_LOOK_UP = 1;

export interface PovPose {
  /** Where the camera should sit. */
  position: [number, number, number];
  /** The point the camera should look at. */
  lookAt: [number, number, number];
}

/**
 * POV-follow camera pose: the camera sits behind + above the player along their
 * facing and looks ahead in that direction. rotation = 0 faces +z, so
 * directionX = sin(rotation), directionZ = cos(rotation).
 */
export function povCameraPose(
  playerPosition: [number, number, number],
  playerRotation: number,
  povHeight: number,
  povDistance: number,
): PovPose {
  const [px, py, pz] = playerPosition;
  const directionX = Math.sin(playerRotation);
  const directionZ = Math.cos(playerRotation);
  return {
    position: [
      px - directionX * povDistance,
      py + povHeight,
      pz - directionZ * povDistance,
    ],
    lookAt: [
      px + directionX * POV_LOOK_AHEAD,
      py + POV_LOOK_UP,
      pz + directionZ * POV_LOOK_AHEAD,
    ],
  };
}

/** The three fixed viewpoints the HUD and keys 1–3 offer. */
export type CameraPreset = 'top' | 'sideline' | 'end-to-end';

/** Distinct from PovPose above: that one is a direction to look along, this a point to sit on. */
export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Overhead height per metre of the ground's longest semi-axis. Standard ground's
 * 82.5 m half-length against the 200 m top view has always used — every other
 * ground is framed by the same rule.
 */
const TOP_HEIGHT_PER_SEMI_AXIS = 200 / 82.5;

/** Elevation of the two oblique views, as a fraction of their standoff. */
const OBLIQUE_HEIGHT_RATIO = 1 / 3;

/**
 * Where a preset view sits for a given ground.
 *
 * Both oblique presets stand off the centre by `semiX + semiZ`, and the two terms
 * mean different things in each: the near semi-axis carries the camera clear of the
 * ground, and the far one is the dimension that has to fit across the frame. From
 * the sideline that is half the wing-to-wing plus half the goal-to-goal; from behind
 * the goal it is the same two numbers the other way round. At Standard ground both
 * come to 150 m.
 *
 * Top view cannot use that sum, because looking straight down there is no near axis
 * to clear — both dimensions have to fit at once, so it scales with the longer one.
 * A ground that is longer than Standard has to be viewed from higher up even if it
 * is also narrower, and a sum would have moved the camera the wrong way.
 *
 * A preset frames *this* ground — the coach who taps "top view" on a tight ground
 * wants the tight ground filling the screen. Note that switching the Active Venue
 * does NOT re-run this: the camera holds still while the boundary changes underneath,
 * because that stillness is the comparison the coach switched grounds to make.
 */
export function presetCameraPose(view: CameraPreset, boundary: Boundary): CameraPose {
  const standoff = boundary.semiX + boundary.semiZ;
  const target: [number, number, number] = [0, 0, 0];

  switch (view) {
    case 'top': {
      const longestSemiAxis = Math.max(boundary.semiX, boundary.semiZ);
      return { position: [0, longestSemiAxis * TOP_HEIGHT_PER_SEMI_AXIS, 0], target };
    }
    case 'sideline':
      return { position: [0, standoff * OBLIQUE_HEIGHT_RATIO, standoff], target };
    case 'end-to-end':
      return { position: [standoff, standoff * OBLIQUE_HEIGHT_RATIO, 0], target };
  }
}

/**
 * How steeply the camera looks down, in degrees above the horizon: 90 straight
 * down, 0 level with the grass.
 */
export function cameraTilt(
  position: [number, number, number],
  target: [number, number, number],
): number {
  const height = position[1] - target[1];
  const across = Math.hypot(position[0] - target[0], position[2] - target[2]);
  return (Math.atan2(height, across) * 180) / Math.PI;
}

/** Whether the board shows every player as a Player body or as a Player token. */
export type PlayerLook = 'body' | 'token';

/** Steeper than this, the board shows tokens. */
export const TOKEN_TILT = 62;
/** Lower than this, the board shows bodies again. */
export const BODY_TILT = 58;

/**
 * Bodies or tokens, decided once for the whole board. The 4° gap between the
 * two thresholds keeps a camera orbiting near 60° from flicking back and forth:
 * inside it the board keeps showing what it showed. A POV view always shows
 * bodies, since a player's-eye view of discs makes no sense.
 */
export function playerLook({
  tilt,
  pov,
  previous,
}: {
  tilt: number;
  pov: boolean;
  previous: PlayerLook;
}): PlayerLook {
  if (pov) return 'body';
  if (tilt > TOKEN_TILT) return 'token';
  if (tilt < BODY_TILT) return 'body';
  return previous;
}

/** A Player token's true size: 2 m across. */
export const TOKEN_WORLD_DIAMETER = 2;
/** The smallest a Player token draws on screen, in CSS points. */
export const TOKEN_MIN_POINTS = 32;

/**
 * How wide a Player token is in the world, in metres: its true 2 m, or wider
 * when 2 m would draw under 32 points, so it stays readable however far out the
 * camera sits. `fov` is the camera's vertical field of view in degrees and
 * `viewportHeight` the canvas height in CSS points.
 */
export function tokenDiameter({
  distance,
  fov,
  zoom,
  viewportHeight,
}: {
  distance: number;
  fov: number;
  zoom: number;
  viewportHeight: number;
}): number {
  const visibleHeight = (2 * distance * Math.tan((fov * Math.PI) / 360)) / zoom;
  const floor = (TOKEN_MIN_POINTS * visibleHeight) / viewportHeight;
  return Math.max(TOKEN_WORLD_DIAMETER, floor);
}
