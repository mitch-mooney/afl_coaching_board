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
 * Configuration for a single player's path within an animation event
 */
export interface PlayerPathConfig {
  playerId: string;
  pathId: string; // Reference to MovementPath
  startTimeOffset: number; // When to start this path (ms) relative to event start
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
  /** Named phases for pause-and-coach workflow. Empty array = no phases (plays straight through). */
  phases: AnimationPhase[];
  createdAt: number; // Timestamp when event was created
}

// Event system defaults
export const EVENT_DEFAULTS = {
  duration: 30000, // Default 30 second event duration (in ms)
  startTimeOffset: 0, // Default start time offset for paths (in ms)
} as const;

/**
 * Create a player path configuration for an animation event
 */
export function createPlayerPathConfig(
  playerId: string,
  pathId: string,
  startTimeOffset: number = EVENT_DEFAULTS.startTimeOffset
): PlayerPathConfig {
  return {
    playerId,
    pathId,
    startTimeOffset,
  };
}

/**
 * Create an animation event
 */
export function createAnimationEvent(
  name: string,
  playerPaths: PlayerPathConfig[] = [],
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
    phases: [],
    createdAt: Date.now(),
  };
}

/**
 * Add a player path configuration to an event
 */
export function addPlayerPathToEvent(
  event: AnimationEvent,
  playerPath: PlayerPathConfig
): AnimationEvent {
  // Check if player already has a path in this event
  const existingIndex = event.playerPaths.findIndex(
    (pp) => pp.playerId === playerPath.playerId
  );

  if (existingIndex >= 0) {
    // Replace existing path config for this player
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
 * Remove a player path configuration from an event by player ID
 */
export function removePlayerPathFromEvent(
  event: AnimationEvent,
  playerId: string
): AnimationEvent {
  return {
    ...event,
    playerPaths: event.playerPaths.filter((pp) => pp.playerId !== playerId),
  };
}

/**
 * Update a player path configuration in an event
 */
export function updatePlayerPathInEvent(
  event: AnimationEvent,
  playerId: string,
  updates: Partial<Omit<PlayerPathConfig, 'playerId'>>
): AnimationEvent {
  return {
    ...event,
    playerPaths: event.playerPaths.map((pp) =>
      pp.playerId === playerId ? { ...pp, ...updates } : pp
    ),
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
 * Calculate the actual duration based on player paths
 * Returns the maximum end time across all paths
 */
export function calculateEventEndTime(
  event: AnimationEvent,
  pathDurations: Map<string, number>
): number {
  if (event.playerPaths.length === 0) {
    return event.duration;
  }

  let maxEndTime = 0;
  for (const pathConfig of event.playerPaths) {
    const pathDuration = pathDurations.get(pathConfig.pathId) ?? 0;
    const endTime = pathConfig.startTimeOffset + pathDuration * 1000; // Convert path duration (seconds) to ms
    maxEndTime = Math.max(maxEndTime, endTime);
  }

  return Math.max(maxEndTime, event.duration);
}
