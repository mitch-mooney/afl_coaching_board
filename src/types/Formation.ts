/**
 * Formation type definitions for AFL coaching board templates
 */

/**
 * Represents a single player's position within a formation template
 */
export interface PlayerPosition {
  /** Player number (1-18 for team1, 1-18 for team2) */
  playerNumber: number;
  /** Team identifier matching the existing Player model */
  teamId: 'team1' | 'team2';
  /** Position coordinates [x, y, z] matching the Player model format */
  position: [number, number, number];
  /** Optional rotation in radians */
  rotation?: number;
  /** Optional AFL role/position name (e.g., "CHF", "FF", "Ruck", "CHB") */
  role?: string;
}

/**
 * Formation category distinguishing pre-built from user-created templates
 */
export type FormationCategory = 'pre-built' | 'custom';

/**
 * Represents a complete formation template with positions for all 36 players
 */
export interface Formation {
  /** Unique identifier for the formation */
  id: string;
  /** Display name for the formation */
  name: string;
  /** Brief description of the formation and its tactical purpose */
  description: string;
  /** Whether this is a pre-built or custom user formation */
  category: FormationCategory;
  /** Array of player positions (36 total: 18 per team) */
  positions: PlayerPosition[];
  /** Creation timestamp (primarily for custom formations) */
  createdAt?: Date;
  /** Optional thumbnail image as base64 or URL */
  thumbnail?: string;
}

/**
 * Schema for creating a new custom formation (without auto-generated fields)
 */
export interface CreateFormationInput {
  name: string;
  description: string;
  positions: PlayerPosition[];
  thumbnail?: string;
}

/**
 * Schema for stored custom formations in IndexedDB via Dexie
 */
export interface StoredFormation {
  /** Auto-incremented ID from Dexie */
  id?: number;
  /** Unique string identifier */
  formationId: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Player positions JSON */
  positions: PlayerPosition[];
  /** Creation timestamp as ISO string for storage */
  createdAt: string;
  /** Optional thumbnail */
  thumbnail?: string;
}

/**
 * Utility type for formation application updates
 * Maps player IDs to their new positions
 */
export interface FormationUpdate {
  playerId: string;
  position: [number, number, number];
  rotation?: number;
}
