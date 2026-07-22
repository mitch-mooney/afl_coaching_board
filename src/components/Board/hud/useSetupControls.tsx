import { useState, type CSSProperties, type ReactNode } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useUIStore } from '../../../store/uiStore';
import { usePathStore } from '../../../store/pathStore';
import { useBallStore } from '../../../store/ballStore';
import { getFormationById } from '../../../data/formations';
import { AnnotatePalette } from './AnnotatePalette';
import { TeamSelectModal } from './TeamSelectModal';
import { RosterImportModal } from './RosterImportModal';
import { useBoardUndo } from '../../../hooks/useBoardUndo';

export interface HudAction {
  key: string;
  label: ReactNode; // may be dynamic ("Labels: #", "🏉 Give ball to #7")
  onClick: () => void;
  active?: boolean; // amber highlight (e.g. Draw path on)
  disabled?: boolean;
  hidden?: boolean; // e.g. ball buttons when no ball
  extraStyle?: CSSProperties; // override base/active/disabled styles
}

export interface HudControls {
  actions: HudAction[];
  modals: ReactNode;
}

const FORMATIONS = [
  { id: 'centre-bounce', label: 'Centre Bounce' },
  { id: 'kick-in-pressing', label: 'Kick-in Press' },
  { id: 'kick-in-kicking', label: 'Kick-in Kick' },
];
const LABELS = { number: '#', name: 'Name', position: 'Pos' } as const;

export function useSetupControls(): HudControls {
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

  const actions: HudAction[] = [
    ...FORMATIONS.map((f) => ({ key: f.id, label: f.label, onClick: () => applyPreset(f.id) })),
    { key: 'teams', label: '🔵🔴 Teams / jerseys', onClick: () => setShowTeams(true) },
    { key: 'labels', label: `Labels: ${LABELS[labelMode]}`, onClick: cycleLabelMode },
    { key: 'reset', label: 'Reset players', onClick: resetPlayers },
    { key: 'undo', label: '↩ Undo', onClick: handleUndo, disabled: !canUndo() },
    {
      key: 'draw',
      label: `✏ Draw path${boardSubMode === 'draw' ? ' (on)' : ''}`,
      onClick: toggleBoardSubMode,
      active: boardSubMode === 'draw',
      extraStyle: boardSubMode === 'draw' ? undefined : { background: 'transparent' },
    },
    { key: 'clear', label: 'Clear paths', onClick: clearPaths, disabled: paths.length === 0 },
    {
      key: 'give',
      label: `🏉 Give ball${selectedPlayer ? ` to #${selectedPlayer.number}` : ''}`,
      onClick: () => selectedPlayerId && assignBallToPlayer(selectedPlayerId),
      hidden: !ball,
      disabled: !selectedPlayerId,
    },
    {
      key: 'release',
      label: `Release ball${assignedPlayer ? ` (#${assignedPlayer.number})` : ''}`,
      onClick: () => assignBallToPlayer(null),
      hidden: !(ball && assignedPlayer),
    },
    { key: 'annotate', label: '↗ Annotate…', onClick: () => setShowAnnotate(true) },
    { key: 'roster', label: 'Import roster…', onClick: () => setShowRoster(true) },
  ];

  const modals = (
    <>
      <TeamSelectModal open={showTeams} onClose={() => setShowTeams(false)} />
      <RosterImportModal open={showRoster} onClose={() => setShowRoster(false)} />
      <AnnotatePalette open={showAnnotate} onClose={() => setShowAnnotate(false)} />
    </>
  );

  return { actions, modals };
}

export function renderAction(a: HudAction, base: CSSProperties) {
  return (
    <button
      key={a.key}
      onClick={a.onClick}
      disabled={a.disabled}
      style={{
        ...base,
        ...(a.active ? { background: '#f59e0b', color: '#000' } : {}),
        ...(a.disabled ? { opacity: 0.4 } : {}),
        ...a.extraStyle,
      }}
    >
      {a.label}
    </button>
  );
}
