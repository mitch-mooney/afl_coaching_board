/**
 * What each team wears: the one place that decides, so the box figures and the
 * Player token can never disagree about a team's colours. Pure, with no store or
 * scene in reach.
 */
import { getTeamById, type JerseyPattern } from '../data/aflTeams';
import { DEFAULT_TEAM_COLORS, type Player } from '../models/PlayerModel';
import { palette } from '../theme/tokens';

/**
 * What a team turns up in: a club preset, or a custom team's one colour. A
 * preset id the board doesn't know falls back to the colour.
 */
export interface TeamKit {
  presetId?: string;
  color: string;
}

export interface Guernsey {
  /** The body colour: the guernsey's main colour, or the Clash guernsey's flipped one. */
  body: string;
  pattern: JerseyPattern;
  /** The colours the pattern is drawn in, over the body. */
  patternColours: string[];
  /** The token label's colour: Chalk or Concrete, whichever reads on the body. */
  label: string;
  /** Whether this team is in its Clash guernsey. Only ever true for Team 2. */
  clash: boolean;
}

type HomeGuernsey = Omit<Guernsey, 'label'>;

function homeGuernsey(kit: TeamKit): HomeGuernsey {
  const preset = kit.presetId ? getTeamById(kit.presetId) : undefined;
  if (preset) {
    return {
      body: preset.primaryColor,
      pattern: preset.pattern,
      patternColours: [preset.secondaryColor, ...(preset.tertiaryColor ? [preset.tertiaryColor] : [])],
      clash: false,
    };
  }
  return { body: kit.color, pattern: 'solid', patternColours: [kit.color], clash: false };
}

/** A colour in CIELAB (D65), the space the colour difference is measured in. */
interface Lab {
  l: number;
  a: number;
  b: number;
}

/** A hex colour's sRGB channels, linearised. */
function linearRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
}

/** WCAG relative luminance: 0 for black, 1 for white. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toLab(hex: string): Lab {
  const [r, g, b] = linearRgb(hex);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

/**
 * CIEDE2000: how different two colours look to a person, where 0 is identical
 * and about 2 is the smallest difference most people notice side by side.
 */
export function colourDifference(hexA: string, hexB: string): number {
  const p = toLab(hexA);
  const q = toLab(hexB);
  const rad = Math.PI / 180;
  const cMean7 = ((Math.hypot(p.a, p.b) + Math.hypot(q.a, q.b)) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + 25 ** 7)));
  const a1 = p.a * (1 + g);
  const a2 = q.a * (1 + g);
  const c1 = Math.hypot(a1, p.b);
  const c2 = Math.hypot(a2, q.b);
  const hue = (bb: number, aa: number) => {
    if (bb === 0 && aa === 0) return 0;
    const h = Math.atan2(bb, aa) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1 = hue(p.b, a1);
  const h2 = hue(q.b, a2);
  const chromatic = c1 * c2 !== 0;

  let dh = 0;
  if (chromatic) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dL = q.l - p.l;
  const dC = c2 - c1;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh / 2) * rad);

  const lMean = (p.l + q.l) / 2;
  const cMean = (c1 + c2) / 2;
  let hMean = h1 + h2;
  if (chromatic) {
    if (Math.abs(h1 - h2) <= 180) hMean = (h1 + h2) / 2;
    else hMean = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos((hMean - 30) * rad) +
    0.24 * Math.cos(2 * hMean * rad) +
    0.32 * Math.cos((3 * hMean + 6) * rad) -
    0.2 * Math.cos((4 * hMean - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7));
  const sL = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sC = 1 + 0.045 * cMean;
  const sH = 1 + 0.015 * cMean * t;
  const rT = -Math.sin(2 * dTheta * rad) * rC;
  return Math.sqrt((dL / sL) ** 2 + (dC / sC) ** 2 + (dH / sH) ** 2 + rT * (dC / sC) * (dH / sH));
}

/**
 * Main colours closer than this, by `colourDifference`, are too close to tell
 * two teams apart from across a room. Navy against royal blue (about 10) and
 * navy against purple (about 16) clash; navy against black (about 22) and red
 * against orange (about 22) do not.
 */
export const CLASH_THRESHOLD = 20;

function clashes(a: string, b: string): boolean {
  return colourDifference(a, b) < CLASH_THRESHOLD;
}

/** The Clash guernsey's body when the club colour is dark. */
const CLASH_WHITE = '#FFFFFF';

/**
 * A guernsey is dark when its main colour gives back less than half the light
 * white does. Red, navy, teal and orange are dark; gold and pale greys are not.
 */
function isDark(hex: string): boolean {
  return relativeLuminance(hex) < 0.5;
}

/**
 * The Clash guernsey: the pattern stays, the body flips, and the pattern takes
 * the club's main colour so the club still reads. A dark guernsey goes white and
 * a light one Concrete; if that body still clashes with Team 1, it takes the
 * other one.
 */
function clashGuernsey(home: HomeGuernsey, opponent: HomeGuernsey): HomeGuernsey {
  const [first, second] = isDark(home.body) ? [CLASH_WHITE, palette.concrete] : [palette.concrete, CLASH_WHITE];
  const body = clashes(first, opponent.body) ? second : first;
  return { ...home, body, patternColours: [home.body], clash: true };
}

/**
 * What each team wears. Team 2 changes into its Clash guernsey when the two
 * teams clash: the same club on both sides, or main colours too close to tell
 * apart. Team 1 never changes.
 */
export function teamGuernseys(team1: TeamKit, team2: TeamKit): { team1: Guernsey; team2: Guernsey } {
  const home1 = homeGuernsey(team1);
  const home2 = homeGuernsey(team2);
  const sameClub = team1.presetId !== undefined && team1.presetId === team2.presetId;
  const wears2 = sameClub || clashes(home1.body, home2.body) ? clashGuernsey(home2, home1) : home2;
  return { team1: withLabel(home1), team2: withLabel(wears2) };
}

/**
 * What each team on this board wears, reading a team's kit from its players.
 * `setTeamPreset` gives a whole team one preset and one colour, so the first
 * player speaks for the team. A team with no players on the board turns up in
 * its default colour.
 */
export function boardGuernseys(players: Player[]): Record<Player['teamId'], Guernsey> {
  const kit = (teamId: Player['teamId']): TeamKit => {
    const player = players.find((p) => p.teamId === teamId);
    return player
      ? { presetId: player.teamPresetId, color: player.color }
      : { color: DEFAULT_TEAM_COLORS[teamId] };
  };
  return teamGuernseys(kit('team1'), kit('team2'));
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The token's label sits on a plain centre in the body colour, so it takes
 * whichever of Chalk and Concrete contrasts more with the body.
 */
function withLabel(guernsey: HomeGuernsey): Guernsey {
  const label =
    contrastRatio(palette.chalk, guernsey.body) >= contrastRatio(palette.concrete, guernsey.body)
      ? palette.chalk
      : palette.concrete;
  return { ...guernsey, label };
}
