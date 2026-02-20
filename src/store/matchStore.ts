import { create } from 'zustand';

export interface AFLScore {
  goals: number;
  behinds: number;
}

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface MatchState {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: AFLScore;
  awayScore: AFLScore;
  quarter: Quarter;
  showScoreboard: boolean;

  setHomeTeamName: (name: string) => void;
  setAwayTeamName: (name: string) => void;
  setHomeScore: (score: AFLScore) => void;
  setAwayScore: (score: AFLScore) => void;
  setQuarter: (quarter: Quarter) => void;
  toggleScoreboard: () => void;
  setShowScoreboard: (show: boolean) => void;
}

export function formatAFLScore(score: AFLScore): string {
  const total = score.goals * 6 + score.behinds;
  return `${score.goals}.${score.behinds} (${total})`;
}

export const useMatchStore = create<MatchState>((set) => ({
  homeTeamName: '',
  awayTeamName: '',
  homeScore: { goals: 0, behinds: 0 },
  awayScore: { goals: 0, behinds: 0 },
  quarter: 'Q1',
  showScoreboard: false,

  setHomeTeamName: (name) => set({ homeTeamName: name }),
  setAwayTeamName: (name) => set({ awayTeamName: name }),
  setHomeScore: (score) => set({ homeScore: score }),
  setAwayScore: (score) => set({ awayScore: score }),
  setQuarter: (quarter) => set({ quarter }),
  toggleScoreboard: () => set((s) => ({ showScoreboard: !s.showScoreboard })),
  setShowScoreboard: (show) => set({ showScoreboard: show }),
}));
