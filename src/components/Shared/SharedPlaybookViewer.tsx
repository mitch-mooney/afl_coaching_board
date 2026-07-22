import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { getSharedPlaybook } from '../../services/sharingService';
import type { SharedPlaybook } from '../../services/sharingService';
import { fromShareData } from '../../utils/boardSnapshot';
import { capture, restore } from '../../utils/boardSnapshotIO';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { PathManager } from '../Scene/Path';
import { CameraController } from '../Scene/CameraController';

type Step = 'loading' | 'error' | 'video' | 'board';

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
  useEffect(() => {
    if (step !== 'board' || !data) return;
    const previous = capture();
    restore(fromShareData(data.playbook_data));
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

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050510', color: '#8888aa', fontFamily: 'sans-serif' }}>
        Loading…
      </div>
    );
  }

  if (step === 'error' || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050510', color: '#fff', gap: 16, fontFamily: 'sans-serif' }}>
        <p>Invalid or expired share link.</p>
        <Link to="/" style={{ color: '#00d4aa' }}>Go to Coaching Board</Link>
      </div>
    );
  }

  const pd = data.playbook_data;

  return (
    <div style={{ minHeight: '100vh', background: '#050510', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(10,10,26,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1a1a3a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 5, flexShrink: 0 }} />
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{pd.name ?? 'Shared Play'}</div>
          <div style={{ color: '#4444aa', fontSize: 10 }}>AFL Coaching Board</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {step === 'video' ? (
            <div style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa' }} />
              <span style={{ color: '#00d4aa', fontSize: 10, fontWeight: 600 }}>WATCH CLIP</span>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,153,255,0.15)', border: '1px solid rgba(0,153,255,0.3)', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0099ff' }} />
              <span style={{ color: '#0099ff', fontSize: 10, fontWeight: 600 }}>BOARD</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 'video' && data.video_url && (
          <>
            <div style={{ position: 'relative', background: '#000', flex: '0 0 auto' }}>
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
                <div style={{ position: 'absolute', bottom: 40, left: 12, background: 'rgba(0,0,0,0.7)', borderLeft: '3px solid #e8a020', padding: '4px 8px' }}>
                  {pd.quarter && <div style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{pd.quarter}</div>}
                  {pd.label && <div style={{ color: '#aaa', fontSize: 9 }}>{pd.label}</div>}
                </div>
              )}
              {countdown !== null && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>Board diagram in {countdown}…</div>
                    <button onClick={() => {
                      if (countdownRef.current) clearTimeout(countdownRef.current);
                      countdownRef.current = null;
                      setCountdown(null);
                    }} style={{ background: 'none', border: '1px solid #ffffff44', borderRadius: 5, padding: '4px 12px', color: '#aaa', fontSize: 11, cursor: 'pointer' }}>
                      Stay on clip
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={goToBoard} style={{ background: 'none', border: '1px solid #1e1e3f', borderRadius: 6, padding: '7px 14px', color: '#4444aa', fontSize: 11, cursor: 'pointer' }}>
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
                <Field darkMode />
                <PlayerManager readOnly />
                <PathManager paths={pd.paths ?? []} />
                <CameraController />
              </Canvas>
            </div>

            <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
              {data.video_url && (
                <button
                  onClick={() => setStep('video')}
                  style={{ flex: 1, border: '1px solid #1a1a3a', borderRadius: 6, padding: '8px', textAlign: 'center', color: '#4444aa', fontSize: 11, cursor: 'pointer', background: 'none' }}
                >
                  🎬 Replay clip
                </button>
              )}
              <button
                onClick={() => setStep(data.video_url ? 'video' : 'board')}
                style={{ flex: 1, background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 6, padding: '8px', textAlign: 'center', color: '#00d4aa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
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
