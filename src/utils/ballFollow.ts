/**
 * ballFollow - resolves where a "held" ball should sit.
 *
 * A ball assigned to a player rides that player ("held"). But a ball with its
 * own drawn movement path owns its motion (a kick/handball), and the path
 * engine (usePathPlayback) drives it. This helper encodes that precedence so
 * the ball has a single position writer and can't fight itself on screen.
 */
import { MovementPath } from '../models/PathModel';
import { pathHasMovement } from './pathAnimation';

/** Vertical clearance so a held ball renders just above its player. */
export const HELD_BALL_HEIGHT_OFFSET = 0.78; // AFL_BALL.length (0.28) + 0.5 clearance

/**
 * Where a ball assigned to a player should be positioned.
 *
 * Returns `null` when the ball should NOT be follow-positioned — either because
 * it isn't held, or because it has a drawn path that takes precedence (the path
 * engine owns it). Otherwise returns the held target: the player's position
 * lifted by {@link HELD_BALL_HEIGHT_OFFSET}.
 */
export function heldBallTarget(
  assignedPlayerPosition: [number, number, number] | null | undefined,
  ballPath: MovementPath | undefined,
): [number, number, number] | null {
  if (!assignedPlayerPosition) return null;
  // Drawn path wins: let the path engine drive the ball.
  if (ballPath && pathHasMovement(ballPath)) return null;
  return [
    assignedPlayerPosition[0],
    assignedPlayerPosition[1] + HELD_BALL_HEIGHT_OFFSET,
    assignedPlayerPosition[2],
  ];
}
