import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnimationStore } from '../../store/animationStore';
import { pathHasMovement } from '../../utils/pathAnimation';
import { usePathPlayback } from '../../hooks/usePathPlayback';
import { PlayerComponent } from './Player';
import type { Player } from '../../models/PlayerModel';

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

function GhostIndicator({ player }: { player: Player }) {
  return (
    <mesh
      position={[player.position[0], 0.15, player.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
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
