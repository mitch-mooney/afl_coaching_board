import { formatVideoTime } from '../../utils/videoUtils';
import type { LinkedVideoMoment } from '../../models/PlayModel';

interface LinkedVideoBarProps {
  moment: LinkedVideoMoment;
  available: boolean;
  onPreview: () => void;
  onUnlink: () => void;
}

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
        background: 'rgba(13,13,26,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {available ? (
        <>
          <span style={{ color: '#00d4aa', fontSize: 10, marginRight: 2 }}>●</span>
          <span style={{ color: '#00d4aa', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
            VIDEO LINKED
          </span>
          {moment.quarter && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 4 }}>
              {moment.quarter} · {formatVideoTime(moment.startTime)} — {formatVideoTime(moment.endTime)}
            </span>
          )}
          {!moment.quarter && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 4 }}>
              {formatVideoTime(moment.startTime)} — {formatVideoTime(moment.endTime)}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={onPreview}
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,212,170,0.5)',
                background: 'rgba(0,212,170,0.12)',
                color: '#00d4aa',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ▶ Preview
            </button>
            <button
              onClick={onUnlink}
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </>
      ) : (
        <>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginRight: 2 }}>⚪</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
            VIDEO NOT LOADED
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={onPreview}
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,153,255,0.5)',
                background: 'rgba(0,153,255,0.12)',
                color: '#0099ff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Load video →
            </button>
            <button
              onClick={onUnlink}
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Unlink
            </button>
          </div>
        </>
      )}
    </div>
  );
}
