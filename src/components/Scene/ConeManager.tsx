import { useRef } from 'react';
import { useConeStore } from '../../store/coneStore';
import { useModeStore } from '../../store/modeStore';
import { usePenStore } from '../../store/penStore';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { editBoard } from '../../utils/boardEdit';
import { beginConeDrag, conePointerIntent } from '../../utils/coneDrag';
import { isTap } from '../../utils/dragMath';
import { useMarkerDrag } from './useMarkerDrag';
import type { Cone } from '../../store/coneStore';
import type { ThreeEvent } from '@react-three/fiber';

/**
 * One cone. A finger drags it, as it drags a player; while cone setup is armed
 * a tap takes it off instead, the way an armed Placement takes a player off.
 * See `conePointerIntent`.
 */
function ConeMarker({ cone }: { cone: Cone }) {
  const removeCone = useConeStore((s) => s.removeCone);
  const boundary = useActiveBoundary();
  const { isDragging, start, end } = useMarkerDrag();
  // Where a removal tap landed, set on pointer down and read on pointer up.
  // Pointer up rather than click: iOS Safari fires no click on the canvas (see
  // `isTap`).
  const removalDownAtRef = useRef<[number, number] | null>(null);

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

    start(() => beginConeDrag(cone.id, boundary));
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
    end();
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
