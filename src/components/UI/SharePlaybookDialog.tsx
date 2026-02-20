import { useState } from 'react';
import { sharePlaybook } from '../../services/sharingService';
import type { Playbook } from '../../store/playbookStore';

interface SharePlaybookDialogProps {
  playbook: Playbook;
  onClose: () => void;
}

export function SharePlaybookDialog({ playbook, onClose }: SharePlaybookDialogProps) {
  const [expiryDays, setExpiryDays] = useState<number | undefined>(7);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    const result = await sharePlaybook(playbook, undefined, expiryDays);
    setIsSharing(false);

    if (result) {
      setShareUrl(result.url);
    } else {
      alert('Failed to share playbook. Please try again.');
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Share Playbook</h3>
        <p className="text-sm text-gray-600 mb-4">
          Share "{playbook.name}" with a link.
        </p>

        {!shareUrl ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Link Expiry</label>
              <select
                value={expiryDays ?? 'never'}
                onChange={(e) => setExpiryDays(e.target.value === 'never' ? undefined : Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition"
              >
                {isSharing ? 'Sharing...' : 'Create Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-2 py-1 text-sm bg-transparent border-none focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Done
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
