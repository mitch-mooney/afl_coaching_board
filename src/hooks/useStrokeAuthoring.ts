import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import { useAnnotationStore } from '../store/annotationStore';
import { usePenStore } from '../store/penStore';
import { usePlayerStore } from '../store/playerStore';
import { useBallStore } from '../store/ballStore';
import { usePathStore } from '../store/pathStore';
import { snapToField } from '../utils/fieldGeometry';
import { authoringIntent } from '../utils/inputContract';
import {
  entityAtStrokeStart,
  pathFromStroke,
  MIN_STROKE_SAMPLE_DISTANCE,
  type StrokeCandidate,
} from '../utils/pathAuthoring';

/** Below this, the pen's final position is already the last recorded sample. */
const FINAL_SAMPLE_EPSILON = 0.1;

/**
 * Turns a Stroke into whatever the armed Pen tip says it becomes: an Annotation,
 * or a MovementPath for the entity the Stroke began on.
 *
 * Listeners exist only while a tip is armed, and the input contract decides
 * whether a given pointer authors at all — see
 * `docs/adr/0001-pen-authors-finger-manipulates.md`.
 */
export function useStrokeAuthoring() {
  const { camera, raycaster, gl } = useThree();
  const armedTip = usePenStore((state) => state.armedTip);
  const { selectedColor, thickness, addAnnotation, setLivePreview, setPendingTextPoint } =
    useAnnotationStore();
  const isStrokingRef = useRef(false);
  const strokeRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    if (!armedTip) return;

    const groundPoint = (event: PointerEvent): [number, number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera({ x, y } as any, camera);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(new Vector3(0, 1, 0), 0),
        new Vector3()
      );
      if (!intersection) return null;

      const [sx, sz] = snapToField(intersection.x, intersection.z);
      return [sx, 0, sz];
    };

    const distanceFromLastSample = (point: [number, number, number]) => {
      const last = strokeRef.current[strokeRef.current.length - 1];
      return Math.sqrt(Math.pow(point[0] - last[0], 2) + Math.pow(point[2] - last[2], 2));
    };

    /**
     * A Path Stroke replaces the entity's existing path on *completion*, so an
     * abandoned stroke no longer destroys good work the way entering draw mode
     * used to.
     */
    const completePathStroke = (points: [number, number, number][]) => {
      const ball = useBallStore.getState().ball;
      const candidates: StrokeCandidate[] = [
        ...usePlayerStore.getState().players.map((p) => ({
          id: p.id,
          type: 'player' as const,
          position: p.position,
        })),
        ...(ball ? [{ id: ball.id, type: 'ball' as const, position: ball.position }] : []),
      ];

      // A Stroke starting on open grass belongs to nothing and produces nothing.
      const entity = entityAtStrokeStart(points[0], candidates);
      if (!entity) return;

      const path = pathFromStroke(entity, points);
      if (!path) return;

      const paths = usePathStore.getState();
      for (const existing of paths.getPathsByEntity(entity.id)) {
        paths.removePath(existing.id);
      }
      paths.addPath(path);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const intent = authoringIntent({
        pointerType: event.pointerType,
        armedTip,
        button: event.button,
      });
      if (intent !== 'author') return;

      const point = groundPoint(event);
      if (!point) return;

      // Text needs a placement point, not a stroke.
      if (armedTip === 'text') {
        setPendingTextPoint(point);
        return;
      }

      strokeRef.current = [point];
      isStrokingRef.current = true;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isStrokingRef.current) return;

      const point = groundPoint(event);
      if (!point) return;

      if (armedTip === 'path') {
        // A Path keeps its whole shape, sampled coarsely enough to stay cheap.
        if (distanceFromLastSample(point) < MIN_STROKE_SAMPLE_DISTANCE) return;
        strokeRef.current.push(point);
      } else {
        // Every Annotation kind is defined by where the stroke started and where
        // the pen is now.
        strokeRef.current = [strokeRef.current[0], point];
      }

      setLivePreview({
        type: armedTip === 'path' ? 'line' : armedTip,
        points: [...strokeRef.current],
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isStrokingRef.current) return;

      if (armedTip === 'path') {
        // The last sample can sit up to MIN_STROKE_SAMPLE_DISTANCE short of where
        // the pen actually lifted, and a path's end is where the runner arrives.
        const point = groundPoint(event);
        if (point && distanceFromLastSample(point) > FINAL_SAMPLE_EPSILON) {
          strokeRef.current.push(point);
        }
        completePathStroke(strokeRef.current);
      } else if (strokeRef.current.length >= 2) {
        addAnnotation({
          type: armedTip,
          points: strokeRef.current,
          color: selectedColor,
          thickness,
        });
      }

      setLivePreview(null);
      isStrokingRef.current = false;
      strokeRef.current = [];
    };

    const handlePointerCancel = () => {
      setLivePreview(null);
      isStrokingRef.current = false;
      strokeRef.current = [];
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    gl.domElement.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
      gl.domElement.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [
    armedTip,
    selectedColor,
    thickness,
    camera,
    raycaster,
    gl,
    addAnnotation,
    setLivePreview,
    setPendingTextPoint,
  ]);

  return null;
}
