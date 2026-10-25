import type { CSSProperties } from 'react';
import { GroundChip } from '../Board/hud/GroundChip';
import { CHALK_DIM, LIT } from '../Board/hud/podStyles';
import { palette, radii, typeStyle, withAlpha } from '../../theme/tokens';
import { HamburgerIcon } from '../UI/HamburgerIcon';

interface EditorTopBarProps {
  editorTab: 'board' | 'video' | 'training';
  mode: 'match' | 'training';
  isConePlacementActive: boolean;
  isMenuOpen: boolean;
  onBack: () => void;
  onSelectTab: (tab: 'board' | 'video' | 'training') => void;
  onExitConePlacement: () => void;
  onToggleMenu: () => void;
}

/**
 * A tab of the switcher. The selected tab is lit in Floodlight whichever tab it
 * is: selected is a state, and the HUD has one state colour. (Training's tab
 * used to light orange, which made one tab's selection a different signal from
 * the others'.)
 */
function tabStyle(selected: boolean): CSSProperties {
  return selected ? LIT : { background: withAlpha(palette.concrete, 0.8), color: CHALK_DIM };
}

export function EditorTopBar({
  editorTab, mode, isConePlacementActive, isMenuOpen,
  onBack, onSelectTab, onExitConePlacement, onToggleMenu,
}: EditorTopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 pt-safe-top pt-3 pb-6 pointer-events-none"
         style={{ background: `linear-gradient(180deg, ${withAlpha(palette.concrete, 0.85)} 0%, transparent 100%)` }}>
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* The global menu lives here rather than floating below the bar, so the
            left edge below is free for the Tool rail. See
            `docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`. */}
        <HamburgerIcon isOpen={isMenuOpen} onClick={onToggleMenu} />
        <button onClick={onBack} className="text-chalk/60 hover:text-chalk text-sm">
          ← Plays
        </button>
        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-steel ml-2">
          <button
            onClick={() => onSelectTab('board')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={tabStyle(editorTab === 'board')}
          >
            Board
          </button>
          <button
            onClick={() => onSelectTab('video')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={tabStyle(editorTab === 'video')}
          >
            Video
          </button>
          <button
            onClick={() => onSelectTab('training')}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={tabStyle(editorTab === 'training')}
          >
            Training
          </button>
        </div>

        {/* The Ground chip, right of the tab switcher. It renders from here
            rather than from either HUD skin so it lands identically in both —
            the same reason the Tool rail does. Board tab only: only the board
            tab renders a board. Both modes, deliberately. */}
        {editorTab === 'board' && <GroundChip />}
      </div>

      {/* Training-mode board controls (cone placement) */}
      {editorTab === 'board' && mode === 'training' && (
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onExitConePlacement}
            style={{
              padding: '6px 12px', borderRadius: radii.chip, border: `1px solid ${palette.steel}`,
              background: palette.steel, color: palette.chalk,
              ...typeStyle('label'), cursor: 'pointer',
            }}
          >
            ← Training
          </button>
          {isConePlacementActive && (
            <span style={{ ...typeStyle('label'), color: palette.floodlight }}>
              🔶 Tap field to place cone
            </span>
          )}
        </div>
      )}
    </div>
  );
}
