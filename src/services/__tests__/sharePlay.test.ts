import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Play } from '../../models/PlayModel';

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));
const trimAndConvertVideoMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: fromMock,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/clip.mp4' } })),
      })),
    },
  },
}));

const scenariosGetMock = vi.fn();
vi.mock('../../store/appDatabase', () => ({
  playbookDB: {
    scenarios: {
      get: scenariosGetMock,
    },
    venues: {},
  },
}));

vi.mock('../../utils/ffmpegConverter', () => ({
  trimAndConvertVideo: trimAndConvertVideoMock,
}));

// Import after mocks are registered.
const { sharePlay } = await import('../sharingService');
const { useVenueStore } = await import('../../store/venueStore');

const aPhase = {
  id: 'phase-1',
  label: 'Phase 1',
  playerPositions: [],
  paths: [],
  annotations: [],
  cameraState: null,
};

describe('sharePlay — board-only branch', () => {
  beforeEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    trimAndConvertVideoMock.mockClear();
    scenariosGetMock.mockReset();
  });

  it('shares board-only (video_url: null) and skips FFmpeg when the play has no linkedVideoMoment', async () => {
    const play: Play = {
      id: 1,
      name: 'Centre bounce press',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [
        {
          id: 'phase-1',
          label: 'Phase 1',
          playerPositions: [],
          paths: [],
          annotations: [],
          cameraState: null,
        },
      ],
      // no linkedVideoMoment
    };
    scenariosGetMock.mockResolvedValue(play);

    const result = await sharePlay(1, undefined);

    expect(trimAndConvertVideoMock).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.video_url).toBeNull();
    expect(insertArg.playbook_data.quarter).toBeNull();
    expect(insertArg.playbook_data.label).toBeNull();
    if (!('url' in result)) throw new Error('expected a successful share result');
    expect(result.token).toBeTruthy();
    expect(result.url).toContain('/shared/');
  });

  it('returns reason "no-content" without inserting when the play has no saved phase', async () => {
    const play: Play = {
      id: 3,
      name: 'Freshly created play',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [],
    };
    scenariosGetMock.mockResolvedValue(play);

    const result = await sharePlay(3, null);

    expect(result).toEqual({ reason: 'no-content' });
    expect(insertMock).not.toHaveBeenCalled();
    expect(trimAndConvertVideoMock).not.toHaveBeenCalled();
  });

  it('still shares board-only when a linkedVideoMoment exists but no videoBlob is supplied', async () => {
    const play: Play = {
      id: 2,
      name: 'Kick-in structure',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [
        {
          id: 'phase-1',
          label: 'Phase 1',
          playerPositions: [],
          paths: [],
          annotations: [],
          cameraState: null,
        },
      ],
      linkedVideoMoment: {
        videoId: 1,
        startTime: 0,
        endTime: 5,
      },
    };
    scenariosGetMock.mockResolvedValue(play);

    await sharePlay(2, null);

    expect(trimAndConvertVideoMock).not.toHaveBeenCalled();
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.video_url).toBeNull();
  });
});

describe('sharePlay — the ground the play was designed on', () => {
  beforeEach(() => {
    insertMock.mockClear();
    scenariosGetMock.mockReset();
    useVenueStore.setState({ venues: [], activeVenueId: null });
  });

  const play: Play = {
    id: 4,
    name: 'Wing overlap',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    team1RosterId: null,
    team2RosterId: null,
    phases: [aPhase],
  };

  it('sends the Active Venue alongside the board, so the recipient sees the author’s spacing', async () => {
    useVenueStore.setState({
      venues: [
        {
          id: 7,
          name: 'Kardinia Park',
          boundaryLength: 152,
          boundaryWidth: 118,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeVenueId: 7,
    });
    scenariosGetMock.mockResolvedValue(play);

    await sharePlay(4, null);

    const { playbook_data } = insertMock.mock.calls[0][0];
    expect(playbook_data.venueName).toBe('Kardinia Park');
    expect(playbook_data.boundaryLength).toBe(152);
    expect(playbook_data.boundaryWidth).toBe(118);
  });

  it('names Standard ground when no Venue has resolved, rather than leaving the link silent', async () => {
    scenariosGetMock.mockResolvedValue(play);

    await sharePlay(4, null);

    // Absent venue fields have exactly one meaning — a link shared before Venues
    // existed. A link written today always says which ground, even when that
    // ground is the generic one the board was rendering.
    const { playbook_data } = insertMock.mock.calls[0][0];
    expect(playbook_data.venueName).toBe('Standard ground');
    expect(playbook_data.boundaryLength).toBe(165);
    expect(playbook_data.boundaryWidth).toBe(135);
  });
});
