import type { Drill, DrillCategory } from '../models/TrainingSession';
import type { Player } from '../models/PlayerModel';
import { DEFAULT_TEAM_COLORS } from '../models/PlayerModel';

export interface DrillBoardLayout {
  playerPositions: Player[];
  conePositions: Array<[number, number, number]>;
}

interface ZoneConfig {
  cx: number;  // centre x
  cz: number;  // centre z
  xSpread: number;
  zSpread: number;
}

const ZONE_CONFIG: Record<DrillCategory, ZoneConfig> = {
  attack:        { cx: 55,  cz: 0, xSpread: 22, zSpread: 18 },
  'goal-kicking':{ cx: 55,  cz: 0, xSpread: 22, zSpread: 18 },
  defence:       { cx: -55, cz: 0, xSpread: 22, zSpread: 18 },
  rucking:       { cx: 0,   cz: 0, xSpread: 8,  zSpread: 8  },
  marking:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
  kicking:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
  'ball-handling':{ cx: 0,  cz: 0, xSpread: 28, zSpread: 22 },
  fitness:       { cx: 0,   cz: 0, xSpread: 28, zSpread: 22 },
};

/**
 * Distribute N points in a grid inside [cx ± xSpread, cz ± zSpread].
 * Returns [x, z] pairs.
 */
function gridPoints(n: number, cx: number, cz: number, xSpread: number, zSpread: number): [number, number][] {
  if (n === 0) return [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const points: [number, number][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (points.length >= n) break;
      const x = cols === 1 ? cx : cx - xSpread + (c / (cols - 1)) * xSpread * 2;
      const z = rows === 1 ? cz : cz - zSpread + (r / (rows - 1)) * zSpread * 2;
      points.push([x, z]);
    }
  }
  return points;
}

/**
 * Given a drill, return ghost player positions and cone positions
 * for placing on the 3D board.
 *
 * Field coordinates:
 *   x = goal-to-goal (±82.5), z = wing-to-wing (±67.5), y = 0 (ground)
 */
export function getDrillBoardLayout(drill: Drill): DrillBoardLayout {
  const zone = ZONE_CONFIG[drill.category];
  const { cx, cz, xSpread, zSpread } = zone;

  // --- Player positions ---
  const n = drill.playersRequired;
  const teamACount = Math.ceil(n / 2);
  const teamBCount = Math.floor(n / 2);

  // Two sub-grids: team A at cz - zSpread/2, team B at cz + zSpread/2
  const teamAPoints = gridPoints(teamACount, cx, cz - zSpread / 2, xSpread * 0.8, zSpread * 0.35);
  const teamBPoints = gridPoints(teamBCount, cx, cz + zSpread / 2, xSpread * 0.8, zSpread * 0.35);

  const playerPositions: Player[] = [
    ...teamAPoints.map(([x, z], i): Player => ({
      id: `drill-preview-a-${i}`,
      teamId: 'team1',
      position: [x, 0, z],
      rotation: 0,
      color: DEFAULT_TEAM_COLORS.team1,
      number: i + 1,
    })),
    ...teamBPoints.map(([x, z], i): Player => ({
      id: `drill-preview-b-${i}`,
      teamId: 'team2',
      position: [x, 0, z],
      rotation: Math.PI,
      color: DEFAULT_TEAM_COLORS.team2,
      number: i + 1,
    })),
  ];

  // --- Cone positions ---
  const conePositions: Array<[number, number, number]> = [];
  if (drill.equipment.includes('cones')) {
    const cxOff = xSpread * 0.7;
    const czOff = zSpread * 0.7;
    // Four corners
    conePositions.push(
      [cx - cxOff, 0, cz - czOff],
      [cx + cxOff, 0, cz - czOff],
      [cx + cxOff, 0, cz + czOff],
      [cx - cxOff, 0, cz + czOff],
    );
    // Two mid-channel markers
    conePositions.push(
      [cx, 0, cz - czOff],
      [cx, 0, cz + czOff],
    );
  }

  return { playerPositions, conePositions };
}
