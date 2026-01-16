import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useState } from 'react';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
}

export function Toolbar({ canvas }: ToolbarProps) {
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const selectedPlayerId = usePlayerStore((state) => state.selectedPlayerId);
  const players = usePlayerStore((state) => state.players);
  const { setPresetView, resetCamera } = useCameraStore();
  const ball = useBallStore((state) => state.ball);
  const isBallSelected = useBallStore((state) => state.isBallSelected);
  const assignBallToPlayer = useBallStore((state) => state.assignBallToPlayer);
  const { isPlaying, progress, togglePlay, stop } = useAnimationStore();
  const { createPath, getPathByEntity, removePath } = usePathStore();
  const { isRecording, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');

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
          onClick={resetPlayers}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Reset Players
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
          onClick={togglePlay}
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
    </div>
  );
}
