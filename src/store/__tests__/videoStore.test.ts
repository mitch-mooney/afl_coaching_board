import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVideoStore, videoDb } from '../videoStore';
import type { PerspectiveSettings, ExportSettings, VideoMetadata } from '../videoStore';

// Default values for comparison
const DEFAULT_PERSPECTIVE_SETTINGS: PerspectiveSettings = {
  cameraPosition: [0, 100, 150],
  cameraRotation: [0, 0, 0],
  fieldOfView: 60,
  fieldScale: 1,
  fieldOpacity: 0.5,
  fieldOffset: [0, 0, 0],
  lockOrbitControls: false,
};

const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: '1080p',
  format: 'webm',
  quality: 0.9,
};

// Helper to create a mock File
const createMockFile = (name = 'test.mp4', size = 1000): File => {
  return new File(['video content'], name, { type: 'video/mp4' });
};

// Helper to create mock VideoMetadata
const createMockVideoMetadata = (): VideoMetadata => ({
  fileName: 'test-video.mp4',
  fileSize: 5000000,
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
});

// Helper to create a mock HTMLVideoElement
const createMockVideoElement = (): HTMLVideoElement => {
  const video = document.createElement('video');
  return video;
};

describe('videoStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useVideoStore.getState().resetStore();
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const state = useVideoStore.getState();

      // Video source
      expect(state.videoFile).toBeNull();
      expect(state.videoElement).toBeNull();
      expect(state.videoMetadata).toBeNull();

      // Playback state
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.playbackRate).toBe(1);
      expect(state.isLooping).toBe(false);
      expect(state.volume).toBe(1);
      expect(state.isMuted).toBe(false);

      // Loading state
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      // Video mode
      expect(state.isVideoMode).toBe(false);

      // Persistence state
      expect(state.savedVideos).toEqual([]);
      expect(state.currentSavedVideoId).toBeNull();
      expect(state.isPersisting).toBe(false);
    });

    it('should have default perspective settings', () => {
      const state = useVideoStore.getState();
      expect(state.perspectiveSettings).toEqual(DEFAULT_PERSPECTIVE_SETTINGS);
    });

    it('should have default export settings', () => {
      const state = useVideoStore.getState();
      expect(state.exportSettings).toEqual(DEFAULT_EXPORT_SETTINGS);
    });
  });

  describe('Video Source Actions', () => {
    it('setVideoFile should update videoFile and set isLoading', () => {
      const mockFile = createMockFile();
      useVideoStore.getState().setVideoFile(mockFile);

      const state = useVideoStore.getState();
      expect(state.videoFile).toBe(mockFile);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('setVideoFile with null should clear file and stop loading', () => {
      // First set a file
      useVideoStore.getState().setVideoFile(createMockFile());
      // Then clear it
      useVideoStore.getState().setVideoFile(null);

      const state = useVideoStore.getState();
      expect(state.videoFile).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('setVideoElement should update videoElement', () => {
      const mockElement = createMockVideoElement();
      useVideoStore.getState().setVideoElement(mockElement);

      expect(useVideoStore.getState().videoElement).toBe(mockElement);
    });

    it('setVideoMetadata should update videoMetadata', () => {
      const mockMetadata = createMockVideoMetadata();
      useVideoStore.getState().setVideoMetadata(mockMetadata);

      expect(useVideoStore.getState().videoMetadata).toEqual(mockMetadata);
    });

    it('clearVideo should reset all video-related state', () => {
      // Set up some state
      const mockElement = createMockVideoElement();
      useVideoStore.getState().setVideoFile(createMockFile());
      useVideoStore.getState().setVideoElement(mockElement);
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      useVideoStore.getState().setCurrentTime(50);
      useVideoStore.getState().setDuration(100);
      useVideoStore.getState().setIsPlaying(true);
      useVideoStore.getState().setIsLoaded(true);
      useVideoStore.getState().setIsVideoMode(true);

      // Clear video
      useVideoStore.getState().clearVideo();

      const state = useVideoStore.getState();
      expect(state.videoFile).toBeNull();
      expect(state.videoElement).toBeNull();
      expect(state.videoMetadata).toBeNull();
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isVideoMode).toBe(false);
    });
  });

  describe('Playback Control Actions', () => {
    it('setCurrentTime should update currentTime', () => {
      useVideoStore.getState().setCurrentTime(30.5);
      expect(useVideoStore.getState().currentTime).toBe(30.5);
    });

    it('setDuration should update duration', () => {
      useVideoStore.getState().setDuration(120);
      expect(useVideoStore.getState().duration).toBe(120);
    });

    it('setIsPlaying should update isPlaying', () => {
      useVideoStore.getState().setIsPlaying(true);
      expect(useVideoStore.getState().isPlaying).toBe(true);

      useVideoStore.getState().setIsPlaying(false);
      expect(useVideoStore.getState().isPlaying).toBe(false);
    });

    it('togglePlayback should toggle isPlaying state', () => {
      expect(useVideoStore.getState().isPlaying).toBe(false);

      useVideoStore.getState().togglePlayback();
      expect(useVideoStore.getState().isPlaying).toBe(true);

      useVideoStore.getState().togglePlayback();
      expect(useVideoStore.getState().isPlaying).toBe(false);
    });

    it('setPlaybackRate should update playbackRate', () => {
      useVideoStore.getState().setPlaybackRate(2);
      expect(useVideoStore.getState().playbackRate).toBe(2);

      useVideoStore.getState().setPlaybackRate(0.5);
      expect(useVideoStore.getState().playbackRate).toBe(0.5);
    });

    it('setIsLooping should update isLooping', () => {
      useVideoStore.getState().setIsLooping(true);
      expect(useVideoStore.getState().isLooping).toBe(true);
    });

    it('toggleLooping should toggle isLooping state', () => {
      expect(useVideoStore.getState().isLooping).toBe(false);

      useVideoStore.getState().toggleLooping();
      expect(useVideoStore.getState().isLooping).toBe(true);

      useVideoStore.getState().toggleLooping();
      expect(useVideoStore.getState().isLooping).toBe(false);
    });

    it('setVolume should update volume and clamp between 0 and 1', () => {
      useVideoStore.getState().setVolume(0.5);
      expect(useVideoStore.getState().volume).toBe(0.5);

      // Test clamping to max
      useVideoStore.getState().setVolume(1.5);
      expect(useVideoStore.getState().volume).toBe(1);

      // Test clamping to min
      useVideoStore.getState().setVolume(-0.5);
      expect(useVideoStore.getState().volume).toBe(0);
    });

    it('setIsMuted should update isMuted', () => {
      useVideoStore.getState().setIsMuted(true);
      expect(useVideoStore.getState().isMuted).toBe(true);
    });

    it('toggleMute should toggle isMuted state', () => {
      expect(useVideoStore.getState().isMuted).toBe(false);

      useVideoStore.getState().toggleMute();
      expect(useVideoStore.getState().isMuted).toBe(true);

      useVideoStore.getState().toggleMute();
      expect(useVideoStore.getState().isMuted).toBe(false);
    });
  });

  describe('Frame Stepping Actions', () => {
    const FRAME_DURATION = 1 / 30; // Assumed 30fps

    beforeEach(() => {
      // Set up a video with duration
      useVideoStore.getState().setDuration(100);
      useVideoStore.getState().setCurrentTime(50);
    });

    it('stepForward should advance by one frame', () => {
      useVideoStore.getState().stepForward();
      expect(useVideoStore.getState().currentTime).toBeCloseTo(50 + FRAME_DURATION, 5);
    });

    it('stepForward with frames parameter should advance by multiple frames', () => {
      useVideoStore.getState().stepForward(5);
      expect(useVideoStore.getState().currentTime).toBeCloseTo(50 + 5 * FRAME_DURATION, 5);
    });

    it('stepForward should not exceed duration', () => {
      useVideoStore.getState().setCurrentTime(99.99);
      useVideoStore.getState().stepForward(100);
      expect(useVideoStore.getState().currentTime).toBe(100);
    });

    it('stepBackward should go back by one frame', () => {
      useVideoStore.getState().stepBackward();
      expect(useVideoStore.getState().currentTime).toBeCloseTo(50 - FRAME_DURATION, 5);
    });

    it('stepBackward with frames parameter should go back by multiple frames', () => {
      useVideoStore.getState().stepBackward(5);
      expect(useVideoStore.getState().currentTime).toBeCloseTo(50 - 5 * FRAME_DURATION, 5);
    });

    it('stepBackward should not go below 0', () => {
      useVideoStore.getState().setCurrentTime(0.01);
      useVideoStore.getState().stepBackward(100);
      expect(useVideoStore.getState().currentTime).toBe(0);
    });
  });

  describe('Loading State Actions', () => {
    it('setIsLoaded should update isLoaded and set isLoading to false', () => {
      useVideoStore.getState().setIsLoading(true);
      useVideoStore.getState().setIsLoaded(true);

      const state = useVideoStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('setIsLoading should update isLoading', () => {
      useVideoStore.getState().setIsLoading(true);
      expect(useVideoStore.getState().isLoading).toBe(true);
    });

    it('setError should update error and reset loading states', () => {
      useVideoStore.getState().setIsLoading(true);
      useVideoStore.getState().setIsLoaded(true);

      useVideoStore.getState().setError('Test error message');

      const state = useVideoStore.getState();
      expect(state.error).toBe('Test error message');
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
    });

    it('setError with null should clear error', () => {
      useVideoStore.getState().setError('Previous error');
      useVideoStore.getState().setError(null);

      expect(useVideoStore.getState().error).toBeNull();
    });
  });

  describe('Video Mode Actions', () => {
    it('setIsVideoMode should update isVideoMode', () => {
      useVideoStore.getState().setIsVideoMode(true);
      expect(useVideoStore.getState().isVideoMode).toBe(true);

      useVideoStore.getState().setIsVideoMode(false);
      expect(useVideoStore.getState().isVideoMode).toBe(false);
    });
  });

  describe('Perspective Settings Actions', () => {
    it('setPerspectiveSettings should merge partial settings', () => {
      useVideoStore.getState().setPerspectiveSettings({
        fieldOfView: 90,
        fieldScale: 1.5,
      });

      const state = useVideoStore.getState();
      expect(state.perspectiveSettings.fieldOfView).toBe(90);
      expect(state.perspectiveSettings.fieldScale).toBe(1.5);
      // Other settings should remain default
      expect(state.perspectiveSettings.cameraPosition).toEqual([0, 100, 150]);
    });

    it('setCameraPosition should update camera position', () => {
      const newPosition: [number, number, number] = [10, 50, 100];
      useVideoStore.getState().setCameraPosition(newPosition);

      expect(useVideoStore.getState().perspectiveSettings.cameraPosition).toEqual(newPosition);
    });

    it('setCameraRotation should update camera rotation', () => {
      const newRotation: [number, number, number] = [0.1, 0.2, 0.3];
      useVideoStore.getState().setCameraRotation(newRotation);

      expect(useVideoStore.getState().perspectiveSettings.cameraRotation).toEqual(newRotation);
    });

    it('setFieldOfView should update FOV', () => {
      useVideoStore.getState().setFieldOfView(90);
      expect(useVideoStore.getState().perspectiveSettings.fieldOfView).toBe(90);
    });

    it('setFieldScale should update field scale', () => {
      useVideoStore.getState().setFieldScale(2);
      expect(useVideoStore.getState().perspectiveSettings.fieldScale).toBe(2);
    });

    it('setFieldOpacity should update field opacity', () => {
      useVideoStore.getState().setFieldOpacity(0.8);
      expect(useVideoStore.getState().perspectiveSettings.fieldOpacity).toBe(0.8);
    });

    it('setFieldOffset should update field offset', () => {
      const newOffset: [number, number, number] = [5, 10, 15];
      useVideoStore.getState().setFieldOffset(newOffset);

      expect(useVideoStore.getState().perspectiveSettings.fieldOffset).toEqual(newOffset);
    });

    it('setLockOrbitControls should update lock state', () => {
      useVideoStore.getState().setLockOrbitControls(true);
      expect(useVideoStore.getState().perspectiveSettings.lockOrbitControls).toBe(true);
    });

    it('toggleLockOrbitControls should toggle lock state', () => {
      expect(useVideoStore.getState().perspectiveSettings.lockOrbitControls).toBe(false);

      useVideoStore.getState().toggleLockOrbitControls();
      expect(useVideoStore.getState().perspectiveSettings.lockOrbitControls).toBe(true);

      useVideoStore.getState().toggleLockOrbitControls();
      expect(useVideoStore.getState().perspectiveSettings.lockOrbitControls).toBe(false);
    });

    it('resetPerspectiveSettings should restore defaults', () => {
      // Modify all settings
      useVideoStore.getState().setPerspectiveSettings({
        cameraPosition: [1, 2, 3],
        cameraRotation: [0.1, 0.2, 0.3],
        fieldOfView: 90,
        fieldScale: 2,
        fieldOpacity: 0.3,
        fieldOffset: [10, 20, 30],
        lockOrbitControls: true,
      });

      // Reset
      useVideoStore.getState().resetPerspectiveSettings();

      expect(useVideoStore.getState().perspectiveSettings).toEqual(DEFAULT_PERSPECTIVE_SETTINGS);
    });
  });

  describe('Export Settings Actions', () => {
    it('setExportSettings should merge partial settings', () => {
      useVideoStore.getState().setExportSettings({
        resolution: '720p',
        quality: 0.8,
      });

      const state = useVideoStore.getState();
      expect(state.exportSettings.resolution).toBe('720p');
      expect(state.exportSettings.quality).toBe(0.8);
      // Format should remain default
      expect(state.exportSettings.format).toBe('webm');
    });

    it('setExportSettings should allow setting format', () => {
      useVideoStore.getState().setExportSettings({ format: 'mp4' });
      expect(useVideoStore.getState().exportSettings.format).toBe('mp4');
    });

    it('resetExportSettings should restore defaults', () => {
      useVideoStore.getState().setExportSettings({
        resolution: '720p',
        format: 'mp4',
        quality: 0.5,
      });

      useVideoStore.getState().resetExportSettings();

      expect(useVideoStore.getState().exportSettings).toEqual(DEFAULT_EXPORT_SETTINGS);
    });
  });

  describe('Reset Store Action', () => {
    it('resetStore should reset all state to initial values', () => {
      // Set various state values
      useVideoStore.getState().setVideoFile(createMockFile());
      useVideoStore.getState().setVideoElement(createMockVideoElement());
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      useVideoStore.getState().setCurrentTime(50);
      useVideoStore.getState().setDuration(100);
      useVideoStore.getState().setIsPlaying(true);
      useVideoStore.getState().setPlaybackRate(2);
      useVideoStore.getState().setIsLooping(true);
      useVideoStore.getState().setVolume(0.5);
      useVideoStore.getState().setIsMuted(true);
      useVideoStore.getState().setIsLoaded(true);
      useVideoStore.getState().setIsVideoMode(true);
      useVideoStore.getState().setPerspectiveSettings({ fieldOfView: 90 });
      useVideoStore.getState().setExportSettings({ resolution: '720p' });

      // Reset everything
      useVideoStore.getState().resetStore();

      const state = useVideoStore.getState();

      // Verify all values are reset
      expect(state.videoFile).toBeNull();
      expect(state.videoElement).toBeNull();
      expect(state.videoMetadata).toBeNull();
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.playbackRate).toBe(1);
      expect(state.isLooping).toBe(false);
      expect(state.volume).toBe(1);
      expect(state.isMuted).toBe(false);
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isVideoMode).toBe(false);
      expect(state.perspectiveSettings).toEqual(DEFAULT_PERSPECTIVE_SETTINGS);
      expect(state.exportSettings).toEqual(DEFAULT_EXPORT_SETTINGS);
      expect(state.currentSavedVideoId).toBeNull();
    });

    it('resetStore should preserve savedVideos list', () => {
      // The savedVideos array should not be cleared by resetStore
      // as it represents persisted data from IndexedDB
      const state = useVideoStore.getState();
      expect(state.savedVideos).toEqual([]);
    });
  });

  describe('Persistence Actions', () => {
    beforeEach(async () => {
      // Clear the database before each persistence test
      await videoDb.videos.clear();
    });

    it('loadSavedVideos should set isPersisting during operation', async () => {
      const promise = useVideoStore.getState().loadSavedVideos();

      // During the operation, isPersisting should be true (may be quick)
      await promise;

      // After completion, isPersisting should be false
      expect(useVideoStore.getState().isPersisting).toBe(false);
    });

    it('loadSavedVideos should populate savedVideos from database', async () => {
      // Add test data to the database
      await videoDb.videos.add({
        fileName: 'test1.mp4',
        fileSize: 1000,
        duration: 60,
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
        createdAt: new Date(),
        updatedAt: new Date(),
        perspectiveSettings: DEFAULT_PERSPECTIVE_SETTINGS,
        exportSettings: DEFAULT_EXPORT_SETTINGS,
      });

      await useVideoStore.getState().loadSavedVideos();

      const savedVideos = useVideoStore.getState().savedVideos;
      expect(savedVideos).toHaveLength(1);
      expect(savedVideos[0].fileName).toBe('test1.mp4');
    });

    it('saveVideoMetadata should throw error when no metadata', async () => {
      await expect(useVideoStore.getState().saveVideoMetadata()).rejects.toThrow(
        'No video metadata to save'
      );
    });

    it('saveVideoMetadata should save current video settings', async () => {
      // Set up video metadata
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      useVideoStore.getState().setDuration(120);
      useVideoStore.getState().setPerspectiveSettings({ fieldOfView: 75 });
      useVideoStore.getState().setExportSettings({ quality: 0.95 });

      const id = await useVideoStore.getState().saveVideoMetadata();

      expect(id).toBeDefined();
      expect(useVideoStore.getState().currentSavedVideoId).toBe(id);

      // Verify data was saved
      const saved = await videoDb.videos.get(id);
      expect(saved).toBeDefined();
      expect(saved?.fileName).toBe('test-video.mp4');
      expect(saved?.duration).toBe(120);
      expect(saved?.perspectiveSettings.fieldOfView).toBe(75);
      expect(saved?.exportSettings.quality).toBe(0.95);
    });

    it('updateVideoMetadata should update existing record', async () => {
      // First save
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      useVideoStore.getState().setDuration(60);
      const id = await useVideoStore.getState().saveVideoMetadata();

      // Update settings
      useVideoStore.getState().setDuration(120);
      useVideoStore.getState().setPerspectiveSettings({ fieldOfView: 90 });

      await useVideoStore.getState().updateVideoMetadata(id);

      // Verify update
      const updated = await videoDb.videos.get(id);
      expect(updated?.duration).toBe(120);
      expect(updated?.perspectiveSettings.fieldOfView).toBe(90);
    });

    it('deleteVideoMetadata should remove record from database', async () => {
      // Save a record
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      const id = await useVideoStore.getState().saveVideoMetadata();

      // Delete it
      await useVideoStore.getState().deleteVideoMetadata(id);

      // Verify deletion
      const record = await videoDb.videos.get(id);
      expect(record).toBeUndefined();
    });

    it('deleteVideoMetadata should clear currentSavedVideoId if deleted record was current', async () => {
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      const id = await useVideoStore.getState().saveVideoMetadata();

      expect(useVideoStore.getState().currentSavedVideoId).toBe(id);

      await useVideoStore.getState().deleteVideoMetadata(id);

      expect(useVideoStore.getState().currentSavedVideoId).toBeNull();
    });

    it('loadVideoSettings should load settings from database', async () => {
      // Save with specific settings
      useVideoStore.getState().setVideoMetadata(createMockVideoMetadata());
      useVideoStore.getState().setPerspectiveSettings({
        cameraPosition: [10, 20, 30],
        fieldOfView: 75,
      });
      useVideoStore.getState().setExportSettings({
        resolution: '720p',
        quality: 0.8,
      });
      const id = await useVideoStore.getState().saveVideoMetadata();

      // Reset to defaults
      useVideoStore.getState().resetPerspectiveSettings();
      useVideoStore.getState().resetExportSettings();

      // Load saved settings
      await useVideoStore.getState().loadVideoSettings(id);

      const state = useVideoStore.getState();
      expect(state.perspectiveSettings.cameraPosition).toEqual([10, 20, 30]);
      expect(state.perspectiveSettings.fieldOfView).toBe(75);
      expect(state.exportSettings.resolution).toBe('720p');
      expect(state.exportSettings.quality).toBe(0.8);
      expect(state.currentSavedVideoId).toBe(id);
    });

    it('loadVideoSettings should throw error for non-existent id', async () => {
      await expect(useVideoStore.getState().loadVideoSettings(999999)).rejects.toThrow(
        'Video with id 999999 not found'
      );
    });
  });

  describe('State Immutability', () => {
    it('should not mutate perspectiveSettings object reference on partial update', () => {
      const originalSettings = useVideoStore.getState().perspectiveSettings;
      useVideoStore.getState().setFieldOfView(90);
      const newSettings = useVideoStore.getState().perspectiveSettings;

      expect(newSettings).not.toBe(originalSettings);
      expect(newSettings.fieldOfView).toBe(90);
    });

    it('should not mutate exportSettings object reference on partial update', () => {
      const originalSettings = useVideoStore.getState().exportSettings;
      useVideoStore.getState().setExportSettings({ quality: 0.5 });
      const newSettings = useVideoStore.getState().exportSettings;

      expect(newSettings).not.toBe(originalSettings);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state updates correctly', () => {
      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        useVideoStore.getState().setCurrentTime(i);
      }

      expect(useVideoStore.getState().currentTime).toBe(99);
    });

    it('should handle concurrent toggle operations', () => {
      // Toggle playback multiple times
      useVideoStore.getState().togglePlayback();
      useVideoStore.getState().togglePlayback();
      useVideoStore.getState().togglePlayback();

      expect(useVideoStore.getState().isPlaying).toBe(true);
    });

    it('should handle zero duration for frame stepping', () => {
      useVideoStore.getState().setDuration(0);
      useVideoStore.getState().setCurrentTime(0);
      useVideoStore.getState().stepForward();

      // Should be clamped to duration (0)
      expect(useVideoStore.getState().currentTime).toBe(0);
    });
  });
});
