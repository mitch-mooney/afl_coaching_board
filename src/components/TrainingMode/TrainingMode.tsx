import React from 'react';
import { TrainingSessionEditor } from './TrainingSessionEditor';
import { RotationPreviewBanner } from './RotationPreviewBanner';
import { useConeStore } from '../../store/coneStore';
import { useUIStore } from '../../store/uiStore';
import { useTimerStore } from '../../store/timerStore';
import { usePenStore } from '../../store/penStore';

export const TrainingMode: React.FC = () => {
  const { cones, isConePlacementActive, setConePlacementActive } = useConeStore();
  const setEditorTab = useUIStore((s) => s.setEditorTab);
  const { isRunning, remainingSeconds, currentTimer, formatTime } = useTimerStore();

  const handleSetUpCones = () => {
    // A tap on grass cannot both set a cone and place a player.
    usePenStore.getState().disarmPlacement();
    setConePlacementActive(true);
    setEditorTab('board');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0d0d1a',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#00d4aa',
            textTransform: 'uppercase',
          }}
        >
          Training Mode
        </span>

        {isRunning && currentTimer === 'session' && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              fontFamily: 'monospace',
              color: '#FFD700',
              fontWeight: 700,
            }}
          >
            Session: {formatTime(remainingSeconds)}
          </span>
        )}

        <button
          onClick={handleSetUpCones}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            borderRadius: 6,
            border: isConePlacementActive
              ? '1px solid #FF6B00'
              : '1px solid rgba(255,255,255,0.2)',
            background: isConePlacementActive
              ? 'rgba(255,107,0,0.2)'
              : 'rgba(255,255,255,0.07)',
            color: isConePlacementActive ? '#FF6B00' : 'rgba(255,255,255,0.7)',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🔶 Set up cones{cones.length > 0 ? ` (${cones.length})` : ''}
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TrainingSessionEditor />
      </div>

      {/* Preview banner */}
      <RotationPreviewBanner />
    </div>
  );
};
