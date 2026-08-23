import { useEffect, useRef, useState } from 'react';
import { useAnnotationStore } from '../../../store/annotationStore';
import { editBoard } from '../../../utils/boardEdit';
import { fanPill, glass } from './podStyles';

/**
 * The transient field that turns a placed Text Annotation into a real one.
 *
 * The Text tip is the one tip whose Stroke is not enough on its own: tapping
 * only records *where* the Annotation goes, and the words still have to be
 * typed. `useStrokeAuthoring` records that placement as `pendingTextPoint`, and
 * this field is what resolves it — Enter or Add commits the Annotation, Escape
 * or ✕ discards it. Nothing else clears a pending point, so if this component
 * is not rendered the Text tip fails *silently*: the coach taps, nothing
 * appears, and no error is raised.
 *
 * It used to live inside `AnnotatePalette`, which meant the field only existed
 * while that palette happened to be open — and it was pinned to the palette's
 * corner, so the coach typed at the bottom-left while looking at a tap point
 * somewhere else entirely. Retiring the palette moved it here, beside the Tool
 * rail's own components, and `BoardHud` renders it once for both HUD skins.
 *
 * It is deliberately NOT on the Tool rail. A Tool rail button arms an
 * instrument; this is the tail end of a single authoring gesture, alive only
 * between the tap and the Annotation, and it has to sit near the tap rather
 * than at a fixed edge.
 *
 * Positioned with `position: fixed` from the client coordinates of the tap: the
 * board's HUD layer is a positioned ancestor, so absolute coordinates would
 * need converting, and the viewport is what the tap was measured against.
 */

/** Matches the palette's old field width; wide enough for a short phrase. */
const FIELD_WIDTH = 244;
/** Clear of the pen tip itself, so the field is not under the coach's hand. */
const TAP_OFFSET = 16;
/** Never flush against a screen edge. */
const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function TextAnnotationInput() {
  const pendingTextPoint = useAnnotationStore((state) => state.pendingTextPoint);
  const pendingTextAnchor = useAnnotationStore((state) => state.pendingTextAnchor);
  const selectedColour = useAnnotationStore((state) => state.selectedColor);
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const setPendingTextPoint = useAnnotationStore((state) => state.setPendingTextPoint);

  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus follows the placement, not the mount: tapping a second point while
  // the field is already open moves it and re-focuses it.
  useEffect(() => {
    if (!pendingTextPoint) return;
    setText('');
    const focus = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focus);
  }, [pendingTextPoint]);

  if (!pendingTextPoint) return null;

  const commit = () => {
    if (!text.trim()) return;
    // Recorded here rather than in the store — below the empty-text guard, so
    // it still lands only on the commits that produce an Annotation.
    editBoard('Add annotation', () => {
      addAnnotation({
        type: 'text',
        points: [pendingTextPoint],
        color: selectedColour,
        text: text.trim(),
      });
    });
    setPendingTextPoint(null);
    setText('');
  };

  const discard = () => {
    setPendingTextPoint(null);
    setText('');
  };

  // Read at render rather than tracked: the field lives for a few seconds, and
  // a resize mid-typing is not worth a listener.
  const maxLeft = window.innerWidth - FIELD_WIDTH - VIEWPORT_MARGIN;
  const position = pendingTextAnchor
    ? {
        left: clamp(pendingTextAnchor.x + TAP_OFFSET, VIEWPORT_MARGIN, maxLeft),
        top: clamp(pendingTextAnchor.y + TAP_OFFSET, VIEWPORT_MARGIN, window.innerHeight - 64),
      }
    : // No anchor — the placement did not come from a tap. Centre it rather
      // than guessing.
      { left: clamp((window.innerWidth - FIELD_WIDTH) / 2, VIEWPORT_MARGIN, maxLeft), top: '40%' };

  return (
    <div
      role="dialog"
      aria-label="Text annotation"
      style={{
        ...glass,
        position: 'fixed',
        ...position,
        width: FIELD_WIDTH,
        borderRadius: 14,
        padding: 8,
        display: 'flex',
        gap: 6,
        // Above the Tool rail and the HUD pods, because it is the live end of a
        // gesture the coach is in the middle of.
        zIndex: 60,
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') discard();
        }}
        placeholder="Annotation text…"
        aria-label="Annotation text"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid #ffffff33',
          background: '#ffffff11',
          color: '#fff',
          fontSize: 12,
        }}
      />
      <button
        type="button"
        onClick={commit}
        disabled={!text.trim()}
        style={{ ...fanPill, padding: '6px 10px', opacity: text.trim() ? 1 : 0.4 }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={discard}
        aria-label="Discard annotation text"
        style={{ ...fanPill, padding: '6px 10px' }}
      >
        ✕
      </button>
    </div>
  );
}
