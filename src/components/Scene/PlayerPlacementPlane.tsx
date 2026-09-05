import type { ThreeEvent } from '@react-three/fiber';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { useAnimationStore } from '../../store/animationStore';
import { usePenStore } from '../../store/penStore';
import { usePlayerStore } from '../../store/playerStore';
import { editBoard } from '../../utils/boardEdit';
import { placePlayer, teamAppearance } from '../../utils/boardPlacement';
import { capture, restore } from '../../utils/boardSnapshotIO';
import { placementAvailable } from '../../utils/inputContract';

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
 * Reads the armed team from `penStore.armedPlacement`. Whether Placement may
 * act right now is `placementAvailable` in the input contract, the predicate
 * the Tool rail asks to fade the Placement buttons. The rail cannot be the
 * enforcement, because a Placement armed before playback started stays armed
 * by design, so the plane asks again at the tap.
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
        // Read from the store at the instant of the tap, not by subscription:
        // subscribing would unmount and remount the plane on every play and
        // pause. A refused tap never reaches editBoard, so nothing is recorded.
        if (!placementAvailable({ isPlaying: useAnimationStore.getState().isPlaying })) return;
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
