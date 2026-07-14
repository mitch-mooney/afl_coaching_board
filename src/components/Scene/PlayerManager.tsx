import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnimationStore } from '../../store/animationStore';
import { pathHasMovement } from '../../utils/pathAnimation';
import { usePathPlayback } from '../../hooks/usePathPlayback';
import { PlayerComponent } from './Player';

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
