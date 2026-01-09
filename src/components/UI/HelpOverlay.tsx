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
        </div>
      </div>
    </div>
  );
}
