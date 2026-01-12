import { useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';
import { snapToField } from '../../utils/fieldGeometry';

interface ZoneAnnotationProps {
  annotation: Annotation;
}

/**
 * DragHandle Component
 *
 * A draggable sphere handle for manipulating zone boundaries.
 * Used to resize zones when selected.
 */
interface DragHandleProps {
  position: [number, number, number];
  onDrag: (newPosition: [number, number, number]) => void;
  isSelected: boolean;
  size?: number;
}

function DragHandle({ position, onDrag, isSelected, size = 0.6 }: DragHandleProps) {
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
  const handleScale = isDragging ? 1.2 : hovered ? 1.1 : 1.0;

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
        scale={handleScale}
      >
        <sphereGeometry args={[size, 16, 16]} />
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
        <ringGeometry args={[size + 0.2, size + 0.4, 16]} />
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
 * ZoneAnnotation Component
 *
 * Renders semi-transparent zone shapes (circles or rectangles) for highlighting
 * areas of the field. Both shapes are rendered as filled planes with configurable
 * opacity to allow field visibility underneath.
 * Supports selection highlighting with visual indicator.
 * When selected, zone boundaries can be resized using drag handles.
 */
export function ZoneAnnotation({ annotation }: ZoneAnnotationProps) {
  // Validate annotation has at least 2 points for defining the zone
  if (annotation.points.length < 2) {
    return null;
  }

  // Route to appropriate shape renderer
  if (annotation.type === 'circle') {
    return <CircleZone annotation={annotation} />;
  }

  if (annotation.type === 'rectangle') {
    return <RectangleZone annotation={annotation} />;
  }

  return null;
}

/**
 * CircleZone Component
 *
 * Renders a filled circle zone on the field.
 * Center is defined by points[0], radius by distance to points[1].
 * When selected, the center can be moved and the edge handle controls radius.
 */
function CircleZone({ annotation }: ZoneAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { selectedAnnotationId, selectAnnotation, updateAnnotationPoint, updateAnnotationPoints } = useAnnotationStore();
  const { camera, raycaster } = useThree();
  const isSelected = selectedAnnotationId === annotation.id;

  const center = annotation.points[0];
  const edgePoint = annotation.points[1];

  // Calculate radius as distance from center to edge point (using X-Z plane)
  const radius = useMemo(() => {
    const dx = edgePoint[0] - center[0];
    const dz = edgePoint[2] - center[2];
    return Math.sqrt(dx * dx + dz * dz);
  }, [center, edgePoint]);

  // Handle center drag (moves entire zone)
  useFrame((state) => {
    if (isDragging && isSelected) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [newX, newZ] = snapToField(intersection.x, intersection.z);
        // Calculate offset and move both points
        const dx = newX - center[0];
        const dz = newZ - center[2];
        const newCenter = [newX, center[1], newZ];
        const newEdge = [edgePoint[0] + dx, edgePoint[1], edgePoint[2] + dz];
        updateAnnotationPoints(annotation.id, [newCenter, newEdge]);
      }
    }
  });

  // Handle edge point drag (controls radius)
  const handleEdgeDrag = (newPosition: [number, number, number]) => {
    updateAnnotationPoint(annotation.id, 1, newPosition);
  };

  // Position slightly above field to prevent z-fighting
  const yPosition = 0.02;

  // Opacity varies based on selection/hover state
  const baseOpacity = 0.3;
  const opacity = isSelected ? 0.5 : hovered ? 0.4 : baseOpacity;

  // Determine color based on selection/hover state
  const zoneColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
    setIsDragging(true);
  };

  const handlePointerMove = (e: any) => {
    if (isDragging) {
      e.stopPropagation();
    }
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

  return (
    <group
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Zone fill */}
      <mesh
        position={[center[0], yPosition, center[2]]}
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on X-Z plane
      >
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial
          color={zoneColor}
          opacity={opacity}
          transparent
          emissive={isSelected ? '#ffff00' : undefined}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Selection indicator ring around the zone */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0.03, center[2]]}>
          <ringGeometry args={[radius + 0.3, radius + 0.6, 32]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={isDragging ? 0.8 : 0.5}
          />
        </mesh>
      )}

      {/* Drag handle for radius control (edge point) */}
      <DragHandle
        position={[edgePoint[0], edgePoint[1], edgePoint[2]]}
        onDrag={handleEdgeDrag}
        isSelected={isSelected}
        size={0.5}
      />
    </group>
  );
}

/**
 * RectangleZone Component
 *
 * Renders a filled rectangle zone on the field.
 * Defined by two opposite corner points: points[0] and points[1].
 * When selected, both corners can be dragged to resize.
 */
function RectangleZone({ annotation }: ZoneAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { selectedAnnotationId, selectAnnotation, updateAnnotationPoint, updateAnnotationPoints } = useAnnotationStore();
  const { camera, raycaster } = useThree();
  const isSelected = selectedAnnotationId === annotation.id;

  const [p1, p2] = annotation.points;

  // Calculate dimensions and center from corner points
  const dimensions = useMemo(() => {
    const width = Math.abs(p2[0] - p1[0]);
    const height = Math.abs(p2[2] - p1[2]);
    const centerX = (p1[0] + p2[0]) / 2;
    const centerZ = (p1[2] + p2[2]) / 2;

    return { width, height, centerX, centerZ };
  }, [p1, p2]);

  // Handle center drag (moves entire zone)
  useFrame((state) => {
    if (isDragging && isSelected) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [newX, newZ] = snapToField(intersection.x, intersection.z);
        // Calculate offset from current center and move both corners
        const dx = newX - dimensions.centerX;
        const dz = newZ - dimensions.centerZ;
        const newP1 = [p1[0] + dx, p1[1], p1[2] + dz];
        const newP2 = [p2[0] + dx, p2[1], p2[2] + dz];
        updateAnnotationPoints(annotation.id, [newP1, newP2]);
      }
    }
  });

  // Handle corner drag (p1 - first corner)
  const handleCorner1Drag = (newPosition: [number, number, number]) => {
    updateAnnotationPoint(annotation.id, 0, newPosition);
  };

  // Handle corner drag (p2 - second corner)
  const handleCorner2Drag = (newPosition: [number, number, number]) => {
    updateAnnotationPoint(annotation.id, 1, newPosition);
  };

  // Position slightly above field to prevent z-fighting
  const yPosition = 0.02;

  // Opacity varies based on selection/hover state
  const baseOpacity = 0.3;
  const opacity = isSelected ? 0.5 : hovered ? 0.4 : baseOpacity;

  // Determine color based on selection/hover state
  const zoneColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
    setIsDragging(true);
  };

  const handlePointerMove = (e: any) => {
    if (isDragging) {
      e.stopPropagation();
    }
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

  return (
    <group
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Zone fill */}
      <mesh
        position={[dimensions.centerX, yPosition, dimensions.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on X-Z plane
      >
        <planeGeometry args={[dimensions.width, dimensions.height]} />
        <meshStandardMaterial
          color={zoneColor}
          opacity={opacity}
          transparent
          emissive={isSelected ? '#ffff00' : undefined}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Selection indicator border around the zone */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[dimensions.centerX, 0.03, dimensions.centerZ]}>
          <ringGeometry args={[
            Math.max(dimensions.width, dimensions.height) / 2 + 0.3,
            Math.max(dimensions.width, dimensions.height) / 2 + 0.6,
            4
          ]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={isDragging ? 0.8 : 0.5}
          />
        </mesh>
      )}

      {/* Drag handles for corners */}
      <DragHandle
        position={[p1[0], p1[1], p1[2]]}
        onDrag={handleCorner1Drag}
        isSelected={isSelected}
        size={0.5}
      />
      <DragHandle
        position={[p2[0], p2[1], p2[2]]}
        onDrag={handleCorner2Drag}
        isSelected={isSelected}
        size={0.5}
      />
    </group>
  );
}
