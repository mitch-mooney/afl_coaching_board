// src/components/UI/PlayHQImportDialog.tsx
import { useState } from 'react';
import { parsePlayHQText, fetchPlayHQRoster } from '../../store/rosterStore';
import type { RosterPlayer } from '../../models/RosterModel';

interface Props {
  onImport: (teamName: string, players: RosterPlayer[]) => void;
  onClose: () => void;
}

export function PlayHQImportDialog({ onImport, onClose }: Props) {
  const [teamName, setTeamName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RosterPlayer[] | null>(null);

  const handleParse = () => {
    if (!pasteText.trim()) return;
    setPreview(parsePlayHQText(pasteText));
    setFetchError(null);
  };

  const handleFetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    const text = await fetchPlayHQRoster(url);
    setIsFetching(false);
    if (!text) {
      setFetchError('Could not fetch roster. Check the URL or paste the data manually.');
      return;
    }
    setPreview(parsePlayHQText(text));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">Import PlayHQ Roster</h2>

        <label className="block text-sm text-gray-400 mb-1">Team Name *</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Gungahlin Jets U18"
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm mb-4 outline-none
                     focus:ring-2 focus:ring-amber-500"
        />

        <label className="block text-sm text-gray-400 mb-1">Paste PlayHQ data</label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"#\tPlayers\tPP\tG\n23\tSmith J (c)\t3\t2"}
          rows={4}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono mb-2
                     outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleParse}
          className="w-full mb-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
        >
          Parse Pasted Data
        </button>

        <label className="block text-sm text-gray-400 mb-1">Or fetch from PlayHQ URL</label>
        <div className="flex gap-2 mb-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.playhq.com/..."
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none
                       focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleFetch}
            disabled={isFetching || !url.trim()}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm
                       disabled:opacity-50"
          >
            {isFetching ? '…' : 'Fetch'}
          </button>
        </div>
        {fetchError && <p className="text-red-400 text-sm mb-3">{fetchError}</p>}

        {preview && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2">{preview.length} players found:</p>
            {preview.map((p) => (
              <div key={p.id} className="text-sm flex gap-2 py-0.5">
                <span className="text-gray-500 w-6 text-right shrink-0">{p.number}</span>
                <span>{p.name}</span>
                {p.isCaptain && <span className="text-amber-400 text-xs">(c)</span>}
                {p.isViceCaptain && <span className="text-amber-400/70 text-xs">(vc)</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (preview && teamName.trim()) { onImport(teamName.trim(), preview); onClose(); } }}
            disabled={!preview || !teamName.trim()}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm disabled:opacity-50"
          >
            Import Roster
          </button>
        </div>
      </div>
    </div>
  );
}
