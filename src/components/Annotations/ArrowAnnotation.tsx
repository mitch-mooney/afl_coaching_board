import { useMemo, useRef, useState } from 'react';
import { Mesh, Vector3, Euler } from 'three';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';

interface ArrowAnnotationProps {
  annotation: Annotation;
}

/**
 * ArrowAnnotation Component
 *
 * Renders a directional arrow between two points on the 3D field.
 * The arrow consists of a line segment with a cone arrowhead at the end point.
 * Supports selection highlighting with visual indicator.
 */
export function ArrowAnnotation({ annotation }: ArrowAnnotationProps) {
  const coneRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation } = useAnnotationStore();
  const isSelected = selectedAnnotationId === annotation.id;

  // Validate annotation has at least 2 points for start and end
  if (annotation.points.length < 2) {
    return null;
  }

  const startPoint = annotation.points[0];
  const endPoint = annotation.points[1];

  // Memoize line geometry points
  const linePoints = useMemo(() => {
    return new Float32Array([
      startPoint[0], startPoint[1], startPoint[2],
      endPoint[0], endPoint[1], endPoint[2],
    ]);
  }, [startPoint, endPoint]);

  // Calculate cone rotation to point from start to end
  const coneRotation = useMemo(() => {
    const start = new Vector3(startPoint[0], startPoint[1], startPoint[2]);
    const end = new Vector3(endPoint[0], endPoint[1], endPoint[2]);

    // Direction vector from start to end
    const direction = new Vector3().subVectors(end, start).normalize();

    // Cone default direction is along positive Y-axis
    // We need to rotate it to align with our direction vector
    // Using spherical coordinates to calculate rotation
    const phi = Math.acos(direction.y); // Angle from Y-axis
    const theta = Math.atan2(direction.x, direction.z); // Rotation around Y-axis

    // Euler rotation: first rotate around X to tilt, then around Y to point direction
    return new Euler(phi, theta, 0, 'YXZ');
  }, [startPoint, endPoint]);

  // Arrowhead cone dimensions - scaled appropriately for field visibility
  const coneRadius = 0.8;
  const coneHeight = 2.0;
  const coneSegments = 8;

  // Offset the cone slightly back along the arrow so tip is exactly at endpoint
  const conePosition = useMemo(() => {
    const start = new Vector3(startPoint[0], startPoint[1], startPoint[2]);
    const end = new Vector3(endPoint[0], endPoint[1], endPoint[2]);

    // Direction vector from start to end
    const direction = new Vector3().subVectors(end, start).normalize();

    // Move cone back by half its height so the tip is at the endpoint
    const offset = direction.multiplyScalar(-coneHeight / 2);

    return [
      endPoint[0] + offset.x,
      endPoint[1] + offset.y,
      endPoint[2] + offset.z,
    ] as [number, number, number];
  }, [startPoint, endPoint, coneHeight]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);

  // Determine colors based on selection/hover state
  const lineColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;
  const coneColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;
  const emissiveIntensity = isSelected ? 0.3 : hovered ? 0.1 : 0;

  return (
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Arrow line segment */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={linePoints}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} linewidth={annotation.thickness || 2} />
      </line>

      {/* Arrowhead cone at end point */}
      <mesh
        ref={coneRef}
        position={conePosition}
        rotation={coneRotation}
      >
        <coneGeometry args={[coneRadius, coneHeight, coneSegments]} />
        <meshStandardMaterial
          color={coneColor}
          emissive={isSelected ? '#ffff00' : annotation.color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Selection indicator rings at start and end points */}
      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[startPoint[0], 0.03, startPoint[2]]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[endPoint[0], 0.03, endPoint[2]]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
}
