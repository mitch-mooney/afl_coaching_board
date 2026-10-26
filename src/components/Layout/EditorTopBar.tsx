import type { CSSProperties } from 'react';
import { GroundChip } from '../Board/hud/GroundChip';
import { CHALK_DIM, LIT } from '../Board/hud/podStyles';
import { palette, radii, typeStyle, withAlpha } from '../../theme/tokens';
import { HamburgerIcon } from '../UI/HamburgerIcon';
import { usePlayerStore } from '../../store/playerStore';

const CHIP_BUTTON: CSSProperties = {
  padding: '6px 12px', borderRadius: radii.chip, border: `1px solid ${palette.steel}`,
  background: palette.steel, color: palette.chalk,
  ...typeStyle('label'), cursor: 'pointer', whiteSpace: 'nowrap',
};

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
  const hasDrillPreview = usePlayerStore((s) => s.previewPositions !== null);
  const clearPreviewPositions = usePlayerStore((s) => s.clearPreviewPositions);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-start gap-2 px-4 pt-safe-top pt-3 pb-6 pointer-events-none"
         style={{ background: `linear-gradient(180deg, ${withAlpha(palette.concrete, 0.85)} 0%, transparent 100%)` }}>
      {/* This group has the bar's width first and wraps when it runs out, so on
          a phone the Ground chip and Clear drill preview drop to a second row
          beside each other, clear of both rails, instead of running off the
          right edge (ADR 0003: "the phone case wraps"). */}
      <div className="flex flex-wrap items-center gap-2 pointer-events-auto" style={{ flexShrink: 0, maxWidth: '100%' }}>
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

        {/* The Ground chip, right of the tab switcher. The Board chrome leaves
            it in the top bar (ADR 0007). Board tab only: only the board tab
            renders a board. Both modes, deliberately. */}
        {editorTab === 'board' && <GroundChip />}

        {/* The drill preview's dismissal. The drill's gold dots are a preview
            held outside the board (`previewPositions`, never captured into a
            snapshot or saved): a finger drags them, and this clears them. They
            outlive a switch to Match, so the dismissal shows wherever the board
            shows them, beside the Ground chip, the other board-wide control. */}
        {editorTab === 'board' && hasDrillPreview && (
          <button onClick={clearPreviewPositions} style={CHIP_BUTTON}>
            Clear drill preview
          </button>
        )}
      </div>

      {/* Training-mode board controls (cone setup). This group takes whatever
          width the one above leaves. On a phone that is none, so it is clipped
          away; before, it ran off the right edge, which was no more reachable. */}
      {editorTab === 'board' && mode === 'training' && (
        <div className="ml-auto self-center flex items-center gap-2 min-w-0 overflow-hidden pointer-events-auto">
          <button onClick={onExitConePlacement} style={CHIP_BUTTON}>
            ← Training
          </button>
          {isConePlacementActive && (
            <span style={{ ...typeStyle('label'), color: palette.floodlight }}>
              🔶 Tap field to place a cone, tap a cone to remove it
            </span>
          )}
        </div>
      )}
    </div>
  );
}
