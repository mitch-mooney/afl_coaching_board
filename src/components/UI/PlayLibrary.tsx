// src/components/UI/PlayLibrary.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayStore } from '../../store/playStore';
import { usePlaybookStore } from '../../store/playbookStore';
import { useRosterStore } from '../../store/rosterStore';
import { videoDb } from '../../store/videoStore';
import type { Play } from '../../models/PlayModel';

async function videoMetadataExists(videoId: number): Promise<boolean> {
  try {
    const record = await videoDb.videos.get(videoId);
    return record != null;
  } catch {
    return false;
  }
}

type FilterMode = 'all' | 'linked' | 'board-only';

export function PlayLibrary() {
  const { plays, loadPlays, createPlay, deletePlay } = usePlayStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [videoAvailability, setVideoAvailability] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadPlays();
    loadRosters();
  }, [loadPlays, loadRosters]);

  useEffect(() => {
    const linked = plays.filter(p => p.linkedVideoMoment);
    Promise.all(
      linked.map(async (p) => {
        const exists = await videoMetadataExists(p.linkedVideoMoment!.videoId);
        return [p.id!, exists] as [number, boolean];
      })
    ).then(results => {
      const map: Record<number, boolean> = {};
      results.forEach(([id, exists]) => { map[id] = exists; });
      setVideoAvailability(map);
    });
  }, [plays]);

  const handleNew = async () => {
    const playbookId = await usePlaybookStore.getState().ensureDefaultPlaybook();
    const id = await createPlay('New Play', playbookId);
    navigate(`/play/${id}`);
  };

  const filtered = plays.filter(p => {
    if (filter === 'linked') return !!p.linkedVideoMoment;
    if (filter === 'board-only') return !p.linkedVideoMoment;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a', color: '#ffffff', fontFamily: 'sans-serif' }}>
      {/* Top nav */}
      <div style={{ background: '#13132a', borderBottom: '1px solid #1e1e3f', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 6, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>AFL Coaching Board</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/rosters')}
            style={{ background: '#1a1a35', border: '1px solid #2a2a55', borderRadius: 6, padding: '6px 14px', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}
          >
            Rosters {rosters.length > 0 && `(${rosters.length})`}
          </button>
          <button
            onClick={handleNew}
            style={{ background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 6, padding: '7px 16px', color: '#000', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            + New Play
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 120px' }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginRight: 4 }}>Plays</span>
          <span style={{ background: '#1e1e3f', border: '1px solid #2a2a55', borderRadius: 10, padding: '2px 8px', color: '#6666aa', fontSize: 11 }}>{plays.length}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['all', 'linked', 'board-only'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#00d4aa22' : '#1a1a35',
                  border: `1px solid ${filter === f ? '#00d4aa44' : '#2a2a55'}`,
                  borderRadius: 5, padding: '4px 10px',
                  color: filter === f ? '#00d4aa' : '#6666aa',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'All' : f === 'linked' ? '🎬 Linked' : 'Board only'}
              </button>
            ))}
          </div>
        </div>

        {/* Play grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4444aa' }}>
            <p style={{ marginBottom: 8 }}>{plays.length === 0 ? 'No plays yet' : 'No plays match this filter'}</p>
            {plays.length === 0 && (
              <button onClick={handleNew} style={{ background: 'linear-gradient(135deg, #00d4aa, #0099ff)', border: 'none', borderRadius: 8, padding: '10px 24px', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                Create your first play
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {filtered.map(p => (
              <PlayCard
                key={p.id}
                play={p}
                videoAvailable={p.id != null ? videoAvailability[p.id] : undefined}
                onOpen={() => navigate(`/play/${p.id}`)}
                onDelete={() => { if (confirm(`Delete "${p.name}"?`)) deletePlay(p.id!); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Roster pill — safe-area pinned bottom */}
      <div
        style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          background: '#13132a', border: '1px solid #1e1e3f', borderRadius: 8,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', zIndex: 20,
        }}
        onClick={() => navigate('/rosters')}
      >
        <span style={{ color: '#8888aa', fontSize: 12 }}>👥 Manage Roster</span>
        <span style={{ color: '#4444aa', fontSize: 12 }}>→</span>
      </div>
    </div>
  );
}

function PlayCard({
  play, videoAvailable, onOpen, onDelete,
}: {
  play: Play;
  videoAvailable: boolean | undefined;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const lvm = play.linkedVideoMoment;

  return (
    <div
      onClick={onOpen}
      style={{
        background: '#13132a',
        border: `1px solid ${lvm ? '#2a2a55' : '#1e1e3f'}`,
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4aa44')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = lvm ? '#2a2a55' : '#1e1e3f')}
    >
      {/* Thumbnail area */}
      <div style={{ height: 100, background: '#0d2a0d', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #1a4a1a, #0a1a0a)' }} />
        <div style={{ position: 'relative', width: 80, height: 60, border: '1px solid #2a5a2a', borderRadius: 3 }} />

        {/* Video badge / link prompt */}
        {lvm && videoAvailable === true ? (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0,212,170,0.4)', borderRadius: 5,
            padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa' }} />
            <span style={{ color: '#00d4aa', fontSize: 9, fontWeight: 600 }}>
              VIDEO LINKED
            </span>
          </div>
        ) : lvm && videoAvailable === false ? (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,102,102,0.4)', borderRadius: 5,
            padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6666' }} />
            <span style={{ color: '#ff6666', fontSize: 9, fontWeight: 600 }}>
              UNAVAILABLE
            </span>
          </div>
        ) : lvm ? null : (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            border: '1px dashed #2a2a4a', borderRadius: 5,
            padding: '3px 7px',
          }}>
            <span style={{ color: '#3a3a6a', fontSize: 9 }}>+ link video</span>
          </div>
        )}

        {/* Clip duration strip */}
        {lvm && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 22,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 4, padding: '0 7px',
          }}>
            <span style={{ color: '#aaa', fontSize: 9 }}>🎬</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #00d4aa, #0099ff)', borderRadius: 2 }} />
            </div>
            <span style={{ color: '#aaa', fontSize: 9 }}>
              {formatDuration(lvm.endTime - lvm.startTime)}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{play.name}</div>
          <div style={{ color: '#5555aa', fontSize: 10 }}>
            {new Date(play.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ color: 'rgba(239,83,80,0.4)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef5350')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,83,80,0.4)')}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
