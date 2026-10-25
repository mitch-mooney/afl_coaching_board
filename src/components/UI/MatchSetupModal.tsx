import { useMatchStore, formatAFLScore } from '../../store/matchStore';
import type { Quarter } from '../../store/matchStore';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogField,
  dialogFieldCompact,
  dialogFooterButton,
  dialogHeader,
  dialogHint,
  dialogLabel,
  dialogLayer,
  dialogLit,
  dialogPanelScroll,
  dialogScrim,
  dialogTitle,
} from './dialogStyles';

export function MatchSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
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
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={onClose} />
      <div className={`${dialogPanelScroll} max-w-sm`}>
        <div className={dialogHeader}>
          <span className={dialogTitle}>Match setup</span>
        </div>
        <div className="p-lg space-y-lg">
          {/* Team names */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className={dialogLabel}>Home team</label>
              <input
                type="text"
                value={matchHome}
                onChange={(e) => setMatchHome(e.target.value)}
                className={dialogField}
                placeholder="Home team"
              />
            </div>
            <div>
              <label className={dialogLabel}>Away team</label>
              <input
                type="text"
                value={matchAway}
                onChange={(e) => setMatchAway(e.target.value)}
                className={dialogField}
                placeholder="Away team"
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className={dialogLabel}>Scores</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div className="border border-steel rounded-chip p-sm">
                <div className="text-label text-chalk mb-xs">{matchHome || 'Home'}: {formatAFLScore(matchHomeScore)}</div>
                <div className="flex items-center gap-sm">
                  <label className={dialogHint}>G</label>
                  <input
                    type="number"
                    min={0}
                    value={matchHomeScore.goals}
                    onChange={(e) => setMatchHomeScore({ ...matchHomeScore, goals: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={`${dialogFieldCompact} w-14 text-center`}
                  />
                  <label className={dialogHint}>B</label>
                  <input
                    type="number"
                    min={0}
                    value={matchHomeScore.behinds}
                    onChange={(e) => setMatchHomeScore({ ...matchHomeScore, behinds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={`${dialogFieldCompact} w-14 text-center`}
                  />
                </div>
              </div>
              <div className="border border-steel rounded-chip p-sm">
                <div className="text-label text-chalk mb-xs">{matchAway || 'Away'}: {formatAFLScore(matchAwayScore)}</div>
                <div className="flex items-center gap-sm">
                  <label className={dialogHint}>G</label>
                  <input
                    type="number"
                    min={0}
                    value={matchAwayScore.goals}
                    onChange={(e) => setMatchAwayScore({ ...matchAwayScore, goals: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={`${dialogFieldCompact} w-14 text-center`}
                  />
                  <label className={dialogHint}>B</label>
                  <input
                    type="number"
                    min={0}
                    value={matchAwayScore.behinds}
                    onChange={(e) => setMatchAwayScore({ ...matchAwayScore, behinds: Math.max(0, parseInt(e.target.value) || 0) })}
                    className={`${dialogFieldCompact} w-14 text-center`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quarter */}
          <div>
            <label className={dialogLabel}>Quarter</label>
            <div className="flex gap-sm">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setMatchQuarter(q)}
                  className={`flex-1 min-h-[44px] px-sm py-xs font-display text-number rounded-chip border touch-manipulation motion-safe:transition-colors ${
                    matchQuarter === q ? dialogLit : 'border-steel text-chalk hover:bg-steel/50'
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
          className={dialogFooterButton}
        >
          Close
        </button>
      </div>
    </div>
  );
}
