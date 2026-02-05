import { useState, useCallback, useMemo } from 'react';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { usePathStore } from '../../store/pathStore';
import { usePlayerStore } from '../../store/playerStore';
import { createPlayerPathConfig, EVENT_DEFAULTS } from '../../models/EventModel';

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
  const [error, setError] = useState<string | null>(null);

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

    if (editEventId && existingEvent) {
      // Update existing event
      updateEvent(editEventId, {
        name: eventName.trim(),
        description: description.trim() || undefined,
        duration: durationMs,
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

  // Get uncaptured paths (available for capture)
  const uncapturedPaths = useMemo(() => {
    return playerPaths.filter((path) => !pathOffsets.has(path.entityId));
  }, [playerPaths, pathOffsets]);

  // Group uncaptured paths by team
  const uncapturedByTeam = useMemo(() => {
    const team1: typeof uncapturedPaths = [];
    const team2: typeof uncapturedPaths = [];
    uncapturedPaths.forEach((path) => {
      const player = getPlayerInfo(path.entityId);
      if (player?.teamId === 'team1') {
        team1.push(path);
      } else {
        team2.push(path);
      }
    });
    return { team1, team2 };
  }, [uncapturedPaths, getPlayerInfo]);

  // Calculate suggested duration based on longest path
  const suggestedDuration = useMemo(() => {
    if (capturedPaths.length === 0) return null;
    const maxPathDuration = Math.max(...capturedPaths.map((p) => p.duration));
    // Add 10% buffer, round up to nearest second
    return Math.ceil(maxPathDuration * 1.1);
  }, [capturedPaths]);

  /**
   * Apply the suggested duration
   */
  const handleApplySuggestedDuration = useCallback(() => {
    if (suggestedDuration !== null) {
      setDurationSeconds(suggestedDuration);
    }
  }, [suggestedDuration]);

  /**
   * Capture a single path
   */
  const handleCapturePathSingle = useCallback((playerId: string) => {
    setPathOffsets((prev) => {
      const newMap = new Map(prev);
      newMap.set(playerId, 0);
      return newMap;
    });
  }, []);

  /**
   * Auto-stagger offsets for all captured paths
   */
  const handleAutoStagger = useCallback(() => {
    const staggerInterval = 500; // 0.5 second stagger between players
    setPathOffsets((prev) => {
      const newMap = new Map<string, number>();
      let offset = 0;
      prev.forEach((_, playerId) => {
        newMap.set(playerId, offset);
        offset += staggerInterval;
      });
      return newMap;
    });
  }, []);

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
          {/* Suggested Duration */}
          {suggestedDuration !== null && suggestedDuration !== durationSeconds && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-gray-500">
                Suggested: {suggestedDuration}s (based on paths)
              </span>
              <button
                type="button"
                onClick={handleApplySuggestedDuration}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
              >
                Apply
              </button>
            </div>
          )}
          {/* Warning if duration is shorter than longest path */}
          {suggestedDuration !== null && durationSeconds < suggestedDuration && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Duration shorter than longest path</span>
            </div>
          )}
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
              {/* Available Paths - grouped by team */}
              {uncapturedPaths.length > 0 && (
                <div className="mb-3 border rounded overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 border-b">
                    Available Paths ({uncapturedPaths.length})
                  </div>
                  {/* Team 1 */}
                  {uncapturedByTeam.team1.length > 0 && (
                    <div>
                      <div className="px-2 py-1 bg-blue-50 text-xs font-medium text-blue-700">Team 1</div>
                      <div className="divide-y divide-blue-100">
                        {uncapturedByTeam.team1.map((path) => {
                          const player = getPlayerInfo(path.entityId);
                          return (
                            <div
                              key={path.id}
                              className="px-3 py-1.5 bg-blue-50/50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                  {player?.number ?? '?'}
                                </span>
                                {player?.playerName && (
                                  <span className="text-xs text-gray-600">{player.playerName}</span>
                                )}
                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">
                                  {path.duration.toFixed(1)}s
                                </span>
                              </div>
                              <button
                                onClick={() => handleCapturePathSingle(path.entityId)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                              >
                                Capture
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Team 2 */}
                  {uncapturedByTeam.team2.length > 0 && (
                    <div>
                      <div className="px-2 py-1 bg-red-50 text-xs font-medium text-red-700">Team 2</div>
                      <div className="divide-y divide-red-100">
                        {uncapturedByTeam.team2.map((path) => {
                          const player = getPlayerInfo(path.entityId);
                          return (
                            <div
                              key={path.id}
                              className="px-3 py-1.5 bg-red-50/50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                                  {player?.number ?? '?'}
                                </span>
                                {player?.playerName && (
                                  <span className="text-xs text-gray-600">{player.playerName}</span>
                                )}
                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">
                                  {path.duration.toFixed(1)}s
                                </span>
                              </div>
                              <button
                                onClick={() => handleCapturePathSingle(path.entityId)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                              >
                                Capture
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCapturePaths}
                disabled={uncapturedPaths.length === 0}
                className={`w-full px-4 py-2 rounded transition flex items-center justify-center gap-2 ${
                  uncapturedPaths.length > 0
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
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
                {uncapturedPaths.length > 0
                  ? `Capture All Paths (${uncapturedPaths.length})`
                  : 'All Paths Captured'}
              </button>
            </>
          )}
        </div>

        {/* Captured Paths List */}
        {capturedPaths.length > 0 && (
          <div className="border rounded max-h-64 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">
                Captured Paths ({capturedPaths.length})
              </span>
              {capturedPaths.length > 1 && (
                <button
                  onClick={handleAutoStagger}
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                  title="Automatically stagger player start times"
                >
                  Stagger
                </button>
              )}
            </div>
            <div className="divide-y">
              {capturedPaths.map((path) => {
                const player = getPlayerInfo(path.entityId);
                const offset = pathOffsets.get(path.entityId) ?? 0;
                const teamColor =
                  player?.teamId === 'team1' ? 'bg-blue-50' : 'bg-red-50';
                const sliderColor =
                  player?.teamId === 'team1' ? 'accent-blue-500' : 'accent-red-500';

                return (
                  <div
                    key={path.id}
                    className={`px-3 py-2 ${teamColor}`}
                  >
                    {/* Player Info Row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold ${
                            player?.teamId === 'team1' ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                        >
                          {player?.number ?? '?'}
                        </span>
                        {player?.playerName && (
                          <span className="text-xs text-gray-600">
                            {player.playerName}
                          </span>
                        )}
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {path.duration.toFixed(1)}s
                        </span>
                      </div>
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
                    {/* Offset Slider Row */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-10">Start:</span>
                      <input
                        type="range"
                        min="0"
                        max={durationSeconds * 1000}
                        step="100"
                        value={offset}
                        onChange={(e) =>
                          handleOffsetChange(path.entityId, parseInt(e.target.value, 10) / 1000)
                        }
                        className={`flex-1 h-2 rounded-lg cursor-pointer ${sliderColor}`}
                        title={`Start time offset: ${(offset / 1000).toFixed(1)}s`}
                      />
                      <span className="text-xs text-gray-600 w-12 text-right font-mono">
                        {(offset / 1000).toFixed(1)}s
                      </span>
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
