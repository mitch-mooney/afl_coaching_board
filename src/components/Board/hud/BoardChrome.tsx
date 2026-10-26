import { useCallback, useState, type ReactNode } from 'react';
import { CHROME_BOTTOM, SIDE_COLUMN_TOP, TOOL_RAIL_CLEARANCE, VIEW_COLUMN_CLEARANCE } from './podStyles';
import { useSetupControls } from './useSetupControls';
import { PlaybackBar } from './PlaybackBar';
import { SetupSheet } from './SetupSheet';
import { TextAnnotationInput } from './TextAnnotationInput';
import { ToolRail } from './ToolRail';
import { ViewColumn } from './ViewColumn';

/**
 * The Board chrome: the board's one set of controls, the same on every device
 * (`docs/adr/0007-one-board-chrome.md`). Each edge has one job:
 *
 * - the **Tool rail** on the left changes the board;
 * - the **View column** on the right changes how you see it;
 * - the **Playback bar** along the bottom changes the moment, and opens the
 *   **Setup sheet** above itself.
 *
 * The two side columns share one row, so the View column's top is the Tool
 * rail's top. The bottom of the board is one column, held between the two
 * side clearances and stacked from the foot up: the Playback bar, the Setup
 * sheet when open, then the `accessory` (the board's Link Video Moment
 * button). Stacking them in one flow is what keeps them apart: none is
 * positioned against another's height, so none can drift over another
 * (refs #58).
 */
export function BoardChrome({ accessory }: { accessory?: ReactNode }) {
  const [setupOpen, setSetupOpen] = useState(false);
  // Held here rather than in the sheet, so the Teams and Roster modals outlive
  // the sheet closing beneath them.
  const setup = useSetupControls();
  const closeSetup = useCallback(() => setSetupOpen(false), []);

  return (
    <>
      {/* The side row: the Tool rail and the View column, each at the head of
          its slot, in one row centred in the height between the side-column
          top and the foot. The row is as tall as the taller column, so both
          tops are one line whatever their heights, with or without the
          linked-video bar. Stretched slots give each pill a definite height
          to scroll within on a short viewport. Lets pointer events through:
          only the pills take taps. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: SIDE_COLUMN_TOP,
          bottom: CHROME_BOTTOM,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            minHeight: 0,
            pointerEvents: 'none',
          }}
        >
          <ToolRail />
          <ViewColumn />
        </div>
      </div>
      {/* Lets pointer events through: an invisible box over the lower board
          would swallow camera drags. Only its children take taps. */}
      <div
        style={{
          position: 'absolute',
          left: TOOL_RAIL_CLEARANCE,
          right: VIEW_COLUMN_CLEARANCE,
          top: SIDE_COLUMN_TOP,
          bottom: CHROME_BOTTOM,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          gap: 8,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {accessory && (
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, minWidth: 0 }}>{accessory}</div>
        )}
        {setupOpen && <SetupSheet actions={setup.actions} onClose={closeSetup} />}
        <PlaybackBar setupOpen={setupOpen} onToggleSetup={() => setSetupOpen((open) => !open)} />
      </div>
      {setup.modals}
      {/* Renders nothing until the Text tip places an Annotation. */}
      <TextAnnotationInput />
    </>
  );
}
