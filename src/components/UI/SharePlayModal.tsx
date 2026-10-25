import { useEffect, useState } from 'react';
import { usePlayStore } from '../../store/playStore';
import { useVideoStore } from '../../store/videoStore';
import { sharePlay } from '../../services/sharingService';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogBody,
  dialogButton,
  dialogError,
  dialogField,
  dialogLayer,
  dialogPanel,
  dialogPrimaryButton,
  dialogScrim,
  dialogTitle,
} from './dialogStyles';

type ShareState = 'idle' | 'working' | 'done' | 'error' | 'tooLarge';

interface Progress {
  phase: string;
  p: number;
}

export function SharePlayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const activePlayId = usePlayStore((s) => s.activePlayId);
  const activePlay = usePlayStore((s) => s.plays.find((p) => p.id === s.activePlayId));
  const videoFile = useVideoStore((s) => s.videoFile);

  const [state, setState] = useState<ShareState>('idle');
  const [progress, setProgress] = useState<Progress>({ phase: '', p: 0 });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("Couldn't create a share link. Try again.");
  const [retryable, setRetryable] = useState(true);

  // Reset to a clean idle state each time the modal opens — it stays mounted
  // (returns null when closed), so a prior 'done'/URL would otherwise leak into
  // the next open (e.g. reopening for a different play).
  useEffect(() => {
    if (open) {
      setState('idle');
      setProgress({ phase: '', p: 0 });
      setShareUrl(null);
      setCopied(false);
    }
  }, [open]);

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
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={handleClose} />
      <div className={`${dialogPanel} max-w-sm p-lg`}>
        <h3 className={`${dialogTitle} mb-md`}>Share Play</h3>

        {blockedReason ? (
          <div className="space-y-md">
            <p className={dialogBody}>{blockedReason}</p>
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className={dialogButton}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-md">
            {state === 'idle' && (
              <>
                <p className={dialogBody}>
                  {hasClip ? 'Board + video clip' : 'Board diagram'}
                </p>
                <div className="flex gap-sm justify-end">
                  <button
                    onClick={handleClose}
                    className={dialogButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className={dialogPrimaryButton}
                  >
                    Create share link
                  </button>
                </div>
              </>
            )}

            {state === 'working' && (
              <>
                <p className={dialogBody}>{progress.phase || 'Working…'}</p>
                <div className="w-full h-2 bg-steel rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-chalk motion-safe:transition-all"
                    style={{ width: `${Math.round(progress.p * 100)}%` }}
                  />
                </div>
              </>
            )}

            {state === 'done' && shareUrl && (
              <>
                <div className="flex gap-sm">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className={dialogField}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
                <div className="flex gap-sm justify-end">
                  <button
                    onClick={handleClose}
                    className={dialogButton}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCopy}
                    className={dialogPrimaryButton}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </>
            )}

            {state === 'tooLarge' && (
              <>
                <p className={dialogError}>Clip too large — try a shorter moment</p>
                <div className="flex gap-sm justify-end">
                  <button
                    onClick={handleClose}
                    className={dialogButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBoardOnly}
                    className={dialogPrimaryButton}
                  >
                    Share board only
                  </button>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <p className={dialogError}>{errorMsg}</p>
                <div className="flex gap-sm justify-end">
                  <button
                    onClick={handleClose}
                    className={dialogButton}
                  >
                    Close
                  </button>
                  {retryable && (
                    <button
                      onClick={handleCreate}
                      className={dialogPrimaryButton}
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
