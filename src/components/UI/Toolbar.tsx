import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';
import { useVideoStore } from '../../store/videoStore';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';
import { usePlaybook } from '../../hooks/usePlaybook';
import { VideoUploader } from '../VideoImport/VideoUploader';
import { useState } from 'react';

interface ToolbarProps {
  canvas: HTMLCanvasElement | null;
}

export function Toolbar({ canvas }: ToolbarProps) {
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const { setPresetView, resetCamera } = useCameraStore();
  const { isRecording, toggleRecording } = useVideoRecorder(canvas);
  const { saveCurrentScenario } = usePlaybook();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');

  // Video mode state
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isLoading = useVideoStore((state) => state.isLoading);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const clearVideo = useVideoStore((state) => state.clearVideo);
  
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
    </div>
  );
}
