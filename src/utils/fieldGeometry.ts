import { FIELD_CONFIG } from '../models/FieldModel';

// Helper functions for field geometry calculations

export function isPointInField(x: number, z: number): boolean {
  const { length, width } = FIELD_CONFIG;
  
  // Check if point is within oval field bounds
  const normalizedX = (2 * x) / length;
  const normalizedZ = (2 * z) / width;
  
  // Ellipse equation: (x/a)^2 + (z/b)^2 <= 1
  return (normalizedX * normalizedX + normalizedZ * normalizedZ) <= 1;
}

export function snapToField(x: number, z: number): [number, number] {
  // Snap position to field boundary if outside
  if (!isPointInField(x, z)) {
    const { length, width } = FIELD_CONFIG;
    
    // Normalize coordinates
    const normalizedX = (2 * x) / length;
    const normalizedZ = (2 * z) / width;
    
    // Calculate distance from center
    const distance = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
    
    if (distance > 1) {
      // Project onto ellipse boundary
      const angle = Math.atan2(normalizedZ, normalizedX);
      const snappedX = (length / 2) * Math.cos(angle);
      const snappedZ = (width / 2) * Math.sin(angle);
      
      return [snappedX, snappedZ];
    }
  }
  
  return [x, z];
}

export function getFieldBounds() {
  const { length, width } = FIELD_CONFIG;
  return {
    minX: -length / 2,
    maxX: length / 2,
    minZ: -width / 2,
    maxZ: width / 2,
  };
}

/**
 * Maps field x/z coordinates to an AFL position code based on zone boundaries.
 * The field runs along the X axis: positive X = team2 attacking end.
 * Returns null if the position doesn't map clearly to a known zone.
 *
 * Zone layout (from team2 attacking end to team1 attacking end):
 *   FF/FP:  x >= 48
 *   CHF:    x >= 30 && |z| < 20
 *   HFF:    x >= 30 && |z| >= 20
 *   W:      |x| < 30 && |z| >= 30
 *   C/RK:   |x| < 15 && |z| < 15
 *   RR/R:   |x| < 30 && |z| < 30 (general midfield)
 *   HBF:    x <= -30 && |z| >= 20
 *   CHB:    x <= -30 && |z| < 20
 *   BP/FB:  x <= -48
 */
export function positionToZone(x: number, z: number): string | null {
  const absZ = Math.abs(z);

  // Forward pocket / full forward end
  if (x >= 48) {
    if (absZ < 15) return 'FF';
    return 'FP';
  }

  // Half forward flank / centre half forward
  if (x >= 28) {
    if (absZ < 20) return 'CHF';
    return 'HFF';
  }

  // Wing
  if (absZ >= 30 && Math.abs(x) < 28) {
    return 'W';
  }

  // Centre midfield zone
  if (Math.abs(x) < 15 && absZ < 15) {
    return 'C';
  }

  // General midfield (rover / ruck rover)
  if (Math.abs(x) < 28 && absZ < 30) {
    return 'R';
  }

  // Half back flank / centre half back
  if (x <= -28) {
    if (absZ < 20) return 'CHB';
    return 'HBF';
  }

  // Back pocket / full back end
  if (x <= -48) {
    if (absZ < 15) return 'FB';
    return 'BP';
  }

  return null;
}
