import { useConeStore } from '../../store/coneStore';
import { useModeStore } from '../../store/modeStore';
import type { Cone } from '../../store/coneStore';
import type { ThreeEvent } from '@react-three/fiber';

function ConeMarker({ cone }: { cone: Cone }) {
  const removeCone = useConeStore((s) => s.removeCone);

  return (
    <mesh
      position={[cone.position[0], 1.0, cone.position[2]]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        removeCone(cone.id);
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
        addCone([e.point.x, 0, e.point.z]);
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
