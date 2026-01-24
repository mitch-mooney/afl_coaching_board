import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD_CONFIG } from '../../models/FieldModel';
import { useVideoStore } from '../../store/videoStore';

/**
 * Grid settings for calibration overlay
 */
export interface GridSettings {
  /** Whether the grid is visible */
  visible: boolean;
  /** Grid line color (hex string) */
  color: string;
  /** Grid line opacity (0-1) */
  opacity: number;
  /** Number of horizontal divisions */
  horizontalDivisions: number;
  /** Number of vertical divisions */
  verticalDivisions: number;
  /** Show major field markings (center, 50m lines) */
  showMajorLines: boolean;
}

/**
 * Default grid settings
 */
const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: false,
  color: '#00ff00',
  opacity: 0.6,
  horizontalDivisions: 10,
  verticalDivisions: 8,
  showMajorLines: true,
};

/**
 * Props for the CalibrationGrid3D component
 */
interface CalibrationGrid3DProps {
  /** Grid visibility */
  visible?: boolean;
  /** Grid line color */
  color?: string;
  /** Grid line opacity */
  opacity?: number;
  /** Number of horizontal divisions */
  horizontalDivisions?: number;
  /** Number of vertical divisions */
  verticalDivisions?: number;
  /** Show major field markings */
  showMajorLines?: boolean;
}

/**
 * CalibrationGrid3D - Three.js component that renders a grid overlay
 * positioned at the field level to help with perspective alignment.
 *
 * The grid uses AFL field proportions and includes:
 * - Regular grid lines based on division settings
 * - Optional major lines at center and 50m marks
 * - Oval boundary outline matching field shape
 */
export function CalibrationGrid3D({
  visible = true,
  color = '#00ff00',
  opacity = 0.6,
  horizontalDivisions = 10,
  verticalDivisions = 8,
  showMajorLines = true,
}: CalibrationGrid3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Store target values for smooth interpolation (matching FieldOverlay pattern)
  const targetScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Update targets when settings change
  useEffect(() => {
    const scale = perspectiveSettings.fieldScale;
    targetScale.set(scale, scale, scale);
    targetPosition.set(...perspectiveSettings.fieldOffset);
  }, [perspectiveSettings.fieldScale, perspectiveSettings.fieldOffset, targetScale, targetPosition]);

  // Apply transformations using useFrame for smooth real-time updates
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.scale.lerp(targetScale, 0.15);
    groupRef.current.position.lerp(targetPosition, 0.15);
  });

  // Generate grid lines geometry
  const gridLines = useMemo(() => {
    const lines: Array<{ start: [number, number, number]; end: [number, number, number]; isMajor: boolean }> = [];
    const { length, width } = FIELD_CONFIG;
    const halfLength = length / 2;
    const halfWidth = width / 2;

    // Vertical lines (along the length of the field)
    for (let i = 0; i <= horizontalDivisions; i++) {
      const z = -halfWidth + (i / horizontalDivisions) * width;
      const isMajor = i === horizontalDivisions / 2; // Center line
      lines.push({
        start: [-halfLength, 0.1, z],
        end: [halfLength, 0.1, z],
        isMajor,
      });
    }

    // Horizontal lines (across the width of the field)
    for (let i = 0; i <= verticalDivisions; i++) {
      const x = -halfLength + (i / verticalDivisions) * length;
      // Check if this is a major line (center or near 50m marks)
      const isMajor = i === verticalDivisions / 2; // Center line
      lines.push({
        start: [x, 0.1, -halfWidth],
        end: [x, 0.1, halfWidth],
        isMajor,
      });
    }

    return lines;
  }, [horizontalDivisions, verticalDivisions]);

  // Generate 50m arc lines for major markings
  const fiftyMeterLines = useMemo(() => {
    if (!showMajorLines) return [];

    const lines: Array<{ start: [number, number, number]; end: [number, number, number] }> = [];
    const { length } = FIELD_CONFIG;
    const halfLength = length / 2;
    const fiftyMeterMark = FIELD_CONFIG.fiftyMetreArcRadius;

    // 50m marks from each goal line (as vertical reference lines)
    const leftFiftyX = -halfLength + fiftyMeterMark;
    const rightFiftyX = halfLength - fiftyMeterMark;
    const halfWidth = FIELD_CONFIG.width / 2;

    // Left 50m line
    lines.push({
      start: [leftFiftyX, 0.1, -halfWidth],
      end: [leftFiftyX, 0.1, halfWidth],
    });

    // Right 50m line
    lines.push({
      start: [rightFiftyX, 0.1, -halfWidth],
      end: [rightFiftyX, 0.1, halfWidth],
    });

    return lines;
  }, [showMajorLines]);

  // Generate oval boundary points
  const boundaryPoints = useMemo(() => {
    const { length, width } = FIELD_CONFIG;
    const segments = 64;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = (length / 2) * Math.cos(angle);
      const z = (width / 2) * Math.sin(angle);
      points.push(new THREE.Vector3(x, 0.1, z));
    }

    return points;
  }, []);

  // Create line material with the specified color and opacity
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      opacity,
      transparent: true,
    });
  }, [color, opacity]);

  // Major line material (slightly thicker appearance via different color)
  const majorLineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(1.2),
      opacity: Math.min(opacity + 0.2, 1),
      transparent: true,
    });
  }, [color, opacity]);

  // Boundary line material
  const boundaryMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      opacity: Math.min(opacity + 0.1, 1),
      transparent: true,
    });
  }, [color, opacity]);

  if (!visible) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Regular grid lines */}
      {gridLines.map((line, index) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...line.start),
          new THREE.Vector3(...line.end),
        ]);
        return (
          <primitive
            key={`grid-${index}`}
            object={new THREE.Line(geometry, line.isMajor && showMajorLines ? majorLineMaterial : lineMaterial)}
          />
        );
      })}

      {/* 50m reference lines */}
      {fiftyMeterLines.map((line, index) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...line.start),
          new THREE.Vector3(...line.end),
        ]);
        return (
          <primitive
            key={`fifty-${index}`}
            object={new THREE.Line(geometry, majorLineMaterial)}
          />
        );
      })}

      {/* Oval boundary */}
      {showMajorLines && (
        <primitive
          object={new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(boundaryPoints),
            boundaryMaterial
          )}
        />
      )}

      {/* Center circle indicator */}
      {showMajorLines && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[FIELD_CONFIG.centerCircleOuterRadius - 0.5, FIELD_CONFIG.centerCircleOuterRadius, 32]} />
          <meshBasicMaterial color={color} opacity={opacity} transparent />
        </mesh>
      )}

      {/* Center square indicator */}
      {showMajorLines && (
        <CenterSquareIndicator color={color} opacity={opacity} />
      )}
    </group>
  );
}

/**
 * Center square indicator for grid overlay
 */
function CenterSquareIndicator({ color, opacity }: { color: string; opacity: number }) {
  const size = FIELD_CONFIG.centerSquareSize;
  const halfSize = size / 2;

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      opacity: Math.min(opacity + 0.2, 1),
      transparent: true,
    });
  }, [color, opacity]);

  const points = useMemo(() => [
    new THREE.Vector3(-halfSize, 0.1, -halfSize),
    new THREE.Vector3(halfSize, 0.1, -halfSize),
    new THREE.Vector3(halfSize, 0.1, halfSize),
    new THREE.Vector3(-halfSize, 0.1, halfSize),
    new THREE.Vector3(-halfSize, 0.1, -halfSize),
  ], [halfSize]);

  return (
    <primitive
      object={new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        material
      )}
    />
  );
}

/**
 * Props for the CalibrationGridControls component
 */
interface CalibrationGridControlsProps {
  /** Current grid settings */
  settings: GridSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: GridSettings) => void;
  /** Whether the video is loaded */
  isVideoLoaded?: boolean;
}

/**
 * CalibrationGridControls - UI component for controlling grid overlay settings.
 *
 * Provides controls for:
 * - Grid visibility toggle
 * - Color picker
 * - Opacity slider
 * - Division count adjustments
 * - Major lines toggle
 */
export function CalibrationGridControls({
  settings,
  onSettingsChange,
  isVideoLoaded = true,
}: CalibrationGridControlsProps) {
  const handleToggleVisible = useCallback(() => {
    onSettingsChange({ ...settings, visible: !settings.visible });
  }, [settings, onSettingsChange]);

  const handleColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, color: event.target.value });
    },
    [settings, onSettingsChange]
  );

  const handleOpacityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, opacity: parseFloat(event.target.value) });
    },
    [settings, onSettingsChange]
  );

  const handleMajorLinesToggle = useCallback(() => {
    onSettingsChange({ ...settings, showMajorLines: !settings.showMajorLines });
  }, [settings, onSettingsChange]);

  const handleHorizontalDivisionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, horizontalDivisions: parseInt(event.target.value, 10) });
    },
    [settings, onSettingsChange]
  );

  const handleVerticalDivisionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, verticalDivisions: parseInt(event.target.value, 10) });
    },
    [settings, onSettingsChange]
  );

  if (!isVideoLoaded) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="font-medium text-gray-800">Calibration Grid</span>
        </div>
        <button
          onClick={handleToggleVisible}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.visible ? 'bg-green-500' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={settings.visible}
          aria-label="Toggle calibration grid"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.visible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Grid controls - only show when visible */}
      {settings.visible && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          {/* Color picker */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Grid Color</label>
            <input
              type="color"
              value={settings.color}
              onChange={handleColorChange}
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              aria-label="Grid color"
            />
          </div>

          {/* Opacity slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-600">Opacity</label>
              <span className="text-xs text-gray-500">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={settings.opacity}
              onChange={handleOpacityChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              aria-label="Grid opacity"
            />
          </div>

          {/* Horizontal divisions */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-600">Width Lines</label>
              <span className="text-xs text-gray-500">{settings.horizontalDivisions}</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              step="2"
              value={settings.horizontalDivisions}
              onChange={handleHorizontalDivisionsChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              aria-label="Number of horizontal grid lines"
            />
          </div>

          {/* Vertical divisions */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-600">Length Lines</label>
              <span className="text-xs text-gray-500">{settings.verticalDivisions}</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              step="2"
              value={settings.verticalDivisions}
              onChange={handleVerticalDivisionsChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              aria-label="Number of vertical grid lines"
            />
          </div>

          {/* Show major lines toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-600">Show Field Markers</span>
            <button
              onClick={handleMajorLinesToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings.showMajorLines ? 'bg-green-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={settings.showMajorLines}
              aria-label="Toggle field markers"
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                  settings.showMajorLines ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Shows 50m arcs, center square, and boundary outline
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage calibration grid state
 *
 * @example
 * ```tsx
 * const { gridSettings, updateGridSettings, resetGridSettings } = useCalibrationGrid();
 *
 * return (
 *   <>
 *     <CalibrationGrid3D {...gridSettings} />
 *     <CalibrationGridControls
 *       settings={gridSettings}
 *       onSettingsChange={updateGridSettings}
 *     />
 *   </>
 * );
 * ```
 */
export function useCalibrationGrid(initialSettings?: Partial<GridSettings>) {
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    ...DEFAULT_GRID_SETTINGS,
    ...initialSettings,
  });

  const updateGridSettings = useCallback((newSettings: GridSettings) => {
    setGridSettings(newSettings);
  }, []);

  const resetGridSettings = useCallback(() => {
    setGridSettings({ ...DEFAULT_GRID_SETTINGS });
  }, []);

  const toggleGrid = useCallback(() => {
    setGridSettings((prev) => ({ ...prev, visible: !prev.visible }));
  }, []);

  return {
    gridSettings,
    updateGridSettings,
    resetGridSettings,
    toggleGrid,
  };
}

/**
 * Export default grid settings for external use
 */
export { DEFAULT_GRID_SETTINGS };

export default CalibrationGrid3D;
