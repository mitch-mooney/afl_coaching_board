import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useUIStore } from '../../../store/uiStore';
import { usePathStore } from '../../../store/pathStore';
import { useAnnotationStore } from '../../../store/annotationStore';
import { useBallStore } from '../../../store/ballStore';
import { useCameraStore } from '../../../store/cameraStore';
import { getFormationById } from '../../../data/formations';
import { TeamSelectModal } from './TeamSelectModal';
import { RosterImportModal } from './RosterImportModal';
import { useBoardUndo } from '../../../hooks/useBoardUndo';
import { editBoard } from '../../../utils/boardEdit';
import { capture, restore } from '../../../utils/boardSnapshotIO';
import { withoutPlayers, atFullStrength } from '../../../utils/boardPlacement';
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
  const selectPlayer = usePlayerStore((s) => s.selectPlayer);
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

  // The coach's clear, as opposed to the mode reset's: same store action, and
  // only this side knows which it is, so this is the side that records.
  const recordAndClearAnnotations = () => {
    editBoard('Clear annotations', () => clearAnnotations());
  };

  const recordAndClearPaths = () => {
    editBoard('Clear paths', () => clearPaths());
  };

  // The third bulk clear. Unlike its neighbours it is not one store's action.
  // Players, their paths and the ball's owner go together, so the edit is the
  // pure `withoutPlayers` written back through restore. Selection and the POV
  // slots are not board content, so they are cleared beside the edit rather
  // than inside it, the same two clears a tap removal makes in `Player`.
  const recordAndClearPlayers = () => {
    editBoard('Clear players', () => restore(withoutPlayers(capture())));
    selectPlayer(null);
    const { releasePov } = useCameraStore.getState();
    for (const player of players) releasePov(player.id);
  };

  const applyPreset = (id: string) => {
    const f = getFormationById(id);
    if (!f) return;
    editBoard('Apply formation', () => applyFormation(f));
    setActiveFormationId(id);
  };

  const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) : null;
  // The presets position 18 a side by number. Reset players is not gated,
  // because it is how a short board gets back to full strength.
  const fullStrength = atFullStrength({ players });
  const assignedPlayer = ball?.assignedPlayerId ? players.find((p) => p.id === ball.assignedPlayerId) : null;

  const actions: HudAction[] = [
    ...FORMATIONS.map((f) => ({
      key: f.id,
      label: f.label,
      onClick: () => applyPreset(f.id),
      disabled: !fullStrength,
    })),
    { key: 'teams', label: '🔵🔴 Teams / jerseys', onClick: () => setShowTeams(true) },
    { key: 'labels', label: `Labels: ${LABELS[labelMode]}`, onClick: cycleLabelMode },
    { key: 'reset', label: 'Reset players', onClick: () => editBoard('Reset players', () => resetPlayers()) },
    { key: 'undo', label: '↩ Undo', onClick: handleUndo, disabled: !canUndo() },
    // The three bulk clears sit together: each wipes a category of board content,
    // and none is an instrument — arming a Pen tip is the Tool rail's job and
    // only the Tool rail's, so no tip is armable from here.
    { key: 'clear', label: 'Clear paths', onClick: recordAndClearPaths, disabled: paths.length === 0 },
    {
      key: 'clear-annotations',
      label: 'Clear annotations',
      onClick: recordAndClearAnnotations,
      disabled: annotations.length === 0,
    },
    {
      key: 'clear-players',
      label: 'Clear players',
      onClick: recordAndClearPlayers,
      disabled: players.length === 0,
    },
    {
      key: 'give',
      label: `🏉 Give ball${selectedPlayer ? ` to #${selectedPlayer.number}` : ''}`,
      onClick: () => selectedPlayerId && editBoard('Assign ball', () => assignBallToPlayer(selectedPlayerId)),
      hidden: !ball,
      disabled: !selectedPlayerId,
    },
    {
      key: 'release',
      label: `Release ball${assignedPlayer ? ` (#${assignedPlayer.number})` : ''}`,
      onClick: () => editBoard('Release ball', () => assignBallToPlayer(null)),
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
