import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnimationStore } from '../../store/animationStore';
import { pathHasMovement } from '../../utils/pathAnimation';
import { usePathPlayback } from '../../hooks/usePathPlayback';
import { PlayerComponent } from './Player';
import { useConeStore } from '../../store/coneStore';
import { usePenStore } from '../../store/penStore';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { beginPreviewDrag, previewPointerIntent } from '../../utils/coneDrag';
import { useMarkerDrag } from './useMarkerDrag';
import type { Player } from '../../models/PlayerModel';
import type { ThreeEvent } from '@react-three/fiber';

interface PlayerManagerProps {
  readOnly?: boolean;
}

function AnimationDriver() {
  usePathPlayback();

  // Keep the transport's `hasAnimation` gate in sync with whether any drawn
  // path can actually be played, so Play does nothing when the board is empty.
  const paths = usePathStore((state) => state.paths);
  const setHasAnimation = useAnimationStore((state) => state.setHasAnimation);
  useEffect(() => {
    setHasAnimation(paths.some(pathHasMovement));
  }, [paths, setHasAnimation]);

  return null;
}

/**
 * A drill preview marker (a gold dot). A finger drags it, as it drags a cone;
 * see `previewPointerIntent`. The move stays in `previewPositions`.
 */
function GhostIndicator({ player }: { player: Player }) {
  const boundary = useActiveBoundary();
  const { isDragging, start, end } = useMarkerDrag();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    const intent = previewPointerIntent({
      pointerType: e.pointerType,
      armedTip: usePenStore.getState().armedTip,
      button: e.button,
      coneSetupActive: useConeStore.getState().isConePlacementActive,
    });
    // 'none' leaves the event to whatever lies beneath: the cone setup plane,
    // or a pen Stroke.
    if (intent === 'none') return;
    e.stopPropagation();
    start(() => beginPreviewDrag(player.id, boundary));
  };

  return (
    <mesh
      position={[player.position[0], 0.15, player.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        e.stopPropagation();
        end();
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (isDragging) e.stopPropagation();
      }}
    >
      <circleGeometry args={[1.2, 24]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.45} />
    </mesh>
  );
}

export function PlayerManager({ readOnly = false }: PlayerManagerProps) {
  const players = usePlayerStore((state) => state.players);
  const previewPositions = usePlayerStore((state) => state.previewPositions);

  return (
    <group>
      {!readOnly && <AnimationDriver />}
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
      {previewPositions?.map((player) => (
        <GhostIndicator key={`ghost-${player.id}`} player={player} />
      ))}
    </group>
  );
}
