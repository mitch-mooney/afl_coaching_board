import { usePlayerStore } from '../../store/playerStore';
import { PlayerComponent } from './Player';

export function PlayerManager() {
  const players = usePlayerStore((state) => state.players);
  
  return (
    <group>
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
    </group>
  );
}
