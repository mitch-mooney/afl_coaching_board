import type { Play } from '../models/PlayModel';
import { fromPhase } from './boardSnapshot';
import { outOfBounds, type Boundary } from './fieldGeometry';

// playFit — does a stored Play fit a ground?
//
// The board answers this for the Play the coach has open, through useOutOfBounds.
// This is the same question asked of a Play sitting on disk, so the coach can set
// the Active Venue to Saturday's ground and triage a whole playbook from the list
// instead of opening plays one at a time.
//
// Pure and store-free, like the fieldGeometry pair it delegates to: the Play and
// the ground are both passed in. There is one definition of "doesn't fit" —
// outOfBounds — and both the on-board count and the list marker call it, so the
// list can never disagree with the board it opens.

/**
 * Does every phase of this Play fit inside the given ground?
 *
 * Every phase, not just the one the thumbnail draws: a play whose second phase
 * pushes the forward line off a tight ground fails at training exactly like one
 * whose first does, and an unmarked row is read as "this one's fine".
 *
 * Annotations are excluded, and MovementPath keyframes are included, because
 * `outOfBounds` is where that rule lives — see its comment for why an arrow
 * pointing off-ground is not a mistake to report.
 */
export function playFitsBoundary(play: Play, boundary: Boundary): boolean {
  return play.phases.every((phase) => outOfBounds(fromPhase(phase), boundary).count === 0);
}
