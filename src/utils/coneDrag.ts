import { beginEdit } from './boardEdit';
import { authoringIntent, type PointerContext } from './inputContract';
import { snapToField, type Boundary } from './fieldGeometry';
import { useConeStore } from '../store/coneStore';
import { usePlayerStore } from '../store/playerStore';

export interface ConePointerContext extends PointerContext {
  /** Whether cone setup is armed (`coneStore.isConePlacementActive`). */
  coneSetupActive: boolean;
}

/**
 * What a pointer landing on a cone does.
 *
 * - `remove`: cone setup is armed, so a tap takes the cone off. Cone setup is
 *   Placement's counterpart for cones: while it is armed a tap on grass sets a
 *   cone and a tap on a cone removes it, the way an armed Placement places and
 *   takes off players. Like Placement it is a pointer job, so every pointer
 *   type counts, and like Placement it does not drag.
 * - `drag`: the finger manipulates (ADR 0001), so the cone follows it.
 * - `none`: a pen with a tip armed is authoring and draws over the cone, and a
 *   secondary mouse button is not a drag.
 */
export function conePointerIntent({
  coneSetupActive,
  ...pointer
}: ConePointerContext): 'remove' | 'drag' | 'none' {
  if (coneSetupActive) return 'remove';
  if (authoringIntent(pointer) === 'author') return 'none';
  if ((pointer.button ?? 0) !== 0) return 'none';
  return 'drag';
}

/**
 * What a pointer landing on a drill preview marker (a gold dot) does. A finger
 * drags it, as it drags a cone. While cone setup is armed the tap is left to
 * the grass beneath, so a coach can set a cone on the marker.
 */
export function previewPointerIntent({
  coneSetupActive,
  ...pointer
}: ConePointerContext): 'drag' | 'none' {
  if (coneSetupActive) return 'none';
  return conePointerIntent({ coneSetupActive, ...pointer }) === 'drag' ? 'drag' : 'none';
}

/** The open half of a cone or drill preview marker drag. */
export interface ConeDragHandle {
  /**
   * Follows the finger to a ground point, `[x, z]`: where the pointer's ray
   * meets the ground, unsnapped. The first point only takes hold of the marker.
   * After it, the marker moves by as far as the finger has travelled, snapped
   * inside the Boundary as a player drag is.
   */
  moveTo: (groundPoint: [number, number]) => void;
  /** Ends the drag, and for a cone records it if the cone moved. Idempotent. */
  commit: () => void;
}

/**
 * Follow the finger from `origin`, keeping the offset between the two that
 * the first ground point sets, and hand each snapped position to `place`.
 */
function followFinger(
  origin: [number, number, number] | undefined,
  boundary: Boundary,
  place: (position: [number, number, number]) => void,
): ConeDragHandle['moveTo'] {
  let offset: [number, number] | null = null;
  return ([x, z]) => {
    if (!origin) return;
    if (offset === null) {
      offset = [origin[0] - x, origin[2] - z];
      return;
    }
    const [cx, cz] = snapToField(x + offset[0], z + offset[1], boundary);
    place([cx, 0, cz]);
  };
}

/**
 * Begin the Board edit for a cone drag, begun when the finger lands on the
 * cone and committed when it lifts, so the whole drag is one undo step.
 *
 * The cone keeps its offset from the finger. A player drag puts the player
 * where the ray meets the ground, but a finger lands on a cone's body, whose
 * ray meets the ground a little way off, so that rule would make a tap nudge
 * the cone and cost an undo step.
 */
export function beginConeDrag(coneId: string, boundary: Boundary): ConeDragHandle {
  const edit = beginEdit('Move cone');
  const cone = useConeStore.getState().cones.find((c) => c.id === coneId);
  return {
    moveTo: followFinger(cone?.position, boundary, (p) => useConeStore.getState().moveCone(coneId, p)),
    commit: () => edit.commit(),
  };
}

/**
 * Begin a drag of one drill preview marker. It moves the way a cone does, but
 * records no Board edit: the preview lives in `previewPositions`, outside the
 * board, and is never captured into a snapshot, so there is nothing to undo.
 */
export function beginPreviewDrag(playerId: string, boundary: Boundary): ConeDragHandle {
  const marker = usePlayerStore.getState().previewPositions?.find((p) => p.id === playerId);
  return {
    moveTo: followFinger(marker?.position, boundary, (p) =>
      usePlayerStore.getState().movePreviewPosition(playerId, p)),
    commit: () => {},
  };
}
