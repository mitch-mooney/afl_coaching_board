import { useMatchStore, formatAFLScore } from '../../store/matchStore';
import type { Quarter } from '../../store/matchStore';

export function MatchSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const matchHome = useMatchStore((s) => s.homeTeamName);
  const matchAway = useMatchStore((s) => s.awayTeamName);
  const matchHomeScore = useMatchStore((s) => s.homeScore);
  const matchAwayScore = useMatchStore((s) => s.awayScore);
  const matchQuarter = useMatchStore((s) => s.quarter);
  const setMatchHome = useMatchStore((s) => s.setHomeTeamName);
  const setMatchAway = useMatchStore((s) => s.setAwayTeamName);
  const setMatchHomeScore = useMatchStore((s) => s.setHomeScore);
  const setMatchAwayScore = useMatchStore((s) => s.setAwayScore);
  const setMatchQuarter = useMatchStore((s) => s.setQuarter);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 w-[400px] max-h-[80vh] overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Match Setup</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Team names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-blue-700">Home Team</label>
              <input
                type="text"
                value={matchHome}
                onChange={(e) => setMatchHome(e.target.value)}
                className="w-full px-2 py-1.5 min-h-[36px] text-sm border rounded touch-manipulation"
                placeholder="Home team"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-red-700">Away Team</label>
              <input
                type="text"
                value={matchAway}
                onChange={(e) => setMatchAway(e.target.value)}
                className="w-full px-2 py-1.5 min-h-[36px] text-sm border rounded touch-manipulation"
                placeholder="Away team"
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className="block text-xs font-medium mb-2 text-gray-600">Scores</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded p-2">
                <div className="text-xs text-blue-700 font-medium mb-1">{matchHome || 'Home'}: {formatAFLScore(matchHomeScore)}</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">G</label>
                  <input
                    type="number"
                    min={0}
                    value={matchHomeScore.goals}
                    onChange={(e) => setMatchHomeScore({ ...matchHomeScore, goals: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 px-1 py-1 text-sm border rounded text-center touch-manipulation"
                  />
                  <label className="text-xs text-gray-500">B</label>
                  <input
                    type="number"
                    min={0}
                    value={matchHomeScore.behinds}
                    onChange={(e) => setMatchHomeScore({ ...matchHomeScore, behinds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 px-1 py-1 text-sm border rounded text-center touch-manipulation"
                  />
                </div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-red-700 font-medium mb-1">{matchAway || 'Away'}: {formatAFLScore(matchAwayScore)}</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">G</label>
                  <input
                    type="number"
                    min={0}
                    value={matchAwayScore.goals}
                    onChange={(e) => setMatchAwayScore({ ...matchAwayScore, goals: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 px-1 py-1 text-sm border rounded text-center touch-manipulation"
                  />
                  <label className="text-xs text-gray-500">B</label>
                  <input
                    type="number"
                    min={0}
                    value={matchAwayScore.behinds}
                    onChange={(e) => setMatchAwayScore({ ...matchAwayScore, behinds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 px-1 py-1 text-sm border rounded text-center touch-manipulation"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quarter */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">Quarter</label>
            <div className="flex gap-2">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setMatchQuarter(q)}
                  className={`flex-1 min-h-[36px] px-2 py-1 text-sm rounded border touch-manipulation transition ${
                    matchQuarter === q
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
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
