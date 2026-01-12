import { useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import { useAnnotationStore, Annotation } from '../store/annotationStore';

/**
 * Selection distance threshold in world units.
 * Annotations within this distance of the click point will be selectable.
 */
const SELECTION_THRESHOLD = 5.0;

/**
 * useAnnotationSelection Hook
 *
 * Handles annotation selection via raycasting when no tool is selected.
 * Uses proximity-based selection to find the nearest annotation to the click point.
 * This approach works for all annotation types including lines and text.
 */
export function useAnnotationSelection() {
  const { camera, raycaster, gl } = useThree();
  const {
    selectedTool,
    annotations,
    selectedAnnotationId,
    selectAnnotation,
  } = useAnnotationStore();

  /**
   * Calculate the minimum distance from a point to an annotation.
   * Different annotation types have different distance calculations.
   */
  const getDistanceToAnnotation = useCallback(
    (clickPoint: Vector3, annotation: Annotation): number => {
      const points = annotation.points;

      if (points.length === 0) return Infinity;

      switch (annotation.type) {
        case 'text': {
          // Text: distance to the text position
          const textPos = new Vector3(points[0][0], 0, points[0][2]);
          return clickPoint.distanceTo(textPos);
        }

        case 'arrow':
        case 'line': {
          // Arrow/Line: minimum distance to any point along the path
          let minDistance = Infinity;

          // For each segment, calculate distance to the line segment
          for (let i = 0; i < points.length - 1; i++) {
            const p1 = new Vector3(points[i][0], 0, points[i][2]);
            const p2 = new Vector3(points[i + 1][0], 0, points[i + 1][2]);
            const distance = distanceToLineSegment(clickPoint, p1, p2);
            minDistance = Math.min(minDistance, distance);
          }

          // Also check distance to individual points
          for (const point of points) {
            const p = new Vector3(point[0], 0, point[2]);
            minDistance = Math.min(minDistance, clickPoint.distanceTo(p));
          }

          return minDistance;
        }

        case 'circle': {
          // Circle: distance to center or edge
          const center = new Vector3(points[0][0], 0, points[0][2]);
          const edge = new Vector3(points[1][0], 0, points[1][2]);
          const radius = center.distanceTo(edge);
          const distToCenter = clickPoint.distanceTo(center);

          // If inside the circle, distance is 0
          if (distToCenter <= radius) return 0;

          // Otherwise, distance to the edge
          return distToCenter - radius;
        }

        case 'rectangle': {
          // Rectangle: check if inside or distance to nearest edge
          const [p1, p2] = points;
          const minX = Math.min(p1[0], p2[0]);
          const maxX = Math.max(p1[0], p2[0]);
          const minZ = Math.min(p1[2], p2[2]);
          const maxZ = Math.max(p1[2], p2[2]);

          const cx = clickPoint.x;
          const cz = clickPoint.z;

          // If inside the rectangle, distance is 0
          if (cx >= minX && cx <= maxX && cz >= minZ && cz <= maxZ) {
            return 0;
          }

          // Calculate distance to nearest edge
          const nearestX = Math.max(minX, Math.min(maxX, cx));
          const nearestZ = Math.max(minZ, Math.min(maxZ, cz));
          const nearestPoint = new Vector3(nearestX, 0, nearestZ);
          return clickPoint.distanceTo(nearestPoint);
        }

        default:
          return Infinity;
      }
    },
    []
  );

  /**
   * Find the annotation closest to the given click point.
   * Returns the annotation if within threshold, otherwise null.
   */
  const findNearestAnnotation = useCallback(
    (clickPoint: Vector3): Annotation | null => {
      let nearestAnnotation: Annotation | null = null;
      let minDistance = SELECTION_THRESHOLD;

      for (const annotation of annotations) {
        const distance = getDistanceToAnnotation(clickPoint, annotation);
        if (distance < minDistance) {
          minDistance = distance;
          nearestAnnotation = annotation;
        }
      }

      return nearestAnnotation;
    },
    [annotations, getDistanceToAnnotation]
  );

  useEffect(() => {
    // Only handle selection when no tool is selected
    if (selectedTool) return;

    const handleClick = (event: PointerEvent) => {
      // Only respond to left mouse button
      if (event.button !== 0) return;

      // Convert mouse position to normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Set up raycaster from camera
      raycaster.setFromCamera({ x, y } as any, camera);

      // Intersect with ground plane (Y = 0)
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const groundPlane = new Plane(planeNormal, -planeNormal.dot(planePoint));
      const intersection = new Vector3();

      const didIntersect = raycaster.ray.intersectPlane(groundPlane, intersection);

      if (!didIntersect) {
        // Click didn't hit the ground plane - deselect if something was selected
        if (selectedAnnotationId) {
          selectAnnotation(null);
        }
        return;
      }

      // Find the nearest annotation to the click point
      const nearestAnnotation = findNearestAnnotation(intersection);

      if (nearestAnnotation) {
        // Select the annotation (or toggle if already selected)
        if (selectedAnnotationId === nearestAnnotation.id) {
          // Clicking the same annotation deselects it
          selectAnnotation(null);
        } else {
          selectAnnotation(nearestAnnotation.id);
        }
      } else {
        // No annotation near click point - deselect any current selection
        if (selectedAnnotationId) {
          selectAnnotation(null);
        }
      }
    };

    gl.domElement.addEventListener('click', handleClick);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [
    selectedTool,
    camera,
    raycaster,
    gl,
    annotations,
    selectedAnnotationId,
    selectAnnotation,
    findNearestAnnotation,
  ]);

  return null;
}

/**
 * Calculate the minimum distance from a point to a line segment.
 * Used for line/arrow annotation selection.
 */
function distanceToLineSegment(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
  const line = new Vector3().subVectors(lineEnd, lineStart);
  const lineLength = line.length();

  if (lineLength === 0) {
    // Line segment has zero length - return distance to the point
    return point.distanceTo(lineStart);
  }

  // Calculate parameter t for the closest point on the line
  const t = Math.max(
    0,
    Math.min(
      1,
      new Vector3().subVectors(point, lineStart).dot(line) / (lineLength * lineLength)
    )
  );

  // Calculate the closest point on the line segment
  const closestPoint = new Vector3()
    .copy(lineStart)
    .add(line.multiplyScalar(t));

  return point.distanceTo(closestPoint);
}
