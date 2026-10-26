import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '../../store/playerStore';
import { intersectGroundPlane } from '../../utils/dragMath';
import type { ConeDragHandle } from '../../utils/coneDrag';

/**
 * The drag mechanics a cone and a drill preview marker share, following the
 * Ball and Player drags: the marker follows the pointer in `useFrame`, a
 * window-level pointer up ends the drag, and a second finger cancels it so the
 * camera can take over. `start` opens a drag with a handle from `coneDrag.ts`.
 */
export function useMarkerDrag() {
  const setDragging = usePlayerStore((s) => s.setDragging);
  const { camera, raycaster } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<ConeDragHandle | null>(null);

  useFrame((state) => {
    if (!isDragging) return;
    // The raw ground hit: the handle keeps the grab offset, then snaps inside
    // the Boundary as a player drag does.
    raycaster.setFromCamera(state.pointer, camera);
    const ground = intersectGroundPlane(raycaster.ray);
    if (ground) dragRef.current?.moveTo(ground);
  });

  const end = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragging(false);
    dragRef.current?.commit();
    dragRef.current = null;
  }, [isDragging, setDragging]);

  // End the drag wherever the pointer lifts, even off the canvas.
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [isDragging, end]);

  // A second finger landing mid-drag hands the gesture to the camera. The
  // handle commits what the drag had moved so far, as a player drag does.
  useEffect(() => {
    if (!isDragging) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) end();
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, [isDragging, end]);

  const start = useCallback((open: () => ConeDragHandle) => {
    setIsDragging(true);
    setDragging(true); // disables the camera controls for the drag
    // Close a drag stranded by a pointer down that never saw its pointer up,
    // rather than losing the handle: boardEdit has one open-edit slot.
    dragRef.current?.commit();
    dragRef.current = open();
  }, [setDragging]);

  return { isDragging, start, end };
}
