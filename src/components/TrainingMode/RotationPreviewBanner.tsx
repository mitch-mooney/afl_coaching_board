import React from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useUIStore } from '../../store/uiStore';

export const RotationPreviewBanner: React.FC = () => {
  const previewPositions = usePlayerStore((s) => s.previewPositions);
  const clearPreviewPositions = usePlayerStore((s) => s.clearPreviewPositions);
  const setEditorTab = useUIStore((s) => s.setEditorTab);

  if (previewPositions === null) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        backgroundColor: 'rgba(255,215,0,0.12)',
        borderTop: '1px solid rgba(255,215,0,0.3)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>
        🔶 Rotation preview active
      </span>
      <button
        onClick={() => setEditorTab('board')}
        style={{
          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.5)',
          background: 'rgba(255,215,0,0.15)', color: '#FFD700', fontSize: 12,
          cursor: 'pointer', fontWeight: 600,
        }}
      >
        Switch to Board
      </button>
      <button
        onClick={clearPreviewPositions}
        style={{
          marginLeft: 'auto', padding: '4px 10px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
        }}
      >
        ✕ Clear preview
      </button>
    </div>
  );
};
