import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useConeStore } from '../../store/coneStore';
import { useModeStore } from '../../store/modeStore';
import { usePenStore } from '../../store/penStore';
import { usePlayerStore } from '../../store/playerStore';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { editBoard } from '../../utils/boardEdit';
import { beginConeDrag, conePointerIntent, type ConeDragHandle } from '../../utils/coneDrag';
import { intersectGroundPlane, isTap } from '../../utils/dragMath';
import type { Cone } from '../../store/coneStore';
import type { ThreeEvent } from '@react-three/fiber';

/**
 * One cone. A finger drags it, as it drags a player; while cone setup is armed
 * a tap takes it off instead, the way an armed Placement takes a player off.
 * See `conePointerIntent`.
 */
function ConeMarker({ cone }: { cone: Cone }) {
  const removeCone = useConeStore((s) => s.removeCone);
  const setDragging = usePlayerStore((s) => s.setDragging);
  const { camera, raycaster } = useThree();
  const boundary = useActiveBoundary();
  const [isDragging, setIsDragging] = useState(false);
  // The open Board edit for the drag in progress.
  const dragRef = useRef<ConeDragHandle | null>(null);
  // Where a removal tap landed, set on pointer down and read on pointer up.
  // Pointer up rather than click: iOS Safari fires no click on the canvas (see
  // `isTap`).
  const removalDownAtRef = useRef<[number, number] | null>(null);

  useFrame((state) => {
    if (!isDragging) return;
    // The raw ground hit: the drag handle keeps the grab offset, then snaps
    // inside the Boundary as a player drag does.
    raycaster.setFromCamera(state.pointer, camera);
    const ground = intersectGroundPlane(raycaster.ray);
    if (ground) dragRef.current?.moveTo(ground);
  });

  const endDragging = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragging(false);
    dragRef.current?.commit();
    dragRef.current = null;
  }, [isDragging, setDragging]);

  // End the drag wherever the pointer lifts, even off the canvas.
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointerup', endDragging);
    window.addEventListener('pointercancel', endDragging);
    return () => {
      window.removeEventListener('pointerup', endDragging);
      window.removeEventListener('pointercancel', endDragging);
    };
  }, [isDragging, endDragging]);

  // A second finger landing mid-drag hands the gesture to the camera. The edit
  // commits what the drag had moved so far, as a player drag does.
  useEffect(() => {
    if (!isDragging) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) endDragging();
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, [isDragging, endDragging]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    removalDownAtRef.current = null;

    const intent = conePointerIntent({
      pointerType: e.pointerType,
      armedTip: usePenStore.getState().armedTip,
      button: e.button,
      coneSetupActive: useConeStore.getState().isConePlacementActive,
    });

    if (intent === 'remove') {
      removalDownAtRef.current = [e.nativeEvent.clientX, e.nativeEvent.clientY];
      return;
    }
    if (intent === 'none') return;

    setIsDragging(true);
    setDragging(true); // disables the camera controls for the drag
    // Close a drag stranded by a pointer down that never saw its pointer up,
    // rather than losing the handle: boardEdit has one open-edit slot.
    dragRef.current?.commit();
    dragRef.current = beginConeDrag(cone.id, boundary);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const downAt = removalDownAtRef.current;
    removalDownAtRef.current = null;
    if (downAt) {
      if (isTap(downAt, [e.nativeEvent.clientX, e.nativeEvent.clientY])) {
        editBoard('Remove cone', () => removeCone(cone.id));
      }
      return;
    }
    endDragging();
  };

  return (
    <mesh
      position={[cone.position[0], 1.0, cone.position[2]]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (isDragging) e.stopPropagation();
      }}
    >
      <coneGeometry args={[0.5, 2.0, 8]} />
      <meshStandardMaterial color="#FF6B00" />
    </mesh>
  );
}

function ConePlacementPlane() {
  const addCone = useConeStore((s) => s.addCone);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        editBoard('Place cone', () => addCone([e.point.x, 0, e.point.z]));
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export function ConeManager() {
  const cones = useConeStore((s) => s.cones);
  const isConePlacementActive = useConeStore((s) => s.isConePlacementActive);
  const mode = useModeStore((s) => s.mode);

  if (mode !== 'training') return null;

  return (
    <group>
      {isConePlacementActive && <ConePlacementPlane />}
      {cones.map((cone) => (
        <ConeMarker key={cone.id} cone={cone} />
      ))}
    </group>
  );
}
