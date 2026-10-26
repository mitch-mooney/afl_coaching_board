import { describe, it, expect } from 'vitest';
import {
  cameraTilt,
  playerLook,
  povCameraPose,
  presetCameraPose,
  tokenDiameter,
  POV_LOOK_AHEAD,
  POV_LOOK_UP,
} from '../cameraMath';
import { STANDARD_BOUNDARY, boundaryOf } from '../fieldGeometry';

// A tight community ground: 150 m goal-to-goal, 110 m wing-to-wing.
const TIGHT = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });

describe('povCameraPose', () => {
  it('faces +z at rotation 0: camera sits behind (−z), looks ahead (+z)', () => {
    const pose = povCameraPose([0, 0, 0], 0, 3, 10);
    expect(pose.position).toEqual([0, 3, -10]);
    expect(pose.lookAt).toEqual([0, 1, 5]);
  });

  it('faces +x at rotation π/2: camera sits behind (−x), looks ahead (+x)', () => {
    const pose = povCameraPose([0, 0, 0], Math.PI / 2, 3, 10);
    expect(pose.position[0]).toBeCloseTo(-10, 10);
    expect(pose.position[1]).toBe(3);
    expect(pose.position[2]).toBeCloseTo(0, 10);
    expect(pose.lookAt[0]).toBeCloseTo(5, 10);
    expect(pose.lookAt[1]).toBe(1);
    expect(pose.lookAt[2]).toBeCloseTo(0, 10);
  });

  it('tracks a non-origin player, applying height and distance offsets', () => {
    const pose = povCameraPose([10, 2, -4], 0, 3, 10);
    expect(pose.position).toEqual([10, 5, -14]);
    expect(pose.lookAt).toEqual([10, 3, 1]);
  });

  it('locks the sign pairing at a mixed angle (π/4) with a non-origin player', () => {
    // sin(π/4) = cos(π/4) ≈ 0.70710678, so both axes are non-trivial at once —
    // this catches an accidental swap of the behind (−dir·dist) vs ahead (+dir·5) signs.
    const pose = povCameraPose([10, 2, -4], Math.PI / 4, 3, 10);
    expect(pose.position[0]).toBeCloseTo(2.928932, 6); // 10 − 0.70710678·10
    expect(pose.position[1]).toBe(5); // 2 + 3
    expect(pose.position[2]).toBeCloseTo(-11.071068, 6); // −4 − 0.70710678·10
    expect(pose.lookAt[0]).toBeCloseTo(13.535534, 6); // 10 + 0.70710678·5
    expect(pose.lookAt[1]).toBe(3); // 2 + 1
    expect(pose.lookAt[2]).toBeCloseTo(-0.464466, 6); // −4 + 0.70710678·5
  });

  it('exposes the look-ahead and look-up constants', () => {
    expect(POV_LOOK_AHEAD).toBe(5);
    expect(POV_LOOK_UP).toBe(1);
  });
});

describe('presetCameraPose', () => {
  // Standard ground is the regression guard: these are the poses the three presets
  // have always used, and they must not move for a coach who never records a Venue.
  describe('at Standard ground (165 × 135)', () => {
    it('top looks straight down from 200 m', () => {
      expect(presetCameraPose('top', STANDARD_BOUNDARY)).toEqual({
        position: [0, 200, 0],
        target: [0, 0, 0],
      });
    });

    it('sideline sits 150 m off the wing, 50 m up', () => {
      expect(presetCameraPose('sideline', STANDARD_BOUNDARY).position).toEqual([0, 50, 150]);
    });

    it('end-to-end sits 150 m beyond the goal, 50 m up', () => {
      expect(presetCameraPose('end-to-end', STANDARD_BOUNDARY).position).toEqual([150, 50, 0]);
    });
  });

  describe('at a tighter ground (150 × 110)', () => {
    it('frames closer than Standard ground from every preset', () => {
      // The point of the whole feature: a smaller ground is framed smaller, so it
      // reads as smaller rather than being zoomed back up to fill the screen.
      expect(presetCameraPose('top', TIGHT).position[1]).toBeLessThan(200);
      expect(presetCameraPose('sideline', TIGHT).position[2]).toBeLessThan(150);
      expect(presetCameraPose('end-to-end', TIGHT).position[0]).toBeLessThan(150);
    });

    it('stands the sideline camera off the wing by the ground half-length it has to fit', () => {
      // 55 m to the wing + 75 m of half-length to fit across the frame.
      const [x, y, z] = presetCameraPose('sideline', TIGHT).position;
      expect([x, z]).toEqual([0, 130]);
      expect(y).toBeCloseTo(130 / 3, 6);
    });

    it('stands the end-to-end camera off the goal by the half-width it has to fit', () => {
      // 75 m to the goal line + 55 m of half-width to fit across the frame.
      const [x, y, z] = presetCameraPose('end-to-end', TIGHT).position;
      expect([x, z]).toEqual([130, 0]);
      expect(y).toBeCloseTo(130 / 3, 6);
    });
  });

  it('always looks at the centre bounce, at every ground', () => {
    for (const view of ['top', 'sideline', 'end-to-end'] as const) {
      expect(presetCameraPose(view, TIGHT).target).toEqual([0, 0, 0]);
    }
  });

  it('is unaffected by which end is which — a ground is symmetric about the centre', () => {
    const wide = boundaryOf({ boundaryLength: 165, boundaryWidth: 141 });
    expect(presetCameraPose('sideline', wide).position[2]).toBeGreaterThan(150);
    expect(presetCameraPose('end-to-end', wide).position[0]).toBeGreaterThan(150);
  });

  it('views a longer ground from higher up even when it is also narrower', () => {
    // 170 × 110: longer than Standard goal-to-goal but much tighter across. Top
    // view has to rise to keep the extra length in frame — the ends are what would
    // be cropped, and they are the part that grew.
    const longAndNarrow = boundaryOf({ boundaryLength: 170, boundaryWidth: 110 });
    expect(presetCameraPose('top', longAndNarrow).position[1]).toBeGreaterThan(200);
  });
});

describe('playerLook: bodies or tokens', () => {
  const look = (tilt: number, previous: 'body' | 'token') => playerLook({ tilt, pov: false, previous });

  it('shows tokens once the camera tilts above 62°', () => {
    expect(look(63, 'body')).toBe('token');
    expect(look(90, 'body')).toBe('token');
  });

  it('shows bodies once the camera lowers below 58°', () => {
    expect(look(57, 'token')).toBe('body');
    expect(look(20, 'token')).toBe('body');
  });

  it('holds whatever it showed while the camera is inside the gap', () => {
    for (const tilt of [58, 59, 60, 61, 62]) {
      expect(look(tilt, 'body')).toBe('body');
      expect(look(tilt, 'token')).toBe('token');
    }
  });

  it('does not flicker when the camera orbits through 60° from either side', () => {
    let shown: 'body' | 'token' = 'body';
    const seen: Array<[number, string]> = [];
    for (const tilt of [50, 56, 59, 61, 63, 61, 59, 57, 59, 61]) {
      shown = look(tilt, shown);
      seen.push([tilt, shown]);
    }
    expect(seen).toEqual([
      [50, 'body'],
      [56, 'body'],
      [59, 'body'],
      [61, 'body'],
      [63, 'token'],
      [61, 'token'],
      [59, 'token'],
      [57, 'body'],
      [59, 'body'],
      [61, 'body'],
    ]);
  });

  it('always shows bodies in a POV view, however steep', () => {
    expect(playerLook({ tilt: 90, pov: true, previous: 'body' })).toBe('body');
    expect(playerLook({ tilt: 90, pov: true, previous: 'token' })).toBe('body');
  });

  describe('the preset views', () => {
    const tiltOf = (view: 'top' | 'sideline' | 'end-to-end') => {
      const { position, target } = presetCameraPose(view, STANDARD_BOUNDARY);
      return cameraTilt(position, target);
    };

    it('Top looks straight down, so it shows tokens', () => {
      expect(tiltOf('top')).toBeCloseTo(90, 6);
      expect(look(tiltOf('top'), 'body')).toBe('token');
    });

    it('Broadcast, Sideline and End-to-end show bodies', () => {
      // The Broadcast pose the board opens in: 100 m up, 150 m off the wing.
      const broadcast = cameraTilt([0, 100, 150], [0, 0, 0]);
      expect(broadcast).toBeCloseTo(33.69, 2);
      for (const tilt of [broadcast, tiltOf('sideline'), tiltOf('end-to-end')]) {
        expect(look(tilt, 'token')).toBe('body');
      }
    });

    it('measures tilt from the camera to whatever it looks at', () => {
      expect(tiltOf('sideline')).toBeCloseTo(18.43, 2);
      expect(cameraTilt([10, 20, 30], [10, 0, 10])).toBeCloseTo(45, 6);
    });
  });
});

describe('tokenDiameter', () => {
  // The board's camera: a 50° vertical field of view, no pinch zoom.
  const view = { fov: 50, zoom: 1 };

  it('is the true 2 m when the camera is close enough for 2 m to read', () => {
    // 20 m away on an 834-point-tall iPad, 2 m spans about 89 points.
    expect(tokenDiameter({ ...view, distance: 20, viewportHeight: 834 })).toBe(2);
  });

  it('never draws smaller than 32 points on screen', () => {
    // From Top view's 200 m, 834 points span 186.5 m: 4.47 points a metre, so
    // 2 m would be 9 points. The floor holds the token at 32 points, 7.16 m.
    expect(tokenDiameter({ ...view, distance: 200, viewportHeight: 834 })).toBeCloseTo(7.16, 2);
  });

  it('needs more ground for the floor on a shorter screen', () => {
    // An iPhone 13 in portrait: 664 points of height span the same 186.5 m.
    expect(tokenDiameter({ ...view, distance: 200, viewportHeight: 664 })).toBeCloseTo(8.99, 2);
  });

  it('counts pinch zoom: zoomed in twice, the floor needs half the ground', () => {
    expect(tokenDiameter({ fov: 50, zoom: 2, distance: 200, viewportHeight: 834 })).toBeCloseTo(3.58, 2);
  });
});
