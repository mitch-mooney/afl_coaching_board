import { useTransportControls } from './useTransportControls';
import { arcPath, polar } from '../../../utils/arcGeometry';

const TEAL = '#00d4aa';
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
        <path d={arcPath(60, 60, R, START, START + SWEEP)} fill="none" stroke="#ffffff30" strokeWidth={6} strokeLinecap="round" />
        <path d={arcPath(60, 60, R, START, START + progress * SWEEP)} fill="none" stroke={TEAL} strokeWidth={6} strokeLinecap="round" />
        <circle cx={knob.x} cy={knob.y} r={8} fill="#fff" stroke={TEAL} strokeWidth={3} />
      </svg>

      <button
        onClick={togglePlayback}
        disabled={!hasAnimation}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{
          position: 'absolute', left: 30, top: 30, width: 60, height: 60, borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${TEAL}, #0099ff)`, color: '#000', fontSize: 26,
          cursor: hasAnimation ? 'pointer' : 'default', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      {/* Scrub — a range input mapped to progress; scrubTo repositions tokens live. */}
      <input
        type="range" min={0} max={1000} value={Math.round(progress * 1000)}
        onChange={(e) => scrub(Number(e.target.value) / 1000)}
        aria-label="Scrub animation"
        style={{ position: 'absolute', left: 6, bottom: -22, width: 108, accentColor: TEAL }}
      />

      <button
        onClick={cycleSpeed}
        aria-label="Playback speed"
        style={{
          position: 'absolute', right: -6, top: 6, padding: '2px 8px', borderRadius: 999,
          border: '1px solid #ffffff33', background: 'rgba(13,13,26,0.9)', color: '#fff',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {speed}×
      </button>
    </div>
  );
}
