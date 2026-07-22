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
  },
}));

vi.mock('../../utils/ffmpegConverter', () => ({
  trimAndConvertVideo: trimAndConvertVideoMock,
}));

// Import after mocks are registered.
const { sharePlay } = await import('../sharingService');

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
