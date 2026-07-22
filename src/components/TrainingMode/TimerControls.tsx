import React from 'react';
import { useTimerStore } from '../../store/timerStore';

interface TimerControlsProps {
  timerType: 'drill' | 'rest' | 'session';
}

export const TimerControls: React.FC<TimerControlsProps> = ({ timerType }) => {
  const {
    currentTimer,
    isRunning,
    isActive,
    remainingSeconds,
    elapsedSeconds,
    timers,
    pauseTimer,
    resumeTimer,
    setTimerDuration,
    setTimerLabel,
    switchTimer,
    resetTimer,
    formatTime,
  } = useTimerStore();

  const isCurrent = currentTimer === timerType;
  const timer = timers[timerType];

  if (!timer) return null;

  const handleStart = () => {
    if (isCurrent) {
      isRunning ? pauseTimer() : resumeTimer();
    } else {
      switchTimer(timerType);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10) || 0;
    setTimerDuration(timerType, minutes * 60);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimerLabel(timerType, e.target.value);
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: isCurrent ? '#e3f2fd' : '#f5f5f5',
        border: isCurrent ? '2px solid #2196f3' : '1px solid #ddd',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <input
            type="text"
            value={timer.label}
            onChange={handleLabelChange}
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              width: '150px',
            }}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Duration: {Math.floor(timer.duration / 60)} min
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isActive && isCurrent && (
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                minWidth: '100px',
                textAlign: 'center',
              }}
            >
              {formatTime(remainingSeconds)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              min="1"
              max="180"
              value={Math.floor(timer.duration / 60)}
              onChange={handleDurationChange}
              style={{
                width: '60px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            />
            <span style={{ padding: '8px' }}>min</span>
          </div>

          {isCurrent ? (
            <button
              onClick={handleStart}
              style={{
                padding: '8px 16px',
                backgroundColor: isRunning ? '#ff9800' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
          ) : (
            <button
              onClick={() => switchTimer(timerType)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Select
            </button>
          )}

          {isCurrent && (
            <button
              onClick={resetTimer}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {isCurrent && elapsedSeconds > 0 && (
        <div
          style={{
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            marginTop: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#2196f3',
              width: `${Math.min((elapsedSeconds / timer.duration) * 100, 100)}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
};
