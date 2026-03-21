/**
 * Pre-built AFL Formation Templates
 *
 * Field dimensions: 165m (length/x) x 135m (width/z)
 * Center: (0, 0, 0)
 * Team 1 defends at x = -82.5 (goal at negative x)
 * Team 2 defends at x = +82.5 (goal at positive x)
 *
 * NOTE: Field has been rotated 90 degrees from original orientation.
 * X-axis is now goal-to-goal, Z-axis is now wing-to-wing.
 *
 * Standard AFL positions:
 * - Full Back (FB), Back Pocket (BP)
 * - Centre Half Back (CHB), Half Back Flank (HBF)
 * - Wing (W), Centre (C), Ruck (R), Rover (RO), Ruck Rover (RR)
 * - Centre Half Forward (CHF), Half Forward Flank (HFF)
 * - Full Forward (FF), Forward Pocket (FP)
 */

import { Formation, PlayerPosition } from '../types/Formation';

/**
 * Helper to create player positions for a team
 * Applies 90-degree rotation to match field orientation (x=goal-to-goal, z=wing-to-wing)
 */
function createTeamPositions(
  teamId: 'team1' | 'team2',
  positions: Array<{ x: number; z: number; role: string; rotation?: number }>
): PlayerPosition[] {
  return positions.map((pos, index) => ({
    playerNumber: index + 1,
    teamId,
    // Rotate 90 degrees: new_x = old_z, new_z = old_x
    position: [pos.z, 0, pos.x] as [number, number, number],
    rotation: pos.rotation ?? 0,
    role: pos.role,
  }));
}

/**
 * Mirror positions for opposing team (flip z-axis in original orientation)
 * After rotation, this will flip the x-axis (goal-to-goal)
 */
function mirrorTeamPositions(
  sourcePositions: Array<{ x: number; z: number; role: string; rotation?: number }>
): Array<{ x: number; z: number; role: string; rotation?: number }> {
  return sourcePositions.map(pos => ({
    ...pos,
    z: -pos.z,  // In original coords (will become x after rotation)
    rotation: pos.rotation ? pos.rotation + Math.PI : Math.PI,
  }));
}

// Standard AFL Team 1 positions (defending at z = -67.5)
const STANDARD_TEAM1_POSITIONS = [
  // Defence
  { x: 0, z: -60, role: 'FB', rotation: 0 },           // Full Back
  { x: -25, z: -55, role: 'BP', rotation: 0 },         // Back Pocket Left
  { x: 25, z: -55, role: 'BP', rotation: 0 },          // Back Pocket Right
  { x: 0, z: -40, role: 'CHB', rotation: 0 },          // Centre Half Back
  { x: -35, z: -40, role: 'HBF', rotation: 0 },        // Half Back Flank Left
  { x: 35, z: -40, role: 'HBF', rotation: 0 },         // Half Back Flank Right

  // Midfield
  { x: -50, z: 0, role: 'W', rotation: Math.PI / 2 },  // Wing Left
  { x: 50, z: 0, role: 'W', rotation: -Math.PI / 2 },  // Wing Right
  { x: 0, z: -5, role: 'C', rotation: 0 },             // Centre
  { x: 0, z: 5, role: 'R', rotation: 0 },              // Ruckman
  { x: -15, z: 5, role: 'RR', rotation: 0 },           // Ruck Rover
  { x: 15, z: 5, role: 'RO', rotation: 0 },            // Rover

  // Forward
  { x: 0, z: 40, role: 'CHF', rotation: Math.PI },     // Centre Half Forward
  { x: -35, z: 40, role: 'HFF', rotation: Math.PI },   // Half Forward Flank Left
  { x: 35, z: 40, role: 'HFF', rotation: Math.PI },    // Half Forward Flank Right
  { x: 0, z: 60, role: 'FF', rotation: Math.PI },      // Full Forward
  { x: -25, z: 55, role: 'FP', rotation: Math.PI },    // Forward Pocket Left
  { x: 25, z: 55, role: 'FP', rotation: Math.PI },     // Forward Pocket Right

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

/**
 * 1. STANDARD SETUP
 * Traditional AFL positioning with players in their designated areas.
 * Balanced formation suitable for most game situations.
 */
const STANDARD_SETUP: Formation = {
  id: 'standard-setup',
  name: 'Standard Setup',
  description: 'Traditional AFL positioning with players in their designated areas. Balanced formation suitable for most game situations.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', STANDARD_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(STANDARD_TEAM1_POSITIONS)),
  ],
};

/**
 * 2. ZONE DEFENSE
 * Players positioned in defensive zones rather than man-to-man.
 * Compact defensive structure to limit opposition scoring opportunities.
 */
const ZONE_DEFENSE_TEAM1_POSITIONS = [
  // Deep zone - packed defence
  { x: 0, z: -55, role: 'FB', rotation: 0 },
  { x: -20, z: -50, role: 'BP', rotation: 0 },
  { x: 20, z: -50, role: 'BP', rotation: 0 },
  { x: -40, z: -45, role: 'HBF', rotation: 0 },
  { x: 40, z: -45, role: 'HBF', rotation: 0 },
  { x: 0, z: -35, role: 'CHB', rotation: 0 },

  // Mid zone - players sit behind the ball
  { x: -30, z: -15, role: 'W', rotation: 0 },
  { x: 30, z: -15, role: 'W', rotation: 0 },
  { x: -15, z: -20, role: 'RR', rotation: 0 },
  { x: 15, z: -20, role: 'RO', rotation: 0 },
  { x: 0, z: -5, role: 'C', rotation: 0 },
  { x: 0, z: 10, role: 'R', rotation: 0 },

  // Forward zone - minimal forward presence
  { x: 0, z: 25, role: 'CHF', rotation: Math.PI },
  { x: -30, z: 35, role: 'HFF', rotation: Math.PI },
  { x: 30, z: 35, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 55, role: 'FF', rotation: Math.PI },
  { x: -20, z: 50, role: 'FP', rotation: Math.PI },
  { x: 20, z: 50, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const ZONE_DEFENSE: Formation = {
  id: 'zone-defense',
  name: 'Zone Defense',
  description: 'Players positioned in defensive zones rather than man-to-man. Compact structure to limit opposition scoring opportunities.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', ZONE_DEFENSE_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(ZONE_DEFENSE_TEAM1_POSITIONS)),
  ],
};

/**
 * 3. PRESS
 * High forward pressure formation with midfielders pushing forward.
 * Aggressive setup to force turnovers in the opposition's defensive area.
 */
const PRESS_TEAM1_POSITIONS = [
  // Defence - standard positioning
  { x: 0, z: -58, role: 'FB', rotation: 0 },
  { x: -22, z: -52, role: 'BP', rotation: 0 },
  { x: 22, z: -52, role: 'BP', rotation: 0 },
  { x: 0, z: -35, role: 'CHB', rotation: 0 },
  { x: -35, z: -38, role: 'HBF', rotation: 0 },
  { x: 35, z: -38, role: 'HBF', rotation: 0 },

  // Midfield - pushed forward
  { x: -45, z: 25, role: 'W', rotation: Math.PI / 2 },
  { x: 45, z: 25, role: 'W', rotation: -Math.PI / 2 },
  { x: 0, z: 20, role: 'C', rotation: Math.PI },
  { x: 0, z: 35, role: 'R', rotation: Math.PI },
  { x: -20, z: 25, role: 'RR', rotation: Math.PI },
  { x: 20, z: 25, role: 'RO', rotation: Math.PI },

  // Forward - high and tight
  { x: 0, z: 50, role: 'CHF', rotation: Math.PI },
  { x: -30, z: 48, role: 'HFF', rotation: Math.PI },
  { x: 30, z: 48, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 62, role: 'FF', rotation: Math.PI },
  { x: -18, z: 58, role: 'FP', rotation: Math.PI },
  { x: 18, z: 58, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const PRESS: Formation = {
  id: 'press',
  name: 'Press',
  description: 'High forward pressure formation with midfielders pushing forward. Aggressive setup to force turnovers in opposition territory.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', PRESS_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(PRESS_TEAM1_POSITIONS)),
  ],
};

/**
 * 4. SPREAD
 * Wide distribution formation to create space and open up the ground.
 * Players positioned near the boundary to stretch opposition defence.
 */
const SPREAD_TEAM1_POSITIONS = [
  // Defence - wide positioning
  { x: 0, z: -58, role: 'FB', rotation: 0 },
  { x: -35, z: -55, role: 'BP', rotation: 0 },
  { x: 35, z: -55, role: 'BP', rotation: 0 },
  { x: 0, z: -38, role: 'CHB', rotation: 0 },
  { x: -50, z: -35, role: 'HBF', rotation: 0 },
  { x: 50, z: -35, role: 'HBF', rotation: 0 },

  // Midfield - spread wide
  { x: -60, z: 0, role: 'W', rotation: Math.PI / 2 },
  { x: 60, z: 0, role: 'W', rotation: -Math.PI / 2 },
  { x: -25, z: 0, role: 'C', rotation: 0 },
  { x: 25, z: 0, role: 'R', rotation: 0 },
  { x: -40, z: 15, role: 'RR', rotation: Math.PI / 4 },
  { x: 40, z: 15, role: 'RO', rotation: -Math.PI / 4 },

  // Forward - wide spread
  { x: 0, z: 38, role: 'CHF', rotation: Math.PI },
  { x: -50, z: 35, role: 'HFF', rotation: Math.PI },
  { x: 50, z: 35, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 58, role: 'FF', rotation: Math.PI },
  { x: -35, z: 55, role: 'FP', rotation: Math.PI },
  { x: 35, z: 55, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const SPREAD: Formation = {
  id: 'spread',
  name: 'Spread',
  description: 'Wide distribution formation to create space and open up the ground. Players positioned near the boundary to stretch the defence.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', SPREAD_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(SPREAD_TEAM1_POSITIONS)),
  ],
};

/**
 * 5. FLOOD
 * Extra defenders behind the ball to create a defensive wall.
 * Ideal for protecting a lead or limiting opposition scoring.
 */
const FLOOD_TEAM1_POSITIONS = [
  // Defence - extra numbers
  { x: 0, z: -58, role: 'FB', rotation: 0 },
  { x: -25, z: -55, role: 'BP', rotation: 0 },
  { x: 25, z: -55, role: 'BP', rotation: 0 },
  { x: 0, z: -42, role: 'CHB', rotation: 0 },
  { x: -40, z: -45, role: 'HBF', rotation: 0 },
  { x: 40, z: -45, role: 'HBF', rotation: 0 },

  // Midfield - pulled back defensively
  { x: -55, z: -20, role: 'W', rotation: 0 },
  { x: 55, z: -20, role: 'W', rotation: 0 },
  { x: -20, z: -25, role: 'C', rotation: 0 },
  { x: 20, z: -25, role: 'R', rotation: 0 },
  { x: -30, z: -35, role: 'RR', rotation: 0 },
  { x: 30, z: -35, role: 'RO', rotation: 0 },

  // Forward - reduced forward line, high up field
  { x: 0, z: 10, role: 'CHF', rotation: Math.PI },
  { x: -30, z: 20, role: 'HFF', rotation: Math.PI },
  { x: 30, z: 20, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 45, role: 'FF', rotation: Math.PI },
  { x: -20, z: 40, role: 'FP', rotation: Math.PI },
  { x: 20, z: 40, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const FLOOD: Formation = {
  id: 'flood',
  name: 'Flood',
  description: 'Extra defenders behind the ball creating a defensive wall. Ideal for protecting a lead or limiting opposition scoring.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', FLOOD_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(FLOOD_TEAM1_POSITIONS)),
  ],
};

/**
 * 6. MAN-ON-MAN
 * Tight defensive marking formation with each player assigned to mark an opponent.
 * Used when opposition has dangerous individual players.
 */
const MAN_ON_MAN_TEAM1_POSITIONS = [
  // Defence - tight marking positions
  { x: 0, z: -55, role: 'FB', rotation: 0 },
  { x: -22, z: -50, role: 'BP', rotation: 0 },
  { x: 22, z: -50, role: 'BP', rotation: 0 },
  { x: 0, z: -38, role: 'CHB', rotation: 0 },
  { x: -33, z: -38, role: 'HBF', rotation: 0 },
  { x: 33, z: -38, role: 'HBF', rotation: 0 },

  // Midfield - positioned to pick up opponents
  { x: -48, z: 0, role: 'W', rotation: Math.PI / 2 },
  { x: 48, z: 0, role: 'W', rotation: -Math.PI / 2 },
  { x: 0, z: 0, role: 'C', rotation: 0 },
  { x: 0, z: 8, role: 'R', rotation: 0 },
  { x: -18, z: 0, role: 'RR', rotation: 0 },
  { x: 18, z: 0, role: 'RO', rotation: 0 },

  // Forward - spread for marking run
  { x: 0, z: 38, role: 'CHF', rotation: Math.PI },
  { x: -33, z: 38, role: 'HFF', rotation: Math.PI },
  { x: 33, z: 38, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 55, role: 'FF', rotation: Math.PI },
  { x: -22, z: 50, role: 'FP', rotation: Math.PI },
  { x: 22, z: 50, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const MAN_ON_MAN: Formation = {
  id: 'man-on-man',
  name: 'Man-on-Man',
  description: 'Tight defensive marking formation with each player assigned to mark an opponent. Used against teams with dangerous individual players.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', MAN_ON_MAN_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(MAN_ON_MAN_TEAM1_POSITIONS)),
  ],
};

/**
 * 7. CENTRE BOUNCE SETUP
 * Starting positions for centre bounce at the beginning of a quarter.
 * Only the ruckmen and selected players in the centre square.
 */
const CENTRE_BOUNCE_TEAM1_POSITIONS = [
  // Defence - stationed behind 50m arc
  { x: 0, z: -77, role: 'FB', rotation: 0 },
  { x: -25, z: -55, role: 'BP', rotation: 0 },
  { x: 25, z: -55, role: 'BP', rotation: 0 },
  { x: 0, z: -48, role: 'CHB', rotation: 0 },
  { x: -35, z: -45, role: 'HBF', rotation: 0 },
  { x: 35, z: -45, role: 'HBF', rotation: 0 },

  // Centre square players (clock-face: 12 o'clock = Team 1 defending goal = -z)
  { x:  0,   z:  0,   role: 'R',   rotation: 0 },             // Ruck: centre
  { x:  0,   z:  5,   role: 'C',   rotation: 0 },             // Centre: 6 o'clock
  { x:  5,   z:  0,   role: 'RR',  rotation: -Math.PI / 2 },  // Ruck-Rover: 3 o'clock
  { x: -5,   z:  0,   role: 'RO',  rotation:  Math.PI / 2 },  // Rover: 9 o'clock
  { x: -25,  z:  0,   role: 'W',   rotation:  Math.PI / 2 },  // Wing Left
  { x:  25,  z:  0,   role: 'W',   rotation: -Math.PI / 2 },  // Wing Right

  // Forward - stationed behind 50m arc
  { x: 0, z: 48, role: 'CHF', rotation: Math.PI },
  { x: -35, z: 45, role: 'HFF', rotation: Math.PI },
  { x: 35, z: 45, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 77, role: 'FF', rotation: Math.PI },
  { x: -25, z: 55, role: 'FP', rotation: Math.PI },
  { x: 25, z: 55, role: 'FP', rotation: Math.PI },

  // Interchange (off the field - positioned on team bench area with offset for visibility)
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const CENTRE_BOUNCE: Formation = {
  id: 'centre-bounce',
  name: 'Centre Bounce',
  description: 'Starting positions for centre bounce at the beginning of a quarter. Ruckmen and midfielders positioned for the ball-up.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', CENTRE_BOUNCE_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(CENTRE_BOUNCE_TEAM1_POSITIONS)),
  ],
};

/**
 * 8. KICK-IN (PRESSING)
 * Team 1 presses Team 2's kick-in in 3 lines at 20m, 35m, 52m from goal,
 * with a 3+3 defensive hold near Team 1's centre-square.
 */
const KICK_IN_PRESSING_TEAM1_POSITIONS = [
  // Line 1: 20m from Team 2's goal (z = +62.5)
  { x: -12, z:  62.5, role: 'FP',  rotation: Math.PI },
  { x:   0, z:  62.5, role: 'FF',  rotation: Math.PI },
  { x:  12, z:  62.5, role: 'FP',  rotation: Math.PI },
  // Line 2: 35m from Team 2's goal (z = +47.5)
  { x: -22, z:  47.5, role: 'HFF', rotation: Math.PI },
  { x:  -7, z:  47.5, role: 'CHF', rotation: Math.PI },
  { x:   7, z:  47.5, role: 'R',   rotation: Math.PI },
  { x:  22, z:  47.5, role: 'HFF', rotation: Math.PI },
  // Line 3: 52m from Team 2's goal (z = +30.5)
  { x: -30, z:  30.5, role: 'W',   rotation:  Math.PI / 2 },
  { x: -15, z:  30.5, role: 'RR',  rotation: Math.PI },
  { x:   0, z:  30.5, role: 'C',   rotation: Math.PI },
  { x:  15, z:  30.5, role: 'RO',  rotation: Math.PI },
  { x:  30, z:  30.5, role: 'W',   rotation: -Math.PI / 2 },
  // Back 3+3: hold near Team 1's centre-square in defensive half
  { x: -28, z:   8,   role: 'HBF', rotation: 0 },
  { x:   0, z:   8,   role: 'CHB', rotation: 0 },
  { x:  28, z:   8,   role: 'HBF', rotation: 0 },
  { x: -18, z:  20,   role: 'BP',  rotation: 0 },
  { x:   0, z:  22,   role: 'FB',  rotation: 0 },
  { x:  18, z:  20,   role: 'BP',  rotation: 0 },
  // Interchange
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const KICK_IN_PRESSING: Formation = {
  id: 'kick-in-pressing',
  name: 'Kick-in (Pressing)',
  description: "Team 1 presses Team 2's kick-in in 3 lines at 20m, 35m, 52m from goal with a 3+3 defensive hold.",
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', KICK_IN_PRESSING_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(KICK_IN_PRESSING_TEAM1_POSITIONS)),
  ],
};

/**
 * 9. KICK-IN (KICKING)
 * Team 1 takes the kick-in: FB kicker in goal square, BPs at ±45°,
 * midfield clusters at 40m & 55m, forward 2-1-2-1 diamond.
 */
const KICK_IN_KICKING_TEAM1_POSITIONS = [
  // Kicker: FB in goal square
  { x:   0, z: -78,    role: 'FB',  rotation: 0 },
  // BPs: ±45° angle, 20m from own goal
  { x: -14, z: -68,    role: 'BP',  rotation: 0 },
  { x:  14, z: -68,    role: 'BP',  rotation: 0 },
  // Cluster 40m from own goal (z = -42.5)
  { x: -20, z: -42.5,  role: 'W',   rotation:  Math.PI / 2 },
  { x:  -7, z: -42.5,  role: 'C',   rotation: 0 },
  { x:   7, z: -42.5,  role: 'RR',  rotation: 0 },
  { x:  20, z: -42.5,  role: 'W',   rotation: -Math.PI / 2 },
  // Cluster 55m from own goal (z = -27.5)
  { x: -25, z: -27.5,  role: 'HBF', rotation: 0 },
  { x:  -8, z: -27.5,  role: 'CHB', rotation: 0 },
  { x:   8, z: -27.5,  role: 'R',   rotation: 0 },
  { x:  25, z: -27.5,  role: 'HBF', rotation: 0 },
  // Forward 2-1-2-1 diamond
  { x: -25, z:  18,    role: 'HFF', rotation: Math.PI },
  { x:  25, z:  18,    role: 'HFF', rotation: Math.PI },
  { x:   0, z:  30,    role: 'CHF', rotation: Math.PI },
  { x: -20, z:  50,    role: 'FP',  rotation: Math.PI },
  { x:  20, z:  50,    role: 'FP',  rotation: Math.PI },
  { x:   0, z:  60,    role: 'FF',  rotation: Math.PI },
  // Rover near mid-field
  { x:   0, z: -15,    role: 'RO',  rotation: 0 },
  // Interchange
  { x: 73, z: -25, role: 'INT', rotation: 0 },          // Interchange 1 → centre sideline
  { x: 73, z: -18, role: 'INT', rotation: 0 },          // Interchange 2
  { x: 73, z: -12, role: 'INT', rotation: 0 },          // Interchange 3
  { x: 73, z:  -6, role: 'INT', rotation: 0 },          // Interchange 4
];

const KICK_IN_KICKING: Formation = {
  id: 'kick-in-kicking',
  name: 'Kick-in (Kicking)',
  description: 'Team 1 takes the kick-in: FB kicker in goal square, BPs at ±45°, midfield clusters at 40m & 55m, forward 2-1-2-1 diamond.',
  category: 'pre-built',
  positions: [
    ...createTeamPositions('team1', KICK_IN_KICKING_TEAM1_POSITIONS),
    ...createTeamPositions('team2', mirrorTeamPositions(KICK_IN_KICKING_TEAM1_POSITIONS)),
  ],
};

/**
 * Collection of all pre-built formations
 */
export const PRE_BUILT_FORMATIONS: Formation[] = [
  STANDARD_SETUP,
  ZONE_DEFENSE,
  PRESS,
  SPREAD,
  FLOOD,
  MAN_ON_MAN,
  CENTRE_BOUNCE,
  KICK_IN_PRESSING,
  KICK_IN_KICKING,
];

/**
 * Get a formation by its ID
 */
export function getFormationById(id: string): Formation | undefined {
  return PRE_BUILT_FORMATIONS.find(f => f.id === id);
}

/**
 * Validate that a formation has the required 44 positions (22 per team: 18 on-field + 4 interchange)
 */
export function validateFormation(formation: Formation): boolean {
  if (formation.positions.length !== 44) {
    return false;
  }

  const team1Count = formation.positions.filter(p => p.teamId === 'team1').length;
  const team2Count = formation.positions.filter(p => p.teamId === 'team2').length;

  return team1Count === 22 && team2Count === 22;
}

/**
 * Get all positions for a specific team from a formation
 */
export function getTeamPositions(
  formation: Formation,
  teamId: 'team1' | 'team2'
): PlayerPosition[] {
  return formation.positions.filter(p => p.teamId === teamId);
}
