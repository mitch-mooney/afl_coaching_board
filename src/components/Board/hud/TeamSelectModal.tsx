import { usePlayerStore } from '../../../store/playerStore';
import { useMatchStore } from '../../../store/matchStore';
import { AFL_TEAMS } from '../../../data/aflTeams';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
import { editBoard } from '../../../utils/boardEdit';
import {
  dialogField,
  dialogFooterButton,
  dialogHeader,
  dialogLabel,
  dialogLayer,
  dialogPanelScroll,
  dialogScrim,
  dialogTitle,
} from '../../UI/dialogStyles';

export function TeamSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const team1PresetId = usePlayerStore((state) => state.team1PresetId);
  const team2PresetId = usePlayerStore((state) => state.team2PresetId);
  const setTeamPreset = usePlayerStore((state) => state.setTeamPreset);

  const matchHome = useMatchStore((s) => s.homeTeamName);
  const matchAway = useMatchStore((s) => s.awayTeamName);
  const setMatchHome = useMatchStore((s) => s.setHomeTeamName);
  const setMatchAway = useMatchStore((s) => s.setAwayTeamName);

  if (!open) return null;

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
