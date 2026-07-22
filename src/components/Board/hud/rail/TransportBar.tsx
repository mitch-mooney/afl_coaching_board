import { useAnimationStore } from '../../../../store/animationStore';
import { scrubTo } from '../../../../utils/boardScrub';

const TEAL = '#00d4aa';
export function TransportBar() {
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed } = useAnimationStore();
  const stop = () => { if (isPlaying) togglePlayback(); scrubTo(0); };
  const dim = { opacity: hasAnimation ? 1 : 0.4, pointerEvents: hasAnimation ? 'auto' : 'none' } as const;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, ...dim }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={togglePlayback} disabled={!hasAnimation} aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ width:46, height:46, borderRadius:999, border:'none', background:`linear-gradient(135deg, ${TEAL}, #0099ff)`, color:'#000', fontSize:18, cursor:'pointer' }}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={stop} aria-label="Stop" style={{ width:38, height:38, borderRadius:8, border:'1px solid #ffffff22', background:'rgba(0,0,0,0.4)', color:'#fff', cursor:'pointer' }}>■</button>
        <span style={{ fontSize:12, opacity:0.6, fontVariantNumeric:'tabular-nums', marginLeft:'auto' }}>{Math.round(progress * 100)}%</span>
      </div>
      <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(e) => scrubTo(Number(e.target.value) / 1000)}
        aria-label="Scrub animation" style={{ width:'100%', accentColor:TEAL }} />
      <button onClick={cycleSpeed} aria-label="Playback speed"
        style={{ alignSelf:'flex-start', padding:'4px 12px', borderRadius:999, border:'1px solid #ffffff33', background:'rgba(13,13,26,0.9)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
        Speed {speed}×
      </button>
    </div>
  );
}
