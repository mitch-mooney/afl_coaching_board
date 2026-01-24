import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVideoStore } from '../../store/videoStore';

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

  // Store state
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isPlaying = useVideoStore((state) => state.isPlaying);

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

    // Apply texture to mesh material
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.map = texture;
        material.needsUpdate = true;
      }
    }

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
   * Only updates when video is loaded and playing to optimize performance
   */
  useFrame(() => {
    if (!enableFrameUpdate || !textureRef.current || !videoElement) {
      return;
    }

    // Mark texture for update on each frame when video is playing
    // This ensures the Three.js renderer picks up the latest video frame
    if (isLoaded && (isPlaying || videoElement.seeking)) {
      textureRef.current.needsUpdate = true;
    }
  });

  /**
   * Update texture when video is paused but seeked
   * Ensures frame updates are visible when scrubbing timeline
   */
  useEffect(() => {
    if (!videoElement || !textureRef.current) return;

    const handleSeeked = () => {
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    };

    const handleTimeUpdate = () => {
      // Update texture periodically even when paused during scrubbing
      if (textureRef.current && videoElement.paused) {
        textureRef.current.needsUpdate = true;
      }
    };

    videoElement.addEventListener('seeked', handleSeeked);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('seeked', handleSeeked);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoElement]);

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
    >
      <planeGeometry args={[planeDimensions.width, planeDimensions.height]} />
      <meshBasicMaterial
        map={textureRef.current}
        side={THREE.FrontSide}
        toneMapped={false} // Preserve video colors without tone mapping
        transparent={false}
        depthWrite={true}
        depthTest={true}
      />
    </mesh>
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
 */
export function VideoBackgroundWithControls({
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
}
