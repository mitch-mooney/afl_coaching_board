// src/components/UI/PlaybookLibrary.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaybookStore } from '../../store/playbookStore';
import { usePlayStore } from '../../store/playStore';
import { useRosterStore } from '../../store/rosterStore';
import type { Playbook } from '../../models/PlaybookModel';
import {
  CARD_ACTION, CARD_ACTION_DESTRUCTIVE, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, CARD_BODY, CARD_DETAIL, CARD_GRID, CARD_NAME,
  CARD_TURF, CONTENT, COUNT_PILL, FOOT_PILL, FOOT_PILL_BOTTOM, MARK, PAGE, SECTION_HEADER, SECTION_TITLE,
  TOP_BAR, TOP_BAR_ACTIONS, TOP_BAR_TITLE, openOnKey,
} from './libraryStyles';

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
    <div className={PAGE}>
      {/* Top nav */}
      <div className={TOP_BAR}>
        <div className={MARK} aria-hidden="true" />
        <span className={TOP_BAR_TITLE}>AFL Coaching Board</span>
        <div className={TOP_BAR_ACTIONS}>
          <button type="button" onClick={() => navigate('/rosters')} className={BUTTON_SECONDARY}>
            Rosters {rosters.length > 0 && `(${rosters.length})`}
          </button>
          <button type="button" onClick={handleNewPlaybook} className={BUTTON_SECONDARY}>
            New playbook
          </button>
          <button type="button" onClick={handleNewPlay} className={BUTTON_PRIMARY}>
            New play
          </button>
        </div>
      </div>

      <div className={CONTENT}>
        <div className={SECTION_HEADER}>
          <h1 className={SECTION_TITLE}>Playbooks</h1>
          <span className={COUNT_PILL}>{playbooks.length}</span>
        </div>

        <div className={CARD_GRID}>
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
      <button
        type="button"
        className={FOOT_PILL}
        style={{ bottom: FOOT_PILL_BOTTOM }}
        onClick={() => navigate('/rosters')}
      >
        Manage roster <span aria-hidden="true">→</span>
      </button>
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
      role={isEditing ? undefined : 'button'}
      tabIndex={isEditing ? undefined : 0}
      onClick={isEditing ? undefined : onOpen}
      onKeyDown={isEditing ? undefined : openOnKey(onOpen)}
      className={`${CARD} ${isEditing ? 'cursor-default' : ''}`}
    >
      {/* The Playbook's size on lit Turf, in the guernsey-number face. */}
      <div className={CARD_TURF}>
        <span className="font-display text-[44px] leading-none font-extrabold text-chalk/85">{count}</span>
      </div>

      <div className={CARD_BODY}>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              aria-label="Playbook name"
              onClick={e => e.stopPropagation()}
              onChange={e => onEditName(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              className="w-full rounded-chip border border-floodlight/50 bg-concrete px-sm py-xxs text-label text-chalk"
            />
          ) : (
            <div className={`${CARD_NAME} mb-xxs`}>
              {book.name}{book.isDefault && <span className="font-normal text-chalk/60"> · default</span>}
            </div>
          )}
          <div className={CARD_DETAIL}>
            {count} {count === 1 ? 'play' : 'plays'} · {new Date(latest).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-xxs">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onStartRename(); }}
            className={CARD_ACTION}
          >
            Rename
          </button>
          {!book.isDefault && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className={CARD_ACTION_DESTRUCTIVE}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
