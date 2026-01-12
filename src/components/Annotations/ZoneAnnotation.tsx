import { useMemo } from 'react';
import { Annotation } from '../../store/annotationStore';

interface ZoneAnnotationProps {
  annotation: Annotation;
}

/**
 * ZoneAnnotation Component
 *
 * Renders semi-transparent zone shapes (circles or rectangles) for highlighting
 * areas of the field. Both shapes are rendered as filled planes with configurable
 * opacity to allow field visibility underneath.
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
  const center = annotation.points[0];

  // Calculate radius as distance from center to edge point (using X-Z plane)
  const radius = useMemo(() => {
    const dx = annotation.points[1][0] - center[0];
    const dz = annotation.points[1][2] - center[2];
    return Math.sqrt(dx * dx + dz * dz);
  }, [annotation.points, center]);

  // Position slightly above field to prevent z-fighting
  const yPosition = 0.02;

  // Default opacity for zone highlighting
  const opacity = 0.3;

  return (
    <mesh
      position={[center[0], yPosition, center[2]]}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on X-Z plane
    >
      <circleGeometry args={[radius, 32]} />
      <meshStandardMaterial
        color={annotation.color}
        opacity={opacity}
        transparent
      />
    </mesh>
  );
}

/**
 * RectangleZone Component
 *
 * Renders a filled rectangle zone on the field.
 * Defined by two opposite corner points: points[0] and points[1].
 */
function RectangleZone({ annotation }: ZoneAnnotationProps) {
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

  // Default opacity for zone highlighting
  const opacity = 0.3;

  return (
    <mesh
      position={[dimensions.centerX, yPosition, dimensions.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on X-Z plane
    >
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshStandardMaterial
        color={annotation.color}
        opacity={opacity}
        transparent
      />
    </mesh>
  );
}
