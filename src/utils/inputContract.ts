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
