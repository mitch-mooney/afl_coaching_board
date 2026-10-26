import { usePlayerStore } from '../../../store/playerStore';
import { useMatchStore } from '../../../store/matchStore';
import { AFL_TEAMS } from '../../../data/aflTeams';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
import { editBoard } from '../../../utils/boardEdit';
import { boardGuernseys, GUERNSEY_OVERRIDES, type GuernseyOverride } from '../../../utils/guernsey';
import {
  dialogField,
  dialogFooterButton,
  dialogHeader,
  dialogHint,
  dialogLabel,
  dialogLayer,
  dialogLit,
  dialogPanelScroll,
  dialogScrim,
  dialogTitle,
} from '../../UI/dialogStyles';

export function TeamSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const team1PresetId = usePlayerStore((state) => state.team1PresetId);
  const team2PresetId = usePlayerStore((state) => state.team2PresetId);
  const setTeamPreset = usePlayerStore((state) => state.setTeamPreset);
  const players = usePlayerStore((state) => state.players);
  const team2Guernsey = usePlayerStore((state) => state.team2Guernsey);
  const setTeam2Guernsey = usePlayerStore((state) => state.setTeam2Guernsey);

  const matchHome = useMatchStore((s) => s.homeTeamName);
  const matchAway = useMatchStore((s) => s.awayTeamName);
  const setMatchHome = useMatchStore((s) => s.setHomeTeamName);
  const setMatchAway = useMatchStore((s) => s.setAwayTeamName);

  if (!open) return null;

  // Auto names what it has decided, so the coach knows the state before overriding it.
  const autoDecision = boardGuernseys(players, team2Guernsey).auto;
  const overrideLabel: Record<GuernseyOverride, { name: string; detail?: string }> = {
    auto: { name: 'Auto', detail: autoDecision === 'clash' ? '(wearing clash)' : '(wearing home)' },
    clash: { name: 'Clash' },
    home: { name: 'Home' },
  };

  return (
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={onClose} />
      <div className={`${dialogPanelScroll} max-w-sm`}>
        <div className={dialogHeader}>
          <span className={dialogTitle}>Select AFL team jerseys</span>
        </div>
        <div className="p-md space-y-lg">
          {/* Team 1 selector */}
          <div>
            <label className={dialogLabel}>Team 1 (home)</label>
            <select
              value={team1PresetId ?? ''}
              onChange={(e) => {
                editBoard('Apply team preset', () => setTeamPreset('team1', e.target.value || null));
                const team = AFL_TEAMS.find(t => t.id === e.target.value);
                if (team && !matchHome) setMatchHome(team.name);
              }}
              className={dialogField}
            >
              <option value="">Default (Blue)</option>
              {AFL_TEAMS.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          {/* Team 2 selector */}
          <div>
            <label className={dialogLabel}>Team 2 (away)</label>
            <select
              value={team2PresetId ?? ''}
              onChange={(e) => {
                editBoard('Apply team preset', () => setTeamPreset('team2', e.target.value || null));
                const team = AFL_TEAMS.find(t => t.id === e.target.value);
                if (team && !matchAway) setMatchAway(team.name);
              }}
              className={dialogField}
            >
              <option value="">Default (Red)</option>
              {AFL_TEAMS.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          {/* Team 2's guernsey: the board's clash decision, or the coach's override for this Play */}
          <div>
            <span id="team2-guernsey-label" className={dialogLabel}>Team 2 guernsey</span>
            <div role="group" aria-labelledby="team2-guernsey-label" className="flex gap-xs">
              {GUERNSEY_OVERRIDES.map((override) => {
                const { name, detail } = overrideLabel[override];
                return (
                  <button
                    key={override}
                    type="button"
                    aria-pressed={team2Guernsey === override}
                    onClick={() => editBoard('Team 2 guernsey', () => setTeam2Guernsey(override))}
                    className={`${override === 'auto' ? 'flex-[2]' : 'flex-1'} min-h-[44px] px-sm py-xs text-label rounded-chip border touch-manipulation motion-safe:transition-colors ${
                      team2Guernsey === override ? dialogLit : 'border-steel text-chalk hover:bg-steel/50'
                    }`}
                  >
                    {name}
                    {detail && <span className="text-caption"> {detail}</span>}
                  </button>
                );
              })}
            </div>
            <p className={`${dialogHint} mt-xs`}>Saved with this Play only.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={dialogFooterButton}
        >
          Close
        </button>
      </div>
    </div>
  );
}
