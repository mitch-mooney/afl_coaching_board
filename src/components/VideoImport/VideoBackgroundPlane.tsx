import { useEffect, useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVideoStore } from '../../store/videoStore';

/**
 * Performance constants for video texture rendering
 */
const PERFORMANCE_CONFIG = {
  /** Minimum time between texture updates in milliseconds (for ~30fps cap) */
  MIN_UPDATE_INTERVAL_MS: 33,
  /** Priority for useFrame callback (lower = earlier execution) */
  FRAME_PRIORITY: -1,
} as const;

/**
 * Props for the VideoBackgroundPlane component
 */
interface VideoBackgroundPlaneProps {
  /** Optional Y position offset (default positions behind field) */
  positionY?: number;
  /** Optional Z position offset */
  positionZ?: number;
  /** Optional custom scale multiplier */
  scale?: number;
  /** Whether to enable texture updates on each frame */
  enableFrameUpdate?: boolean;
}

/**
 * Default plane dimensions matching common video aspect ratios
 * These are base dimensions that will be scaled based on actual video aspect ratio
 */
const DEFAULT_PLANE_WIDTH = 160;
const DEFAULT_PLANE_HEIGHT = 90; // 16:9 aspect ratio base

/**
 * Default position behind the field (below ground plane)
 */
const DEFAULT_POSITION_Y = -1;

/**
 * VideoBackgroundPlane - A Three.js mesh that renders video as a texture
 * on a plane positioned behind the field for video overlay functionality.
 *
 * Features:
 * - Creates THREE.VideoTexture from video element in store
 * - Automatically handles aspect ratio to prevent distortion
 * - Updates texture on each frame for smooth playback
 * - Proper disposal of texture on unmount to prevent memory leaks
 */
export function VideoBackgroundPlane({
  positionY = DEFAULT_POSITION_Y,
  positionZ = 0,
  scale = 1,
  enableFrameUpdate = true,
}: VideoBackgroundPlaneProps) {
  // Refs for Three.js objects
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const lastVideoElementRef = useRef<HTMLVideoElement | null>(null);

  // Performance tracking refs
  const lastUpdateTimeRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(0);

  // Store state - subscribe only to values that trigger re-renders when changed
  // isPlaying and isLoaded are accessed via getState() in useFrame to avoid re-renders
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const isLoaded = useVideoStore((state) => state.isLoaded);

  /**
   * Calculate plane dimensions based on video aspect ratio
   * Maintains proper proportions to prevent video distortion
   */
  const planeDimensions = useMemo(() => {
    if (!videoMetadata || videoMetadata.aspectRatio <= 0) {
      // Default to 16:9 if no metadata
      return {
        width: DEFAULT_PLANE_WIDTH * scale,
        height: DEFAULT_PLANE_HEIGHT * scale,
      };
    }

    const aspectRatio = videoMetadata.aspectRatio;

    // Calculate dimensions to fit within default bounds while preserving aspect ratio
    let width: number;
    let height: number;

    if (aspectRatio >= 1) {
      // Wider than tall - constrain by width
      width = DEFAULT_PLANE_WIDTH * scale;
      height = width / aspectRatio;
    } else {
      // Taller than wide - constrain by height
      height = DEFAULT_PLANE_HEIGHT * scale;
      width = height * aspectRatio;
    }

    return { width, height };
  }, [videoMetadata, scale]);

  /**
   * Create and manage the video texture
   * Recreates texture when video element changes
   */
  useEffect(() => {
    // Clean up if video element is removed
    if (!videoElement) {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      lastVideoElementRef.current = null;
      return;
    }

    // Skip if same video element
    if (videoElement === lastVideoElementRef.current && textureRef.current) {
      return;
    }

    // Dispose of previous texture if exists
    if (textureRef.current) {
      textureRef.current.dispose();
    }

    // Create new video texture
    const texture = new THREE.VideoTexture(videoElement);

    // Configure texture for optimal video rendering
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Enable smooth playback updates
    texture.generateMipmaps = false;

    // Store references
    textureRef.current = texture;
    lastVideoElementRef.current = videoElement;

    // Cleanup on unmount or when video element changes
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [videoElement]);

  /**
   * Update texture on each frame for smooth video playback
   * Optimized for performance with frame throttling and state checks
   *
   * Performance optimizations:
   * - Uses getState() to avoid re-renders from isPlaying changes
   * - Throttles updates to ~30fps to reduce GPU overhead
   * - Only updates when video time has actually changed
   * - Uses negative priority to run before other frame callbacks
   */
  useFrame((_, delta) => {
    if (!enableFrameUpdate || !textureRef.current || !videoElement) {
      return;
    }

    // Get current state without subscribing (avoids re-renders)
    const { isPlaying, isLoaded: loaded } = useVideoStore.getState();

    // Skip if video not loaded
    if (!loaded) {
      return;
    }

    // Check if video is playing or seeking
    const shouldUpdate = isPlaying || videoElement.seeking;
    if (!shouldUpdate) {
      return;
    }

    // Throttle texture updates to ~30fps for performance
    // This reduces GPU overhead while maintaining smooth video playback
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    if (timeSinceLastUpdate < PERFORMANCE_CONFIG.MIN_UPDATE_INTERVAL_MS) {
      return;
    }

    // Only update if video time has actually changed
    // This prevents unnecessary GPU texture uploads when video is paused
    const currentVideoTime = videoElement.currentTime;
    if (currentVideoTime === lastVideoTimeRef.current && !videoElement.seeking) {
      return;
    }

    // Mark texture for update
    textureRef.current.needsUpdate = true;
    lastUpdateTimeRef.current = now;
    lastVideoTimeRef.current = currentVideoTime;
  }, PERFORMANCE_CONFIG.FRAME_PRIORITY);

  /**
   * Update texture when video is paused but seeked
   * Ensures frame updates are visible when scrubbing timeline
   *
   * Performance optimizations:
   * - Only triggers on seeked (not continuous timeupdate)
   * - Debounced to prevent rapid fire updates during scrubbing
   */
  useEffect(() => {
    if (!videoElement || !textureRef.current) return;

    let seekDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleSeeked = () => {
      // Clear any pending debounced update
      if (seekDebounceTimeout) {
        clearTimeout(seekDebounceTimeout);
      }

      // Debounce seek updates to prevent rapid fire during scrubbing
      seekDebounceTimeout = setTimeout(() => {
        if (textureRef.current) {
          textureRef.current.needsUpdate = true;
          lastVideoTimeRef.current = videoElement.currentTime;
        }
      }, 16); // ~60fps max for seek updates
    };

    // Use seeked event instead of timeupdate for better performance
    // timeupdate fires very frequently and causes unnecessary work
    videoElement.addEventListener('seeked', handleSeeked);

    return () => {
      if (seekDebounceTimeout) {
        clearTimeout(seekDebounceTimeout);
      }
      videoElement.removeEventListener('seeked', handleSeeked);
    };
  }, [videoElement]);

  /**
   * Memoize geometry to prevent recreation on every render
   * Only recreates when dimensions actually change
   */
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(planeDimensions.width, planeDimensions.height);
  }, [planeDimensions.width, planeDimensions.height]);

  /**
   * Memoize material to prevent recreation on every render
   * Material texture is updated via effect when texture changes
   */
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      side: THREE.FrontSide,
      toneMapped: false, // Preserve video colors without tone mapping
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
  }, []);

  // Sync material map with texture ref when video element changes
  useEffect(() => {
    if (material && textureRef.current) {
      material.map = textureRef.current;
      material.needsUpdate = true;
    }
  }, [material, videoElement]);

  // Cleanup geometry and material on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Don't render if no video is loaded
  if (!isLoaded || !videoElement) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[0, positionY, positionZ]}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat like field
      renderOrder={-1} // Render before other objects to ensure it's behind
      geometry={geometry}
      material={material}
    />
  );
}

/**
 * Props for controlling video background visibility and appearance
 */
export interface VideoBackgroundControlProps {
  visible: boolean;
  opacity?: number;
  scale?: number;
}

/**
 * VideoBackgroundWithControls - A wrapper component that adds visibility
 * and opacity controls to the video background plane.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
export const VideoBackgroundWithControls = memo(function VideoBackgroundWithControls({
  visible,
  opacity = 1,
  scale = 1,
}: VideoBackgroundControlProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Update material opacity when props change
  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
        material.needsUpdate = true;
      }
    }
  }, [opacity]);

  if (!visible) {
    return null;
  }

  return <VideoBackgroundPlane scale={scale} />;
});
