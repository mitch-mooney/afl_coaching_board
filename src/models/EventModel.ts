/**
 * EventModel - Types and utilities for animation events
 * Events group multiple player paths together for synchronized multi-player animation
 */

/**
 * A named phase within an animation event.
 * When playback reaches startTime, it pauses so the coach can explain the next phase.
 * Phase 1 always starts at t=0 and plays immediately (no pause at startTime=0).
 */
export interface AnimationPhase {
  id: string;
  name: string;
  description?: string;
  /** The boundary in ms where animation pauses BEFORE playing this phase */
  startTime: number;
}

/**
 * Create an animation phase
 */
export function createAnimationPhase(
  name: string,
  startTime: number,
  description?: string
): AnimationPhase {
  return {
    id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    startTime,
    description,
  };
}

/**
 * Kick types for ball trajectory animations
 */
export type KickType = 'standard' | 'high' | 'low' | 'checkside' | 'handball';

/**
 * Presets for different kick types (visual parameters)
 */
export const KICK_PRESETS: Record<KickType, {
  apexHeight: number;         // Y peak (meters)
  curveDeviation: number;     // Lateral curve (meters)
  durationMultiplier: number; // Speed scaling
}> = {
  standard:    { apexHeight: 3,   curveDeviation: 0, durationMultiplier: 1.0 },
  high:        { apexHeight: 5,   curveDeviation: 0, durationMultiplier: 1.2 },
  low:         { apexHeight: 1,   curveDeviation: 0, durationMultiplier: 0.8 },
  checkside:   { apexHeight: 2.5, curveDeviation: 2, durationMultiplier: 1.1 },
  handball:    { apexHeight: 1.5, curveDeviation: 0, durationMultiplier: 0.6 }
};

/**
 * Configuration for a ball movement path within an animation event
 */
export interface BallPathConfig {
  pathId: string; // Reference to MovementPath
  startTimeOffset: number; // When to start this path (ms) relative to event start
  kickType: KickType;
  entityId: string; // Player ID or 'ball' for ball paths
}

/**
 * Configuration for a single player's path within an animation event
 */
export interface PlayerPathConfig {
  pathId: string; // Reference to MovementPath
  playerId: string;
  startTimeOffset: number; // When to start this path (ms) relative to event start
}

/**
 * Create a player path configuration for an animation event
 */
export function createPlayerPathConfig(
  playerId: string,
  pathId: string,
  startTimeOffset: number = EVENT_DEFAULTS.startTimeOffset
): PlayerPathConfig {
  return {
    pathId,
    playerId,
    startTimeOffset,
  };
}

/**
 * An animation event that groups multiple player paths together
 * Enables coordinated multi-player animations with individual timing
 */
export interface AnimationEvent {
  id: string;
  name: string;
  description?: string;
  duration: number; // Total event duration in milliseconds (e.g., 30000 for 30s)
  playerPaths: PlayerPathConfig[];
  ballPaths: BallPathConfig[];
  /** Named phases for pause-and-coach workflow. Empty array = no phases (plays straight through). */
  phases: AnimationPhase[];
  createdAt: number; // Timestamp when event was created
}

/**
 * Create an animation event
 */
export function createAnimationEvent(
  name: string,
  playerPaths: PlayerPathConfig[] = [],
  ballPaths: BallPathConfig[] = [],
  duration: number = EVENT_DEFAULTS.duration,
  description?: string,
  id?: string
): AnimationEvent {
  return {
    id: id ?? `event-${Date.now()}`,
    name,
    description,
    duration,
    playerPaths,
    ballPaths,
    phases: [],
    createdAt: Date.now(),
  };
}

// Event system defaults
export const EVENT_DEFAULTS = {
  duration: 30000, // Default 30 second event duration (in ms)
  startTimeOffset: 0, // Default start time offset for paths (in ms)
} as const;

/**
 * Add a player path configuration to an event.
 * Deduplicates by (playerId, startTimeOffset) so the same player can have
 * one path per phase (different startTimeOffset = different phase).
 */
export function addPlayerPathToEvent(
  event: AnimationEvent,
  playerPath: PlayerPathConfig
): AnimationEvent {
  // Dedup key is (playerId, startTimeOffset) — same player at the same phase offset replaces
  const existingIndex = event.playerPaths.findIndex(
    (pp) =>
      pp.playerId === playerPath.playerId &&
      pp.startTimeOffset === playerPath.startTimeOffset
  );

  if (existingIndex >= 0) {
    // Replace existing path config for this player at this phase offset
    const newPlayerPaths = [...event.playerPaths];
    newPlayerPaths[existingIndex] = playerPath;
    return {
      ...event,
      playerPaths: newPlayerPaths,
    };
  }

  return {
    ...event,
    playerPaths: [...event.playerPaths, playerPath],
  };
}

/**
 * Remove a player path configuration from an event.
 * If pathId is provided, removes only that specific path entry.
 * Otherwise removes all paths for the given player.
 */
export function removePlayerPathFromEvent(
  event: AnimationEvent,
  playerId: string,
  pathId?: string
): AnimationEvent {
  return {
    ...event,
    playerPaths: pathId
      ? event.playerPaths.filter(
          (pp) => !(pp.playerId === playerId)
        )
      : event.playerPaths.filter((pp) => pp.playerId !== playerId),
  };
}

/**
 * Update a player path configuration in an event.
 * Updates all paths for the given player.
 */
export function updatePlayerPathInEvent(
  event: AnimationEvent,
  playerId: string,
  updates: Partial<Omit<PlayerPathConfig, 'playerId'>>
): AnimationEvent {
  return {
    ...event,
    playerPaths: event.playerPaths.map((pp) => {
      return pp.playerId === playerId ? { ...pp, ...updates } : pp;
    }),
  };
}

/**
 * Update event properties
 */
export function updateEvent(
  event: AnimationEvent,
  updates: Partial<Omit<AnimationEvent, 'id' | 'createdAt'>>
): AnimationEvent {
  return {
    ...event,
    ...updates,
  };
}

/**
 * Get a player path configuration from an event by player ID
 */
export function getPlayerPathConfig(
  event: AnimationEvent,
  playerId: string
): PlayerPathConfig | undefined {
  return event.playerPaths.find((pp) => pp.playerId === playerId);
}

/**
 * Check if an event has a path configuration for a specific player
 */
export function hasPlayerPath(event: AnimationEvent, playerId: string): boolean {
  return event.playerPaths.some((pp) => pp.playerId === playerId);
}

/**
 * Check if an event is valid (has at least one player path)
 */
export function isValidEvent(event: AnimationEvent): boolean {
  return (
    event.name.trim().length > 0 &&
    event.duration > 0 &&
    event.playerPaths.length > 0
  );
}

/**
 * Calculate the actual duration based on player paths and ball paths
 * Returns the maximum end time across all paths
 */
export function calculateEventEndTime(
  event: AnimationEvent,
  pathDurations: Map<string, number>
): number {
  let maxEndTime = event.duration;

  // Calculate from player paths
  for (const pathConfig of event.playerPaths) {
    const pathDuration = pathDurations.get(pathConfig.pathId) ?? 0;
    const endTime = pathConfig.startTimeOffset + pathDuration * 1000;
    maxEndTime = Math.max(maxEndTime, endTime);
  }

  // Calculate from ball paths
  for (const pathConfig of event.ballPaths) {
    const pathDuration = pathDurations.get(pathConfig.pathId) ?? 0;
    const endTime = pathConfig.startTimeOffset + pathDuration * 1000;
    maxEndTime = Math.max(maxEndTime, endTime);
  }

  return maxEndTime;
}
