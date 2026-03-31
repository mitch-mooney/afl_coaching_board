import { usePlayerStore } from '../../store/playerStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { PlayerComponent } from './Player';
import type { Player } from '../../models/PlayerModel';

interface PlayerManagerProps {
  readOnly?: boolean;
}

function AnimationDriver() {
  useAnimationPlayback();
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
