import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useUIStore } from '../../../store/uiStore';
import { usePathStore } from '../../../store/pathStore';
import { useBallStore } from '../../../store/ballStore';
import { getFormationById } from '../../../data/formations';
import { fanPill, podButton } from './podStyles';
import { AnnotatePalette } from './AnnotatePalette';
import { TeamSelectModal } from './TeamSelectModal';
import { RosterImportModal } from './RosterImportModal';
import { useBoardUndo } from '../../../hooks/useBoardUndo';

const FORMATIONS = [
  { id: 'centre-bounce', label: 'Centre Bounce' },
  { id: 'kick-in-pressing', label: 'Kick-in Press' },
  { id: 'kick-in-kicking', label: 'Kick-in Kick' },
];
const LABELS = { number: '#', name: 'Name', position: 'Pos' } as const;

export function SetupPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const applyFormation = usePlayerStore((s) => s.applyFormation);
  const resetPlayers = usePlayerStore((s) => s.resetPlayers);
  const labelMode = usePlayerStore((s) => s.labelMode);
  const cycleLabelMode = usePlayerStore((s) => s.cycleLabelMode);
  const selectedPlayerId = usePlayerStore((s) => s.selectedPlayerId);
  const players = usePlayerStore((s) => s.players);
  const setActiveFormationId = useUIStore((s) => s.setActiveFormationId);
  const boardSubMode = useUIStore((s) => s.boardSubMode);
  const toggleBoardSubMode = useUIStore((s) => s.toggleBoardSubMode);
  const clearPaths = usePathStore((s) => s.clearPaths);
  const paths = usePathStore((s) => s.paths);
  const ball = useBallStore((s) => s.ball);
  const assignBallToPlayer = useBallStore((s) => s.assignBallToPlayer);
  const { handleUndo, canUndo } = useBoardUndo();

  const [showTeams, setShowTeams] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showAnnotate, setShowAnnotate] = useState(false);

  const applyPreset = (id: string) => {
    const f = getFormationById(id);
    if (!f) return;
    applyFormation(f);
    setActiveFormationId(id);
  };

  const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) : null;
  const assignedPlayer = ball?.assignedPlayerId ? players.find((p) => p.id === ball.assignedPlayerId) : null;

  return (
    <>
      <div style={{ position: 'absolute', left: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {FORMATIONS.map((f) => (
              <button key={f.id} style={fanPill} onClick={() => applyPreset(f.id)}>{f.label}</button>
            ))}
            <button style={fanPill} onClick={() => setShowTeams(true)}>🔵🔴 Teams / jerseys</button>
            <button style={fanPill} onClick={cycleLabelMode}>Labels: {LABELS[labelMode]}</button>
            <button style={fanPill} onClick={resetPlayers}>Reset players</button>
            <button style={fanPill} onClick={handleUndo} disabled={!canUndo()}>↩ Undo</button>
            <button style={{ ...fanPill, background: boardSubMode === 'draw' ? '#f59e0b' : undefined, color: boardSubMode === 'draw' ? '#000' : '#fff' }} onClick={toggleBoardSubMode}>
              ✏ Draw path{boardSubMode === 'draw' ? ' (on)' : ''}
            </button>
            <button style={fanPill} onClick={clearPaths} disabled={paths.length === 0}>Clear paths</button>
            {ball && (
              <button
                style={{ ...fanPill, opacity: selectedPlayerId ? 1 : 0.4 }}
                onClick={() => selectedPlayerId && assignBallToPlayer(selectedPlayerId)}
                disabled={!selectedPlayerId}
              >
                🏉 Give ball{selectedPlayer ? ` to #${selectedPlayer.number}` : ''}
              </button>
            )}
            {ball && assignedPlayer && (
              <button style={fanPill} onClick={() => assignBallToPlayer(null)}>
                Release ball (#{assignedPlayer.number})
              </button>
            )}
            <button style={fanPill} onClick={() => setShowAnnotate(true)}>↗ Annotate…</button>
            <button style={fanPill} onClick={() => setShowRoster(true)}>Import roster…</button>
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '👥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>SETUP</span>
        </button>
      </div>

      <TeamSelectModal open={showTeams} onClose={() => setShowTeams(false)} />
      <RosterImportModal open={showRoster} onClose={() => setShowRoster(false)} />
      <AnnotatePalette open={showAnnotate} onClose={() => setShowAnnotate(false)} />
    </>
  );
}
