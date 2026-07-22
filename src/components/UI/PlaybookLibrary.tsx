// src/components/UI/PlaybookLibrary.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaybookStore } from '../../store/playbookStore';
import { usePlayStore } from '../../store/playStore';
import { useRosterStore } from '../../store/rosterStore';
import type { Playbook } from '../../models/PlaybookModel';

export function PlaybookLibrary() {
  const { playbooks, loadPlaybooks, ensureDefaultPlaybook, createPlaybook, renamePlaybook, deletePlaybook, setActivePlaybook } =
    usePlaybookStore();
  const { loadPlays, createPlay, playsInBook } = usePlayStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const editingIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Root context: a subsequent board quick-save falls back to My Plays.
    setActivePlaybook(null);
    // Fresh installs skip the v5 migration — guarantee "My Plays" exists.
    ensureDefaultPlaybook().then(() => loadPlaybooks());
    loadPlays();
    loadRosters();
  }, [ensureDefaultPlaybook, loadPlaybooks, loadPlays, loadRosters, setActivePlaybook]);

  // Play count + latest activity for a book — containment comes from the store
  // selector; this view only aggregates. (Whole-store subscription re-renders us
  // when plays change, so a fresh read each render is correct.)
  const statsFor = (bookId: number) => {
    const bookPlays = playsInBook(bookId);
    const latest = bookPlays.reduce((acc, p) => (p.updatedAt > acc ? p.updatedAt : acc), '');
    return { count: bookPlays.length, latest };
  };

  const handleNewPlaybook = async () => {
    const name = prompt('Name this playbook')?.trim();
    if (!name) return;
    const id = await createPlaybook(name);
    navigate(`/playbook/${id}`);
  };

  const handleNewPlay = async () => {
    const playbookId = await ensureDefaultPlaybook();
    const id = await createPlay('New Play', playbookId);
    navigate(`/play/${id}`);
  };

  const startRename = (book: Playbook) => {
    editingIdRef.current = book.id!;
    setEditingId(book.id!);
    setEditName(book.name);
  };

  const commitRename = async () => {
    const id = editingIdRef.current;
    if (id == null) return; // trailing blur after a commit/cancel — no-op
    editingIdRef.current = null;
    setEditingId(null);
    const name = editName.trim();
    const current = playbooks.find((p) => p.id === id);
    if (name && name !== current?.name) await renamePlaybook(id, name);
  };

  const cancelRename = () => {
    editingIdRef.current = null;
    setEditingId(null);
  };

  const handleDelete = async (book: Playbook) => {
    if (!confirm(`Delete "${book.name}"? Its plays move to My Plays.`)) return;
    await deletePlaybook(book.id!);
    await loadPlays(); // refresh counts for the reassigned plays
  };

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
            onClick={handleNewPlaybook}
            style={{ background: '#1a1a35', border: '1px solid #2a2a55', borderRadius: 6, padding: '6px 14px', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}
          >
            + New Playbook
          </button>
          <button
            onClick={handleNewPlay}
            style={{ background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 6, padding: '7px 16px', color: '#000', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            + New Play
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginRight: 4 }}>Playbooks</span>
          <span style={{ background: '#1e1e3f', border: '1px solid #2a2a55', borderRadius: 10, padding: '2px 8px', color: '#6666aa', fontSize: 11 }}>{playbooks.length}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {playbooks.map((book) => {
            const s = book.id != null ? statsFor(book.id) : { count: 0, latest: '' };
            return (
            <PlaybookCard
              key={book.id}
              book={book}
              count={s.count}
              latest={s.latest || book.updatedAt}
              isEditing={editingId === book.id}
              editName={editName}
              onOpen={() => navigate(`/playbook/${book.id}`)}
              onStartRename={() => startRename(book)}
              onEditName={setEditName}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
              onDelete={() => handleDelete(book)}
            />
            );
          })}
        </div>
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

function PlaybookCard({
  book, count, latest, isEditing, editName,
  onOpen, onStartRename, onEditName, onCommitRename, onCancelRename, onDelete,
}: {
  book: Playbook;
  count: number;
  latest: string;
  isEditing: boolean;
  editName: string;
  onOpen: () => void;
  onStartRename: () => void;
  onEditName: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={isEditing ? undefined : onOpen}
      style={{
        background: '#13132a', border: '1px solid #1e1e3f', borderRadius: 10,
        overflow: 'hidden', cursor: isEditing ? 'default' : 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4aa44')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e3f')}
    >
      <div style={{ height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #16163a, #0a0a1a)' }} />
        <span style={{ position: 'relative', fontSize: 34 }}>📚</span>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onClick={e => e.stopPropagation()}
              onChange={e => onEditName(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              style={{ width: '100%', background: '#0f0f1a', border: '1px solid #00d4aa44', borderRadius: 4, color: '#fff', fontSize: 12, padding: '3px 6px' }}
            />
          ) : (
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.name}{book.isDefault && <span style={{ color: '#5555aa', fontWeight: 400 }}> · default</span>}
            </div>
          )}
          <div style={{ color: '#5555aa', fontSize: 10 }}>
            {count} {count === 1 ? 'play' : 'plays'} · {new Date(latest).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onStartRename(); }}
            style={{ color: '#5555aa', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            title="Rename"
          >
            ✎
          </button>
          {!book.isDefault && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ color: 'rgba(239,83,80,0.4)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef5350')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,83,80,0.4)')}
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
