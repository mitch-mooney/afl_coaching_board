import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { getSharedPlaybook } from '../../services/sharingService';
import type { SharedPlaybook } from '../../services/sharingService';
import { fromShareData, designedGroundOf } from '../../utils/boardSnapshot';
import { boardAt } from '../../utils/boardPlayback';
import { boundaryOf } from '../../utils/fieldGeometry';
import { capture, restore } from '../../utils/boardSnapshotIO';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { PathManager } from '../Scene/Path';
import { CameraController } from '../Scene/CameraController';
import { fonts, palette, radii, typeStyle, withAlpha } from '../../theme/tokens';

type Step = 'loading' | 'error' | 'video' | 'board';

/**
 * The viewer's chrome, from the design tokens: a Concrete page with Chalk
 * text, the same as the app the coach uses. The ground inside the `<Canvas>`
 * is the board's own concern (`Field`), not this file's.
 */
const page: CSSProperties = {
  minHeight: '100vh',
  background: palette.concrete,
  color: palette.chalk,
  fontFamily: fonts.body,
};

const chalkDim = withAlpha(palette.chalk, 0.65);

/** A quiet bordered button: Stay on clip, Skip to board diagram, Replay clip. */
const quietButton: CSSProperties = {
  ...typeStyle('label'),
  background: 'none',
  border: `1px solid ${palette.steel}`,
  borderRadius: radii.control,
  padding: '10px 14px',
  minHeight: 44,
  color: chalkDim,
  cursor: 'pointer',
};

/**
 * Which step the recipient is on. A state, so it is lit in Floodlight; the
 * two steps differ only in their words.
 */
function StepBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        border: `1px solid ${withAlpha(palette.floodlight, 0.4)}`,
        background: withAlpha(palette.floodlight, 0.12),
        borderRadius: radii.chip,
        padding: '3px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: radii.pill, background: palette.floodlight }} />
      <span style={{ ...typeStyle('caption'), color: palette.floodlight, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export function SharedPlaybookViewer() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [data, setData] = useState<SharedPlaybook | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) { setStep('error'); return; }
    getSharedPlaybook(token).then(shared => {
      if (!shared) { setStep('error'); return; }
      setData(shared);
      setStep(shared.video_url ? 'video' : 'board');
    });
  }, [token]);

  // Seed stores when entering board step; put the prior board back on leave.
  // Render the play's end state via boardAt(…, 1): tokens and the ball sit at
  // their path ends while PathManager draws the arrows showing how they got
  // there. A play with no movement renders its arranged positions unchanged.
  useEffect(() => {
    if (step !== 'board' || !data) return;
    const previous = capture();
    restore(boardAt(fromShareData(data.playbook_data), 1));
    return () => {
      restore(previous);
    };
  }, [step, data]);

  const goToBoard = useCallback(() => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setCountdown(null);
    setStep('board');
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setCountdown(2);
    countdownRef.current = setTimeout(() => {
      setCountdown(1);
      countdownRef.current = setTimeout(() => {
        goToBoard();
      }, 1000);
    }, 1000);
  }, [goToBoard]);

  useEffect(() => () => { if (countdownRef.current) clearTimeout(countdownRef.current); }, []);

  // This viewer renders on the sender's ground, not on an Active Venue — a
  // recipient's app may not have one, and the spacing only means what the author
  // meant against the boundary they drew it on. See `DesignedGround` in
  // `utils/boardSnapshot`. Named as well as sized, so the recipient can judge
  // whether the play transfers to their own ground.
  const ground = useMemo(() => (data ? designedGroundOf(data.playbook_data) : null), [data]);
  const boundary = useMemo(() => (ground ? boundaryOf(ground) : undefined), [ground]);

  if (step === 'loading') {
    return (
      <div style={{ ...page, ...typeStyle('body'), color: chalkDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  if (step === 'error' || !data) {
    return (
      <div style={{ ...page, ...typeStyle('body'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p>Invalid or expired share link.</p>
        <Link to="/" style={{ ...typeStyle('label'), color: palette.chalk, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Go to Coaching Board
        </Link>
      </div>
    );
  }

  const pd = data.playbook_data;

  return (
    <div style={{ ...page, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: palette.concrete, borderBottom: `1px solid ${palette.steel}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* The app's mark: a patch of lit turf edged in chalk. */}
        <div style={{ width: 22, height: 22, background: palette.turfLit, border: `1.5px solid ${palette.chalk}`, borderRadius: radii.chip / 2, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...typeStyle('title'), color: palette.chalk }}>{pd.name ?? 'Shared Play'}</div>
          {ground && (
            <div style={{ ...typeStyle('caption'), color: chalkDim }}>
              Designed at {ground.name} · {ground.boundaryLength} × {ground.boundaryWidth} m
            </div>
          )}
          <div style={{ ...typeStyle('caption'), color: withAlpha(palette.chalk, 0.45) }}>AFL Coaching Board</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StepBadge label={step === 'video' ? 'Watch clip' : 'Board'} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 'video' && data.video_url && (
          <>
            <div style={{ position: 'relative', background: palette.concrete, flex: '0 0 auto' }}>
              <video
                ref={videoRef}
                src={data.video_url}
                autoPlay
                playsInline
                controls
                onEnded={handleVideoEnded}
                style={{ width: '100%', maxHeight: '60vh', display: 'block' }}
              />
              {(pd.quarter || pd.label) && (
                <div style={{ position: 'absolute', bottom: 40, left: 12, background: withAlpha(palette.concrete, 0.8), borderLeft: `3px solid ${palette.chalk}`, padding: '4px 8px' }}>
                  {pd.quarter && <div style={{ ...typeStyle('number'), color: palette.chalk }}>{pd.quarter}</div>}
                  {pd.label && <div style={{ ...typeStyle('caption'), color: chalkDim }}>{pd.label}</div>}
                </div>
              )}
              {countdown !== null && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: withAlpha(palette.concrete, 0.6) }}>
                  <div style={{ textAlign: 'center', color: palette.chalk }}>
                    <div style={{ ...typeStyle('body'), marginBottom: 8 }}>Board diagram in {countdown}…</div>
                    <button onClick={() => {
                      if (countdownRef.current) clearTimeout(countdownRef.current);
                      countdownRef.current = null;
                      setCountdown(null);
                    }} style={quietButton}>
                      Stay on clip
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={goToBoard} style={quietButton}>
                Skip to board diagram →
              </button>
            </div>
          </>
        )}

        {step === 'board' && (
          <>
            <div style={{ flex: 1, minHeight: '60vh', position: 'relative' }}>
              <Canvas
                camera={{ position: pd.cameraPosition ?? [0, 100, 150], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
                style={{ width: '100%', height: '100%', touchAction: 'none' }}
              >
                <color attach="background" args={['#020a02']} />
                <ambientLight intensity={0.3} />
                <pointLight position={[0, 80, 0]} intensity={2} color="#00ff88" />
                <Field darkMode boundary={boundary} />
                <PlayerManager readOnly />
                <PathManager paths={pd.paths ?? []} />
                <CameraController />
              </Canvas>
            </div>

            <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
              {data.video_url && (
                <button
                  onClick={() => setStep('video')}
                  style={{ ...quietButton, flex: 1, textAlign: 'center' }}
                >
                  🎬 Replay clip
                </button>
              )}
              <button
                onClick={() => setStep(data.video_url ? 'video' : 'board')}
                style={{ ...quietButton, flex: 1, textAlign: 'center', background: palette.chalk, border: `1px solid ${palette.chalk}`, color: palette.concrete }}
              >
                ↺ Replay all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
