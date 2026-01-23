import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { useHistoryStore } from '../../store/historyStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useState, useEffect, useCallback } from 'react';
import { FormationSelector } from './FormationSelector';

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
  const { setPresetView, resetCamera } = useCameraStore();
  const ball = useBallStore((state) => state.ball);
  const isBallSelected = useBallStore((state) => state.isBallSelected);
  const assignBallToPlayer = useBallStore((state) => state.assignBallToPlayer);
  const { isPlaying, progress, togglePlayback, stop } = useAnimationStore();
  const { createPath, getPathByEntity, removePath, clearPaths, paths } = usePathStore();
  const { isRecording, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const { undo, canUndo, pauseRecording, resumeRecording } = useHistoryStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [rosterText, setRosterText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'team1' | 'team2'>('all');
  const [editingName, setEditingName] = useState('');

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
                <option value="team1">Team 1 (Home)</option>
                <option value="team2">Team 2 (Away)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Player Names (one per line)
              </label>
              <textarea
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
                placeholder="John Smith
Jane Doe
..."
                rows={8}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Names will be assigned to players in order
              </p>
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

      {/* Edit Player Name Dialog */}
      {editingPlayerId && editingPlayer && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[280px]">
          <h3 className="text-lg font-bold mb-3">Edit Player Name</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Player #{editingPlayer.number}
              </label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePlayerName();
                  } else if (e.key === 'Escape') {
                    handleCancelEditPlayerName();
                  }
                }}
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter player name"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEditPlayerName}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlayerName}
                className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
