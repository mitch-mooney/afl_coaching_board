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
 * PathLine - Renders the continuous line path between keyframes
 */
function PathLine({ points, color }: PathLineProps) {
  // Render as multiple connected line segments (same pattern as Field.tsx)
  const segments = useMemo(() => {
    const result: Array<{ start: [number, number, number]; end: [number, number, number] }> = [];
    const numPoints = points.length / 3;

    for (let i = 0; i < numPoints - 1; i++) {
      const startIdx = i * 3;
      const endIdx = (i + 1) * 3;
      result.push({
        start: [points[startIdx], points[startIdx + 1], points[startIdx + 2]],
        end: [points[endIdx], points[endIdx + 1], points[endIdx + 2]],
      });
    }

    return result;
  }, [points]);

  return (
    <group>
      {segments.map((segment, index) => (
        <line key={`path-segment-${index}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                segment.start[0], segment.start[1], segment.start[2],
                segment.end[0], segment.end[1], segment.end[2],
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} linewidth={2} />
        </line>
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
