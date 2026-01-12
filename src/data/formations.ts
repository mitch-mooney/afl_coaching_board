/**
 * Pre-built AFL Formation Templates
 *
 * Field dimensions: 165m (length/x) x 135m (width/z)
 * Center: (0, 0, 0)
 * Team 1 defends at z = -67.5 (goal at negative z)
 * Team 2 defends at z = +67.5 (goal at positive z)
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
 */
function createTeamPositions(
  teamId: 'team1' | 'team2',
  positions: Array<{ x: number; z: number; role: string; rotation?: number }>
): PlayerPosition[] {
  return positions.map((pos, index) => ({
    playerNumber: index + 1,
    teamId,
    position: [pos.x, 0, pos.z] as [number, number, number],
    rotation: pos.rotation ?? 0,
    role: pos.role,
  }));
}

/**
 * Mirror positions for opposing team (flip z-axis)
 */
function mirrorTeamPositions(
  sourcePositions: Array<{ x: number; z: number; role: string; rotation?: number }>
): Array<{ x: number; z: number; role: string; rotation?: number }> {
  return sourcePositions.map(pos => ({
    ...pos,
    z: -pos.z,
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
  { x: 0, z: -58, role: 'FB', rotation: 0 },
  { x: -25, z: -55, role: 'BP', rotation: 0 },
  { x: 25, z: -55, role: 'BP', rotation: 0 },
  { x: 0, z: -48, role: 'CHB', rotation: 0 },
  { x: -35, z: -45, role: 'HBF', rotation: 0 },
  { x: 35, z: -45, role: 'HBF', rotation: 0 },

  // Centre square players
  { x: -24, z: 0, role: 'W', rotation: Math.PI / 2 },  // On center square edge
  { x: 24, z: 0, role: 'W', rotation: -Math.PI / 2 }, // On center square edge
  { x: -10, z: -10, role: 'C', rotation: 0 },          // In centre square
  { x: 0, z: 2, role: 'R', rotation: 0 },              // Ruckman at ball-up
  { x: 10, z: -10, role: 'RR', rotation: 0 },          // In centre square
  { x: 0, z: -15, role: 'RO', rotation: 0 },           // In centre square

  // Forward - stationed behind 50m arc
  { x: 0, z: 48, role: 'CHF', rotation: Math.PI },
  { x: -35, z: 45, role: 'HFF', rotation: Math.PI },
  { x: 35, z: 45, role: 'HFF', rotation: Math.PI },
  { x: 0, z: 58, role: 'FF', rotation: Math.PI },
  { x: -25, z: 55, role: 'FP', rotation: Math.PI },
  { x: 25, z: 55, role: 'FP', rotation: Math.PI },
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
];

/**
 * Get a formation by its ID
 */
export function getFormationById(id: string): Formation | undefined {
  return PRE_BUILT_FORMATIONS.find(f => f.id === id);
}

/**
 * Validate that a formation has the required 36 positions
 */
export function validateFormation(formation: Formation): boolean {
  if (formation.positions.length !== 36) {
    return false;
  }

  const team1Count = formation.positions.filter(p => p.teamId === 'team1').length;
  const team2Count = formation.positions.filter(p => p.teamId === 'team2').length;

  return team1Count === 18 && team2Count === 18;
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
