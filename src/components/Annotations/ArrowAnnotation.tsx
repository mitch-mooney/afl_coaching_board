import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Euler, Plane } from 'three';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';
import { snapToField } from '../../utils/fieldGeometry';

interface ArrowAnnotationProps {
  annotation: Annotation;
}

/**
 * DragHandle Component
 *
 * A draggable sphere handle for manipulating annotation points.
 * Used to drag arrow endpoints when the annotation is selected.
 */
interface DragHandleProps {
  position: [number, number, number];
  onDrag: (newPosition: [number, number, number]) => void;
  isSelected: boolean;
}

function DragHandle({ position, onDrag, isSelected }: DragHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { camera, raycaster } = useThree();

  // Handle dragging with global pointer events in useFrame
  useFrame((state) => {
    if (isDragging) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [newX, newZ] = snapToField(intersection.x, intersection.z);
        onDrag([newX, position[1], newZ]);
      }
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => {
    setHovered(false);
    setIsDragging(false);
  };

  // Handle appearance based on state
  const handleColor = isDragging ? '#ff8800' : hovered ? '#ffffff' : '#ffff00';
  const handleSize = isDragging ? 1.2 : hovered ? 1.1 : 1.0;

  if (!isSelected) return null;

  return (
    <group>
      {/* Draggable sphere handle */}
      <mesh
        position={[position[0], 0.5, position[2]]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={handleSize}
      >
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={handleColor}
          emissive={handleColor}
          emissiveIntensity={isDragging ? 0.6 : 0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Selection indicator ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.03, position[2]]}>
        <ringGeometry args={[0.8, 1.0, 16]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffff00"
          emissiveIntensity={isDragging ? 0.8 : 0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * ArrowAnnotation Component
 *
 * Renders a directional arrow between two points on the 3D field.
 * The arrow consists of a line segment with a cone arrowhead at the end point.
 * Supports selection highlighting with visual indicator.
 * When selected, both endpoints can be dragged to new positions.
 */
export function ArrowAnnotation({ annotation }: ArrowAnnotationProps) {
  const coneRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation, updateAnnotationPoint } = useAnnotationStore();
  const isSelected = selectedAnnotationId === annotation.id;

  // Validate annotation has at least 2 points for start and end
  if (annotation.points.length < 2) {
    return null;
  }

  const startPoint = annotation.points[0];
  const endPoint = annotation.points[1];

  // Handle start point drag
  const handleStartDrag = (newPosition: [number, number, number]) => {
    updateAnnotationPoint(annotation.id, 0, newPosition);
  };

  // Handle end point drag
  const handleEndDrag = (newPosition: [number, number, number]) => {
    updateAnnotationPoint(annotation.id, 1, newPosition);
  };

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

      {/* Draggable handles for start and end points when selected */}
      <DragHandle
        position={[startPoint[0], startPoint[1], startPoint[2]]}
        onDrag={handleStartDrag}
        isSelected={isSelected}
      />
      <DragHandle
        position={[endPoint[0], endPoint[1], endPoint[2]]}
        onDrag={handleEndDrag}
        isSelected={isSelected}
      />
    </group>
  );
}
