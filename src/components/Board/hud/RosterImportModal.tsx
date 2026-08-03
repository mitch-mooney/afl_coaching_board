import { useState } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
import { describeRosterFit, type RosterTarget } from './rosterImportFit';

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
  // should be telling the truth about what the import will do.
  const target: RosterTarget =
    selectedTeam === 'all'
      ? { capacity: players.length, scope: 'board' }
      : { capacity: players.filter((p) => p.teamId === selectedTeam).length, scope: 'team' };

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
    importRoster(pendingNames, teamId);
    closeImportDialog();
  };

  const handleImportAutoAssign = () => {
    const teamId = selectedTeam === 'all' ? undefined : selectedTeam;
    importRoster(pendingNames, teamId);
    autoAssignPositions(teamId);
    closeImportDialog();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeImportDialog}
      />
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-[90vw] max-w-sm">
        {importStep === 1 ? (
          <>
            <h3 className="text-lg font-bold mb-1">Import Roster</h3>
            <p className="text-xs text-gray-500 mb-3">Paste names from PlayHQ (one per line). Leading numbers are stripped automatically.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as 'all' | 'team1' | 'team2')}
                  className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation"
                >
                  <option value="all">All Players</option>
                  <option value="team1">Team 1</option>
                  <option value="team2">Team 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Player Names *</label>
                <textarea
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  className="w-full px-3 py-2 border rounded font-mono text-sm touch-manipulation"
                  placeholder="1. John Smith&#10;2. Jane Doe&#10;3. Mike Johnson"
                  rows={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeImportDialog}
                  className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportNext}
                  className="px-4 py-2 min-h-[44px] bg-cyan-500 text-white rounded hover:bg-cyan-600 transition touch-manipulation"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-1">Assign Positions</h3>
            <p className="text-xs text-gray-500 mb-3">
              {describeRosterFit(pendingNames.length, target)} How should positions be assigned?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleImportAutoAssign}
                className="w-full px-4 py-3 min-h-[52px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition touch-manipulation text-left"
              >
                <div className="font-medium">Auto-assign by jersey number</div>
                <div className="text-xs text-green-100 mt-0.5">Uses PlayHQ jersey order: #1→FB, #6→C, #15→FF etc.</div>
              </button>
              <button
                onClick={handleImportNamesOnly}
                className="w-full px-4 py-3 min-h-[52px] bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition touch-manipulation text-left"
              >
                <div className="font-medium">Import names only</div>
                <div className="text-xs text-cyan-100 mt-0.5">Assign positions manually afterwards</div>
              </button>
              <button
                onClick={() => setImportStep(1)}
                className="w-full px-4 py-2 min-h-[44px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition touch-manipulation"
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
