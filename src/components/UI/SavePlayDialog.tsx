import { useState } from 'react';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';

export function SavePlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const { saveCurrentPlay } = usePlaybook();
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');

  if (!open) return null;

  const handleClose = () => {
    onClose();
    setPlaybookName('');
    setPlaybookDescription('');
  };

  const handleSave = async () => {
    if (!playbookName.trim()) {
      alert('Please enter a name for the playbook');
      return;
    }

    try {
      await saveCurrentPlay(playbookName);
      onClose();
      setPlaybookName('');
      setPlaybookDescription('');
      alert('Playbook saved successfully!');
    } catch (error) {
      console.error('Error saving playbook:', error);
      alert('Failed to save playbook. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
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
              onClick={handleClose}
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
  );
}
