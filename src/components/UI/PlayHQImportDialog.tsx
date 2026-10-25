// src/components/UI/PlayHQImportDialog.tsx
import { useState } from 'react';
import { parsePlayHQText, fetchPlayHQRoster } from '../../store/rosterStore';
import type { RosterPlayer } from '../../models/RosterModel';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogButton,
  dialogError,
  dialogField,
  dialogHint,
  dialogLabel,
  dialogLayer,
  dialogPanelScroll,
  dialogPrimaryButton,
  dialogTitle,
} from './dialogStyles';

interface Props {
  onImport: (teamName: string, players: RosterPlayer[]) => void;
  onClose: () => void;
}

export function PlayHQImportDialog({ onImport, onClose }: Props) {
  useOverlayOpen();
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
    <div className={`${dialogLayer} bg-concrete/75`}>
      <div className={`${dialogPanelScroll} max-w-lg p-xl`}>
        <h2 className={`${dialogTitle} mb-lg`}>Import PlayHQ roster</h2>

        <label className={dialogLabel}>Team name *</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Gungahlin Jets U18"
          className={`${dialogField} mb-lg`}
        />

        <label className={dialogLabel}>Paste PlayHQ data</label>
        <p className={`${dialogHint} mb-xs`}>
          Go to your PlayHQ team page, select all the player rows and paste below.
          Captain markers (C / VC) are automatically detected.
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"#\tPlayers\tPP\tG\n23\tSmith J C\t3\t2\n7\tJones K VC\t2\t1"}
          rows={4}
          className={`${dialogField} mb-sm`}
        />
        <button onClick={handleParse} className={`${dialogButton} w-full mb-lg`}>
          Parse pasted data
        </button>

        <label className={dialogLabel}>Or fetch from PlayHQ URL</label>
        <p className={`${dialogHint} mb-xs`}>
          Note: direct URL fetch is blocked by browser security (CORS). Paste the data above instead.
        </p>
        <div className="flex gap-sm mb-sm">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.playhq.com/..."
            className={`${dialogField} flex-1`}
          />
          <button onClick={handleFetch} disabled={isFetching || !url.trim()} className={dialogButton}>
            {isFetching ? '…' : 'Fetch'}
          </button>
        </div>
        {fetchError && (
          <p className={`${dialogError} mb-md`}>
            {fetchError.includes('Could not fetch')
              ? 'Could not fetch — PlayHQ blocks direct browser requests (CORS). Please paste the roster data manually instead.'
              : fetchError}
          </p>
        )}

        {preview && (
          <div className="border border-steel rounded-control p-md mb-lg max-h-40 overflow-y-auto bg-steel/40">
            <p className={`${dialogHint} mb-sm`}>{preview.length} players found:</p>
            {preview.map((p) => (
              <div key={p.id} className="text-body flex gap-sm py-xxs">
                <span className="text-chalk/60 w-6 text-right shrink-0 font-display text-number">{p.number}</span>
                <span className="text-chalk">{p.name}</span>
                {p.isCaptain && <span className="text-caption font-semibold text-chalk">(C)</span>}
                {p.isViceCaptain && <span className="text-caption text-chalk/80">(VC)</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-md">
          <button onClick={onClose} className={`${dialogButton} flex-1`}>
            Cancel
          </button>
          <button
            onClick={() => { if (preview && teamName.trim()) { onImport(teamName.trim(), preview); onClose(); } }}
            disabled={!preview || !teamName.trim()}
            className={`${dialogPrimaryButton} flex-1`}
          >
            Import roster
          </button>
        </div>
      </div>
    </div>
  );
}
