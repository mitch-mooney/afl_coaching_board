import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { usePathStore } from '../../store/pathStore';
import { usePlayerStore } from '../../store/playerStore';
import { useUIStore } from '../../store/uiStore';
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
 * A single captured path entry — one per (entity, phase).
 * Multiple entries for the same entity are valid when it has paths in multiple phases.
 */
interface CapturedEntry {
  /** Player ID or ball ID */
  playerId: string;
  pathId: string;
  /** When this path starts in the event (ms), equals the phase's startTime */
  startTimeOffset: number;
  /** Human-readable phase label, e.g. "Phase 1" */
  phaseLabel: string;
  entityType: 'player' | 'ball';
}

/**
 * EventEditor component for creating/editing animation events
 *
 * Features:
 * - Event name input
 * - Duration input (default 30s)
 * - Per-phase "Capture" buttons that snapshot current pathStore paths
 * - Ball paths captured alongside player paths
 */
export function EventEditor({ onClose, editEventId = null }: EventEditorProps) {
  // Stores
  const createEvent = useEventStore((state) => state.createEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const addPlayerPath = useEventStore((state) => state.addPlayerPath);
  const removePlayerPath = useEventStore((state) => state.removePlayerPath);
  const getEvent = useEventStore((state) => state.getEvent);
  const setActiveEvent = useEventStore((state) => state.setActiveEvent);
  const paths = usePathStore((state) => state.paths);
  const getPath = usePathStore((state) => state.getPath);
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

  // Local phase state (phases 2+ only; phase 1 at t=0 is implicit)
  const [phases, setPhases] = useState<AnimationPhase[]>(() =>
    (existingEvent?.phases ?? []).filter((p) => p.startTime > 0)
  );

  // All captured entries: multiple entries per entity allowed (one per phase)
  const [capturedEntries, setCapturedEntries] = useState<CapturedEntry[]>(() => {
    if (!existingEvent) return [];
    return existingEvent.playerPaths.map((pp) => {
      // Determine phase label
      let phaseLabel = 'Phase 1';
      if (pp.startTimeOffset > 0) {
        const matchingPhase = existingEvent.phases?.find(
          (p) => p.startTime === pp.startTimeOffset
        );
        phaseLabel = matchingPhase?.name ?? `Phase (${pp.startTimeOffset / 1000}s)`;
      }
      // Determine entity type from pathStore
      const path = usePathStore.getState().getPath(pp.pathId);
      return {
        playerId: pp.playerId,
        pathId: pp.pathId,
        startTimeOffset: pp.startTimeOffset,
        phaseLabel,
        entityType: path?.entityType ?? 'player',
      };
    });
  });

  // All phases ordered by startTime: implicit Phase 1 (t=0) + user-defined phases
  const allPhases = useMemo(() => {
    const phase1: AnimationPhase = existingEvent?.phases?.find((p) => p.startTime === 0) ??
      createAnimationPhase('Phase 1', 0);
    return [phase1, ...phases].sort((a, b) => a.startTime - b.startTime);
  }, [existingEvent, phases]);

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
   * Add a new phase, placing it at the midpoint between the last phase and the event end.
   * This ensures phases are always spread apart and never duplicate a startTime.
   */
  const handleAddPhase = useCallback(() => {
    const durationMs = durationSeconds * 1000;
    const sortedStarts = allPhases.map((p) => p.startTime).sort((a, b) => a - b);
    const lastStart = sortedStarts[sortedStarts.length - 1] ?? 0;
    const proposed = Math.round((lastStart + durationMs) / 2);
    const clamped = Math.max(lastStart + 1000, Math.min(proposed, durationMs - 1000));
    const newPhase = createAnimationPhase(`Phase ${allPhases.length + 1}`, clamped);
    setPhases((prev) => [...prev, newPhase]);
  }, [durationSeconds, allPhases]);

  /**
   * Remove a phase and its captured entries
   */
  const handleRemovePhase = useCallback((phaseId: string) => {
    setPhases((prev) => {
      const removed = prev.find((p) => p.id === phaseId);
      if (removed) {
        // Remove captured entries at this phase's offset
        setCapturedEntries((entries) =>
          entries.filter((e) => e.startTimeOffset !== removed.startTime)
        );
      }
      return prev.filter((p) => p.id !== phaseId);
    });
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
   * Capture current paths from pathStore for a specific phase.
   * Skips paths whose pathId is already assigned to any phase — this prevents
   * Phase 1 paths (kept alive by event-ref protection) from being recaptured
   * as Phase 2 paths when the coach drags new paths for Phase 2.
   */
  const handleCaptureForPhase = useCallback(
    (phaseStartTimeMs: number, phaseLabel: string) => {
      const allPaths = usePathStore.getState().paths;
      if (allPaths.length === 0) {
        setError('No paths to capture. Drag players or the ball to create movement paths first.');
        return;
      }
      setError(null);

      setCapturedEntries((prev) => {
        // Exclude paths whose pathId is already assigned to any phase.
        // Phase 1 paths linger in pathStore (event-ref protection keeps them) so
        // pressing "Capture Phase 2" must not recapture them at Phase 2's offset.
        const alreadyCapturedPathIds = new Set(prev.map((e) => e.pathId));

        const newEntries: CapturedEntry[] = allPaths
          .filter((path) => !alreadyCapturedPathIds.has(path.id))
          .map((path) => ({
            playerId: path.entityId,
            pathId: path.id,
            startTimeOffset: phaseStartTimeMs,
            phaseLabel,
            entityType: path.entityType,
          }));

        if (newEntries.length === 0) return prev; // nothing new to add

        // Register path IDs with uiStore so Player.tsx won't delete them
        // while the editor is open (unsaved paths are invisible to event-ref check)
        useUIStore.getState().addCapturedPathIds(newEntries.map((e) => e.pathId));

        // Replace existing entries for the same (playerId, startTimeOffset) pair
        // so re-dragging and recapturing the same phase updates correctly.
        const filtered = prev.filter(
          (e) =>
            !newEntries.some(
              (n) => n.playerId === e.playerId && n.startTimeOffset === e.startTimeOffset
            )
        );
        return [...filtered, ...newEntries];
      });
    },
    []
  );

  /**
   * Remove a single captured entry
   */
  const handleRemoveEntry = useCallback(
    (playerId: string, startTimeOffset: number) => {
      setCapturedEntries((prev) =>
        prev.filter(
          (e) => !(e.playerId === playerId && e.startTimeOffset === startTimeOffset)
        )
      );
    },
    []
  );

  /**
   * Get display label for a player or ball
   */
  const getEntityLabel = useCallback(
    (entry: CapturedEntry): string => {
      if (entry.entityType === 'ball') return 'Ball';
      const player = players.find((p) => p.id === entry.playerId);
      if (!player) return `Player (${entry.playerId.slice(-4)})`;
      const parts = [`#${player.number ?? '?'}`];
      if (player.playerName) parts.push(player.playerName);
      return parts.join(' ');
    },
    [players]
  );

  /**
   * Get team color class for a player entry
   */
  const getEntryColorClass = useCallback(
    (entry: CapturedEntry): string => {
      if (entry.entityType === 'ball') return 'bg-yellow-50';
      const player = players.find((p) => p.id === entry.playerId);
      return player?.teamId === 'team1' ? 'bg-blue-50' : 'bg-red-50';
    },
    [players]
  );

  // Clear captured path IDs from uiStore when this editor unmounts (save or cancel).
  // This allows Player.tsx to freely clean up those paths on the next drag.
  useEffect(() => {
    return () => {
      useUIStore.getState().clearCapturedPathIds();
    };
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

    if (capturedEntries.length === 0) {
      setError('No paths captured. Use "Capture" buttons to add paths for each phase.');
      return;
    }

    const durationMs = durationSeconds * 1000;

    // Build full phases array: implicit phase 1 at t=0 plus user-defined phases
    const phase1 = createAnimationPhase('Phase 1', 0);
    const existingPhase1 = existingEvent?.phases?.find((p) => p.startTime === 0);
    const fullPhases: AnimationPhase[] = [
      existingPhase1 ?? phase1,
      ...phases.map((p) => ({
        ...p,
        startTime: Math.max(1, Math.min(durationMs - 1, p.startTime)),
      })),
    ];

    // Build PlayerPathConfig[] from captured entries (one per entry — no deduplication)
    const playerPathConfigs = capturedEntries
      .filter((entry) => {
        // Verify the path still exists in pathStore
        const pathExists = getPath(entry.pathId);
        return pathExists !== undefined;
      })
      .map((entry) =>
        createPlayerPathConfig(entry.playerId, entry.pathId, entry.startTimeOffset)
      );

    if (editEventId && existingEvent) {
      // Update existing event metadata
      updateEvent(editEventId, {
        name: eventName.trim(),
        description: description.trim() || undefined,
        duration: durationMs,
        phases: fullPhases,
      });

      // Replace all player paths: remove existing, add all new configs
      existingEvent.playerPaths.forEach((pp) => {
        removePlayerPath(editEventId, pp.playerId, pp.pathId);
      });
      playerPathConfigs.forEach((config) => {
        addPlayerPath(editEventId, config);
      });
    } else {
      // Create new event
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
    capturedEntries,
    phases,
    getPath,
    createEvent,
    updateEvent,
    addPlayerPath,
    removePlayerPath,
    setActiveEvent,
    onClose,
  ]);

  // Count total paths available in pathStore
  const availablePathsCount = paths.length;

  // Count paths in pathStore that have NOT yet been captured in any phase
  const newPathsCount = useMemo(() => {
    const capturedIds = new Set(capturedEntries.map((e) => e.pathId));
    return paths.filter((p) => !capturedIds.has(p.id)).length;
  }, [paths, capturedEntries]);

  // Entries grouped by phase offset for display
  const entriesByPhase = useMemo(() => {
    const map = new Map<number, CapturedEntry[]>();
    for (const entry of capturedEntries) {
      const list = map.get(entry.startTimeOffset) ?? [];
      list.push(entry);
      map.set(entry.startTimeOffset, list);
    }
    return map;
  }, [capturedEntries]);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
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
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close event editor"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

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

        {/* Phase-Aware Path Capture Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Phases & Paths</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {availablePathsCount} path{availablePathsCount !== 1 ? 's' : ''} on field
              </span>
              <button
                type="button"
                onClick={handleAddPhase}
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded transition"
              >
                + Add Phase
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {allPhases.map((phase, i) => {
              const phaseEntries = entriesByPhase.get(phase.startTime) ?? [];
              const isPhase1 = phase.startTime === 0;
              const phaseNumber = i + 1;

              return (
                <div
                  key={phase.id}
                  className={`border rounded p-2.5 ${
                    isPhase1 ? 'border-gray-200 bg-gray-50' : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  {/* Phase header row */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isPhase1 ? 'bg-yellow-400' : 'bg-yellow-500'
                      }`}
                    />
                    {isPhase1 ? (
                      <>
                        <span className="text-xs font-medium text-gray-700 flex-1">Phase 1</span>
                        <span className="text-xs text-gray-400">t = 0s</span>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={phase.name}
                          onChange={(e) => handleUpdatePhase(phase.id, { name: e.target.value })}
                          placeholder={`Phase ${phaseNumber} name`}
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
                      </>
                    )}
                  </div>

                  {/* Capture button for this phase */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCaptureForPhase(phase.startTime, phase.name)
                    }
                    disabled={newPathsCount === 0}
                    className={`w-full px-3 py-1.5 text-xs rounded transition flex items-center justify-center gap-1.5 ${
                      newPathsCount > 0
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Capture {phase.name} Paths
                    {newPathsCount > 0 && (
                      <span className="opacity-75">({newPathsCount} new)</span>
                    )}
                  </button>
                  {newPathsCount === 0 && phaseEntries.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400 italic">
                      Drag players to new positions on the board to add {phase.name} paths.
                    </p>
                  )}

                  {/* Captured entries for this phase */}
                  {phaseEntries.length > 0 && (
                    <div className="mt-2 divide-y divide-gray-100 border border-gray-200 rounded overflow-hidden">
                      {phaseEntries.map((entry) => (
                        <div
                          key={`${entry.playerId}-${entry.startTimeOffset}`}
                          className={`px-2.5 py-1.5 flex items-center justify-between text-xs ${getEntryColorClass(entry)}`}
                        >
                          <div className="flex items-center gap-1.5">
                            {entry.entityType === 'ball' ? (
                              <span className="w-3 h-3 rounded-full bg-yellow-600 flex-shrink-0" />
                            ) : (
                              <span
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  players.find((p) => p.id === entry.playerId)?.teamId === 'team1'
                                    ? 'bg-blue-500'
                                    : 'bg-red-500'
                                }`}
                              />
                            )}
                            <span className="font-medium">{getEntityLabel(entry)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEntry(entry.playerId, entry.startTimeOffset)}
                            className="p-0.5 text-red-400 hover:text-red-600 transition flex-shrink-0"
                            aria-label={`Remove ${getEntityLabel(entry)} from ${phase.name}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {phaseEntries.length === 0 && (
                    <p className="mt-1.5 text-xs text-gray-400 italic">
                      No paths captured for this phase yet.
                    </p>
                  )}
                </div>
              );
            })}

            {allPhases.length === 1 && phases.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                Single phase — animation plays straight through. Add a phase for pause-and-coach.
              </p>
            )}
          </div>
        </div>

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
