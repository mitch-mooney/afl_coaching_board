import { useMemo } from 'react';
import { MovementPath } from '../../models/PathModel';
import { samplePathPositions, pathHasMovement } from '../../utils/pathAnimation';

/**
 * Path component - Visualizes entity movement paths on the 3D field
 * Renders path line and keyframe waypoints using Three.js line primitives
 */

// Configuration for path rendering
const PATH_CONFIG = {
  lineHeight: 0.05, // Height above field surface
  lineSegments: 32, // Number of segments for smooth path rendering
  waypointRadius: 0.4, // Radius of keyframe waypoint markers
  colors: {
    ball: '#ff6b00', // Orange for ball paths
    player: '#00bfff', // Blue for player paths
    selected: '#ffff00', // Yellow for selected paths
    waypoint: '#ffffff', // White for waypoint markers
  },
} as const;

interface PathProps {
  path: MovementPath;
  selected?: boolean;
  showWaypoints?: boolean;
  color?: string;
}

/**
 * Main Path component for rendering movement paths
 */
export function Path({
  path,
  selected = false,
  showWaypoints = true,
  color,
}: PathProps) {
  // Don't render if path has no movement
  if (!pathHasMovement(path)) {
    return null;
  }

  // Determine path color based on entity type and selection state
  const pathColor = useMemo(() => {
    if (selected) return PATH_CONFIG.colors.selected;
    if (color) return color;
    return path.entityType === 'ball'
      ? PATH_CONFIG.colors.ball
      : PATH_CONFIG.colors.player;
  }, [selected, color, path.entityType]);

  // Sample positions along the path for smooth rendering
  const pathPoints = useMemo(() => {
    const positions = samplePathPositions(path, PATH_CONFIG.lineSegments);
    // Flatten positions into array for bufferAttribute
    const points: number[] = [];
    positions.forEach((pos) => {
      points.push(pos[0], PATH_CONFIG.lineHeight, pos[2]); // x, y (height), z
    });
    return new Float32Array(points);
  }, [path]);

  return (
    <group>
      {/* Path line rendering */}
      <PathLine points={pathPoints} color={pathColor} />

      {/* Keyframe waypoint markers */}
      {showWaypoints && (
        <PathWaypoints
          keyframes={path.keyframes}
          selected={selected}
        />
      )}
    </group>
  );
}

interface PathLineProps {
  points: Float32Array;
  color: string;
}

/**
 * PathLine - Renders the continuous path as flat ribbon planes lying on the field surface.
 * Uses PlaneGeometry instead of WebGL lines (which are always 1px regardless of linewidth).
 */
function PathLine({ points, color }: PathLineProps) {
  const ribbons = useMemo(() => {
    const result: Array<{
      midpoint: [number, number, number];
      length: number;
      angle: number;
    }> = [];
    const numPoints = points.length / 3;

    for (let i = 0; i < numPoints - 1; i++) {
      const ax = points[i * 3];
      const az = points[i * 3 + 2];
      const bx = points[(i + 1) * 3];
      const bz = points[(i + 1) * 3 + 2];

      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 0.001) continue;

      result.push({
        midpoint: [(ax + bx) / 2, 0.03, (az + bz) / 2],
        length,
        angle: Math.atan2(dx, dz),
      });
    }

    return result;
  }, [points]);

  return (
    <group>
      {ribbons.map((ribbon, index) => (
        <mesh
          key={`ribbon-${index}`}
          position={ribbon.midpoint}
          rotation={[-Math.PI / 2, 0, ribbon.angle]}
        >
          <planeGeometry args={[0.6, ribbon.length]} />
          <meshStandardMaterial
            color={color}
            transparent={true}
            opacity={0.65}
            depthWrite={false}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

interface PathWaypointsProps {
  keyframes: MovementPath['keyframes'];
  selected: boolean;
}

/**
 * PathWaypoints - Renders markers at each keyframe position
 */
function PathWaypoints({ keyframes, selected }: PathWaypointsProps) {
  return (
    <group>
      {keyframes.map((keyframe, index) => (
        <WaypointMarker
          key={`waypoint-${index}`}
          position={keyframe.position}
          isFirst={index === 0}
          isLast={index === keyframes.length - 1}
          selected={selected}
        />
      ))}
    </group>
  );
}

interface WaypointMarkerProps {
  position: [number, number, number];
  isFirst: boolean;
  isLast: boolean;
  selected: boolean;
}

/**
 * WaypointMarker - Visual marker for individual keyframe waypoints
 */
function WaypointMarker({ position, isFirst, isLast, selected }: WaypointMarkerProps) {
  // Determine marker color based on position in path
  const markerColor = useMemo(() => {
    if (selected) return PATH_CONFIG.colors.selected;
    if (isFirst) return '#00ff00'; // Green for start
    if (isLast) return '#ff0000'; // Red for end
    return PATH_CONFIG.colors.waypoint;
  }, [selected, isFirst, isLast]);

  // Slightly larger markers for start/end
  const radius = (isFirst || isLast)
    ? PATH_CONFIG.waypointRadius * 1.2
    : PATH_CONFIG.waypointRadius;

  return (
    <mesh
      position={[position[0], PATH_CONFIG.lineHeight + 0.01, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[radius, 16]} />
      <meshBasicMaterial color={markerColor} />
    </mesh>
  );
}

/**
 * PathArrowhead - Arrow indicator showing direction of movement
 * Can be used to show travel direction at path end
 */
interface PathArrowheadProps {
  position: [number, number, number];
  direction: [number, number, number];
  color: string;
}

export function PathArrowhead({ position, direction, color }: PathArrowheadProps) {
  // Calculate rotation from direction vector
  const rotation = useMemo(() => {
    const angle = Math.atan2(direction[2], direction[0]);
    return [0, -angle, 0] as [number, number, number];
  }, [direction]);

  return (
    <mesh
      position={[position[0], PATH_CONFIG.lineHeight + 0.02, position[2]]}
      rotation={rotation}
    >
      <coneGeometry args={[0.3, 0.6, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/**
 * PathManager - Component to render all paths from pathStore
 * Use this in the scene to render all entity paths
 */
interface PathManagerProps {
  paths: MovementPath[];
  selectedPathId?: string | null;
  showWaypoints?: boolean;
}

export function PathManager({
  paths,
  selectedPathId,
  showWaypoints = true,
}: PathManagerProps) {
  return (
    <group>
      {paths.map((path) => (
        <Path
          key={path.id}
          path={path}
          selected={path.id === selectedPathId}
          showWaypoints={showWaypoints}
        />
      ))}
    </group>
  );
}

export default Path;
