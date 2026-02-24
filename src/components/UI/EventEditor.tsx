import { useState, useCallback, useMemo } from 'react';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { usePathStore } from '../../store/pathStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  createPlayerPathConfig,
  createAnimationPhase,
  AnimationPhase,
  EVENT_DEFAULTS,
} from '../../models/EventModel';

interface EventEditorProps {
  /** Callback when editor is closed */
  onClose: () => void;
  /** Optional event ID to edit (if not provided, creates new event) */
  editEventId?: string | null;
}

/**
 * EventEditor component for creating/editing animation events
 *
 * Features:
 * - Event name input
 * - Duration input (default 30s)
 * - Button to capture current player paths as event
 * - Per-player start time offset editing (advanced mode)
 */
export function EventEditor({ onClose, editEventId = null }: EventEditorProps) {
  // Stores
  const createEvent = useEventStore((state) => state.createEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const addPlayerPath = useEventStore((state) => state.addPlayerPath);
  const updatePlayerPath = useEventStore((state) => state.updatePlayerPath);
  const removePlayerPath = useEventStore((state) => state.removePlayerPath);
  const getEvent = useEventStore((state) => state.getEvent);
  const setActiveEvent = useEventStore((state) => state.setActiveEvent);
  const paths = usePathStore((state) => state.paths);
  const players = usePlayerStore((state) => state.players);

  // Get existing event if editing
  const existingEvent = editEventId ? getEvent(editEventId) : undefined;

  // Local state
  const [eventName, setEventName] = useState(existingEvent?.name ?? '');
  const [description, setDescription] = useState(existingEvent?.description ?? '');
  const [durationSeconds, setDurationSeconds] = useState(
    (existingEvent?.duration ?? EVENT_DEFAULTS.duration) / 1000
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local phase state (phases 2+ only; phase 1 at t=0 is implicit)
  const [phases, setPhases] = useState<AnimationPhase[]>(() =>
    (existingEvent?.phases ?? []).filter((p) => p.startTime > 0)
  );

  // Local state for path offsets (used when creating or before saving)
  // Maps playerId to startTimeOffset in milliseconds
  const [pathOffsets, setPathOffsets] = useState<Map<string, number>>(() => {
    const offsetMap = new Map<string, number>();
    if (existingEvent) {
      existingEvent.playerPaths.forEach((pp) => {
        offsetMap.set(pp.playerId, pp.startTimeOffset);
      });
    }
    return offsetMap;
  });

  // Get all player paths (paths of type 'player')
  const playerPaths = useMemo(() => {
    return paths.filter((p) => p.entityType === 'player');
  }, [paths]);

  // Get player info for a path
  const getPlayerInfo = useCallback(
    (entityId: string) => {
      return players.find((p) => p.id === entityId);
    },
    [players]
  );

  // Count paths that would be captured
  const captureablePathsCount = playerPaths.length;

  /**
   * Handle duration change with validation
   */
  const handleDurationChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDurationSeconds(numValue);
    }
  }, []);

  /**
   * Handle path offset change
   */
  const handleOffsetChange = useCallback((playerId: string, offsetSeconds: number) => {
    setPathOffsets((prev) => {
      const newMap = new Map(prev);
      newMap.set(playerId, offsetSeconds * 1000); // Convert to ms
      return newMap;
    });
  }, []);

  /**
   * Add a new phase
   */
  const handleAddPhase = useCallback(() => {
    const midpoint = Math.max(1, Math.round(durationSeconds / 2));
    const newPhase = createAnimationPhase(`Phase ${phases.length + 2}`, midpoint * 1000);
    setPhases((prev) => [...prev, newPhase]);
  }, [durationSeconds, phases.length]);

  /**
   * Remove a phase
   */
  const handleRemovePhase = useCallback((phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
  }, []);

  /**
   * Update a phase field
   */
  const handleUpdatePhase = useCallback(
    (phaseId: string, updates: Partial<Omit<AnimationPhase, 'id'>>) => {
      setPhases((prev) =>
        prev.map((p) => (p.id === phaseId ? { ...p, ...updates } : p))
      );
    },
    []
  );

  /**
   * Capture all current paths from pathStore into the event
   */
  const handleCapturePaths = useCallback(() => {
    if (playerPaths.length === 0) {
      setError('No player paths to capture. Create paths by dragging players first.');
      return;
    }

    // Initialize offsets for all capturable paths
    const newOffsets = new Map<string, number>();
    playerPaths.forEach((path) => {
      // Keep existing offset if present, otherwise default to 0
      const existingOffset = pathOffsets.get(path.entityId) ?? 0;
      newOffsets.set(path.entityId, existingOffset);
    });
    setPathOffsets(newOffsets);
    setError(null);
  }, [playerPaths, pathOffsets]);

  /**
   * Remove a path from the capture list
   */
  const handleRemovePathFromCapture = useCallback((playerId: string) => {
    setPathOffsets((prev) => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  /**
   * Save the event (create new or update existing)
   */
  const handleSave = useCallback(() => {
    // Validation
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }

    if (durationSeconds <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    const durationMs = durationSeconds * 1000;

    // Build full phases array: implicit phase 1 at t=0 plus user-defined phases
    const phase1 = createAnimationPhase('Phase 1', 0);
    // Preserve existing phase 1 id if editing
    const existingPhase1 = existingEvent?.phases?.find((p) => p.startTime === 0);
    const fullPhases: AnimationPhase[] = [
      existingPhase1 ?? phase1,
      ...phases.map((p) => ({
        ...p,
        startTime: Math.max(1, Math.min(durationMs - 1, p.startTime)),
      })),
    ];

    if (editEventId && existingEvent) {
      // Update existing event
      updateEvent(editEventId, {
        name: eventName.trim(),
        description: description.trim() || undefined,
        duration: durationMs,
        phases: fullPhases,
      });

      // Update player paths
      // First, find paths to remove (in event but not in our offsets)
      existingEvent.playerPaths.forEach((pp) => {
        if (!pathOffsets.has(pp.playerId)) {
          removePlayerPath(editEventId, pp.playerId);
        }
      });

      // Update or add paths
      pathOffsets.forEach((offset, playerId) => {
        const path = playerPaths.find((p) => p.entityId === playerId);
        if (path) {
          const existingPathConfig = existingEvent.playerPaths.find(
            (pp) => pp.playerId === playerId
          );
          if (existingPathConfig) {
            // Update existing
            updatePlayerPath(editEventId, playerId, {
              pathId: path.id,
              startTimeOffset: offset,
            });
          } else {
            // Add new
            const pathConfig = createPlayerPathConfig(playerId, path.id, offset);
            addPlayerPath(editEventId, pathConfig);
          }
        }
      });
    } else {
      // Create new event
      // Build player path configs from captured paths
      const playerPathConfigs = Array.from(pathOffsets.entries())
        .map(([playerId, offset]) => {
          const path = playerPaths.find((p) => p.entityId === playerId);
          if (!path) return null;
          return createPlayerPathConfig(playerId, path.id, offset);
        })
        .filter((config): config is NonNullable<typeof config> => config !== null);

      const newEvent = createEvent(
        eventName.trim(),
        playerPathConfigs,
        durationMs,
        description.trim() || undefined
      );

      // Apply phases to new event after creation
      if (fullPhases.length > 1) {
        updateEvent(newEvent.id, { phases: fullPhases });
      }

      // Set as active event
      setActiveEvent(newEvent.id);
    }

    onClose();
  }, [
    eventName,
    description,
    durationSeconds,
    editEventId,
    existingEvent,
    pathOffsets,
    playerPaths,
    phases,
    createEvent,
    updateEvent,
    addPlayerPath,
    updatePlayerPath,
    removePlayerPath,
    setActiveEvent,
    onClose,
  ]);

  // Get paths that are captured (have offsets set)
  const capturedPaths = useMemo(() => {
    return playerPaths.filter((path) => pathOffsets.has(path.entityId));
  }, [playerPaths, pathOffsets]);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[400px] max-w-[500px]">
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {editEventId ? 'Edit Event' : 'Create New Event'}
      </h3>

      {error && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Event Name */}
        <div>
          <label htmlFor="event-name" className="block text-sm font-medium mb-1">
            Event Name *
          </label>
          <input
            id="event-name"
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., Centre Bounce Play"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="event-description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Optional description of the event"
            rows={2}
          />
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="event-duration" className="block text-sm font-medium mb-1">
            Duration (seconds)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="event-duration"
              type="number"
              min="1"
              max="120"
              step="1"
              value={durationSeconds}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-24 px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <span className="text-sm text-gray-500">
              ({formatEventTime(durationSeconds * 1000)})
            </span>
          </div>
        </div>

        {/* Phases Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Phases</span>
            <button
              type="button"
              onClick={handleAddPhase}
              className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded transition"
            >
              + Add Phase
            </button>
          </div>

          <div className="space-y-1.5">
            {/* Implicit Phase 1 — always shown, non-editable */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-700 flex-1">Phase 1</span>
              <span className="text-xs text-gray-400">t = 0s</span>
            </div>

            {/* User-defined phases */}
            {phases.map((phase, i) => (
              <div key={phase.id} className="border border-yellow-200 rounded p-2 bg-yellow-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => handleUpdatePhase(phase.id, { name: e.target.value })}
                    placeholder={`Phase ${i + 2} name`}
                    className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 min-w-0"
                  />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={durationSeconds - 1}
                      step={1}
                      value={Math.round(phase.startTime / 1000)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          handleUpdatePhase(phase.id, { startTime: val * 1000 });
                        }
                      }}
                      className="w-14 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 text-center"
                    />
                    <span className="text-xs text-gray-500">s</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhase(phase.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition flex-shrink-0"
                    aria-label={`Remove ${phase.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Optional description */}
                <input
                  type="text"
                  value={phase.description ?? ''}
                  onChange={(e) =>
                    handleUpdatePhase(phase.id, { description: e.target.value || undefined })
                  }
                  placeholder="Description (optional)"
                  className="mt-1.5 w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 bg-white"
                />
              </div>
            ))}

            {phases.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No phases — animation plays straight through. Add a phase to enable pause-and-coach.
              </p>
            )}
          </div>
        </div>

        {/* Capture Paths Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Player Paths</span>
            <span className="text-xs text-gray-500">
              {capturedPaths.length} of {captureablePathsCount} paths captured
            </span>
          </div>

          {captureablePathsCount === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No player paths available. Drag players to create movement paths first.
            </p>
          ) : (
            <>
              <button
                onClick={handleCapturePaths}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition flex items-center justify-center gap-2"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Capture All Paths ({captureablePathsCount})
              </button>
            </>
          )}
        </div>

        {/* Captured Paths List */}
        {capturedPaths.length > 0 && (
          <div className="border rounded max-h-48 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">
                Captured Paths ({capturedPaths.length})
              </span>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-purple-600 hover:text-purple-800 transition"
              >
                {showAdvanced ? 'Hide Offsets' : 'Edit Offsets'}
              </button>
            </div>
            <div className="divide-y">
              {capturedPaths.map((path) => {
                const player = getPlayerInfo(path.entityId);
                const offset = pathOffsets.get(path.entityId) ?? 0;
                const teamColor =
                  player?.teamId === 'team1' ? 'bg-blue-100' : 'bg-red-100';

                return (
                  <div
                    key={path.id}
                    className={`px-3 py-2 flex items-center justify-between ${teamColor}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        #{player?.number ?? '?'}
                      </span>
                      {player?.playerName && (
                        <span className="text-xs text-gray-600">
                          {player.playerName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {showAdvanced ? (
                        <div className="flex items-center gap-1">
                          <label
                            htmlFor={`offset-${path.entityId}`}
                            className="text-xs text-gray-500"
                          >
                            Start:
                          </label>
                          <input
                            id={`offset-${path.entityId}`}
                            type="number"
                            min="0"
                            max={durationSeconds}
                            step="0.1"
                            value={offset / 1000}
                            onChange={(e) =>
                              handleOffsetChange(
                                path.entityId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 text-xs border rounded"
                          />
                          <span className="text-xs text-gray-500">s</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {offset > 0 ? `+${(offset / 1000).toFixed(1)}s` : '0s'}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemovePathFromCapture(path.entityId)}
                        className="p-1 text-red-500 hover:text-red-700 transition"
                        title="Remove from event"
                        aria-label={`Remove player #${player?.number ?? '?'} from event`}
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!eventName.trim()}
            className={`px-4 py-2 rounded transition ${
              eventName.trim()
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {editEventId ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
