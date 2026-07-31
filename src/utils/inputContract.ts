/**
 * The input contract: **the pen authors, the finger manipulates.**
 *
 * This is the board's only modal axis, and it lives in the user's hand rather
 * than in app state — see `docs/adr/0001-pen-authors-finger-manipulates.md`.
 */

// Type-only import, erased at compile time: the contract carries no runtime
// dependency on the annotation store.
import type { AnnotationType } from '../store/annotationStore';

/**
 * The armed authoring instrument. The contract cares only *whether* a tip is
 * armed, never which one — what a Stroke becomes is the tip's business.
 */
export type PenTip = AnnotationType | 'path';

export interface PointerContext {
  /** `PointerEvent.pointerType`. */
  pointerType: string;
  armedTip: PenTip | null;
  /** `PointerEvent.button`. Absent is treated as the primary button. */
  button?: number;
}

/**
 * Playback, as much of it as the contract needs to know.
 *
 * `isPlaying` only — paused counts as not playing. Playback drives entity
 * positions solely while playing (`hooks/usePathPlayback.ts`); paused, the
 * tokens stay put and the coach may already drag them, so nothing about a paused
 * animation makes authoring a MovementPath wrong.
 */
export interface PlaybackContext {
  isPlaying: boolean;
}

/**
 * Whether a Pen tip may author, given playback.
 *
 * Annotations are inert markup — drawing a circle over a moving player is a
 * legitimate coaching gesture and playback makes it no less so. The Path tip is
 * different in kind: it writes to the very state playback is reading, and it
 * claims its entity by proximity, so a Path Stroke authored mid-animation would
 * attach to whatever happened to be near the Stroke's start at that instant.
 * That is a write during a read of the same state. So the Path tip alone goes
 * unavailable while an animation plays; every other tip is unaffected.
 *
 * The armed tip is deliberately *not* cleared when playback starts — the coach
 * previews mid-authoring constantly, and losing the tip on every preview would
 * grate. An armed Path tip simply cannot author until playback ends.
 *
 * One predicate, two consumers: the Tool rail's disabled state and the
 * stroke-authoring guard both ask this. That is the point of it being a single
 * predicate — a button that looks disabled and a Stroke that is refused cannot
 * drift apart into disagreeing.
 */
export function tipAvailable(tip: PenTip, { isPlaying }: PlaybackContext): boolean {
  return tip !== 'path' || !isPlaying;
}

export type AuthoringIntent = 'author' | 'manipulate';

export function authoringIntent({
  pointerType,
  armedTip,
  button = 0,
}: PointerContext): AuthoringIntent {
  // A finger never authors, armed tip or not.
  if (pointerType === 'touch') return 'manipulate';

  // A pen with no tip armed is a pointer, not an instrument.
  if (armedTip === null) return 'manipulate';

  // Only the primary button authors — right-drag stays the rotate gesture.
  if (button !== 0) return 'manipulate';

  return 'author';
}
