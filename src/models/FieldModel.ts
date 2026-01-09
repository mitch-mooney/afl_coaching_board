// Australian Football Field Specifications
// Field dimensions vary by venue: ~150-185m length, ~120-155m width
// Using standard dimensions for consistency

export const FIELD_CONFIG = {
  // Standard field dimensions (in meters)
  length: 165, // meters
  width: 135, // meters
  
  // Center square dimensions
  centerSquareSize: 50, // 50m x 50m
  
  // Center circle radius
  centerCircleRadius: 3, // meters
  
  // Goal posts
  goalPostWidth: 6.4, // meters between posts
  goalPostHeight: 6, // meters height
  
  // Scale factor for 3D scene (1 unit = 1 meter)
  scale: 1,
} as const;

export interface FieldGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
}

// Generate oval field shape
export function generateFieldGeometry(): FieldGeometry {
  const { length, width } = FIELD_CONFIG;
  const segments = 64; // Number of segments for smooth oval
  
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Generate oval vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = (length / 2) * Math.cos(angle);
    const z = (width / 2) * Math.sin(angle);
    vertices.push(x, 0, z);
  }
  
  // Generate indices for oval outline
  for (let i = 0; i < segments; i++) {
    indices.push(i, i + 1);
  }
  
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}
