import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import {
  STANDARD_GROUND_DIMENSIONS,
  STANDARD_GROUND_NAME,
  validateBoundaryDimensions,
} from '../models/VenueModel';
import type { BoundaryDimensions, Venue } from '../models/VenueModel';
import { STANDARD_DESIGNED_GROUND, type DesignedGround } from '../utils/boardSnapshot';

export const venueTable = playbookDB.venues;

/**
 * The Active Venue is a *selection over* the Venue records, not a record itself, so
 * it lives in localStorage rather than the database — the same split as the HUD skin
 * preference. A stored id that no longer resolves is not an error; it falls back to
 * Standard ground, because there is always an Active Venue.
 */
export const ACTIVE_VENUE_KEY = 'afl.venue.activeId';

function readStoredActiveId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_VENUE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null; // private mode
  }
}

// Coalesces concurrent ensureStandardGround() calls (React StrictMode's
// double-invoked mount effect, or the board and the Venue panel mounting together)
// onto a single check-then-create, so the seed is never created twice.
let ensureStandardInFlight: Promise<number> | null = null;

/** What the coach typed: a name and the two measurements, before it is a record. */
export interface VenueDraft extends BoundaryDimensions {
  name: string;
}

interface VenueState {
  venues: Venue[];
  activeVenueId: number | null;

  loadVenues: () => Promise<void>;
  ensureStandardGround: () => Promise<number>;
  createVenue: (draft: VenueDraft) => Promise<number>;
  updateVenue: (id: number, draft: VenueDraft) => Promise<void>;
  deleteVenue: (id: number) => Promise<void>;
  setActiveVenue: (id: number) => void;

  /**
   * The Venue the board renders on. Undefined only before the records have loaded
   * — once loaded this always resolves, because Standard ground is seeded and
   * adopted when nothing else is selected.
   */
  activeVenue: () => Venue | undefined;

  /**
   * The ground the board renders on, as dimensions. Falls back to the Standard
   * ground constant for the pre-load instant only, so callers never handle
   * "no ground" — see ADR 0002.
   */
  activeBoundaryDimensions: () => BoundaryDimensions;

  /**
   * The ground the board renders on, named — what a shared link records as the
   * ground its Play was designed on. The name comes along because the recipient
   * reads it; they are told which ground, not just how big it was.
   *
   * Falls back to Standard ground for the same pre-load instant as
   * `activeBoundaryDimensions`, and for the same reason: a link that said nothing
   * about its ground would be indistinguishable from one shared before Venues
   * existed, and both would render plausibly at 165 × 135.
   */
  activeDesignedGround: () => DesignedGround;
}

/**
 * Which Venue is active — the single definition of that rule. Exported as a plain
 * selector so components can subscribe to it (`useVenueStore(selectActiveVenue)`)
 * and the store can answer it imperatively, without the two drifting apart.
 */
export const selectActiveVenue = (state: Pick<VenueState, 'venues' | 'activeVenueId'>) =>
  state.venues.find((v) => v.id === state.activeVenueId);

/**
 * The ground a Venue describes — or Standard ground when there is not one yet.
 *
 * The only moment there is no Active Venue is before the records have loaded, and
 * the board has to render something then. Stated once here because both readers
 * need it: the store answers it imperatively, and useActiveBoundary answers it for
 * React on every frame of a drag. A second copy of this rule would be a second
 * place for a fallback to go wrong.
 */
export const boundaryDimensionsOf = (venue: Venue | undefined): BoundaryDimensions =>
  venue
    ? { boundaryLength: venue.boundaryLength, boundaryWidth: venue.boundaryWidth }
    : STANDARD_GROUND_DIMENSIONS;

export const useVenueStore = create<VenueState>((set, get) => ({
  venues: [],
  activeVenueId: readStoredActiveId(),

  loadVenues: async () => {
    try {
      const standardId = await get().ensureStandardGround();
      const venues = await venueTable.orderBy('createdAt').toArray();

      // The in-memory selection wins over the stored one: when localStorage is
      // unavailable (private mode) setActiveVenue keeps the choice in memory only,
      // and re-reading the key here would silently drop the coach back to Standard
      // ground on the next create or delete.
      const candidate = get().activeVenueId ?? readStoredActiveId();
      // A Venue deleted in an earlier session, or on another tab, leaves a dangling
      // id. Adopting the seeded record rather than null makes "there is always an
      // Active Venue" literally true — every consumer resolves to a real record.
      const resolved = venues.some((v) => v.id === candidate) ? candidate : standardId;

      set({ venues, activeVenueId: resolved });
    } catch (err) {
      console.error('[venueStore] loadVenues failed', err);
    }
  },

  ensureStandardGround: async () => {
    if (ensureStandardInFlight) return ensureStandardInFlight;
    ensureStandardInFlight = (async () => {
      try {
        const all = await venueTable.toArray();
        const pool = all.filter((v) => v.isDefault || v.name === STANDARD_GROUND_NAME);
        // Deterministic survivor: earliest created, id as tie-break — so two tabs
        // that both seeded on a fresh install agree on which one is the default.
        pool.sort((a, b) =>
          a.createdAt === b.createdAt ? (a.id ?? 0) - (b.id ?? 0) : a.createdAt < b.createdAt ? -1 : 1,
        );
        if (pool[0]?.id != null) return pool[0].id;

        const now = new Date().toISOString();
        return (await venueTable.add({
          name: STANDARD_GROUND_NAME,
          ...STANDARD_GROUND_DIMENSIONS,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        })) as number;
      } finally {
        ensureStandardInFlight = null;
      }
    })();
    return ensureStandardInFlight;
  },

  createVenue: async (draft) => {
    const validation = validateBoundaryDimensions(draft);
    if (!validation.ok) throw new Error(validation.error);

    const now = new Date().toISOString();
    const id = (await venueTable.add({
      name: draft.name,
      boundaryLength: draft.boundaryLength,
      boundaryWidth: draft.boundaryWidth,
      createdAt: now,
      updatedAt: now,
    })) as number;
    // A coach who records a ground is standing on it. Selecting here rather than at
    // the call site means every door into creating one — the Grounds panel today,
    // the ground popover's "Add a ground" footer — lands the coach on the same board.
    //
    // After the reload, never before: selecting an id the loaded records do not hold
    // yet resolves to no Venue, and the board's fallback for that is Standard ground
    // — for the whole round trip below. The coach would see the boundary jump to
    // 165 × 135 and back. This way the previous ground holds until the new one is
    // there to replace it, in one step.
    await get().loadVenues();
    get().setActiveVenue(id);
    return id;
  },

  updateVenue: async (id, draft) => {
    const validation = validateBoundaryDimensions(draft);
    if (!validation.ok) throw new Error(validation.error);

    const target = await venueTable.get(id);
    // Standard ground is the generic fallback the UI labels as un-measured. Letting
    // it be edited would make that label a lie, and there is no need: a coach with
    // a real ground records their own Venue.
    if (target?.isDefault) throw new Error(`${STANDARD_GROUND_NAME} cannot be edited — add your own ground instead.`);

    await venueTable.update(id, {
      name: draft.name,
      boundaryLength: draft.boundaryLength,
      boundaryWidth: draft.boundaryWidth,
      updatedAt: new Date().toISOString(),
    });
    await get().loadVenues();
  },

  deleteVenue: async (id) => {
    const target = await venueTable.get(id);
    if (!target || target.isDefault) return; // Standard ground is the safety net
    await venueTable.delete(id);
    if (get().activeVenueId === id) {
      try {
        window.localStorage.removeItem(ACTIVE_VENUE_KEY);
      } catch { /* private mode: loadVenues re-resolves from memory below */ }
      // Drop the dangling selection; loadVenues adopts Standard ground in its place.
      set({ activeVenueId: null });
    }
    await get().loadVenues();
  },

  setActiveVenue: (id) => {
    try {
      window.localStorage.setItem(ACTIVE_VENUE_KEY, String(id));
    } catch { /* private mode: keep in-memory */ }
    set({ activeVenueId: id });
  },

  activeVenue: () => selectActiveVenue(get()),

  activeBoundaryDimensions: () => boundaryDimensionsOf(get().activeVenue()),

  activeDesignedGround: () => {
    const venue = get().activeVenue();
    if (!venue) return STANDARD_DESIGNED_GROUND;
    return {
      name: venue.name,
      boundaryLength: venue.boundaryLength,
      boundaryWidth: venue.boundaryWidth,
    };
  },
}));
