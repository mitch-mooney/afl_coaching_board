// src/components/UI/PlayLibrary.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { usePlayStore } from '../../store/playStore';
import { usePlaybookStore } from '../../store/playbookStore';
import { useRosterStore } from '../../store/rosterStore';
import { videoDb } from '../../store/videoStore';
import type { Play } from '../../models/PlayModel';
import { PlayThumbnail } from './PlayThumbnail';
import { playFitsBoundary } from '../../utils/playFit';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { selectActiveVenue, useVenueStore } from '../../store/venueStore';
import { OUT_OF_BOUNDS_AMBER } from '../Board/hud/fitReadout';
import {
  BADGE, BUTTON_PRIMARY, BUTTON_QUIET, BUTTON_SECONDARY, CARD, CARD_ACTION_DESTRUCTIVE, CARD_BODY, CARD_DETAIL, CARD_GRID,
  CARD_NAME, CARD_TURF, CONTENT, COUNT_PILL, FOOT_PILL, FOOT_PILL_BOTTOM, MARK, PAGE, SECTION_HEADER,
  SECTION_TITLE, TOP_BAR, TOP_BAR_ACTIONS, TOP_BAR_TITLE, openOnKey,
} from './libraryStyles';

async function videoMetadataExists(videoId: number): Promise<boolean> {
  try {
    const record = await videoDb.videos.get(videoId);
    return record != null;
  } catch {
    return false;
  }
}

type FilterMode = 'all' | 'linked' | 'board-only';

const FILTER_LABELS: Record<FilterMode, string> = {
  all: 'All',
  linked: 'Linked',
  'board-only': 'Board only',
};

export function PlayLibrary() {
  const { plays, loadPlays, createPlay, deletePlay, playsInBook } = usePlayStore();
  const { playbooks, loadPlaybooks, setActivePlaybook } = usePlaybookStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const playbookId = Number(id);
  const currentBook = playbooks.find((b) => b.id === playbookId);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [videoAvailability, setVideoAvailability] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Board quick-save + New Play here target this book.
    setActivePlaybook(playbookId);
    loadPlaybooks();
    loadPlays();
    loadRosters();
  }, [playbookId, setActivePlaybook, loadPlaybooks, loadPlays, loadRosters]);

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
    const newId = await createPlay('New Play', playbookId);
    navigate(`/play/${newId}`);
  };

  const bookPlays = playsInBook(playbookId);
  const filtered = bookPlays.filter(p => {
    if (filter === 'linked') return !!p.linkedVideoMoment;
    if (filter === 'board-only') return !p.linkedVideoMoment;
    return true;
  });

  // Book was deleted or the id is invalid — books have loaded and none match.
  if (Number.isNaN(playbookId) || (playbooks.length > 0 && !currentBook)) return <Navigate to="/" replace />;

  return (
    <div className={PAGE}>
      {/* Top nav */}
      <div className={TOP_BAR}>
        <div className={MARK} aria-hidden="true" />
        <button type="button" onClick={() => navigate('/')} className={BUTTON_QUIET}>
          ← Playbooks
        </button>
        <span className={TOP_BAR_TITLE}>{currentBook?.name ?? 'Plays'}</span>
        <div className={TOP_BAR_ACTIONS}>
          <button type="button" onClick={() => navigate('/rosters')} className={BUTTON_SECONDARY}>
            Rosters {rosters.length > 0 && `(${rosters.length})`}
          </button>
          <button type="button" onClick={handleNew} className={BUTTON_PRIMARY}>
            New play
          </button>
        </div>
      </div>

      <div className={CONTENT}>
        {/* Filter chips */}
        <div className={SECTION_HEADER}>
          <h1 className={SECTION_TITLE}>Plays</h1>
          <span className={COUNT_PILL}>{bookPlays.length}</span>
          <div className="ml-auto flex flex-wrap gap-xs" role="group" aria-label="Show">
            {(['all', 'linked', 'board-only'] as FilterMode[]).map(f => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                // The active filter is a state, so it is lit in Floodlight.
                className={`min-h-[36px] rounded-chip border px-md text-label transition-colors cursor-pointer ${
                  filter === f
                    ? 'border-floodlight/60 bg-floodlight/15 text-floodlight'
                    : 'border-steel bg-steel/40 text-chalk/70 hover:text-chalk'
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Play grid */}
        {filtered.length === 0 ? (
          <div className="py-[80px] text-center text-chalk/60">
            <p className="mb-sm">{bookPlays.length === 0 ? 'No plays in this playbook yet' : 'No plays match this filter'}</p>
            {bookPlays.length === 0 && (
              <button type="button" onClick={handleNew} className={BUTTON_PRIMARY}>
                Create your first play
              </button>
            )}
          </div>
        ) : (
          <div className={CARD_GRID}>
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

function PlayCard({
  play, videoAvailable, onOpen, onDelete,
}: {
  play: Play;
  videoAvailable: boolean | undefined;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const lvm = play.linkedVideoMoment;

  // Derived per row against the Active Venue, never stored: switching grounds
  // remarks the whole list on the spot, and there is no staleness to invalidate.
  // The predicate is the one the open board uses — see playFit.
  const boundary = useActiveBoundary();
  const activeVenue = useVenueStore(selectActiveVenue);
  const fits = useMemo(() => playFitsBoundary(play, boundary), [play, boundary]);

  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={openOnKey(onOpen)} className={CARD}>
      {/* Thumbnail area: the Play drawn on lit Turf, as the board draws it. */}
      <div className={CARD_TURF}>
        <PlayThumbnail play={play} />

        {/* Doesn't-fit marker — opposite corner to the video badge so a play can
            carry both. Phrased as a finding rather than an error: a play that
            does not fit Saturday's ground is a true thing to look at, and the
            coach fixes it by opening the play, not from here. Amber, because
            amber means doesn't fit and nothing else (ADR 0005). */}
        {!fits && (
          <div
            title={`Some of this play is outside ${activeVenue?.name ?? 'the active ground'}.`}
            className={`${BADGE} left-[7px] bg-concrete/80 font-semibold`}
            style={{ border: `1px solid ${OUT_OF_BOUNDS_AMBER}73`, color: OUT_OF_BOUNDS_AMBER }}
          >
            <div className="h-[6px] w-[6px] rounded-pill" style={{ background: OUT_OF_BOUNDS_AMBER }} />
            Doesn't fit
          </div>
        )}

        {/* Video badge / link prompt */}
        {lvm && videoAvailable === true ? (
          <div className={`${BADGE} right-[7px] border border-chalk/40 bg-concrete/80 font-semibold text-chalk`}>
            <div className="h-[6px] w-[6px] rounded-pill bg-chalk" />
            Video linked
          </div>
        ) : lvm && videoAvailable === false ? (
          // A hollow dot: the link is there, the video it points at is not.
          <div className={`${BADGE} right-[7px] border border-chalk/25 bg-concrete/80 font-semibold text-chalk/70`}>
            <div className="h-[6px] w-[6px] rounded-pill border border-chalk/70" />
            Video unavailable
          </div>
        ) : lvm ? null : (
          // A solid faint edge: a dashed one marks an action that removes something.
          <div className={`${BADGE} right-[7px] border border-chalk/25 text-chalk/60 backdrop-blur-none`}>
            + Link video
          </div>
        )}

        {/* Clip duration strip */}
        {lvm && (
          <div className="absolute inset-x-0 bottom-0 flex h-[22px] items-center gap-xs bg-concrete/80 px-sm text-caption text-chalk/70">
            <span aria-hidden="true">🎬</span>
            <div className="h-[4px] flex-1 overflow-hidden rounded-pill bg-chalk/15">
              <div className="h-full w-full rounded-pill bg-chalk/70" />
            </div>
            <span className="font-display font-bold">{formatDuration(lvm.endTime - lvm.startTime)}</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className={CARD_BODY}>
        <div className="min-w-0">
          <div className={`${CARD_NAME} mb-xxs`}>{play.name}</div>
          <div className={CARD_DETAIL}>
            {new Date(play.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className={CARD_ACTION_DESTRUCTIVE}
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
