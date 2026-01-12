import { useMemo, useState } from 'react';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';

interface DrawingAnnotationProps {
  annotation: Annotation;
}

/**
 * DrawingAnnotation Component
 *
 * Renders a free-hand drawing path on the 3D field.
 * The drawing consists of a continuous line connecting multiple points
 * captured during mouse/pointer movement.
 * Supports selection highlighting with visual indicator.
 */
export function DrawingAnnotation({ annotation }: DrawingAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation } = useAnnotationStore();
  const isSelected = selectedAnnotationId === annotation.id;

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

  // Calculate bounding box center for selection indicator
  const boundingCenter = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const point of annotation.points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minZ = Math.min(minZ, point[2]);
      maxZ = Math.max(maxZ, point[2]);
    }

    return {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      radiusX: (maxX - minX) / 2 + 1,
      radiusZ: (maxZ - minZ) / 2 + 1,
    };
  }, [annotation.points]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);

  // Determine line color based on selection/hover state
  const lineColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;

  // Calculate selection ring radius based on bounding box
  const selectionRadius = Math.max(boundingCenter.radiusX, boundingCenter.radiusZ);

  return (
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
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
          color={lineColor}
          linewidth={annotation.thickness || 2}
        />
      </line>

      {/* Selection indicator ring around the drawing */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[boundingCenter.x, 0.03, boundingCenter.z]}>
          <ringGeometry args={[selectionRadius, selectionRadius + 0.3, 32]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
