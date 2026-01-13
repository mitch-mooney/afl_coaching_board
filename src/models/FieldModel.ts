// Australian Football Field Specifications
// Based on official AFL specifications from:
// https://en.wikipedia.org/wiki/Australian_rules_football_playing_field
// Field dimensions vary by venue: 135-185m length, 110-155m width
// Using standard dimensions for consistency

export const FIELD_CONFIG = {
  // Standard field dimensions (in meters)
  // Senior football: 135–185 metres long goal-to-goal, 110–155 metres wide wing-to-wing
  length: 165, // meters (goal-to-goal)
  width: 135, // meters (wing-to-wing)
  
  // Goal lines: straight and 19.2 m (21 yd) long
  goalLineLength: 19.2, // meters
  
  // Goal squares: 6.4 m × 9 m (7 yd × 10 yd) in front of each goal-face
  goalSquareWidth: 6.4, // meters (width of goal square)
  goalSquareDepth: 9, // meters (depth from goal line)
  
  // Nine-metre line: imaginary continuation of kick-off line
  // Radial markings outside boundary indicate where it crosses
  nineMetreLineDistance: 9, // meters from goal line
  
  // Blue dots: 15 m (16 yd) in front of the centre of each kick-off line
  blueDotDistance: 15, // meters from goal line
  
  // Center square: 50 m × 50 m (55 yd × 55 yd)
  centerSquareSize: 50, // meters
  
  // Center circles: two concentric circles of 3 m (3.3 yd) and 10 m (11 yd) diameter
  // Inner circle: 3m diameter = 1.5m radius
  // Outer circle: 10m diameter = 5m radius
  centerCircleInnerRadius: 1.5, // meters (3m diameter / 2)
  centerCircleOuterRadius: 5, // meters (10m diameter / 2)
  
  // Fifty-metre arcs: circular arc at each end, 50 m (55 yd) from centre of goal-line
  fiftyMetreArcRadius: 50, // meters from centre of goal-line
  
  // Goal posts: spaced 6.4 m (7 yd) apart
  goalPostSpacing: 6.4, // meters between goal posts
  goalPostHeight: 6, // meters (typical height, not specified in Wikipedia)
  
  // Behind posts: 6.4 m (7 yd) on either side of goal posts, 5 metres (16 ft) in height
  behindPostSpacing: 6.4, // meters from goal post to behind post
  behindPostHeight: 5, // meters (16 ft)
  
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
