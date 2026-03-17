// src/components/UI/RosterLibrary.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRosterStore } from '../../store/rosterStore';
import { PlayHQImportDialog } from './PlayHQImportDialog';
import type { RosterPlayer } from '../../models/RosterModel';

export function RosterLibrary() {
  const { rosters, loadRosters, createRoster, deleteRoster } = useRosterStore();
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadRosters(); }, [loadRosters]);

  const handleImport = async (teamName: string, players: RosterPlayer[]) => {
    await createRoster(teamName, players);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Team Rosters</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm"
          >
            + Import Roster
          </button>
        </div>

        {rosters.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-2">No rosters yet.</p>
            <p className="text-sm">Import a squad from PlayHQ — paste the table or enter the page URL.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rosters.map((r) => (
              <div
                key={r.id}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{r.teamName}</h3>
                    <p className="text-sm text-gray-500">
                      {r.players.length} players
                      {r.players.find((p) => p.isCaptain) &&
                        ` · c: ${r.players.find((p) => p.isCaptain)!.name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete "${r.teamName}"?`)) deleteRoster(r.id!); }}
                    className="text-sm text-red-500/50 hover:text-red-400 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showImport && (
        <PlayHQImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
