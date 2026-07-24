import { create } from 'zustand';
import Dexie, { Table } from 'dexie';

/**
 * Video metadata stored for reference
 */
export interface VideoMetadata {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Persisted video metadata in IndexedDB
 * Stores video file metadata for session persistence.
 * Note: rows written before the export-settings removal may still carry an
 * `exportSettings` field on disk; Dexie ignores unmodelled fields on read, so
 * no migration is required.
 */
export interface PersistedVideoMetadata {
  id?: number;
  fileName: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dexie database class for video metadata persistence
 */
class VideoDatabase extends Dexie {
  videos!: Table<PersistedVideoMetadata>;

  constructor() {
    super('VideoImportDB');
    this.version(1).stores({
      videos: '++id, fileName, createdAt, updatedAt',
    });
    this.version(2).stores({
      videos: '++id, fileName, createdAt, updatedAt',
      videoBlobs: '++id, videoId',
    });
    this.version(3).stores({
      videoBlobs: null, // drop the unused blob table
    });
  }
}

const videoDb = new VideoDatabase();

interface VideoState {
  // Video source
  videoFile: File | null;
  videoElement: HTMLVideoElement | null;
  videoMetadata: VideoMetadata | null;

  // Playback state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  isLooping: boolean;
  volume: number;
  isMuted: boolean;

  // Loading state
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Video mode
  isVideoMode: boolean;

  // Persistence state
  savedVideos: PersistedVideoMetadata[];
  currentSavedVideoId: number | null;
  isPersisting: boolean;

  // Actions - Video source
  setVideoFile: (file: File | null) => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setVideoMetadata: (metadata: VideoMetadata | null) => void;
  clearVideo: () => void;

  // Actions - Playback control
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  setIsLooping: (isLooping: boolean) => void;
  toggleLooping: () => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  toggleMute: () => void;

  // Actions - Frame stepping
  stepForward: (frames?: number) => void;
  stepBackward: (frames?: number) => void;

  // Actions - Loading state
  setIsLoaded: (isLoaded: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Video mode
  setIsVideoMode: (isVideoMode: boolean) => void;

  // Actions - Persistence
  loadSavedVideos: () => Promise<void>;
  saveVideoMetadata: () => Promise<number>;

  // Actions - Full reset
  resetStore: () => void;
}

// Frame rate assumption for frame stepping (30 fps is common)
const ASSUMED_FRAME_RATE = 30;

export const useVideoStore = create<VideoState>((set, get) => ({
  // Initial state - Video source
  videoFile: null,
  videoElement: null,
  videoMetadata: null,

  // Initial state - Playback
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
  isLooping: false,
  volume: 1,
  isMuted: false,

  // Initial state - Loading
  isLoaded: false,
  isLoading: false,
  error: null,

  // Initial state - Video mode
  isVideoMode: false,

  // Initial state - Persistence
  savedVideos: [],
  currentSavedVideoId: null,
  isPersisting: false,

  // Actions - Video source
  setVideoFile: (file) => {
    set({
      videoFile: file,
      isLoading: file !== null,
      error: null,
    });
  },

  setVideoElement: (element) => {
    set({ videoElement: element });
  },

  setVideoMetadata: (metadata) => {
    set({ videoMetadata: metadata });
  },

  clearVideo: () => {
    const { videoElement } = get();
    if (videoElement) {
      videoElement.pause();
      videoElement.src = '';
      videoElement.load();
    }
    set({
      videoFile: null,
      videoElement: null,
      videoMetadata: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isLoaded: false,
      isLoading: false,
      error: null,
      isVideoMode: false,
    });
  },

  // Actions - Playback control
  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  togglePlayback: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setPlaybackRate: (rate) => {
    set({ playbackRate: rate });
  },

  setIsLooping: (isLooping) => {
    set({ isLooping });
  },

  toggleLooping: () => {
    set((state) => ({ isLooping: !state.isLooping }));
  },

  setVolume: (volume) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  setIsMuted: (isMuted) => {
    set({ isMuted });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  // Actions - Frame stepping
  stepForward: (frames = 1) => {
    const { currentTime, duration } = get();
    const frameDuration = 1 / ASSUMED_FRAME_RATE;
    const newTime = Math.min(currentTime + frames * frameDuration, duration);
    set({ currentTime: newTime });
  },

  stepBackward: (frames = 1) => {
    const { currentTime } = get();
    const frameDuration = 1 / ASSUMED_FRAME_RATE;
    const newTime = Math.max(currentTime - frames * frameDuration, 0);
    set({ currentTime: newTime });
  },

  // Actions - Loading state
  setIsLoaded: (isLoaded) => {
    set({ isLoaded, isLoading: false });
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error, isLoading: false, isLoaded: false });
  },

  // Actions - Video mode
  setIsVideoMode: (isVideoMode) => {
    set({ isVideoMode });
  },

  // Actions - Persistence
  loadSavedVideos: async () => {
    set({ isPersisting: true });
    try {
      const videos = await videoDb.videos.orderBy('updatedAt').reverse().toArray();
      set({ savedVideos: videos, isPersisting: false });
    } catch (error) {
      set({ isPersisting: false });
      throw error;
    }
  },

  saveVideoMetadata: async () => {
    const { videoMetadata, duration } = get();
    if (!videoMetadata) {
      throw new Error('No video metadata to save');
    }

    set({ isPersisting: true });
    try {
      const now = new Date();
      const record: PersistedVideoMetadata = {
        fileName: videoMetadata.fileName,
        fileSize: videoMetadata.fileSize,
        duration,
        width: videoMetadata.width,
        height: videoMetadata.height,
        aspectRatio: videoMetadata.aspectRatio,
        createdAt: now,
        updatedAt: now,
      };
      const id = await videoDb.videos.add(record) as number;
      set({ currentSavedVideoId: id, isPersisting: false });
      await useVideoStore.getState().loadSavedVideos();
      return id;
    } catch (error) {
      set({ isPersisting: false });
      throw error;
    }
  },

  // Actions - Full reset
  resetStore: () => {
    const { videoElement } = get();
    if (videoElement) {
      videoElement.pause();
      videoElement.src = '';
      videoElement.load();
    }
    set({
      videoFile: null,
      videoElement: null,
      videoMetadata: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
      isLooping: false,
      volume: 1,
      isMuted: false,
      isLoaded: false,
      isLoading: false,
      error: null,
      isVideoMode: false,
      currentSavedVideoId: null,
    });
  },
}));

// Export the database for direct access if needed
export { videoDb };
