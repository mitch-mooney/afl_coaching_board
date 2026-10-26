import type { CSSProperties } from 'react';
import { palette, radii, typeStyle, withAlpha } from '../../../theme/tokens';
import { CHALK_DIM, glass, LIT, MIN_TARGET } from './podStyles';
import { useTransportControls } from './useTransportControls';

/**
 * The Playback bar: the bottom edge, which changes the moment.
 *
 * Two rows. The scrubber takes the bar's width on its own row, beside a readout
 * of where it is, because a long scrubber is how a moment is placed precisely;
 * the buttons sit beneath it, nearest the thumb. The same two rows on every
 * device keep the bar's height independent of its width.
 *
 * A Play with no animation says so in words, and its transport is disabled
 * rather than hidden, so the coach knows why Play does nothing. Setup is not
 * transport and works either way.
 */

const BUTTON: CSSProperties = {
  minWidth: MIN_TARGET,
  height: MIN_TARGET,
  flexShrink: 0,
  borderRadius: radii.control,
  border: `1px solid ${palette.steel}`,
  background: palette.steel,
  color: palette.chalk,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 8px',
  touchAction: 'manipulation',
};

export function PlaybackBar({ setupOpen, onToggleSetup }: { setupOpen: boolean; onToggleSetup: () => void }) {
  const { isPlaying, hasAnimation, progress, speed, togglePlayback, cycleSpeed, scrub, stop } = useTransportControls();
  const transport: CSSProperties = hasAnimation ? {} : { opacity: 0.4, cursor: 'default' };

  return (
    <div
      aria-label="Playback bar"
      role="region"
      style={{
        ...glass,
        borderRadius: radii.panel,
        padding: '4px 6px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        pointerEvents: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => scrub(Number(e.target.value) / 1000)}
          disabled={!hasAnimation}
          aria-label="Scrub animation"
          style={{ flex: '1 1 auto', minWidth: 0, height: MIN_TARGET, margin: 0, accentColor: palette.floodlight, ...transport }}
        />
        <span
          style={{
            ...(hasAnimation ? typeStyle('number') : typeStyle('caption')),
            color: hasAnimation ? withAlpha(palette.chalk, 0.7) : CHALK_DIM,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            paddingRight: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {hasAnimation ? `${Math.round(progress * 100)}%` : 'No animation'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={togglePlayback}
          disabled={!hasAnimation}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          // Lit only while playing: Floodlight marks state, never emphasis.
          style={{ ...BUTTON, fontSize: 16, ...(isPlaying ? { ...LIT, borderColor: palette.floodlight } : {}), ...transport }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={stop} disabled={!hasAnimation} aria-label="Stop" style={{ ...BUTTON, fontSize: 14, ...transport }}>
          ■
        </button>
        <span style={{ flex: '1 1 auto' }} />
        <button onClick={cycleSpeed} disabled={!hasAnimation} aria-label="Playback speed" style={{ ...BUTTON, ...typeStyle('number'), fontSize: 14, ...transport }}>
          {speed}×
        </button>
        <button
          onClick={onToggleSetup}
          aria-label="Setup"
          aria-expanded={setupOpen}
          aria-controls="setup-sheet"
          style={{ ...BUTTON, ...typeStyle('label'), ...(setupOpen ? { ...LIT, borderColor: palette.floodlight } : {}) }}
        >
          Setup
        </button>
      </div>
    </div>
  );
}
