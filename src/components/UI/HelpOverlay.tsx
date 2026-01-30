import { useState } from 'react';

export function HelpOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition text-sm"
      >
        ❓ Help
      </button>
    );
  }
  
  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">Help & Instructions</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold text-lg mb-2">Camera Controls</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Rotate:</strong> Left-click and drag</li>
              <li><strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
              <li><strong>Pan:</strong> Right-click and drag (or middle mouse button)</li>
              <li><strong>Preset Views:</strong> Use toolbar buttons for quick camera positions</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-semibold text-lg mb-2">Player Controls</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Select Player:</strong> Click on a player</li>
              <li><strong>Move Player:</strong> Click and drag a player to reposition</li>
              <li><strong>Reset Players:</strong> Use "Reset Players" button in toolbar</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-semibold text-lg mb-2">Video Recording</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click "Start Recording" to begin capturing</li>
              <li>Click "Stop Recording" to finish and download the video</li>
              <li>Videos are exported as WebM format</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-semibold text-lg mb-2">Playbooks</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Save your current scenario with "Save Playbook"</li>
              <li>Load saved scenarios from the Playbooks panel</li>
              <li>Playbooks are stored locally in your browser</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-semibold text-lg mb-2">Annotations</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Select an annotation tool from the bottom toolbar</li>
              <li>Click and drag on the field to draw</li>
              <li>Change colors and thickness using the toolbar</li>
              <li>Clear all annotations with the "Clear" button</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Video Import</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Import Video:</strong> Click "Import Video" in the toolbar to load game footage (MP4 or WebM)</li>
              <li><strong>Drag & Drop:</strong> You can also drag video files directly onto the upload area</li>
              <li><strong>Video Workspace:</strong> Once loaded, you'll enter the video workspace with timeline controls</li>
              <li><strong>Overlay Players:</strong> Position 3D player models over the video to analyze plays</li>
              <li><strong>Exit Video Mode:</strong> Click the "X" button or press Escape to return to normal field view</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Video Playback Shortcuts</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Space:</strong> Play/Pause video</li>
              <li><strong>Left/Right Arrows:</strong> Step back/forward one frame</li>
              <li><strong>Shift + Left/Right:</strong> Skip back/forward 5 seconds</li>
              <li><strong>Home / End:</strong> Jump to start/end of video</li>
              <li><strong>J:</strong> Slow down playback speed</li>
              <li><strong>K:</strong> Pause playback</li>
              <li><strong>L:</strong> Speed up playback</li>
              <li><strong>Tab:</strong> Toggle sidebar visibility</li>
              <li><strong>Escape:</strong> Exit video mode</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Perspective Calibration</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Open Calibration Panel:</strong> Click the "Calibration" tab in the sidebar</li>
              <li><strong>Camera Position:</strong> Adjust X, Y, Z sliders to move the camera viewpoint</li>
              <li><strong>Camera Rotation:</strong> Use Pitch, Yaw, Roll sliders to rotate the view</li>
              <li><strong>Field of View:</strong> Widen or narrow the perspective (30° - 120°)</li>
              <li><strong>Field Scale:</strong> Resize the 3D field to match the video</li>
              <li><strong>Field Opacity:</strong> Make the field semi-transparent to see through it</li>
              <li><strong>Calibration Mode:</strong> Lock orbit controls for precise adjustments</li>
              <li><strong>Calibration Grid:</strong> Enable grid overlay to help align field markings</li>
              <li><strong>Save Calibration:</strong> Save your settings for future sessions</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Video Export</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Open Export Panel:</strong> Click the "Export" tab in the sidebar</li>
              <li><strong>Format Selection:</strong> Choose WebM or MP4 output format</li>
              <li><strong>Resolution:</strong> Select 720p, 1080p, or original resolution</li>
              <li><strong>Include Audio:</strong> Toggle to include the original audio track</li>
              <li><strong>Export:</strong> Click "Start Export" to render and download the video with 3D overlays</li>
              <li><strong>Cancel:</strong> Stop an in-progress export if needed</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
