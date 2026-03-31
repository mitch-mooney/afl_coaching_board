/**
 * Trajectory Generation - Ball movement animations
 * Generates 3-point trajectories for different kick types
 */

import { KickType, KICK_PRESETS } from '../models/EventModel';
import { Vector3 } from 'three';

export interface TrajectoryKeyframe {
  position: Vector3;
  time: number; // Normalized time (0-1)
}

export interface TrajectoryConfig {
  startPoint: Vector3;
  endPoint: Vector3;
  kickType: KickType;
  duration: number; // milliseconds
}

/**
 * Generate trajectory keyframes for a ball movement
 */
export function generateBallTrajectory(config: TrajectoryConfig): TrajectoryKeyframe[] {
  const { startPoint, endPoint, kickType, duration: _duration } = config;
  const preset = KICK_PRESETS[kickType];

  // Calculate midpoint with lateral curve
  const midX = (startPoint.x + endPoint.x) / 2;
  const midZ = (startPoint.z + endPoint.z) / 2;
  
  // Apply curve deviation (checkside kicks curve laterally)
  const curveDirection = (endPoint.x - startPoint.x) > 0 ? 1 : -1;
  const curveX = midX + (preset.curveDeviation * curveDirection);
  const curveZ = midZ;

  // Keyframes: start, apex, end
  const startKeyframe: TrajectoryKeyframe = {
    position: startPoint,
    time: 0,
  };

  const apexKeyframe: TrajectoryKeyframe = {
    position: new Vector3(curveX, preset.apexHeight, curveZ),
    time: 0.5,
  };

  const endKeyframe: TrajectoryKeyframe = {
    position: endPoint,
    time: 1,
  };

  return [startKeyframe, apexKeyframe, endKeyframe];
}

/**
 * Generate 5-point trajectory with smooth parabolic arc using sin(progress * π)
 */
export function generateSmoothTrajectory(config: TrajectoryConfig): TrajectoryKeyframe[] {
  const { startPoint, endPoint, kickType, duration: _duration } = config;
  const preset = KICK_PRESETS[kickType];

  const midX = (startPoint.x + endPoint.x) / 2;
  const midZ = (startPoint.z + endPoint.z) / 2;
  
  const curveDirection = (endPoint.x - startPoint.x) > 0 ? 1 : -1;
  const curveX = midX + (preset.curveDeviation * curveDirection);
  const curveZ = midZ;

  const startKeyframe: TrajectoryKeyframe = {
    position: startPoint,
    time: 0,
  };

  const firstQuarterKeyframe: TrajectoryKeyframe = {
    position: new Vector3(
      midX * 0.5 + curveX * 0.5,
      preset.apexHeight * 0.3,
      midZ * 0.5 + curveZ * 0.5
    ),
    time: 0.25,
  };

  const apexKeyframe: TrajectoryKeyframe = {
    position: new Vector3(curveX, preset.apexHeight, curveZ),
    time: 0.5,
  };

  const thirdQuarterKeyframe: TrajectoryKeyframe = {
    position: new Vector3(
      midX * 1.5 - curveX * 0.5,
      preset.apexHeight * 0.3,
      midZ * 1.5 - curveZ * 0.5
    ),
    time: 0.75,
  };

  const endKeyframe: TrajectoryKeyframe = {
    position: endPoint,
    time: 1,
  };

  return [startKeyframe, firstQuarterKeyframe, apexKeyframe, thirdQuarterKeyframe, endKeyframe];
}

/**
 * Interpolate position along trajectory using parabolic curve
 */
export function interpolateTrajectory(
  keyframes: TrajectoryKeyframe[],
  progress: number
): Vector3 {
  if (progress <= 0) return keyframes[0].position.clone();
  if (progress >= 1) return keyframes[keyframes.length - 1].position.clone();

  let beforeIdx = 0;
  let afterIdx = keyframes.length - 1;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].time <= progress && keyframes[i + 1].time > progress) {
      beforeIdx = i;
      afterIdx = i + 1;
      break;
    }
  }

  const before = keyframes[beforeIdx];
  const after = keyframes[afterIdx];

  const segmentProgress = (progress - before.time) / (after.time - before.time);

  const YFactor = Math.sin(segmentProgress * Math.PI);

  const x = before.position.x + (after.position.x - before.position.x) * segmentProgress;
  const y = before.position.y + (after.position.y - before.position.y) * YFactor;
  const z = before.position.z + (after.position.z - before.position.z) * segmentProgress;

  return new Vector3(x, y, z);
}

/**
 * Calculate tangent vector for ball rotation
 */
export function calculateTrajectoryTangent(
  keyframes: TrajectoryKeyframe[],
  progress: number,
  delta: number = 0.01
): Vector3 {
  const currentPos = interpolateTrajectory(keyframes, progress);
  const nextPos = interpolateTrajectory(keyframes, Math.min(1, progress + delta));
  
  const tangent = nextPos.sub(currentPos).normalize();
  return tangent;
}

/**
 * Calculate bounce squash/stretch factor
 * Squash to 80% at impact, stretch to 115% at last 20% of trajectory
 */
export function getBounceSquashFactor(progress: number): {
  scaleY: number;
  scaleX: number;
  isBouncing: boolean;
} {
  const BOUNCE_PHASE_START = 0.80;
  const BOUNCE_SQUASH = 0.20;
  const BOUNCE_STRETCH = 0.15;
  const SECONDARY_BOUNCE = 0.04;

  if (progress < BOUNCE_PHASE_START) {
    return { scaleY: 1, scaleX: 1, isBouncing: false };
  }

  const bouncePhase = (progress - BOUNCE_PHASE_START) / (1 - BOUNCE_PHASE_START);
  
  const scaleY = 1 - (BOUNCE_SQUASH * bouncePhase);
  const scaleX = 1 + (BOUNCE_STRETCH * bouncePhase);

  let finalScaleY = scaleY;
  if (bouncePhase > 0.6) {
    const secondary = Math.sin((bouncePhase - 0.6) * 15) * SECONDARY_BOUNCE;
    finalScaleY -= secondary;
  }

  return {
    scaleY: finalScaleY,
    scaleX: scaleX,
    isBouncing: true,
  };
}

/**
 * Calculate trajectory duration based on kick type
 */
export function calculateTrajectoryDuration(kickType: KickType, baseDuration: number = 2000): number {
  const preset = KICK_PRESETS[kickType];
  return baseDuration * preset.durationMultiplier;
}
