import { useMemo, useState } from 'react';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';

interface ZoneAnnotationProps {
  annotation: Annotation;
}

/**
 * ZoneAnnotation Component
 *
 * Renders semi-transparent zone shapes (circles or rectangles) for highlighting
 * areas of the field. Both shapes are rendered as filled planes with configurable
 * opacity to allow field visibility underneath.
 * Supports selection highlighting with visual indicator.
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
 */
function CircleZone({ annotation }: ZoneAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation } = useAnnotationStore();
  const isSelected = selectedAnnotationId === annotation.id;

  const center = annotation.points[0];

  // Calculate radius as distance from center to edge point (using X-Z plane)
  const radius = useMemo(() => {
    const dx = annotation.points[1][0] - center[0];
    const dz = annotation.points[1][2] - center[2];
    return Math.sqrt(dx * dx + dz * dz);
  }, [annotation.points, center]);

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

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);

  return (
    <group
      onClick={handleClick}
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
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

/**
 * RectangleZone Component
 *
 * Renders a filled rectangle zone on the field.
 * Defined by two opposite corner points: points[0] and points[1].
 */
function RectangleZone({ annotation }: ZoneAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation } = useAnnotationStore();
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

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);

  return (
    <group
      onClick={handleClick}
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
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
