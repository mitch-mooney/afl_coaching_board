import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { useHistoryStore } from '../../store/historyStore';
import { useVideoStore } from '../../store/videoStore';
import { useEventStore } from '../../store/eventStore';
import { useUIStore } from '../../store/uiStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { AFL_POSITIONS } from '../../data/aflPositions';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { VideoUploader } from '../VideoImport/VideoUploader';
import { EventEditor } from './EventEditor';
import { HamburgerIcon } from './HamburgerIcon';
import { MobileMenu, createMenuSection, createMenuItem, type MenuSection } from './MobileMenu';
import { useAuthStore } from '../../store/authStore';
import { useMatchStore, formatAFLScore } from '../../store/matchStore';
import { AFL_TEAMS } from '../../data/aflTeams';
import type { Quarter } from '../../store/matchStore';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
}

export function Toolbar({ canvas }: ToolbarProps) {
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const showPlayerNames = usePlayerStore((state) => state.showPlayerNames);
  const togglePlayerNames = usePlayerStore((state) => state.togglePlayerNames);
  const importRoster = usePlayerStore((state) => state.importRoster);
  const editingPlayerId = usePlayerStore((state) => state.editingPlayerId);
  const getPlayer = usePlayerStore((state) => state.getPlayer);
  const selectedPlayerId = usePlayerStore((state) => state.selectedPlayerId);
  const players = usePlayerStore((state) => state.players);
  const updateMultiplePlayers = usePlayerStore((state) => state.updateMultiplePlayers);
  const setPlayerPosition = usePlayerStore((state) => state.setPlayerPosition);
  const autoAssignPositions = usePlayerStore((state) => state.autoAssignPositions);
  const { setPresetView, resetCamera, povMode, povPlayerId, enablePOV, disablePOV } = useCameraStore();
  const ball = useBallStore((state) => state.ball);
  const isBallSelected = useBallStore((state) => state.isBallSelected);
  const assignBallToPlayer = useBallStore((state) => state.assignBallToPlayer);
  const { isPlaying, togglePlayback, stop } = useAnimationStore();
  const { createPath, getPathByEntity, removePath, clearPaths, paths } = usePathStore();
  const { isRecording, isConverting, conversionProgress, exportFormat, setExportFormat, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const { undo, canUndo, pauseRecording, resumeRecording } = useHistoryStore();
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isLoading = useVideoStore((state) => state.isLoading);
  const clearVideo = useVideoStore((state) => state.clearVideo);

  // Event store state
  const getActiveEvent = useEventStore((state) => state.getActiveEvent);
  const clearActiveEvent = useEventStore((state) => state.clearActiveEvent);

  // UI store state for responsive menu
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const toggleMenu = useUIStore((state) => state.toggleMenu);

  const authUser = useAuthStore((state) => state.user);
  const authIsConfigured = useAuthStore((state) => state.isConfigured);
  const authSignOut = useAuthStore((state) => state.signOut);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [rosterText, setRosterText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'team1' | 'team2'>('all');
  const [, setEditingName] = useState('');
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showPOVSelector, setShowPOVSelector] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showMatchSetup, setShowMatchSetup] = useState(false);

  // Team preset state
  const team1PresetId = usePlayerStore((state) => state.team1PresetId);
  const team2PresetId = usePlayerStore((state) => state.team2PresetId);
  const setTeamPreset = usePlayerStore((state) => state.setTeamPreset);

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

  // Get the player being edited
  const editingPlayer = editingPlayerId ? getPlayer(editingPlayerId) : undefined;

  // Initialize editing name when player starts being edited
  useEffect(() => {
    if (editingPlayer) {
      setEditingName(editingPlayer.playerName || '');
    }
  }, [editingPlayerId, editingPlayer]);

  // Get ball's current path
  const ballPath = ball ? getPathByEntity(ball.id, 'ball') : null;

  // Get the assigned player name for display
  const assignedPlayer = ball?.assignedPlayerId
    ? players.find(p => p.id === ball.assignedPlayerId)
    : null;

  // Get the selected player for display
  const selectedPlayer = selectedPlayerId
    ? players.find(p => p.id === selectedPlayerId)
    : null;

  // Get active event info
  const activeEvent = getActiveEvent();

  // Get the POV target player for display
  const povPlayer = povPlayerId
    ? players.find(p => p.id === povPlayerId)
    : null;

  const handleAssignBall = () => {
    if (selectedPlayerId) {
      assignBallToPlayer(selectedPlayerId);
    }
  };

  const handleUnassignBall = () => {
    assignBallToPlayer(null);
  };

  // Create a test path for the ball (from current position to a destination)
  const handleCreateBallPath = () => {
    if (!ball) return;
    // Create a path from current position to a position 30 units away (across field)
    const startPos = ball.position;
    const endPos: [number, number, number] = [
      startPos[0] + 30,
      startPos[1],
      startPos[2] + 20
    ];
    createPath(ball.id, 'ball', startPos, endPos, 5); // 5 second duration
  };

  // Remove ball path
  const handleRemoveBallPath = () => {
    if (ballPath) {
      removePath(ballPath.id);
    }
  };

  // Handle stop animation
  const handleStopAnimation = () => {
    stop();
  };

  const handleSave = async () => {
    if (!playbookName.trim()) {
      alert('Please enter a name for the playbook');
      return;
    }

    try {
      await saveCurrentScenario(playbookName, playbookDescription);
      setShowSaveDialog(false);
      setPlaybookName('');
      setPlaybookDescription('');
      alert('Playbook saved successfully!');
    } catch (error) {
      console.error('Error saving playbook:', error);
      alert('Failed to save playbook. Please try again.');
    }
  };

  const handleRecordingToggle = () => {
    if (!canvas) {
      alert('Canvas not ready. Please wait a moment and try again.');
      return;
    }
    toggleRecording();
  };

  // Handle undo - restore previous player positions
  const handleUndo = useCallback(() => {
    if (!canUndo()) return;

    pauseRecording(); // Don't record the restoration as a new action
    const snapshot = undo();
    if (snapshot) {
      // Apply player positions from snapshot
      const updates = snapshot.players.map(p => ({
        playerId: p.id,
        position: p.position,
        rotation: p.rotation,
      }));
      updateMultiplePlayers(updates);
    }
    resumeRecording();
  }, [undo, canUndo, pauseRecording, resumeRecording, updateMultiplePlayers]);

  const handleImport = () => {
    const names = rosterText
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      alert('Please enter at least one player name');
      return;
    }

    const teamId = selectedTeam === 'all' ? undefined : selectedTeam;
    importRoster(names, teamId);

    setShowImportDialog(false);
    setRosterText('');
    setSelectedTeam('all');
  };

  // Handle POV player selection
  const handleSelectPOVPlayer = useCallback((playerId: string) => {
    enablePOV(playerId);
    setShowPOVSelector(false);
  }, [enablePOV]);

  // Handle clearing active event
  const handleClearEvent = useCallback(() => {
    clearActiveEvent();
    stop();
  }, [clearActiveEvent, stop]);

  // Build mobile menu sections from toolbar functionality
  const mobileMenuSections: MenuSection[] = useMemo(() => {
    const sections: MenuSection[] = [];

    // Camera section
    sections.push(
      createMenuSection('camera', 'Camera', [
        createMenuItem('top-view', 'Top View', () => setPresetView('top'), { variant: 'primary' }),
        createMenuItem('sideline', 'Sideline', () => setPresetView('sideline'), { variant: 'primary' }),
        createMenuItem('end-to-end', 'End-to-End', () => setPresetView('end-to-end'), { variant: 'primary' }),
        createMenuItem('reset-camera', 'Reset Camera', resetCamera, { variant: 'purple' }),
      ])
    );

    // Player Controls section
    const playerItems = [
      createMenuItem('undo', 'Undo', handleUndo, {
        variant: 'warning',
        disabled: !canUndo(),
      }),
      createMenuItem('clear-paths', 'Clear Paths', clearPaths, {
        variant: 'danger',
        disabled: paths.length === 0,
      }),
      createMenuItem('reset-players', 'Reset Players', resetPlayers, { variant: 'success' }),
      createMenuItem('toggle-names', showPlayerNames ? 'Hide Names' : 'Show Names', togglePlayerNames, {
        variant: 'teal',
        active: showPlayerNames,
      }),
      createMenuItem('import-roster', 'Import Roster', () => setShowImportDialog(true), { variant: 'primary' }),
      createMenuItem('auto-assign', 'Auto-Assign Positions', () => autoAssignPositions(), { variant: 'teal' }),
    ];
    sections.push(createMenuSection('players', 'Players', playerItems));

    // Ball Controls section (if ball exists)
    if (ball) {
      const ballItems = [
        createMenuItem('give-ball', selectedPlayer ? `Give Ball to #${selectedPlayer.number}` : 'Give Ball', handleAssignBall, {
          variant: 'warning',
          disabled: !selectedPlayerId,
        }),
      ];
      if (assignedPlayer) {
        ballItems.push(
          createMenuItem('release-ball', `Release (#${assignedPlayer.number})`, handleUnassignBall, { variant: 'danger' })
        );
      }
      if (isBallSelected) {
        if (!ballPath) {
          ballItems.push(
            createMenuItem('add-ball-path', 'Add Ball Path', handleCreateBallPath, { variant: 'indigo' })
          );
        } else {
          ballItems.push(
            createMenuItem('remove-ball-path', 'Remove Path', handleRemoveBallPath, { variant: 'danger' })
          );
        }
      }
      sections.push(createMenuSection('ball', 'Ball', ballItems));
    }

    // Teams section
    const team1Name = team1PresetId ? AFL_TEAMS.find(t => t.id === team1PresetId)?.abbreviation : null;
    const team2Name = team2PresetId ? AFL_TEAMS.find(t => t.id === team2PresetId)?.abbreviation : null;
    sections.push(
      createMenuSection('teams', 'Teams', [
        createMenuItem('team-select', `Jerseys${team1Name || team2Name ? ` (${team1Name ?? '?'} vs ${team2Name ?? '?'})` : ''}`, () => setShowTeamSelector(true), { variant: 'purple' }),
      ])
    );

    // Match section
    sections.push(
      createMenuSection('match', 'Match', [
        createMenuItem('match-setup', 'Match Setup', () => setShowMatchSetup(true), { variant: 'teal' }),
        createMenuItem('toggle-scoreboard', matchShowScoreboard ? 'Hide Scoreboard' : 'Show Scoreboard', toggleScoreboard, {
          variant: 'primary',
          active: matchShowScoreboard,
        }),
      ])
    );

    // Animation Playback section
    sections.push(
      createMenuSection('animation', 'Animation Playback', [
        createMenuItem('play-pause', isPlaying ? 'Pause' : 'Play Animation', togglePlayback, {
          variant: isPlaying ? 'warning' : 'success',
          active: isPlaying,
        }),
        createMenuItem('stop', 'Stop & Reset', handleStopAnimation, { variant: 'default' }),
      ])
    );

    // Video Recording section
    const recordingItems = [
      createMenuItem('recording', isRecording ? 'Stop Recording' : `Record Video (${exportFormat.toUpperCase()})`, handleRecordingToggle, {
        variant: isRecording ? 'danger' : 'default',
        active: isRecording,
        disabled: isConverting,
      }),
      createMenuItem('format-toggle', `Format: ${exportFormat.toUpperCase()}`, () => setExportFormat(exportFormat === 'mp4' ? 'webm' : 'mp4'), {
        variant: 'primary',
        disabled: isRecording || isConverting,
      }),
      createMenuItem('save-playbook', 'Save Playbook', () => setShowSaveDialog(true), { variant: 'warning' }),
    ];
    if (isConverting && conversionProgress) {
      const label = conversionProgress.phase === 'loading'
        ? 'Loading FFmpeg...'
        : `Converting: ${Math.round(conversionProgress.progress * 100)}%`;
      recordingItems.splice(1, 0, createMenuItem('converting', label, () => {}, {
        variant: 'warning',
        active: true,
        disabled: true,
      }));
    }
    sections.push(createMenuSection('recording', 'Video Recording', recordingItems));

    // Events section
    const eventItems = [
      createMenuItem('create-event', 'Create Event', () => setShowEventEditor(true), { variant: 'purple' }),
    ];
    if (activeEvent) {
      eventItems.push(
        createMenuItem('clear-event', `Clear: ${activeEvent.name}`, handleClearEvent, { variant: 'danger' })
      );
    }
    sections.push(createMenuSection('events', 'Events', eventItems));

    // POV section
    const povItems = [];
    if (povMode) {
      povItems.push(
        createMenuItem('exit-pov', `Exit POV (#${povPlayer?.number ?? '?'})`, disablePOV, { variant: 'danger' })
      );
    } else {
      povItems.push(
        createMenuItem('pov-mode', 'POV Mode', () => setShowPOVSelector(true), { variant: 'indigo' })
      );
    }
    sections.push(createMenuSection('pov', 'POV Camera', povItems));

    // Video section
    const videoItems = [];
    if (isVideoMode && isLoaded) {
      videoItems.push(
        createMenuItem('clear-video', 'Clear Video', clearVideo, { variant: 'danger' })
      );
    } else {
      videoItems.push(
        createMenuItem('import-video', isLoading ? 'Loading...' : 'Import Video', () => setShowVideoUploader(true), {
          variant: 'teal',
          disabled: isLoading,
        })
      );
    }
    sections.push(createMenuSection('video', 'Video', videoItems));

    // User section (if authenticated)
    if (authIsConfigured && authUser) {
      sections.push(
        createMenuSection('user', `Account: ${authUser.email ?? ''}`, [
          createMenuItem('sign-out', 'Sign Out', authSignOut, { variant: 'danger' }),
        ])
      );
    }

    return sections;
  }, [
    setPresetView, resetCamera, handleUndo, canUndo, clearPaths, paths.length,
    resetPlayers, showPlayerNames, togglePlayerNames, autoAssignPositions, ball, selectedPlayer,
    selectedPlayerId, handleAssignBall, assignedPlayer, handleUnassignBall,
    isBallSelected, ballPath, handleCreateBallPath, handleRemoveBallPath,
    isPlaying, togglePlayback, handleStopAnimation, isRecording, handleRecordingToggle,
    isConverting, conversionProgress, exportFormat, setExportFormat,
    activeEvent, handleClearEvent, povMode, povPlayer, disablePOV,
    isVideoMode, isLoaded, isLoading, clearVideo,
    authUser, authIsConfigured, authSignOut,
    team1PresetId, team2PresetId, matchShowScoreboard, toggleScoreboard,
  ]);

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 flex-wrap">
      {/* Hamburger menu - visible at all screen sizes */}
      <div>
        <HamburgerIcon isOpen={isMenuOpen} onClick={toggleMenu} />
      </div>

      {/* Menu dropdown */}
      <MobileMenu sections={mobileMenuSections} />

      {/* Selected player position selector */}
      {selectedPlayer && !isMenuOpen && (
        <div className="absolute top-4 right-36 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            #{selectedPlayer.number}{selectedPlayer.playerName ? ` ${selectedPlayer.playerName}` : ''}
          </span>
          <select
            value={selectedPlayer.positionName || ''}
            onChange={(e) => setPlayerPosition(selectedPlayer.id, e.target.value || undefined)}
            className="px-2 py-1 min-h-[36px] text-sm border rounded bg-white touch-manipulation"
          >
            <option value="">Position...</option>
            {AFL_POSITIONS.map((pos) => (
              <option key={pos.code} value={pos.code}>
                {pos.code} - {pos.name}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {/* Import Roster Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowImportDialog(false);
              setRosterText('');
              setSelectedTeam('all');
            }}
          />
          <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-[90vw] max-w-sm">
            <h3 className="text-lg font-bold mb-3">Import Roster</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as 'all' | 'team1' | 'team2')}
                  className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation"
                >
                  <option value="all">All Players</option>
                  <option value="team1">Team 1</option>
                  <option value="team2">Team 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Player Names *</label>
                <textarea
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  className="w-full px-3 py-2 border rounded font-mono text-sm touch-manipulation"
                  placeholder="Enter one player per line&#10;Format: Name, Position&#10;e.g.&#10;John Smith, FB&#10;Jane Doe, CHB&#10;Mike Johnson, RK"
                  rows={6}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setRosterText('');
                    setSelectedTeam('all');
                  }}
                  className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 min-h-[44px] bg-cyan-500 text-white rounded hover:bg-cyan-600 transition touch-manipulation"
                >
                  Import
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

      {/* POV Player Selector Modal */}
      {showPOVSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPOVSelector(false)}
          />
          <div className="relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[250px] max-h-[400px] overflow-y-auto">
            <div className="p-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Select Player for POV</span>
            </div>
            <div className="py-1">
              {selectedPlayer && (
                <button
                  onClick={() => handleSelectPOVPlayer(selectedPlayer.id)}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-sm hover:bg-indigo-50 flex items-center gap-2 border-b border-gray-100 touch-manipulation"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                    {selectedPlayer.number}
                  </span>
                  <span className="font-medium">Selected: #{selectedPlayer.number}</span>
                  {selectedPlayer.playerName && (
                    <span className="text-gray-500 text-xs">{selectedPlayer.playerName}</span>
                  )}
                </button>
              )}
              <div className="px-2 py-1 bg-blue-50 text-xs font-medium text-blue-700">Team 1</div>
              {players
                .filter(p => p.teamId === 'team1')
                .map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPOVPlayer(player.id)}
                    className="w-full min-h-[44px] px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2 touch-manipulation"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      {player.number}
                    </span>
                    <span>#{player.number}</span>
                    {player.playerName && (
                      <span className="text-gray-500 text-xs">{player.playerName}</span>
                    )}
                  </button>
                ))}
              <div className="px-2 py-1 bg-red-50 text-xs font-medium text-red-700">Team 2</div>
              {players
                .filter(p => p.teamId === 'team2')
                .map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPOVPlayer(player.id)}
                    className="w-full min-h-[44px] px-3 py-1.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 touch-manipulation"
                  >
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                      {player.number}
                    </span>
                    <span>#{player.number}</span>
                    {player.playerName && (
                      <span className="text-gray-500 text-xs">{player.playerName}</span>
                    )}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowPOVSelector(false)}
              className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Event Editor Modal */}
      {showEventEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEventEditor(false)}
          />
          {/* Modal content */}
          <div className="relative z-10">
            <EventEditor onClose={() => setShowEventEditor(false)} />
          </div>
        </div>
      )}

      {/* Team Selector Modal */}
      {showTeamSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTeamSelector(false)}
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
              onClick={() => setShowTeamSelector(false)}
              className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
            >
              Close
            </button>
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