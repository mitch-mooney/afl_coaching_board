import { create } from 'zustand';

/**
 * Perspective settings for matching 3D field to video camera angle
 */
export interface PerspectiveSettings {
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number];
  fieldOfView: number;
  fieldScale: number;
  fieldOpacity: number;
}

/**
 * Export settings for video output
 */
export interface ExportSettings {
  resolution: '1080p' | '720p' | 'original';
  format: 'webm' | 'mp4';
  quality: number;
}

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

  // Perspective calibration
  perspectiveSettings: PerspectiveSettings;

  // Export settings
  exportSettings: ExportSettings;

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

  // Actions - Perspective settings
  setPerspectiveSettings: (settings: Partial<PerspectiveSettings>) => void;
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraRotation: (rotation: [number, number, number]) => void;
  setFieldOfView: (fov: number) => void;
  setFieldScale: (scale: number) => void;
  setFieldOpacity: (opacity: number) => void;
  resetPerspectiveSettings: () => void;

  // Actions - Export settings
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  resetExportSettings: () => void;

  // Actions - Full reset
  resetStore: () => void;
}

// Default perspective settings for video calibration
const DEFAULT_PERSPECTIVE_SETTINGS: PerspectiveSettings = {
  cameraPosition: [0, 100, 150],
  cameraRotation: [0, 0, 0],
  fieldOfView: 60,
  fieldScale: 1,
  fieldOpacity: 0.5,
};

// Default export settings
const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: '1080p',
  format: 'webm',
  quality: 0.9,
};

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

  // Initial state - Settings
  perspectiveSettings: { ...DEFAULT_PERSPECTIVE_SETTINGS },
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },

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

  // Actions - Perspective settings
  setPerspectiveSettings: (settings) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, ...settings },
    }));
  },

  setCameraPosition: (position) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, cameraPosition: position },
    }));
  },

  setCameraRotation: (rotation) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, cameraRotation: rotation },
    }));
  },

  setFieldOfView: (fov) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, fieldOfView: fov },
    }));
  },

  setFieldScale: (scale) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, fieldScale: scale },
    }));
  },

  setFieldOpacity: (opacity) => {
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, fieldOpacity: opacity },
    }));
  },

  resetPerspectiveSettings: () => {
    set({ perspectiveSettings: { ...DEFAULT_PERSPECTIVE_SETTINGS } });
  },

  // Actions - Export settings
  setExportSettings: (settings) => {
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    }));
  },

  resetExportSettings: () => {
    set({ exportSettings: { ...DEFAULT_EXPORT_SETTINGS } });
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
      perspectiveSettings: { ...DEFAULT_PERSPECTIVE_SETTINGS },
      exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    });
  },
}));
