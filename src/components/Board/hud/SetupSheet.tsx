import { useEffect } from 'react';
import { radii } from '../../../theme/tokens';
import { glass, sheetPill } from './podStyles';
import { renderAction, type HudAction } from './hudActions';

/**
 * The Setup sheet: rises from the Playback bar and holds the Setup action list
 * (formations, Teams / jerseys, Labels, Reset players, the three clears, Give /
 * Release ball, Import roster). Undo is not in it; it lives at the foot of the
 * Tool rail.
 *
 * It closes on a tap on the board, so it never stays over the space the coach
 * is working on, and on Escape. A tap anywhere else (the Tool rail, the View
 * column, a Setup modal) leaves it open. The modals themselves are rendered by
 * `BoardChrome`, outside the sheet, so closing the sheet never closes them.
 *
 * The rise is a CSS animation that only runs when the coach has not asked for
 * reduced motion (`index.css`, `.setup-sheet`); otherwise it simply appears.
 */
export function SetupSheet({ actions, onClose }: { actions: HudAction[]; onClose: () => void }) {
  useEffect(() => {
    const closeOnBoardTap = (event: PointerEvent) => {
      // The board is the canvas. Capture, and pointerdown rather than click, so
      // the sheet is gone the moment the pen or finger lands on the grass.
      if (event.target instanceof HTMLCanvasElement) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', closeOnBoardTap, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnBoardTap, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      id="setup-sheet"
      className="setup-sheet"
      role="region"
      aria-label="Setup sheet"
      style={{
        ...glass,
        borderRadius: radii.panel,
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 6,
        minHeight: 0,
        overflowY: 'auto',
        pointerEvents: 'auto',
      }}
    >
      {actions.filter((a) => !a.hidden).map((a) => renderAction(a, sheetPill))}
    </div>
  );
}
