import { usePlayerStore } from '../../store/playerStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { PlayerComponent } from './Player';

interface PlayerManagerProps {
  readOnly?: boolean;
}

function AnimationDriver() {
  useAnimationPlayback();
  return null;
}

export function PlayerManager({ readOnly = false }: PlayerManagerProps) {
  const players = usePlayerStore((state) => state.players);

  return (
    <group>
      {!readOnly && <AnimationDriver />}
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
    </group>
  );
}
