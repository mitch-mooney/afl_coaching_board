import { describe, expect, it } from 'vitest';
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

  /** How brightly a tower lights the middle of its pool, by the inverse square. */
  function poolIlluminance({ position, target, intensity }: TowerLight): number {
    const d2 = position.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0);
    return intensity / d2;
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
    expect(nightFill.intensity).toBeLessThan(0.55);
    for (const tower of towerLights(standard)) {
      expect(poolIlluminance(tower)).toBeGreaterThan(3 * nightFill.intensity);
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
