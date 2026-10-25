import { useState } from 'react';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogButton,
  dialogField,
  dialogLabel,
  dialogLayer,
  dialogPanel,
  dialogPrimaryButton,
  dialogScrim,
  dialogTitle,
} from './dialogStyles';

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
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={handleClose} />
      <div className={`${dialogPanel} max-w-sm p-lg`}>
        <h3 className={`${dialogTitle} mb-md`}>Save Playbook</h3>
        <div className="space-y-md">
          <div>
            <label className={dialogLabel}>Name *</label>
            <input
              type="text"
              value={playbookName}
              onChange={(e) => setPlaybookName(e.target.value)}
              className={dialogField}
              placeholder="Enter playbook name"
              autoFocus
            />
          </div>
          <div>
            <label className={dialogLabel}>Description</label>
            <textarea
              value={playbookDescription}
              onChange={(e) => setPlaybookDescription(e.target.value)}
              className={dialogField}
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
          <div className="flex gap-sm justify-end">
            <button
              onClick={handleClose}
              className={dialogButton}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={dialogPrimaryButton}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
