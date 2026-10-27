import { describe, expect, it } from 'vitest';
import { FIELD_MARKINGS } from '../../../models/FieldModel';
import { palette } from '../../../theme/tokens';
import { DEFAULT_CAMERA_POSITION } from '../../../store/cameraStore';
import { presetCameraPose } from '../../../utils/cameraMath';
import { type Boundary, boundaryOf, boundaryPoints } from '../../../utils/fieldGeometry';
import {
  crowdColours,
  crowdTile,
  fogColour,
  nightFill,
  skyColours,
  stadiumRing,
  stadiumShape,
  standColours,
  towerLights,
  turfStripes,
  type StadiumShape,
  type TowerLight,
} from '../nightGround';

/** The three channels of a `#rrggbb` hex. */
function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

describe('the night ground', () => {
  it('stripes the turf within the Turf range, from Turf up to Turf lit', () => {
    const turf = channels(palette.turf);
    const turfLit = channels(palette.turfLit);

    expect(turfStripes).toHaveLength(2);
    expect(turfStripes[0]).toBe(palette.turf);
    for (const stripe of turfStripes) {
      channels(stripe).forEach((c, i) => {
        expect(c).toBeGreaterThanOrEqual(turf[i]);
        expect(c).toBeLessThanOrEqual(turfLit[i]);
      });
    }
    // Two stripes that are the same colour are no stripes at all.
    expect(turfStripes[1]).not.toBe(turfStripes[0]);
  });

  const standard = boundaryOf({ boundaryLength: 165, boundaryWidth: 135 });
  const big = boundaryOf({ boundaryLength: 185, boundaryWidth: 155 });

  /**
   * The light a tower puts on the ground at the middle of its pool: the
   * inverse square, times the cosine of the angle the beam strikes the ground at.
   */
  function poolIlluminance({ position, target, intensity }: TowerLight): number {
    const d2 = position.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0);
    const cosIncidence = (position[1] - target[1]) / Math.sqrt(d2);
    return (intensity / d2) * cosIncidence;
  }

  it('stands a tower off each corner of the ground, aimed into its own quadrant', () => {
    const towers = towerLights(standard);
    expect(towers).toHaveLength(4);

    const quadrants = towers.map(({ position: [x, , z] }) => `${Math.sign(x)},${Math.sign(z)}`);
    expect(new Set(quadrants)).toEqual(new Set(['-1,-1', '-1,1', '1,-1', '1,1']));

    for (const { position: [x, y, z], target: [tx, ty, tz] } of towers) {
      expect((x / standard.semiX) ** 2 + (z / standard.semiZ) ** 2).toBeGreaterThan(1);
      expect(y).toBeGreaterThan(0);
      expect(ty).toBe(0);
      expect((tx / standard.semiX) ** 2 + (tz / standard.semiZ) ** 2).toBeLessThan(1);
      expect(Math.sign(tx)).toBe(Math.sign(x));
      expect(Math.sign(tz)).toBe(Math.sign(z));
    }
  });

  it('moves the towers out with a bigger ground and lights its pools just as brightly', () => {
    const near = towerLights(standard);
    const far = towerLights(big);

    far.forEach((tower, i) => {
      expect(Math.abs(tower.position[0])).toBeGreaterThan(Math.abs(near[i].position[0]));
      expect(Math.abs(tower.position[2])).toBeGreaterThan(Math.abs(near[i].position[2]));
      expect(poolIlluminance(tower)).toBeCloseTo(poolIlluminance(near[i]), 6);
    });
  });

  it('makes the towers the main source, with the fill dropped low', () => {
    // The day rig's hemisphere fill was 1.1.
    expect(nightFill.intensity).toBeLessThan(1.1);
    for (const tower of towerLights(standard)) {
      expect(poolIlluminance(tower)).toBeGreaterThan(2 * nightFill.intensity);
    }
  });

  it('lights the middle of each pool so the turf there shows its own colour', () => {
    // three (r155 on) draws a matte surface at its colour times the light on
    // it over pi, so a pool's middle shows the turf as painted when its tower
    // and the fill together put pi on the ground. Much less, and the whole
    // ground sinks below Turf; much more, and the pools blow past Turf lit.
    for (const tower of towerLights(standard)) {
      const total = poolIlluminance(tower) + nightFill.intensity;
      expect(total).toBeGreaterThan(Math.PI * 0.9);
      expect(total).toBeLessThan(Math.PI * 1.1);
    }
  });

  it("fills with the towers' light scattered back off the sky, not with a dark colour", () => {
    // The hemisphere light's sky colour multiplies its intensity on every
    // upward face. A dark sky colour there is a fill of almost nothing.
    expect(nightFill.sky).toBe(palette.floodlight);
    expect(nightFill.ground).toBe(palette.turf);
  });

  /**
   * The light the whole rig puts on the ground at (x, z), the way three (r155
   * on) lights it: each tower by the inverse square, its cone's smoothstep edge
   * and the cosine of the angle it strikes the ground at; the hemisphere fill
   * at full intensity on an upward face.
   */
  function illuminanceAt(towers: TowerLight[], x: number, z: number): number {
    let total = nightFill.intensity;
    for (const { position: [px, py, pz], target: [tx, ty, tz], intensity, angle, penumbra } of towers) {
      const toLight = [px - x, py, pz - z];
      const d = Math.hypot(...toLight);
      const axis = [tx - px, ty - py, tz - pz];
      const axisLength = Math.hypot(...axis);
      const cosOffAxis = -(toLight[0] * axis[0] + toLight[1] * axis[1] + toLight[2] * axis[2]) / (d * axisLength);
      const outer = Math.cos(angle);
      const inner = Math.cos(angle * (1 - penumbra));
      const t = Math.min(1, Math.max(0, (cosOffAxis - outer) / (inner - outer)));
      const cone = t * t * (3 - 2 * t);
      total += (intensity / d ** 2) * cone * (toLight[1] / d);
    }
    return total;
  }

  /** Points on a grid across the field of play, boundary line included. */
  function fieldOfPlay({ semiX, semiZ }: { semiX: number; semiZ: number }): [number, number][] {
    const points: [number, number][] = [];
    const steps = 30;
    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        const u = i / steps;
        const v = j / steps;
        if (u * u + v * v <= 1) points.push([u * semiX, v * semiZ]);
      }
    }
    return points;
  }

  // The corners of the range a Venue's boundary may take, plus real grounds.
  const venues = [
    standard,
    big,
    boundaryOf({ boundaryLength: 120, boundaryWidth: 90 }),
    boundaryOf({ boundaryLength: 200, boundaryWidth: 170 }),
    boundaryOf({ boundaryLength: 200, boundaryWidth: 90 }),
    boundaryOf({ boundaryLength: 120, boundaryWidth: 120 }),
  ];

  it('lights the wings and both goal squares, on every Venue, nearly as well as the pools', () => {
    // Coaches draw on the wings and in the goal squares constantly (#107).
    for (const boundary of venues) {
      const towers = towerLights(boundary);
      const peak = Math.max(...fieldOfPlay(boundary).map(([x, z]) => illuminanceAt(towers, x, z)));
      const spots: [number, number][] = [
        [0, 0.8 * boundary.semiZ],
        [0, -0.8 * boundary.semiZ],
        [boundary.semiX - FIELD_MARKINGS.goalSquareDepth / 2, 0],
        [-(boundary.semiX - FIELD_MARKINGS.goalSquareDepth / 2), 0],
      ];
      for (const [x, z] of spots) {
        expect(illuminanceAt(towers, x, z)).toBeGreaterThan(0.5 * peak);
      }
    }
  });

  it('drops no part of the field of play into darkness, on every Venue, but keeps the pools', () => {
    for (const boundary of venues) {
      const towers = towerLights(boundary);
      const light = fieldOfPlay(boundary).map(([x, z]) => illuminanceAt(towers, x, z));
      const peak = Math.max(...light);
      const darkest = Math.min(...light);
      // Lit everywhere: a third of the brightest pool at worst.
      expect(darkest).toBeGreaterThan(peak / 3);
      // Still a night game: the grass between the pools reads darker than them.
      expect(darkest).toBeLessThan(0.7 * peak);
      // And not by flooding it: where pools overlap stays short of blown out.
      expect(peak).toBeLessThan(1.8 * Math.PI);
    }
  });

  it('throws shadows from the towers, from no more than two of them', () => {
    // Each shadow-casting light renders the scene once more per frame, and the
    // day rig cast from one light. Two keeps 36 players inside the iPad's budget.
    const casting = towerLights(standard).filter((t) => t.castShadow);
    expect(casting.length).toBeGreaterThanOrEqual(1);
    expect(casting.length).toBeLessThanOrEqual(2);
  });

  /** WCAG relative luminance, 0 for black to 1 for white. */
  function luminance(hex: string): number {
    const [r, g, b] = channels(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** Every colour the Stadium is drawn in. */
  const stadiumColours = [
    standColours.apron,
    standColours.fence,
    standColours.frontWall,
    standColours.seat,
    standColours.rowShadow,
    ...crowdColours.shirts,
    ...crowdColours.heads,
  ];

  /** HSL saturation, 0 for a grey to 1. */
  function saturation(hex: string): number {
    const c = channels(hex).map((v) => v / 255);
    const max = Math.max(...c);
    const min = Math.min(...c);
    if (max === min) return 0;
    const l = (max + min) / 2;
    return (max - min) / (1 - Math.abs(2 * l - 1));
  }

  it('keeps the sky darker than the lit turf, so the ground is what the light falls on', () => {
    for (const colour of [skyColours.zenith, skyColours.horizon, skyColours.below]) {
      expect(luminance(colour)).toBeLessThan(luminance(palette.turfLit));
    }
  });

  it('draws the Stadium, crowd included, in greys no brighter and no more saturated than the darkest mowing stripe', () => {
    // Team colours and chalk stay the brightest things on screen (#136).
    const darkest = turfStripes.reduce((a, b) => (luminance(a) <= luminance(b) ? a : b));
    for (const colour of stadiumColours) {
      const [r, g, b] = channels(colour);
      expect(g).toBe(r);
      expect(b).toBe(r);
      expect(luminance(colour)).toBeLessThanOrEqual(luminance(darkest));
      expect(saturation(colour)).toBeLessThanOrEqual(saturation(darkest));
    }
  });

  it('dresses the crowd in shades far enough apart to read as people, not as a grey band', () => {
    const shades = new Set(crowdColours.shirts.map((c) => channels(c)[0]));
    expect(shades.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...shades) - Math.min(...shades)).toBeGreaterThanOrEqual(20);
    // Faces catch the light: the brightest thing in a row is a head, never a shirt.
    expect(Math.max(...crowdColours.heads.map(luminance))).toBeGreaterThanOrEqual(
      Math.max(...crowdColours.shirts.map(luminance)),
    );
  });

  it('seats the crowd row by row, speckled along each row rather than in bands of one shade', () => {
    const tile = crowdTile();
    expect(tile.seats).toHaveLength(tile.rows);
    for (const row of tile.seats) {
      expect(row).toHaveLength(tile.seatsPerRow);
      // A stand is full but not sold out: most seats taken, a few empty.
      const taken = row.filter((seat) => seat !== null);
      expect(taken.length).toBeGreaterThan(0.7 * row.length);
      let run = 1;
      for (let i = 1; i < row.length; i++) {
        const same = row[i] && row[i - 1] && row[i]!.shirt === row[i - 1]!.shirt;
        run = same ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(2);
      }
      for (const seat of taken) {
        expect(crowdColours.shirts).toContain(seat!.shirt);
        expect(crowdColours.heads).toContain(seat!.head);
      }
    }
    // No two rows alike, or the rows would line up into stripes round the ground.
    const rows = new Set(tile.seats.map((row) => row.map((seat) => seat?.shirt ?? '-').join()));
    expect(rows.size).toBe(tile.rows);
  });

  it('paints the same crowd every time, so it can be generated once in code', () => {
    expect(crowdTile()).toEqual(crowdTile());
  });

  it('bands each row of seats light over the shadow at its foot, and darkens towards the back', () => {
    expect(luminance(standColours.seat)).toBeGreaterThan(luminance(standColours.rowShadow));
    expect(standColours.backShade).toBeGreaterThan(0);
    expect(standColours.backShade).toBeLessThan(1);
  });

  it('fades the distance into the sky at the horizon, with no seam', () => {
    expect(fogColour).toBe(skyColours.horizon);
  });

  // The Stadium is fitted to every ground in the plausible range, not just the
  // Standard one: these are its corners (#136).
  const grounds = [
    standard,
    boundaryOf({ boundaryLength: 120, boundaryWidth: 90 }),
    boundaryOf({ boundaryLength: 120, boundaryWidth: 170 }),
    boundaryOf({ boundaryLength: 200, boundaryWidth: 90 }),
    boundaryOf({ boundaryLength: 200, boundaryWidth: 170 }),
  ];

  it('stands the front row at the same setback outside the Boundary at every ground, past the fence', () => {
    const setbacks = grounds.map((boundary) => stadiumShape(boundary).frontRow.setback);
    expect(new Set(setbacks).size).toBe(1);
    const [setback] = setbacks;
    expect(setback).toBeGreaterThanOrEqual(8);
    expect(setback).toBeLessThanOrEqual(10);
    for (const boundary of grounds) {
      const { fence, frontRow } = stadiumShape(boundary);
      expect(fence.setback).toBeGreaterThan(0);
      expect(fence.setback).toBeLessThan(frontRow.setback);
    }
  });

  /** How far outside the Boundary (x, z) lies, as a Stadium setback; negative inside it. */
  function setbackOf(boundary: Boundary, x: number, z: number): number {
    const outside = (setback: number) => {
      const { semiX, semiZ } = stadiumRing(boundary, setback);
      return (x / semiX) ** 2 + (z / semiZ) ** 2 > 1;
    };
    if (!outside(0)) return -1;
    let lo = 0;
    let hi = 1000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (outside(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** How high the Stadium stands at a setback: the fence, then the front wall and the raked deck. */
  function standHeight({ fence, frontRow, topRow }: StadiumShape, setback: number): number {
    if (setback < fence.setback || setback > topRow.setback) return 0;
    if (setback < frontRow.setback) return fence.height;
    const t = (setback - frontRow.setback) / (topRow.setback - frontRow.setback);
    return frontRow.height + t * (topRow.height - frontRow.height);
  }

  it('keeps the whole near boundary in sight over the stand, from every preset, at every ground', () => {
    // The stand is a backdrop: no preset may lose a blade of the field to it.
    // Every point on the boundary is checked, not just the one straight ahead,
    // since a line of sight crossing the stand at a slant is the shallow one.
    const MARGIN = 1;
    for (const boundary of grounds) {
      const shape = stadiumShape(boundary);
      const cameras = [
        presetCameraPose('sideline', boundary).position,
        presetCameraPose('end-to-end', boundary).position,
        DEFAULT_CAMERA_POSITION,
      ];
      for (const camera of cameras) {
        for (const [bx, bz] of boundaryPoints(boundary, 128)) {
          for (let i = 1; i < 400; i++) {
            const t = i / 400;
            const x = bx + (camera[0] - bx) * t;
            const y = camera[1] * t;
            const z = bz + (camera[2] - bz) * t;
            const setback = setbackOf(boundary, x, z);
            if (setback < shape.fence.setback) continue;
            expect(y - standHeight(shape, setback)).toBeGreaterThan(MARGIN);
          }
        }
      }
    }
  });

  it("rises to the top row from the front row along the deck's rake", () => {
    for (const boundary of grounds) {
      const { frontRow, topRow, deckDepth, rake } = stadiumShape(boundary);
      expect(topRow.setback - frontRow.setback).toBe(deckDepth);
      expect(Math.tan(rake) * deckDepth).toBeCloseTo(topRow.height - frontRow.height, 9);
      expect(topRow.height).toBeGreaterThan(frontRow.height);
    }
  });

  it('lights the field from the towers exactly as it was tuned (#107)', () => {
    // Captured from towerLights before the Stadium was built round the towers.
    expect(towerLights(standard)).toEqual(TOWERS_AT_STANDARD);
    expect(towerLights(boundaryOf({ boundaryLength: 200, boundaryWidth: 170 }))).toEqual(TOWERS_AT_200_BY_170);
  });
});

const TOWERS_AT_STANDARD = [
  { position: [-104.5, 65, -89.5], target: [-49.5, 0, -33.75], intensity: 37976.57383464596, angle: 0.6160606128106922, penumbra: 0.6, castShadow: true },
  { position: [104.5, 65, 89.5], target: [49.5, 0, 33.75], intensity: 37976.57383464596, angle: 0.6160606128106922, penumbra: 0.6, castShadow: true },
  { position: [104.5, 65, -89.5], target: [49.5, 0, -33.75], intensity: 37976.57383464596, angle: 0.6160606128106922, penumbra: 0.6, castShadow: false },
  { position: [-104.5, 65, 89.5], target: [-49.5, 0, 33.75], intensity: 37976.57383464596, angle: 0.6160606128106922, penumbra: 0.6, castShadow: false },
];

const TOWERS_AT_200_BY_170 = [
  { position: [-122, 65, -107], target: [-60, 0, -42.5], intensity: 48718.92817415883, angle: 0.6745354079198873, penumbra: 0.6, castShadow: true },
  { position: [122, 65, 107], target: [60, 0, 42.5], intensity: 48718.92817415883, angle: 0.6745354079198873, penumbra: 0.6, castShadow: true },
  { position: [122, 65, -107], target: [60, 0, -42.5], intensity: 48718.92817415883, angle: 0.6745354079198873, penumbra: 0.6, castShadow: false },
  { position: [-122, 65, 107], target: [-60, 0, 42.5], intensity: 48718.92817415883, angle: 0.6745354079198873, penumbra: 0.6, castShadow: false },
];
