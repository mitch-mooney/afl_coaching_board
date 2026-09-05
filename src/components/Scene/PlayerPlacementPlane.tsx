import type { ThreeEvent } from '@react-three/fiber';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { usePenStore } from '../../store/penStore';
import { usePlayerStore } from '../../store/playerStore';
import { editBoard } from '../../utils/boardEdit';
import { placePlayer, teamAppearance } from '../../utils/boardPlacement';
import { capture, restore } from '../../utils/boardSnapshotIO';

/**
 * The surface a tap on grass lands on while Placement is armed.
 *
 * Built the way `ConeManager`'s placement plane is: a transparent plane over the
 * ground, rendered only while Placement is armed, accepting any pointer type.
 * Placing an object is a pointer job, so a finger, a Pencil and a mouse all
 * place (`docs/adr/0001-pen-authors-finger-manipulates.md`). It sits under the
 * players, and `Player` stops propagation on click, so a tap on a player never
 * reaches here.
 *
 * `onClick` rather than the cone plane's `onPointerDown`, deliberately. R3F only
 * fires click when the pointer moved 2px or less between down and up, which is
 * what makes this a tap: a camera pan that starts on grass must not stand a
 * player at its first touch.
 *
 * Reads the armed team from `penStore.armedPlacement`. Placement's availability
 * during playback is not decided here yet; see the sibling predicate to
 * `tipAvailable` (#86).
 */
export function PlayerPlacementPlane() {
  const armedPlacement = usePenStore((state) => state.armedPlacement);
  const team1PresetId = usePlayerStore((state) => state.team1PresetId);
  const team2PresetId = usePlayerStore((state) => state.team2PresetId);
  // Resolved once in component scope, as every other clamp site does.
  const boundary = useActiveBoundary();

  if (!armedPlacement) return null;

  const teamId = armedPlacement;
  const appearance = teamAppearance(teamId, teamId === 'team1' ? team1PresetId : team2PresetId);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // A refused nineteenth hands back the same snapshot, and editBoard
        // records nothing for a board that did not change.
        editBoard('Place player', () =>
          restore(placePlayer(capture(), teamId, [e.point.x, e.point.z], appearance, boundary)),
        );
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}
