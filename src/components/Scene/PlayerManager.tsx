import { usePlayerStore } from '../../store/playerStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { PlayerComponent } from './Player';

export function PlayerManager() {
  const players = usePlayerStore((state) => state.players);

  // Initialize animation playback hook - handles requestAnimationFrame loop,
  // global time progression, player position calculations, and batch updates
  useAnimationPlayback();

  return (
    <group>
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
    </group>
  );
}
