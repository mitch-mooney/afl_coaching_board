import { useState } from 'react';
import { usePlayStore } from '../../store/playStore';
import { useVideoStore } from '../../store/videoStore';
import { sharePlay } from '../../services/sharingService';

type ShareState = 'idle' | 'working' | 'done' | 'error' | 'tooLarge';

interface Progress {
  phase: string;
  p: number;
}

export function SharePlayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activePlayId = usePlayStore((s) => s.activePlayId);
  const activePlay = usePlayStore((s) => s.plays.find((p) => p.id === s.activePlayId));
  const videoFile = useVideoStore((s) => s.videoFile);

  const [state, setState] = useState<ShareState>('idle');
  const [progress, setProgress] = useState<Progress>({ phase: '', p: 0 });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("Couldn't create a share link. Try again.");
  const [retryable, setRetryable] = useState(true);

  if (!open) return null;

  const hasClip = Boolean(activePlay?.linkedVideoMoment && videoFile);
  const blockedReason = activePlayId == null ? 'Save this play first.' : null;

  const handleClose = () => {
    onClose();
    setState('idle');
    setProgress({ phase: '', p: 0 });
    setShareUrl(null);
    setCopied(false);
  };

  const runShare = async (blob: Blob | null) => {
    if (activePlayId == null) return;
    setState('working');
    const result = await sharePlay(activePlayId, blob, (phase, p) => setProgress({ phase, p }));
    if ('url' in result) {
      setShareUrl(result.url);
      setState('done');
      return;
    }
    if ('clipTooLarge' in result) {
      setState('tooLarge');
      return;
    }
    // A typed failure reason — explain no-content specifically; it isn't retryable.
    if (result.reason === 'no-content') {
      setErrorMsg('Arrange players and save this play before you can share it.');
      setRetryable(false);
    } else {
      setErrorMsg("Couldn't create a share link. Try again.");
      setRetryable(true);
    }
    setState('error');
  };

  const handleCreate = () => {
    void runShare(hasClip ? videoFile : null);
  };

  const handleBoardOnly = () => {
    void runShare(null);
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => {
        console.error('[SharePlayModal] copy failed', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-[90vw] max-w-sm">
        <h3 className="text-lg font-bold mb-3">Share Play</h3>

        {blockedReason ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{blockedReason}</p>
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {state === 'idle' && (
              <>
                <p className="text-sm text-gray-600">
                  {hasClip ? 'Board + video clip' : 'Board diagram'}
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 min-h-[44px] bg-orange-500 text-white rounded hover:bg-orange-600 transition touch-manipulation"
                  >
                    Create share link
                  </button>
                </div>
              </>
            )}

            {state === 'working' && (
              <>
                <p className="text-sm text-gray-600">{progress.phase || 'Working…'}</p>
                <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all"
                    style={{ width: `${Math.round(progress.p * 100)}%` }}
                  />
                </div>
              </>
            )}

            {state === 'done' && shareUrl && (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full px-3 py-2 min-h-[44px] border rounded touch-manipulation text-sm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 min-h-[44px] bg-orange-500 text-white rounded hover:bg-orange-600 transition touch-manipulation"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </>
            )}

            {state === 'tooLarge' && (
              <>
                <p className="text-sm text-red-600">Clip too large — try a shorter moment</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBoardOnly}
                    className="px-4 py-2 min-h-[44px] bg-orange-500 text-white rounded hover:bg-orange-600 transition touch-manipulation"
                  >
                    Share board only
                  </button>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <p className="text-sm text-red-600">{errorMsg}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition touch-manipulation"
                  >
                    Close
                  </button>
                  {retryable && (
                    <button
                      onClick={handleCreate}
                      className="px-4 py-2 min-h-[44px] bg-orange-500 text-white rounded hover:bg-orange-600 transition touch-manipulation"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
