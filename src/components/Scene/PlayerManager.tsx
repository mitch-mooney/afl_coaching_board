import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useBallStore } from '../../store/ballStore';
import { PlayerComponent } from './Player';
import { BallComponent } from './Ball';

export function PlayerManager() {
  const players = usePlayerStore((state) => state.players);
  const ball = useBallStore((state) => state.ball);
  const initializeBall = useBallStore((state) => state.initializeBall);
  const hasBall = useBallStore((state) => state.hasBall);

  // Initialize ball on mount if not already present
  useEffect(() => {
    if (!hasBall()) {
      initializeBall();
    }
  }, [initializeBall, hasBall]);

  return (
    <group>
      {players.map((player) => (
        <PlayerComponent key={player.id} player={player} />
      ))}
      {ball && <BallComponent ball={ball} />}
    </group>
  );
}
