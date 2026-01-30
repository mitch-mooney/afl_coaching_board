import { create } from 'zustand';
import {
  AnimationEvent,
  PlayerPathConfig,
  createAnimationEvent,
  addPlayerPathToEvent,
  removePlayerPathFromEvent,
  updatePlayerPathInEvent,
  updateEvent as updateEventModel,
  EVENT_DEFAULTS,
} from '../models/EventModel';

/**
 * Default global time (start of event)
 */
const DEFAULT_GLOBAL_TIME = 0;

interface EventState {
  /** All animation events */
  events: AnimationEvent[];
  /** ID of the currently active event for playback */
  activeEventId: string | null;
  /** Current global playback time in milliseconds */
  globalTime: number;
  /** Whether event mode is enabled (vs. normal path preview mode) */
  isEventMode: boolean;

  // Event CRUD Actions
  /** Create a new animation event */
  createEvent: (
    name: string,
    playerPaths?: PlayerPathConfig[],
    duration?: number,
    description?: string
  ) => AnimationEvent;
  /** Add an existing event to the store */
  addEvent: (event: AnimationEvent) => void;
  /** Update an existing event */
  updateEvent: (
    eventId: string,
    updates: Partial<Omit<AnimationEvent, 'id' | 'createdAt'>>
  ) => void;
  /** Delete an event by ID */
  deleteEvent: (eventId: string) => void;
  /** Clear all events */
  clearEvents: () => void;

  // Active Event Management
  /** Set the active event for playback */
  setActiveEvent: (eventId: string | null) => void;
  /** Clear the active event (stops playback) */
  clearActiveEvent: () => void;

  // Player Path Management within Events
  /** Add or update a player path in an event */
  addPlayerPath: (eventId: string, playerPath: PlayerPathConfig) => void;
  /** Remove a player path from an event */
  removePlayerPath: (eventId: string, playerId: string) => void;
  /** Update a player path in an event */
  updatePlayerPath: (
    eventId: string,
    playerId: string,
    updates: Partial<Omit<PlayerPathConfig, 'playerId'>>
  ) => void;

  // Playback Time Control
  /** Set the global playback time in milliseconds */
  setGlobalTime: (time: number) => void;
  /** Reset global time to start */
  resetGlobalTime: () => void;

  // Event Mode Control
  /** Enable event mode */
  enableEventMode: () => void;
  /** Disable event mode */
  disableEventMode: () => void;
  /** Toggle event mode on/off */
  toggleEventMode: () => void;

  // Getters
  /** Get an event by ID */
  getEvent: (eventId: string) => AnimationEvent | undefined;
  /** Get the currently active event */
  getActiveEvent: () => AnimationEvent | undefined;
  /** Get all events sorted by creation date (newest first) */
  getEventsSorted: () => AnimationEvent[];

  // Reset
  /** Reset all event state to defaults */
  reset: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  activeEventId: null,
  globalTime: DEFAULT_GLOBAL_TIME,
  isEventMode: false,

  // Event CRUD Actions
  createEvent: (name, playerPaths = [], duration = EVENT_DEFAULTS.duration, description) => {
    const newEvent = createAnimationEvent(name, playerPaths, duration, description);
    set((state) => ({
      events: [...state.events, newEvent],
    }));
    return newEvent;
  },

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  updateEvent: (eventId, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? updateEventModel(event, updates) : event
      ),
    }));
  },

  deleteEvent: (eventId) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
      // Clear active event if it's being deleted
      activeEventId: state.activeEventId === eventId ? null : state.activeEventId,
    }));
  },

  clearEvents: () => {
    set({
      events: [],
      activeEventId: null,
      globalTime: DEFAULT_GLOBAL_TIME,
    });
  },

  // Active Event Management
  setActiveEvent: (eventId) => {
    const { getEvent } = get();

    // Validate that the event exists if setting to a non-null value
    if (eventId !== null && !getEvent(eventId)) {
      return;
    }

    set({
      activeEventId: eventId,
      // Reset global time when switching events
      globalTime: DEFAULT_GLOBAL_TIME,
    });
  },

  clearActiveEvent: () => {
    set({
      activeEventId: null,
      globalTime: DEFAULT_GLOBAL_TIME,
    });
  },

  // Player Path Management
  addPlayerPath: (eventId, playerPath) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? addPlayerPathToEvent(event, playerPath) : event
      ),
    }));
  },

  removePlayerPath: (eventId, playerId) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? removePlayerPathFromEvent(event, playerId) : event
      ),
    }));
  },

  updatePlayerPath: (eventId, playerId, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? updatePlayerPathInEvent(event, playerId, updates) : event
      ),
    }));
  },

  // Playback Time Control
  setGlobalTime: (time) => {
    const { activeEventId, getEvent } = get();
    const activeEvent = activeEventId ? getEvent(activeEventId) : undefined;

    // Clamp time to valid range (0 to event duration)
    const maxTime = activeEvent?.duration ?? 0;
    const clampedTime = Math.max(0, Math.min(maxTime, time));

    set({ globalTime: clampedTime });
  },

  resetGlobalTime: () => {
    set({ globalTime: DEFAULT_GLOBAL_TIME });
  },

  // Event Mode Control
  enableEventMode: () => {
    set({ isEventMode: true });
  },

  disableEventMode: () => {
    set({ isEventMode: false });
  },

  toggleEventMode: () => {
    set((state) => ({ isEventMode: !state.isEventMode }));
  },

  // Getters
  getEvent: (eventId) => {
    return get().events.find((e) => e.id === eventId);
  },

  getActiveEvent: () => {
    const { activeEventId, events } = get();
    if (!activeEventId) return undefined;
    return events.find((e) => e.id === activeEventId);
  },

  getEventsSorted: () => {
    return [...get().events].sort((a, b) => b.createdAt - a.createdAt);
  },

  // Reset
  reset: () => {
    set({
      events: [],
      activeEventId: null,
      globalTime: DEFAULT_GLOBAL_TIME,
      isEventMode: false,
    });
  },
}));

/**
 * Calculate progress (0-1) from global time and event duration
 */
export const getEventProgress = (globalTime: number, duration: number): number => {
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(1, globalTime / duration));
};

/**
 * Calculate global time from progress (0-1) and event duration
 */
export const getTimeFromProgress = (progress: number, duration: number): number => {
  return Math.max(0, Math.min(duration, progress * duration));
};

/**
 * Format global time to display string (mm:ss.ms)
 */
export const formatEventTime = (ms: number): string => {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 100);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};
