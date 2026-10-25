import type { CSSProperties, ReactNode } from 'react';
import { palette, radii, typeStyle, withAlpha } from '../../../theme/tokens';
import { CHALK_DIM, CHROME_BOTTOM, glass, HAIRLINE, LIT, MIN_TARGET, SIDE_COLUMN_TOP } from './podStyles';
import { useCameraControls } from './useCameraControls';
import type { HudAction } from './hudActions';

/**
 * The View column: the right-edge column that changes how you see the board.
 *
 * Nothing in it edits the board, and that is why it may sit in the right-hand
 * palm zone (ADR 0007, answering ADR 0003). A stray tap moves the camera, which
 * shows at once and is undone with one more tap; it never re-arms a tip or
 * changes content silently.
 *
 * It mirrors the Tool rail: the same top line under the linked-video bar
 * (`SIDE_COLUMN_TOP`), the same foot, centred in the height between, and it
 * scrolls rather than shrinks its buttons on a short viewport. Other surfaces
 * keep out of it through `VIEW_COLUMN_CLEARANCE`.
 *
 * The Lens group is empty and labelled on purpose: Spec 2 fills it, and
 * reserving its place now means the Lens switches arrive without moving the
 * camera views.
 */

const VIEW_BUTTON: CSSProperties = {
  width: 56,
  minHeight: MIN_TARGET,
  flexShrink: 0,
  borderRadius: radii.control,
  border: 'none',
  padding: '4px 2px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  ...typeStyle('caption'),
  touchAction: 'manipulation',
};

const GROUP_LABEL: CSSProperties = {
  ...typeStyle('caption'),
  color: withAlpha(palette.chalk, 0.55),
  textAlign: 'center',
  margin: '2px 0 0',
};

/** What each view button shows. Its accessible name is the action's full label. */
const FACE: Record<string, ReactNode> = {
  broadcast: 'Broadcast',
  top: 'Top',
  sideline: 'Sideline',
  'end-to-end': 'End to end',
  'reset-camera': 'Reset',
  'assign-pov1': 'Assign 1',
  'assign-pov2': 'Assign 2',
};

function face(action: HudAction): ReactNode {
  if (FACE[action.key]) return FACE[action.key];
  // "POV 1: #7" shows as the slot over the player it looks through.
  const [slot, who] = String(action.label).split(': ');
  return (
    <>
      <span>{slot}</span>
      <span style={{ ...typeStyle('number'), fontSize: 13 }}>{who}</span>
    </>
  );
}

function ViewButton({ action }: { action: HudAction }) {
  return (
    <button
      onClick={action.onClick}
      aria-label={String(action.label)}
      aria-pressed={action.active ? true : undefined}
      style={{ ...VIEW_BUTTON, ...(action.active ? LIT : { background: 'transparent', color: CHALK_DIM }) }}
    >
      {face(action)}
    </button>
  );
}

const CAMERA_KEYS = ['broadcast', 'top', 'sideline', 'end-to-end', 'reset-camera'];

export function ViewColumn() {
  const { actions, modals } = useCameraControls();
  const camera = actions.filter((a) => CAMERA_KEYS.includes(a.key));
  const pov = actions.filter((a) => !CAMERA_KEYS.includes(a.key));

  return (
    <>
      {/* The positioned box spans the usable height so the column can centre
          in it, and lets pointer events through, like the Tool rail's: an
          invisible strip down the right edge would swallow camera drags. */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: SIDE_COLUMN_TOP,
          bottom: CHROME_BOTTOM,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 8,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div
          aria-label="View column"
          role="toolbar"
          aria-orientation="vertical"
          style={{
            ...glass,
            borderRadius: radii.panel,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minHeight: 0,
            maxHeight: '100%',
            overflowY: 'auto',
            pointerEvents: 'auto',
          }}
        >
          <div role="group" aria-label="Camera" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {camera.map((a) => <ViewButton key={a.key} action={a} />)}
          </div>
          <div aria-hidden style={{ height: 1, flexShrink: 0, margin: '2px 4px', background: palette.steel }} />
          <div role="group" aria-label="POV" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pov.map((a) => <ViewButton key={a.key} action={a} />)}
          </div>
          <div aria-hidden style={{ height: 1, flexShrink: 0, margin: '2px 4px', background: palette.steel }} />
          {/* Reserved for Spec 2's Lens switches. */}
          <div
            role="group"
            aria-label="Lens"
            style={{ flexShrink: 0, border: HAIRLINE, borderStyle: 'dashed', borderRadius: radii.chip, padding: '4px 0 6px' }}
          >
            <p style={GROUP_LABEL}>Lens</p>
          </div>
        </div>
      </div>
      {modals}
    </>
  );
}
