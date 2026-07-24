interface EditorTopBarProps {
  editorTab: 'board' | 'video' | 'training';
  mode: 'match' | 'training';
  isConePlacementActive: boolean;
  onBack: () => void;
  onSelectTab: (tab: 'board' | 'video' | 'training') => void;
  onExitConePlacement: () => void;
}

export function EditorTopBar({
  editorTab, mode, isConePlacementActive, onBack, onSelectTab, onExitConePlacement,
}: EditorTopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 pt-safe-top pt-3 pb-6 pointer-events-none"
         style={{ background: 'linear-gradient(180deg, rgba(13,13,26,0.85) 0%, transparent 100%)' }}>
      <div className="flex items-center gap-2 pointer-events-auto">
        <button onClick={onBack} className="text-white/60 hover:text-white text-sm">
          ← Plays
        </button>
        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-white/20 ml-2">
          <button
            onClick={() => onSelectTab('board')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={editorTab === 'board'
              ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
              : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
          >
            Board
          </button>
          <button
            onClick={() => onSelectTab('video')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={editorTab === 'video'
              ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
              : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
          >
            Video
          </button>
          <button
            onClick={() => onSelectTab('training')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={editorTab === 'training'
              ? { background: 'linear-gradient(135deg, #FF6B00, #ffaa00)', color: '#000' }
              : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
          >
            Training
          </button>
        </div>
      </div>

      {/* Training-mode board controls (cone placement) */}
      {editorTab === 'board' && mode === 'training' && (
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onExitConePlacement}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #FF6B00',
              background: 'rgba(255,107,0,0.15)', color: '#FF6B00',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Training
          </button>
          {isConePlacementActive && (
            <span style={{ fontSize: 12, color: '#FF6B00', fontWeight: 600 }}>
              🔶 Tap field to place cone
            </span>
          )}
        </div>
      )}
    </div>
  );
}
