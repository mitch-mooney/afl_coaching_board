export interface Ball {
  id: string;
  position: [number, number, number]; // [x, y, z]
  color: string;
  size: number; // Radius of the ball
  assignedPlayerId?: string; // Optional player assignment (ball follows player)
}

// AFL ball visual constants
export const BALL_DEFAULTS = {
  color: '#8B4513', // Saddle brown (AFL ball color)
  size: 0.3, // Smaller than player tokens
  id: 'ball-1', // Single ball instance
} as const;

// Create a ball entity with default properties
export function createBall(
  position: [number, number, number] = [0, 0, 0],
  overrides?: Partial<Omit<Ball, 'id'>>
): Ball {
  return {
    id: BALL_DEFAULTS.id,
    position,
    color: overrides?.color ?? BALL_DEFAULTS.color,
    size: overrides?.size ?? BALL_DEFAULTS.size,
    assignedPlayerId: overrides?.assignedPlayerId,
  };
}
