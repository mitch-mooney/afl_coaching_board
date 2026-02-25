import { useMemo } from 'react';
import { MovementPath } from '../../models/PathModel';
import { samplePathPositions, pathHasMovement } from '../../utils/pathAnimation';
import { usePlayerStore } from '../../store/playerStore';
import { useEventStore } from '../../store/eventStore';

/**
 * Path component - Visualizes entity movement paths on the 3D field
 * Renders path line and keyframe waypoints using Three.js line primitives
 */

// Configuration for path rendering
const PATH_CONFIG = {
  lineHeight: 0.05, // Height above field surface
  lineSegments: 32, // Number of segments for smooth path rendering
  waypointRadius: 0.25, // Radius of keyframe waypoint markers
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
          <planeGeometry args={[0.35, ribbon.length]} />
          <meshStandardMaterial
            color={color}
            transparent={true}
            opacity={0.85}
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

/** Ball path base color — applied before phase shading */
const BALL_PATH_COLOR = '#ff6b00';

/**
 * Shift the HSL lightness of a hex color by deltaL (-1..+1).
 * Positive = lighter, negative = darker. Clamps to [0.08, 0.92].
 */
function shiftLightness(hex: string, deltaL: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const newL = Math.max(0.08, Math.min(0.92, l + deltaL));

  if (max === min) {
    const v = Math.round(newL * 255).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
  const p = 2 * newL - q;

  function hue2rgb(pp: number, qq: number, t: number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (qq - pp) * 6 * t;
    if (t < 1 / 2) return qq;
    if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6;
    return pp;
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p, q, h + 1 / 3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1 / 3))}`;
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
  const players = usePlayerStore((state) => state.players);
  const events = useEventStore((state) => state.events);

  // Build a per-path color map: team primary color shaded by phase order.
  // Earlier phases are lighter, later phases are darker.
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();

    // Map each pathId to its { baseColor, phaseIndex, totalPhases } from saved events
    const pathPhaseMap = new Map<string, { baseColor: string; phaseIndex: number; totalPhases: number }>();

    for (const event of events) {
      const phases = [...(event.phases ?? [])].sort((a, b) => a.startTime - b.startTime);
      const totalPhases = phases.length;

      for (const pp of event.playerPaths) {
        const matchedPath = paths.find((p) => p.id === pp.pathId);
        if (!matchedPath) continue;

        const phaseIndex = phases.findIndex((ph) => ph.startTime === pp.startTimeOffset);
        const idx = phaseIndex === -1 ? 0 : phaseIndex;

        const baseColor =
          matchedPath.entityType === 'ball'
            ? BALL_PATH_COLOR
            : (players.find((p) => p.id === matchedPath.entityId)?.color ?? PATH_CONFIG.colors.player);

        pathPhaseMap.set(pp.pathId, { baseColor, phaseIndex: idx, totalPhases });
      }
    }

    for (const path of paths) {
      const phaseInfo = pathPhaseMap.get(path.id);
      if (phaseInfo) {
        const { baseColor, phaseIndex, totalPhases } = phaseInfo;
        // phaseProgress: 0 = first (lightest), 1 = last (darkest)
        const phaseProgress = totalPhases <= 1 ? 1 : phaseIndex / (totalPhases - 1);
        // Lerp deltaL: +0.22 (lightest) → -0.15 (darkest)
        const deltaL = 0.22 * (1 - phaseProgress) - 0.15 * phaseProgress;
        map.set(path.id, shiftLightness(baseColor, deltaL));
      } else {
        // Freshly drawn, not yet in any event — use base color unchanged
        const baseColor =
          path.entityType === 'ball'
            ? BALL_PATH_COLOR
            : (players.find((p) => p.id === path.entityId)?.color ?? PATH_CONFIG.colors.player);
        map.set(path.id, baseColor);
      }
    }

    return map;
  }, [paths, players, events]);

  return (
    <group>
      {paths.map((path) => (
        <Path
          key={path.id}
          path={path}
          selected={path.id === selectedPathId}
          showWaypoints={showWaypoints}
          color={colorMap.get(path.id)}
        />
      ))}
    </group>
  );
}

export default Path;
