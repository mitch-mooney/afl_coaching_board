import type { CSSProperties } from 'react';
import { formatVideoTime } from '../../utils/videoUtils';
import type { LinkedVideoMoment } from '../../models/PlayModel';
import { palette, typeStyle, withAlpha } from '../../theme/tokens';

interface LinkedVideoBarProps {
  moment: LinkedVideoMoment;
  available: boolean;
  onPreview: () => void;
  onUnlink: () => void;
}

const QUIET = withAlpha(palette.chalk, 0.6);

const BUTTON: CSSProperties = {
  padding: '2px 10px',
  borderRadius: 6,
  border: `1px solid ${palette.steel}`,
  background: withAlpha(palette.chalk, 0.06),
  color: QUIET,
  fontSize: 12,
  cursor: 'pointer',
};

/**
 * Floodlight marks the one thing here that is a state, a video that is linked
 * and ready, and its Preview. Everything else is Chalk on Concrete.
 */
const LIT_BUTTON: CSSProperties = {
  ...BUTTON,
  border: `1px solid ${withAlpha(palette.floodlight, 0.5)}`,
  background: withAlpha(palette.floodlight, 0.12),
  color: palette.floodlight,
};

export function LinkedVideoBar({ moment, available, onPreview, onUnlink }: LinkedVideoBarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        left: 0,
        right: 0,
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 16px',
        background: withAlpha(palette.concrete, 0.88),
        borderBottom: `1px solid ${palette.steel}`,
      }}
    >
      {available ? (
        <>
          <span style={{ color: palette.floodlight, fontSize: 10, marginRight: 2 }}>●</span>
          <span style={{ ...typeStyle('label'), color: palette.floodlight }}>
            Video linked
          </span>
          {moment.quarter && (
            <span style={{ color: QUIET, fontSize: 12, marginLeft: 4 }}>
              {moment.quarter} · {formatVideoTime(moment.startTime)} — {formatVideoTime(moment.endTime)}
            </span>
          )}
          {!moment.quarter && (
            <span style={{ color: QUIET, fontSize: 12, marginLeft: 4 }}>
              {formatVideoTime(moment.startTime)} — {formatVideoTime(moment.endTime)}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onPreview} style={LIT_BUTTON}>
              ▶ Preview
            </button>
            <button onClick={onUnlink} style={{ ...BUTTON, padding: '2px 8px' }}>
              ✕
            </button>
          </div>
        </>
      ) : (
        <>
          <span style={{ color: withAlpha(palette.chalk, 0.4), fontSize: 10, marginRight: 2 }}>⚪</span>
          <span style={{ ...typeStyle('label'), color: QUIET }}>
            Video not loaded
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onPreview} style={{ ...BUTTON, color: palette.chalk }}>
              Load video →
            </button>
            <button onClick={onUnlink} style={{ ...BUTTON, padding: '2px 8px' }}>
              Unlink
            </button>
          </div>
        </>
      )}
    </div>
  );
}
