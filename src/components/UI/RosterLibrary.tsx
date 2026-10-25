// src/components/UI/RosterLibrary.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRosterStore } from '../../store/rosterStore';
import { PlayHQImportDialog } from './PlayHQImportDialog';
import type { RosterPlayer } from '../../models/RosterModel';
import { BUTTON_PRIMARY, BUTTON_QUIET, CARD_ACTION, CARD_DETAIL, PAGE, SECTION_TITLE } from './libraryStyles';

export function RosterLibrary() {
  const { rosters, loadRosters, createRoster, deleteRoster } = useRosterStore();
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadRosters(); }, [loadRosters]);

  const handleImport = async (teamName: string, players: RosterPlayer[]) => {
    await createRoster(teamName, players);
  };

  return (
    <div className={`${PAGE} px-lg py-xl`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-md mb-xxl">
          <div className="flex items-center gap-lg">
            <button type="button" onClick={() => navigate('/')} className={BUTTON_QUIET}>
              ← Back
            </button>
            <h1 className={SECTION_TITLE}>Team rosters</h1>
          </div>
          <button type="button" onClick={() => setShowImport(true)} className={BUTTON_PRIMARY}>
            Import roster
          </button>
        </div>

        {rosters.length === 0 ? (
          <div className="text-center py-[80px] text-chalk/60">
            <p className="mb-sm text-body">No rosters yet.</p>
            <p className="text-body">Import a squad from PlayHQ — paste the table or enter the page URL.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-md">
            {rosters.map((r) => (
              <div
                key={r.id}
                className="rounded-panel border border-steel bg-steel/40 p-lg"
              >
                <div className="flex items-center justify-between gap-md">
                  <div className="min-w-0">
                    <h3 className="text-label text-chalk truncate">{r.teamName}</h3>
                    <p className={CARD_DETAIL}>
                      <span className="font-display text-number text-chalk/80">{r.players.length}</span> players
                      {r.players.find((p) => p.isCaptain) &&
                        ` · c: ${r.players.find((p) => p.isCaptain)!.name}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete "${r.teamName}"?`)) deleteRoster(r.id!); }}
                    className={CARD_ACTION}
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
