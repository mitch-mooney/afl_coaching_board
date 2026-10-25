import { useTransportControls } from './useTransportControls';
import { arcPath, polar } from '../../../utils/arcGeometry';
import { palette, radii, shadows, typeStyle, withAlpha } from '../../../theme/tokens';
import { LIT } from './podStyles';

const R = 46, SWEEP = 270, START = 135; // matches the prototype ring

export function PlayFab() {
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub } = useTransportControls();

  const knob = polar(60, 60, R, START + progress * SWEEP);

  return (
    <div
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        width: 120, height: 120, zIndex: 30,
        opacity: hasAnimation ? 1 : 0.4, pointerEvents: hasAnimation ? 'auto' : 'none',
      }}
    >
      <svg width={120} height={120} style={{ position: 'absolute', inset: 0 }}>
        <path d={arcPath(60, 60, R, START, START + SWEEP)} fill="none" stroke={withAlpha(palette.chalk, 0.19)} strokeWidth={6} strokeLinecap="round" />
        <path d={arcPath(60, 60, R, START, START + progress * SWEEP)} fill="none" stroke={palette.floodlight} strokeWidth={6} strokeLinecap="round" />
        <circle cx={knob.x} cy={knob.y} r={8} fill={palette.chalk} stroke={palette.floodlight} strokeWidth={3} />
      </svg>

      <button
        onClick={togglePlayback}
        disabled={!hasAnimation}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{
          position: 'absolute', left: 30, top: 30, width: 60, height: 60, borderRadius: radii.pill, border: 'none',
          ...LIT, fontSize: 26,
          cursor: hasAnimation ? 'pointer' : 'default', boxShadow: shadows.raised,
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      {/* Scrub — a range input mapped to progress; scrub repositions tokens live. */}
      <input
        type="range" min={0} max={1000} value={Math.round(progress * 1000)}
        onChange={(e) => scrub(Number(e.target.value) / 1000)}
        aria-label="Scrub animation"
        style={{ position: 'absolute', left: 6, bottom: -22, width: 108, accentColor: palette.floodlight }}
      />

      <button
        onClick={cycleSpeed}
        aria-label="Playback speed"
        style={{
          position: 'absolute', right: -6, top: 6, padding: '2px 8px', borderRadius: radii.pill,
          border: `1px solid ${palette.steel}`, background: withAlpha(palette.concrete, 0.94), color: palette.chalk,
          ...typeStyle('number'), fontSize: 13, cursor: 'pointer',
        }}
      >
        {speed}×
      </button>
    </div>
  );
}
