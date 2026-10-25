import { useTransportControls } from '../useTransportControls';
import { palette, radii, typeStyle, withAlpha } from '../../../../theme/tokens';
import { LIT } from '../podStyles';

export function TransportBar() {
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub, stop } = useTransportControls();
  const dim = { opacity: hasAnimation ? 1 : 0.4, pointerEvents: hasAnimation ? 'auto' : 'none' } as const;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, ...dim }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={togglePlayback} disabled={!hasAnimation} aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ width:46, height:46, borderRadius:radii.pill, border:'none', ...LIT, fontSize:18, cursor:'pointer' }}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={stop} aria-label="Stop" style={{ width:38, height:38, borderRadius:radii.chip, border:`1px solid ${palette.steel}`, background:palette.steel, color:palette.chalk, cursor:'pointer' }}>■</button>
        <span style={{ ...typeStyle('number'), color:withAlpha(palette.chalk, 0.7), fontVariantNumeric:'tabular-nums', marginLeft:'auto' }}>{Math.round(progress * 100)}%</span>
      </div>
      <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrub(Number(e.target.value) / 1000)}
        aria-label="Scrub animation" style={{ width:'100%', accentColor:palette.floodlight }} />
      <button onClick={cycleSpeed} aria-label="Playback speed"
        style={{ alignSelf:'flex-start', padding:'4px 12px', borderRadius:radii.pill, border:`1px solid ${palette.steel}`, background:withAlpha(palette.concrete, 0.94), color:palette.chalk, ...typeStyle('label'), cursor:'pointer' }}>
        Speed {speed}×
      </button>
    </div>
  );
}
