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
