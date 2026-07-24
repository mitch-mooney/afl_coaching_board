import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoStore, videoDb } from '../videoStore';
import type { VideoMetadata } from '../videoStore';

// Helper to create a mock File
const createMockFile = (name = 'test.mp4', _size = 1000): File => {
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

      const id = await useVideoStore.getState().saveVideoMetadata();

      expect(id).toBeDefined();
      expect(useVideoStore.getState().currentSavedVideoId).toBe(id);

      // Verify data was saved
      const saved = await videoDb.videos.get(id);
      expect(saved).toBeDefined();
      expect(saved?.fileName).toBe('test-video.mp4');
      expect(saved?.duration).toBe(120);
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
