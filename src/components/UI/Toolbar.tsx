import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { useHistoryStore } from '../../store/historyStore';
import { useVideoStore } from '../../store/videoStore';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useState, useEffect, useCallback } from 'react';
import { FormationSelector } from './FormationSelector';
import { VideoUploader } from '../VideoImport/VideoUploader';
import { EventEditor } from './EventEditor';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
}

export function Toolbar({ canvas }: ToolbarProps) {
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const showPlayerNames = usePlayerStore((state) => state.showPlayerNames);
  const togglePlayerNames = usePlayerStore((state) => state.togglePlayerNames);
  const importRoster = usePlayerStore((state) => state.importRoster);
  const editingPlayerId = usePlayerStore((state) => state.editingPlayerId);
  const stopEditingPlayerName = usePlayerStore((state) => state.stopEditingPlayerName);
  const setPlayerName = usePlayerStore((state) => state.setPlayerName);
  const getPlayer = usePlayerStore((state) => state.getPlayer);
  const selectedPlayerId = usePlayerStore((state) => state.selectedPlayerId);
  const players = usePlayerStore((state) => state.players);
  const updateMultiplePlayers = usePlayerStore((state) => state.updateMultiplePlayers);
  const { setPresetView, resetCamera, povMode, povPlayerId, enablePOV, disablePOV } = useCameraStore();
  const ball = useBallStore((state) => state.ball);
  const isBallSelected = useBallStore((state) => state.isBallSelected);
  const assignBallToPlayer = useBallStore((state) => state.assignBallToPlayer);
  const { isPlaying, progress, togglePlayback, stop } = useAnimationStore();
  const { createPath, getPathByEntity, removePath, clearPaths, paths } = usePathStore();
  const { isRecording, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const { undo, canUndo, pauseRecording, resumeRecording } = useHistoryStore();
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isLoading = useVideoStore((state) => state.isLoading);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const clearVideo = useVideoStore((state) => state.clearVideo);

  // Event store state
  const activeEventId = useEventStore((state) => state.activeEventId);
  const getActiveEvent = useEventStore((state) => state.getActiveEvent);
  const clearActiveEvent = useEventStore((state) => state.clearActiveEvent);
  const events = useEventStore((state) => state.events);
  const setActiveEvent = useEventStore((state) => state.setActiveEvent);
  const deleteEvent = useEventStore((state) => state.deleteEvent);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [rosterText, setRosterText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'team1' | 'team2'>('all');
  const [editingName, setEditingName] = useState('');
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showPOVSelector, setShowPOVSelector] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);

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

  const handleSavePlayerName = () => {
    if (editingPlayerId) {
      setPlayerName(editingPlayerId, editingName.trim());
      stopEditingPlayerName();
      setEditingName('');
    }
  };

  const handleCancelEditPlayerName = () => {
    stopEditingPlayerName();
    setEditingName('');
  };

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

  // Handle POV mode toggle
  const handleTogglePOV = useCallback(() => {
    if (povMode) {
      disablePOV();
    } else if (selectedPlayerId) {
      enablePOV(selectedPlayerId);
    }
    setShowPOVSelector(false);
  }, [povMode, selectedPlayerId, enablePOV, disablePOV]);

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

  // Handle deleting an event
  const handleDeleteEvent = useCallback((eventId: string) => {
    if (confirm('Delete this event?')) {
      deleteEvent(eventId);
    }
  }, [deleteEvent]);

  // Handle selecting an event from the custom dropdown
  const handleSelectEvent = useCallback((eventId: string | null) => {
    setActiveEvent(eventId);
    setShowEventDropdown(false);
  }, [setActiveEvent]);

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 flex-wrap">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex gap-2">
        {/* Camera Presets */}
        <button
          onClick={() => setPresetView('top')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Top View
        </button>
        <button
          onClick={() => setPresetView('sideline')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Sideline
        </button>
        <button
          onClick={() => setPresetView('end-to-end')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          End-to-End
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Player Controls */}
        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          className={`px-4 py-2 rounded transition ${
            canUndo()
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title="Undo last player move (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={clearPaths}
          disabled={paths.length === 0}
          className={`px-4 py-2 rounded transition ${
            paths.length > 0
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title="Clear all movement paths"
        >
          Clear Paths
        </button>
        <button
          onClick={resetPlayers}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Reset Players
        </button>
        <FormationSelector />
        <button
          onClick={togglePlayerNames}
          className={`px-4 py-2 rounded transition ${
            showPlayerNames
              ? 'bg-teal-500 text-white hover:bg-teal-600'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
        >
          {showPlayerNames ? '👤 Hide Names' : '👤 Show Names'}
        </button>
        <button
          onClick={() => setShowImportDialog(true)}
          className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
        >
          📋 Import Roster
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Ball Assignment Controls */}
        {ball && (
          <>
            <button
              onClick={handleAssignBall}
              disabled={!selectedPlayerId}
              className={`px-4 py-2 rounded transition ${
                selectedPlayerId
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={selectedPlayerId
                ? `Assign ball to ${selectedPlayer?.number || 'player'}`
                : 'Select a player first'}
            >
              🏈 Give Ball{selectedPlayer ? ` to #${selectedPlayer.number}` : ''}
            </button>
            {assignedPlayer && (
              <button
                onClick={handleUnassignBall}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                title="Release ball from player"
              >
                🏈 Release (#{assignedPlayer.number})
              </button>
            )}
            <div className="w-px bg-gray-300 mx-1" />
          </>
        )}

        {/* Ball Path Controls */}
        {ball && isBallSelected && (
          <>
            {!ballPath ? (
              <button
                onClick={handleCreateBallPath}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
                title="Create a test movement path for the ball"
              >
                ➕ Add Ball Path
              </button>
            ) : (
              <button
                onClick={handleRemoveBallPath}
                className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500 transition"
                title="Remove ball movement path"
              >
                ➖ Remove Path
              </button>
            )}
            <div className="w-px bg-gray-300 mx-1" />
          </>
        )}

        {/* Animation Playback Controls */}
        <button
          onClick={togglePlayback}
          className={`px-4 py-2 rounded transition ${
            isPlaying
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
: 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={handleStopAnimation}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          title="Stop animation and reset to start"
        >
          ⏹ Stop
        </button>
        <span className="px-2 py-2 text-sm text-gray-600 bg-gray-100 rounded">
          {Math.round(progress * 100)}%
        </span>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Camera Controls */}
        <button
          onClick={resetCamera}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
        >
          Reset Camera
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Video Recording */}
        <button
          onClick={handleRecordingToggle}
          className={`px-4 py-2 rounded transition ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
        >
          {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Save Playbook */}
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
        >
          Save Playbook
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Event Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEventEditor(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition flex items-center gap-1"
            title="Create a new animation event"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Event
          </button>
          {/* Event Counter Badge */}
          {events.length > 0 && (
            <span className="bg-purple-200 text-purple-800 text-xs rounded-full px-2 py-1">
              {events.length}
            </span>
          )}
        </div>

        {/* Event Selector - Custom dropdown with preview */}
        {events.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className={`px-3 py-2 bg-purple-100 border border-purple-300 text-purple-800 rounded hover:bg-purple-200 transition cursor-pointer text-sm flex items-center gap-2 min-w-[160px] ${
                showEventDropdown ? 'bg-purple-200' : ''
              }`}
              title="Select an event to play"
            >
              <span className="flex-1 text-left truncate">
                {activeEvent ? activeEvent.name : 'Select Event...'}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showEventDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Custom Dropdown */}
            {showEventDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[250px] max-h-[300px] overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Select Event</span>
                </div>
                <div className="py-1">
                  {/* Clear selection option */}
                  <button
                    onClick={() => handleSelectEvent(null)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      !activeEventId ? 'bg-purple-50' : ''
                    }`}
                  >
                    <span className="text-gray-500 italic">No event selected</span>
                  </button>
                  {/* Event list */}
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex flex-col gap-0.5 ${
                        activeEventId === event.id ? 'bg-purple-100' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-800">{event.name}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatEventTime(event.duration)}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>{event.playerPaths.length} player{event.playerPaths.length !== 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowEventDropdown(false)}
                  className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete Event Button - show when an event is selected */}
        {activeEventId && (
          <button
            onClick={() => handleDeleteEvent(activeEventId)}
            className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
            title="Delete event"
            aria-label="Delete event"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}

        {/* Active Event Indicator */}
        {activeEvent && (
          <div className="flex items-center gap-1">
            <span className="px-3 py-2 bg-purple-100 text-purple-800 rounded text-sm font-medium flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {activeEvent.name}
            </span>
            <button
              onClick={handleClearEvent}
              className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
              title="Clear active event"
              aria-label="Clear active event"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="w-px bg-gray-300 mx-1" />

        {/* POV Camera Controls */}
        <div className="relative">
          {povMode ? (
            <div className="flex items-center gap-1">
              <span className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded text-sm font-medium flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                POV: #{povPlayer?.number ?? '?'}
              </span>
              <button
                onClick={disablePOV}
                className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                title="Exit POV mode"
                aria-label="Exit POV mode"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowPOVSelector(!showPOVSelector)}
                className={`px-4 py-2 rounded transition flex items-center gap-1 ${
                  showPOVSelector
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
                title="Enable POV camera mode"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                POV Mode
              </button>

              {/* POV Player Selector Dropdown */}
              {showPOVSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Select Player for POV</span>
                  </div>
                  <div className="py-1">
                    {/* Quick option: selected player */}
                    {selectedPlayer && (
                      <button
                        onClick={() => handleSelectPOVPlayer(selectedPlayer.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 flex items-center gap-2 border-b border-gray-100"
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
                    {/* Team 1 Players */}
                    <div className="px-2 py-1 bg-blue-50 text-xs font-medium text-blue-700">Team 1</div>
                    {players
                      .filter(p => p.teamId === 'team1')
                      .map(player => (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPOVPlayer(player.id)}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
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
                    {/* Team 2 Players */}
                    <div className="px-2 py-1 bg-red-50 text-xs font-medium text-red-700">Team 2</div>
                    {players
                      .filter(p => p.teamId === 'team2')
                      .map(player => (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPOVPlayer(player.id)}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 flex items-center gap-2"
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
                    className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Video Import Controls */}
        {isVideoMode && isLoaded ? (
          <>
            {/* Show video info and clear button when video is loaded */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 bg-teal-100 text-teal-800 rounded text-sm font-medium flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {videoMetadata?.fileName || 'Video Loaded'}
              </span>
              <button
                onClick={clearVideo}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition flex items-center gap-1"
                aria-label="Clear video and return to field mode"
                title="Clear video and return to field mode"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Video
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setShowVideoUploader(true)}
            disabled={isLoading}
            className={`px-4 py-2 rounded transition flex items-center gap-2 ${
              isLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}
            aria-label="Import video file"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {isLoading ? 'Loading...' : 'Import Video'}
          </button>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[300px]">
          <h3 className="text-lg font-bold mb-3">Save Playbook</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={playbookName}
                onChange={(e) => setPlaybookName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter playbook name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={playbookDescription}
                onChange={(e) => setPlaybookDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded"
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
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Roster Dialog */}
      {showImportDialog && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[350px]">
          <h3 className="text-lg font-bold mb-3">Import Roster</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value as 'all' | 'team1' | 'team2')}
                className="w-full px-3 py-2 border rounded"
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
                className="w-full px-3 py-2 border rounded font-mono text-sm"
                placeholder="Enter one name per line&#10;e.g.&#10;John Smith&#10;Jane Doe&#10;Mike Johnson"
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
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
              >
                Import
              </button>
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
    </div>
  );
}