import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
import { editBoard } from '../../../utils/boardEdit';
import { describeRosterFit, type RosterTarget } from './rosterImportFit';
import {
  dialogButton,
  dialogField,
  dialogHint,
  dialogLabel,
  dialogLayer,
  dialogPanel,
  dialogPrimaryButton,
  dialogScrim,
  dialogTitle,
} from '../../UI/dialogStyles';

export function RosterImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const importRoster = usePlayerStore((state) => state.importRoster);
  const autoAssignPositions = usePlayerStore((state) => state.autoAssignPositions);
  const players = usePlayerStore((state) => state.players);

  const [rosterText, setRosterText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'team1' | 'team2'>('all');
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [pendingNames, setPendingNames] = useState<string[]>([]);

  // Counted off the same players importRoster fills by index, rather than
  // assumed from the roster size — if the two ever disagree, the confirmation
  // should be telling the truth about what the import will do. The per-team
  // size is the count of the team being imported into; for a board-wide import
  // that is the first team, since that is where the names run out and spill
  // onto the second.
  const teamSize = (teamId: 'team1' | 'team2') => players.filter((p) => p.teamId === teamId).length;
  const target: RosterTarget =
    selectedTeam === 'all'
      ? { capacity: players.length, scope: 'board', perTeam: teamSize('team1') }
      : { capacity: teamSize(selectedTeam), scope: 'team', perTeam: teamSize(selectedTeam) };

  const closeImportDialog = () => {
    setRosterText('');
    setSelectedTeam('all');
    setImportStep(1);
    setPendingNames([]);
    onClose();
  };

  const handleImportNext = () => {
    // Strip leading number prefixes (e.g. "1. ", "2 ", "3. ") from PlayHQ lists
    const names = rosterText
      .split('\n')
      .map((line) => line.trim().replace(/^\d+[\.\s]+/, '').trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      alert('Please enter at least one player name');
      return;
    }

    setPendingNames(names);
    setImportStep(2);
  };

  const handleImportNamesOnly = () => {
    const teamId = selectedTeam === 'all' ? undefined : selectedTeam;
    editBoard('Import roster', () => importRoster(pendingNames, teamId));
    closeImportDialog();
  };

  const handleImportAutoAssign = () => {
    const teamId = selectedTeam === 'all' ? undefined : selectedTeam;
    editBoard('Import roster', () => {
      importRoster(pendingNames, teamId);
      autoAssignPositions(teamId);
    });
    closeImportDialog();
  };

  if (!open) return null;

  return (
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={closeImportDialog} />
      <div className={`${dialogPanel} max-w-sm p-lg`}>
        {importStep === 1 ? (
          <>
            <h3 className={`${dialogTitle} mb-xs`}>Import roster</h3>
            <p className={`${dialogHint} mb-md`}>Paste names from PlayHQ (one per line). Leading numbers are stripped automatically.</p>
            <div className="space-y-md">
              <div>
                <label className={dialogLabel}>Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as 'all' | 'team1' | 'team2')}
                  className={dialogField}
                >
                  <option value="all">All players</option>
                  <option value="team1">Team 1</option>
                  <option value="team2">Team 2</option>
                </select>
              </div>
              <div>
                <label className={dialogLabel}>Player names *</label>
                <textarea
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  className={dialogField}
                  placeholder="1. John Smith&#10;2. Jane Doe&#10;3. Mike Johnson"
                  rows={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-sm justify-end">
                <button
                  onClick={closeImportDialog}
                  className={dialogButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportNext}
                  className={dialogPrimaryButton}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className={`${dialogTitle} mb-xs`}>Assign positions</h3>
            <p className={`${dialogHint} mb-md`}>
              {describeRosterFit(pendingNames.length, target)} How should positions be assigned?
            </p>
            <div className="space-y-md">
              <button
                onClick={handleImportAutoAssign}
                className={`${dialogPrimaryButton} w-full min-h-[52px] py-md text-left`}
              >
                <div>Auto-assign by jersey number</div>
                <div className="text-caption text-concrete/70 mt-xxs">Uses PlayHQ jersey order: #1→FB, #6→C, #15→FF etc.</div>
              </button>
              <button
                onClick={handleImportNamesOnly}
                className={`${dialogButton} w-full min-h-[52px] py-md text-left`}
              >
                <div>Import names only</div>
                <div className={`${dialogHint} mt-xxs`}>Assign positions manually afterwards</div>
              </button>
              <button
                onClick={() => setImportStep(1)}
                className={`${dialogButton} w-full`}
              >
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
