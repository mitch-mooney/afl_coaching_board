import { usePlayerStore } from '../../../store/playerStore';
import { useMatchStore } from '../../../store/matchStore';
import { AFL_TEAMS } from '../../../data/aflTeams';

export function TeamSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const team1PresetId = usePlayerStore((state) => state.team1PresetId);
  const team2PresetId = usePlayerStore((state) => state.team2PresetId);
  const setTeamPreset = usePlayerStore((state) => state.setTeamPreset);

  const matchHome = useMatchStore((s) => s.homeTeamName);
  const matchAway = useMatchStore((s) => s.awayTeamName);
  const setMatchHome = useMatchStore((s) => s.setHomeTeamName);
  const setMatchAway = useMatchStore((s) => s.setAwayTeamName);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 w-[380px] max-h-[80vh] overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Select AFL Team Jerseys</span>
        </div>
        <div className="p-3 space-y-4">
          {/* Team 1 selector */}
          <div>
            <label className="block text-sm font-medium mb-1 text-blue-700">Team 1 (Home)</label>
            <select
              value={team1PresetId ?? ''}
              onChange={(e) => {
                setTeamPreset('team1', e.target.value || null);
                const team = AFL_TEAMS.find(t => t.id === e.target.value);
                if (team && !matchHome) setMatchHome(team.name);
              }}
              className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation"
            >
              <option value="">Default (Blue)</option>
              {AFL_TEAMS.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          {/* Team 2 selector */}
          <div>
            <label className="block text-sm font-medium mb-1 text-red-700">Team 2 (Away)</label>
            <select
              value={team2PresetId ?? ''}
              onChange={(e) => {
                setTeamPreset('team2', e.target.value || null);
                const team = AFL_TEAMS.find(t => t.id === e.target.value);
                if (team && !matchAway) setMatchAway(team.name);
              }}
              className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation"
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
          className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
        >
          Close
        </button>
      </div>
    </div>
  );
}
