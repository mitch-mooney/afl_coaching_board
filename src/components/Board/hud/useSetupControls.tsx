import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useUIStore } from '../../../store/uiStore';
import { usePathStore } from '../../../store/pathStore';
import { useAnnotationStore } from '../../../store/annotationStore';
import { useBallStore } from '../../../store/ballStore';
import { getFormationById } from '../../../data/formations';
import { TeamSelectModal } from './TeamSelectModal';
import { RosterImportModal } from './RosterImportModal';
import { useBoardUndo } from '../../../hooks/useBoardUndo';
import type { HudAction, HudControls } from './hudActions';

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
  const clearPaths = usePathStore((s) => s.clearPaths);
  const paths = usePathStore((s) => s.paths);
  const clearAnnotations = useAnnotationStore((s) => s.clearAnnotations);
  const annotations = useAnnotationStore((s) => s.annotations);
  const ball = useBallStore((s) => s.ball);
  const assignBallToPlayer = useBallStore((s) => s.assignBallToPlayer);
  const { handleUndo, canUndo } = useBoardUndo();

  const [showTeams, setShowTeams] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

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
    // The two bulk clears sit together: each wipes a category of board content,
    // and neither is an instrument — arming a Pen tip is the Tool rail's job and
    // only the Tool rail's, so no tip is armable from here.
    { key: 'clear', label: 'Clear paths', onClick: clearPaths, disabled: paths.length === 0 },
    {
      key: 'clear-annotations',
      label: 'Clear annotations',
      onClick: clearAnnotations,
      disabled: annotations.length === 0,
    },
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
    { key: 'roster', label: 'Import roster…', onClick: () => setShowRoster(true) },
  ];

  const modals = (
    <>
      <TeamSelectModal open={showTeams} onClose={() => setShowTeams(false)} />
      <RosterImportModal open={showRoster} onClose={() => setShowRoster(false)} />
    </>
  );

  return { actions, modals };
}
