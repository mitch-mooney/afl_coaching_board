import { describe, expect, it } from 'vitest';
import { FIELD_MARKINGS } from '../../../models/FieldModel';
import { palette } from '../../../theme/tokens';
import { boundaryOf } from '../../../utils/fieldGeometry';
import {
  fogColour,
  nightFill,
  skyColours,
  standColours,
  towerLights,
  turfStripes,
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

  it('keeps the stands and the sky darker than the lit turf, so the ground is what the light falls on', () => {
    const bowl = [
      standColours.apron,
      standColours.riser,
      ...standColours.seats,
      skyColours.zenith,
      skyColours.horizon,
      skyColours.below,
    ];
    for (const colour of bowl) {
      expect(luminance(colour)).toBeLessThan(luminance(palette.turfLit));
    }
  });

  it('bands the seats from dark to light within a tier, and keeps the risers darkest', () => {
    const seats = standColours.seats.map(luminance);
    seats.slice(1).forEach((l, i) => expect(l).toBeGreaterThan(seats[i]));
    expect(luminance(standColours.riser)).toBeLessThan(seats[0]);
  });

  it('fades the distance into the sky at the horizon, with no seam', () => {
    expect(fogColour).toBe(skyColours.horizon);
  });
});
