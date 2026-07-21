import { useVideoStore } from '../../store/videoStore';
import { useUIStore } from '../../store/uiStore';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useState, useMemo } from 'react';
import { VideoUploader } from '../VideoImport/VideoUploader';
import { HamburgerIcon } from './HamburgerIcon';
import { MobileMenu, createMenuSection, createMenuItem, type MenuSection } from './MobileMenu';
import { useAuthStore } from '../../store/authStore';
import { useMatchStore, formatAFLScore } from '../../store/matchStore';
import type { Quarter } from '../../store/matchStore';

export function Toolbar() {
  const { saveCurrentPlay } = usePlaybook();
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isLoading = useVideoStore((state) => state.isLoading);
  const clearVideo = useVideoStore((state) => state.clearVideo);

  // UI store state for responsive menu
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const toggleMenu = useUIStore((state) => state.toggleMenu);

  const authUser = useAuthStore((state) => state.user);
  const authIsConfigured = useAuthStore((state) => state.isConfigured);
  const authSignOut = useAuthStore((state) => state.signOut);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showMatchSetup, setShowMatchSetup] = useState(false);

  // Match store state
  const matchHome = useMatchStore((s) => s.homeTeamName);
  const matchAway = useMatchStore((s) => s.awayTeamName);
  const matchHomeScore = useMatchStore((s) => s.homeScore);
  const matchAwayScore = useMatchStore((s) => s.awayScore);
  const matchQuarter = useMatchStore((s) => s.quarter);
  const matchShowScoreboard = useMatchStore((s) => s.showScoreboard);
  const setMatchHome = useMatchStore((s) => s.setHomeTeamName);
  const setMatchAway = useMatchStore((s) => s.setAwayTeamName);
  const setMatchHomeScore = useMatchStore((s) => s.setHomeScore);
  const setMatchAwayScore = useMatchStore((s) => s.setAwayScore);
  const setMatchQuarter = useMatchStore((s) => s.setQuarter);
  const toggleScoreboard = useMatchStore((s) => s.toggleScoreboard);

  const handleSave = async () => {
    if (!playbookName.trim()) {
      alert('Please enter a name for the playbook');
      return;
    }

    try {
      await saveCurrentPlay(playbookName);
      setShowSaveDialog(false);
      setPlaybookName('');
      setPlaybookDescription('');
      alert('Playbook saved successfully!');
    } catch (error) {
      console.error('Error saving playbook:', error);
      alert('Failed to save playbook. Please try again.');
    }
  };

  // Build mobile menu sections from toolbar functionality (global actions only —
  // per-mode controls live in the board HUD pods)
  const mobileMenuSections: MenuSection[] = useMemo(() => {
    const sections: MenuSection[] = [];

    // Video section
    const videoItems = [];
    if (isVideoMode && isLoaded) {
      videoItems.push(
        createMenuItem('clear-video', 'Clear Video', clearVideo, { variant: 'danger', description: 'Remove the imported background video' })
      );
    } else {
      videoItems.push(
        createMenuItem('import-video', isLoading ? 'Loading...' : 'Import Video', () => setShowVideoUploader(true), {
          variant: 'teal',
          disabled: isLoading,
          description: 'Import a video to overlay on the field',
        })
      );
    }
    sections.push(createMenuSection('video', 'Video', videoItems));

    // Match section
    sections.push(
      createMenuSection('match', 'Match', [
        createMenuItem('match-setup', 'Match Setup', () => setShowMatchSetup(true), { variant: 'teal', description: 'Configure team names, scores and quarter' }),
        createMenuItem('toggle-scoreboard', matchShowScoreboard ? 'Hide Scoreboard' : 'Show Scoreboard', toggleScoreboard, {
          variant: 'primary',
          active: matchShowScoreboard,
          description: 'Show or hide the 3D scoreboard on the field',
        }),
      ])
    );

    // Playbook section
    sections.push(createMenuSection('playbook', 'Playbook', [
      createMenuItem('save-playbook', 'Save Playbook', () => setShowSaveDialog(true), { variant: 'warning', description: 'Save this formation to your playbook library' }),
    ]));

    // User section (if authenticated)
    if (authIsConfigured && authUser) {
      sections.push(
        createMenuSection('user', `Account: ${authUser.email ?? ''}`, [
          createMenuItem('sign-out', 'Sign Out', authSignOut, { variant: 'danger', description: 'Sign out of your account' }),
        ])
      );
    }

    return sections;
  }, [
    isVideoMode, isLoaded, isLoading, clearVideo,
    authUser, authIsConfigured, authSignOut,
    matchShowScoreboard, toggleScoreboard,
  ]);

  return (
    <div className="absolute top-14 left-4 right-4 z-10 flex gap-2 flex-wrap">
      {/* Hamburger menu - visible at all screen sizes */}
      <div>
        <HamburgerIcon isOpen={isMenuOpen} onClick={toggleMenu} />
      </div>

      {/* Menu dropdown */}
      <MobileMenu sections={mobileMenuSections} />

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowSaveDialog(false);
              setPlaybookName('');
              setPlaybookDescription('');
            }}
          />
          <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-[90vw] max-w-sm">
            <h3 className="text-lg font-bold mb-3">Save Playbook</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={playbookName}
                  onChange={(e) => setPlaybookName(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation"
                  placeholder="Enter playbook name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={playbookDescription}
                  onChange={(e) => setPlaybookDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded touch-manipulation"
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setPlaybookName('');
                    setPlaybookDescription('');
                  }}
                  className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 min-h-[44px] bg-orange-500 text-white rounded hover:bg-orange-600 transition touch-manipulation"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Uploader Modal */}
      {showVideoUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowVideoUploader(false)}
          />
          {/* Modal content */}
          <div className="relative z-10">
            <VideoUploader onClose={() => setShowVideoUploader(false)} />
          </div>
        </div>
      )}

      {/* Match Setup Modal */}
      {showMatchSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMatchSetup(false)}
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
              onClick={() => setShowMatchSetup(false)}
              className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
