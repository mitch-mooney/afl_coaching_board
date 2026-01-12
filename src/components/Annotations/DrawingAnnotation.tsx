import { useMemo } from 'react';
import { Annotation } from '../../store/annotationStore';

interface DrawingAnnotationProps {
  annotation: Annotation;
}

/**
 * DrawingAnnotation Component
 *
 * Renders a free-hand drawing path on the 3D field.
 * The drawing consists of a continuous line connecting multiple points
 * captured during mouse/pointer movement.
 */
export function DrawingAnnotation({ annotation }: DrawingAnnotationProps) {
  // Validate annotation has at least 2 points for a visible path
  if (annotation.points.length < 2) {
    return null;
  }

  // Memoize the flattened points array for buffer geometry
  const linePoints = useMemo(() => {
    // Flatten the 2D array of points into a 1D Float32Array
    // Each point is [x, y, z], so we create [x1, y1, z1, x2, y2, z2, ...]
    const flatPoints: number[] = [];

    for (const point of annotation.points) {
      flatPoints.push(point[0], point[1], point[2]);
    }

    return new Float32Array(flatPoints);
  }, [annotation.points]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={annotation.points.length}
          array={linePoints}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={annotation.color}
        linewidth={annotation.thickness || 2}
      />
    </line>
  );
}
