import { beginEdit } from './boardEdit';
import { authoringIntent, type PointerContext } from './inputContract';
import { snapToField, type Boundary } from './fieldGeometry';
import { useConeStore } from '../store/coneStore';

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

/** The open half of a cone drag. */
export interface ConeDragHandle {
  /**
   * Follows the finger to a ground point, `[x, z]`: where the pointer's ray
   * meets the ground, unsnapped. The first point only takes hold of the cone.
   * After it, the cone moves by as far as the finger has travelled, snapped
   * inside the Boundary as a player drag is.
   */
  moveTo: (groundPoint: [number, number]) => void;
  /** Ends the drag and records it if the cone moved. Idempotent. */
  commit: () => void;
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
  let offset: [number, number] | null = null;

  return {
    moveTo: ([x, z]) => {
      if (!cone) return;
      if (offset === null) {
        offset = [cone.position[0] - x, cone.position[2] - z];
        return;
      }
      const [cx, cz] = snapToField(x + offset[0], z + offset[1], boundary);
      useConeStore.getState().moveCone(coneId, [cx, 0, cz]);
    },
    commit: () => edit.commit(),
  };
}
