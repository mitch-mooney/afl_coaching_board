import { useState, useCallback, useEffect } from 'react';
import { useVideoStore } from '../../store/videoStore';

/**
 * Configuration for a slider control
 */
interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}

/**
 * Reusable slider component with numeric input
 */
function CalibrationSlider({
  label,
  min,
  max,
  step,
  value,
  unit = '',
  onChange,
}: SliderConfig) {
  const [inputValue, setInputValue] = useState(value.toString());

  // Sync input value when external value changes
  useEffect(() => {
    setInputValue(value.toFixed(step < 1 ? 2 : 0));
  }, [value, step]);

  const handleSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
    },
    []
  );

  const handleInputBlur = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(clamped.toFixed(step < 1 ? 2 : 0));
    } else {
      setInputValue(value.toFixed(step < 1 ? 2 : 0));
    }
  }, [inputValue, min, max, onChange, value, step]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleInputBlur();
      }
    },
    [handleInputBlur]
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-600 font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-16 px-2 py-0.5 text-xs border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label={`${label} value`}
          />
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        aria-label={label}
      />
    </div>
  );
}

/**
 * Section header component for grouping controls
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mt-3 mb-2 first:mt-0">
      {title}
    </h4>
  );
}

/**
 * Props for the PerspectiveCalibration component
 */
interface PerspectiveCalibrationProps {
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Callback when panel expansion state changes */
  onToggleExpand?: () => void;
  /** Optional callback when save is triggered */
  onSave?: () => void;
}

/**
 * PerspectiveCalibration - A UI panel for adjusting camera and field settings
 * to match 3D overlay perspective with video camera angle.
 *
 * Features:
 * - Camera position sliders (X, Y, Z) with numeric input
 * - Camera rotation sliders (pitch, yaw, roll)
 * - Field of View slider (30-120 degrees)
 * - Field scale slider for sizing 3D field relative to video
 * - Field opacity slider to see through field while calibrating
 * - Reset to defaults button
 * - Save calibration button to persist settings
 * - Real-time preview as values change
 *
 * @example
 * ```tsx
 * <PerspectiveCalibration
 *   isExpanded={isPanelOpen}
 *   onToggleExpand={() => setIsPanelOpen(!isPanelOpen)}
 *   onSave={() => saveSettings()}
 * />
 * ```
 */
export function PerspectiveCalibration({
  isExpanded = true,
  onToggleExpand,
  onSave,
}: PerspectiveCalibrationProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Video store state and actions
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const currentSavedVideoId = useVideoStore((state) => state.currentSavedVideoId);
  const isPersisting = useVideoStore((state) => state.isPersisting);

  // Actions
  const setCameraPosition = useVideoStore((state) => state.setCameraPosition);
  const setCameraRotation = useVideoStore((state) => state.setCameraRotation);
  const setFieldOfView = useVideoStore((state) => state.setFieldOfView);
  const setFieldScale = useVideoStore((state) => state.setFieldScale);
  const setFieldOpacity = useVideoStore((state) => state.setFieldOpacity);
  const setFieldOffset = useVideoStore((state) => state.setFieldOffset);
  const toggleLockOrbitControls = useVideoStore((state) => state.toggleLockOrbitControls);
  const resetPerspectiveSettings = useVideoStore((state) => state.resetPerspectiveSettings);
  const saveVideoMetadata = useVideoStore((state) => state.saveVideoMetadata);
  const updateVideoMetadata = useVideoStore((state) => state.updateVideoMetadata);

  /**
   * Handle camera position axis change
   */
  const handlePositionChange = useCallback(
    (axis: 0 | 1 | 2, value: number) => {
      const newPosition: [number, number, number] = [...perspectiveSettings.cameraPosition];
      newPosition[axis] = value;
      setCameraPosition(newPosition);
    },
    [perspectiveSettings.cameraPosition, setCameraPosition]
  );

  /**
   * Handle camera rotation axis change
   */
  const handleRotationChange = useCallback(
    (axis: 0 | 1 | 2, value: number) => {
      const newRotation: [number, number, number] = [...perspectiveSettings.cameraRotation];
      // Convert degrees to radians for internal storage
      newRotation[axis] = (value * Math.PI) / 180;
      setCameraRotation(newRotation);
    },
    [perspectiveSettings.cameraRotation, setCameraRotation]
  );

  /**
   * Get rotation value in degrees for display
   */
  const getRotationDegrees = useCallback(
    (axis: 0 | 1 | 2): number => {
      return (perspectiveSettings.cameraRotation[axis] * 180) / Math.PI;
    },
    [perspectiveSettings.cameraRotation]
  );

  /**
   * Handle field offset axis change
   */
  const handleOffsetChange = useCallback(
    (axis: 0 | 1 | 2, value: number) => {
      const newOffset: [number, number, number] = [...perspectiveSettings.fieldOffset];
      newOffset[axis] = value;
      setFieldOffset(newOffset);
    },
    [perspectiveSettings.fieldOffset, setFieldOffset]
  );

  /**
   * Handle save calibration
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (currentSavedVideoId) {
        // Update existing calibration
        await updateVideoMetadata(currentSavedVideoId);
        setSaveMessage('Calibration updated!');
      } else {
        // Save new calibration
        await saveVideoMetadata();
        setSaveMessage('Calibration saved!');
      }

      // Clear message after 2 seconds
      setTimeout(() => setSaveMessage(null), 2000);

      if (onSave) {
        onSave();
      }
    } catch (error) {
      setSaveMessage('Failed to save. Please try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [currentSavedVideoId, updateVideoMetadata, saveVideoMetadata, onSave]);

  /**
   * Handle reset to defaults
   */
  const handleReset = useCallback(() => {
    resetPerspectiveSettings();
  }, [resetPerspectiveSettings]);

  // Don't render if no video is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
      {/* Panel Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 transition"
        aria-expanded={isExpanded}
        aria-controls="perspective-calibration-panel"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <span className="font-medium text-gray-800">Perspective Calibration</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Panel Content */}
      {isExpanded && (
        <div
          id="perspective-calibration-panel"
          className="px-4 py-3 border-t border-gray-100 space-y-3"
        >
          {/* Camera Position */}
          <SectionHeader title="Camera Position" />
          <CalibrationSlider
            label="X (Left/Right)"
            min={-200}
            max={200}
            step={1}
            value={perspectiveSettings.cameraPosition[0]}
            unit=""
            onChange={(value) => handlePositionChange(0, value)}
          />
          <CalibrationSlider
            label="Y (Height)"
            min={10}
            max={300}
            step={1}
            value={perspectiveSettings.cameraPosition[1]}
            unit=""
            onChange={(value) => handlePositionChange(1, value)}
          />
          <CalibrationSlider
            label="Z (Forward/Back)"
            min={-200}
            max={300}
            step={1}
            value={perspectiveSettings.cameraPosition[2]}
            unit=""
            onChange={(value) => handlePositionChange(2, value)}
          />

          {/* Camera Rotation */}
          <SectionHeader title="Camera Rotation" />
          <CalibrationSlider
            label="Pitch (Up/Down)"
            min={-90}
            max={90}
            step={1}
            value={getRotationDegrees(0)}
            unit="°"
            onChange={(value) => handleRotationChange(0, value)}
          />
          <CalibrationSlider
            label="Yaw (Left/Right)"
            min={-180}
            max={180}
            step={1}
            value={getRotationDegrees(1)}
            unit="°"
            onChange={(value) => handleRotationChange(1, value)}
          />
          <CalibrationSlider
            label="Roll (Tilt)"
            min={-180}
            max={180}
            step={1}
            value={getRotationDegrees(2)}
            unit="°"
            onChange={(value) => handleRotationChange(2, value)}
          />

          {/* Field of View */}
          <SectionHeader title="Field of View" />
          <CalibrationSlider
            label="FOV"
            min={30}
            max={120}
            step={1}
            value={perspectiveSettings.fieldOfView}
            unit="°"
            onChange={setFieldOfView}
          />

          {/* Field Settings */}
          <SectionHeader title="Field Overlay" />
          <CalibrationSlider
            label="Field Scale"
            min={0.5}
            max={2}
            step={0.01}
            value={perspectiveSettings.fieldScale}
            unit="x"
            onChange={setFieldScale}
          />
          <CalibrationSlider
            label="Field Opacity"
            min={0}
            max={1}
            step={0.05}
            value={perspectiveSettings.fieldOpacity}
            unit=""
            onChange={setFieldOpacity}
          />

          {/* Field Position Offset */}
          <SectionHeader title="Field Position" />
          <CalibrationSlider
            label="Offset X (Left/Right)"
            min={-100}
            max={100}
            step={1}
            value={perspectiveSettings.fieldOffset[0]}
            unit=""
            onChange={(value) => handleOffsetChange(0, value)}
          />
          <CalibrationSlider
            label="Offset Y (Up/Down)"
            min={-50}
            max={50}
            step={1}
            value={perspectiveSettings.fieldOffset[1]}
            unit=""
            onChange={(value) => handleOffsetChange(1, value)}
          />
          <CalibrationSlider
            label="Offset Z (Forward/Back)"
            min={-100}
            max={100}
            step={1}
            value={perspectiveSettings.fieldOffset[2]}
            unit=""
            onChange={(value) => handleOffsetChange(2, value)}
          />

          {/* Controls Lock */}
          <SectionHeader title="Calibration Mode" />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-600">Lock Camera Controls</span>
            <button
              onClick={toggleLockOrbitControls}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                perspectiveSettings.lockOrbitControls
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={perspectiveSettings.lockOrbitControls}
              aria-label="Lock camera controls for precise calibration"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  perspectiveSettings.lockOrbitControls
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 -mt-1">
            {perspectiveSettings.lockOrbitControls
              ? 'Camera locked - use sliders to adjust'
              : 'Drag to orbit camera freely'}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition flex items-center justify-center gap-1"
              aria-label="Reset calibration to defaults"
              title="Reset to defaults"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isPersisting}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded transition flex items-center justify-center gap-1"
              aria-label="Save calibration settings"
              title="Save calibration"
            >
              {isSaving || isPersisting ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`text-center text-sm py-2 rounded ${
                saveMessage.includes('Failed')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
              role="status"
              aria-live="polite"
            >
              {saveMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the calibration panel for inline use
 */
export function PerspectiveCalibrationCompact() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <PerspectiveCalibration
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
    />
  );
}

export default PerspectiveCalibration;
