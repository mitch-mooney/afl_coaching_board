import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useState } from 'react';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
}

export function Toolbar({ canvas }: ToolbarProps) {
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const showPlayerNames = usePlayerStore((state) => state.showPlayerNames);
  const togglePlayerNames = usePlayerStore((state) => state.togglePlayerNames);
  const importRoster = usePlayerStore((state) => state.importRoster);
  const { setPresetView, resetCamera } = useCameraStore();
  const { isRecording, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [rosterText, setRosterText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'team1' | 'team2'>('all');
  
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
          onClick={resetPlayers}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Reset Players
        </button>
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
    </div>
  );
}
