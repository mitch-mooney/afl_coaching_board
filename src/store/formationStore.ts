import { create } from 'zustand';
import Dexie, { Table } from 'dexie';
import { Formation, PlayerPosition, StoredFormation } from '../types/Formation';

/**
 * Dexie database for custom formation persistence in IndexedDB
 */
class FormationDatabase extends Dexie {
  customFormations!: Table<StoredFormation>;

  constructor() {
    super('AFLFormationDB');
    this.version(1).stores({
      customFormations: '++id, name, createdAt',
    });
  }
}

const db = new FormationDatabase();

interface FormationState {
  /** List of custom formations loaded from IndexedDB */
  customFormations: Formation[];
  /** Currently selected formation (if any) */
  currentFormation: Formation | null;
  /** Loading state for async operations */
  isLoading: boolean;

  // Actions
  /** Load all custom formations from IndexedDB */
  loadCustomFormations: () => Promise<void>;
  /** Save a new custom formation to IndexedDB */
  saveCustomFormation: (
    name: string,
    description: string,
    positions: PlayerPosition[],
    thumbnail?: string
  ) => Promise<number>;
  /** Delete a custom formation by its database ID */
  deleteCustomFormation: (id: number) => Promise<void>;
  /** Set the current formation (for tracking which is applied) */
  setCurrentFormation: (formation: Formation | null) => void;
  /** Get a custom formation by its ID */
  getCustomFormation: (id: number) => Promise<Formation | undefined>;
  /** Update an existing custom formation */
  updateCustomFormation: (
    id: number,
    updates: Partial<Omit<StoredFormation, 'id' | 'createdAt'>>
  ) => Promise<void>;
  /** Check if a formation name already exists */
  checkNameExists: (name: string) => Promise<boolean>;
}

/**
 * Convert a stored formation from IndexedDB to a Formation type
 */
function storedToFormation(stored: StoredFormation): Formation {
  return {
    id: `custom-${stored.id}`,
    name: stored.name,
    description: stored.description,
    category: 'custom',
    positions: stored.positions,
    createdAt: new Date(stored.createdAt),
    thumbnail: stored.thumbnail,
  };
}

export const useFormationStore = create<FormationState>((set, get) => ({
  customFormations: [],
  currentFormation: null,
  isLoading: false,

  loadCustomFormations: async () => {
    set({ isLoading: true });
    try {
      const storedFormations = await db.customFormations
        .orderBy('createdAt')
        .reverse()
        .toArray();
      const formations = storedFormations.map(storedToFormation);
      set({ customFormations: formations, isLoading: false });
    } catch (error) {
      console.error('Error loading custom formations:', error);
      set({ isLoading: false });
    }
  },

  saveCustomFormation: async (name, description, positions, thumbnail) => {
    try {
      const storedFormation: StoredFormation = {
        formationId: `custom-${Date.now()}`,
        name,
        description,
        positions,
        createdAt: new Date().toISOString(),
        thumbnail,
      };
      const id = await db.customFormations.add(storedFormation);
      // Reload formations to update the list
      await get().loadCustomFormations();
      return id;
    } catch (error) {
      console.error('Error saving custom formation:', error);
      throw error;
    }
  },

  deleteCustomFormation: async (id) => {
    try {
      await db.customFormations.delete(id);
      // Reload formations to update the list
      await get().loadCustomFormations();
      // Clear current formation if it was the deleted one
      const current = get().currentFormation;
      if (current && current.id === `custom-${id}`) {
        set({ currentFormation: null });
      }
    } catch (error) {
      console.error('Error deleting custom formation:', error);
      throw error;
    }
  },

  setCurrentFormation: (formation) => {
    set({ currentFormation: formation });
  },

  getCustomFormation: async (id) => {
    try {
      const stored = await db.customFormations.get(id);
      if (stored) {
        return storedToFormation(stored);
      }
      return undefined;
    } catch (error) {
      console.error('Error getting custom formation:', error);
      throw error;
    }
  },

  updateCustomFormation: async (id, updates) => {
    try {
      await db.customFormations.update(id, updates);
      // Reload formations to update the list
      await get().loadCustomFormations();
    } catch (error) {
      console.error('Error updating custom formation:', error);
      throw error;
    }
  },

  checkNameExists: async (name) => {
    try {
      const existing = await db.customFormations
        .where('name')
        .equalsIgnoreCase(name)
        .first();
      return !!existing;
    } catch (error) {
      console.error('Error checking formation name:', error);
      throw error;
    }
  },
}));

/**
 * Export the database instance for direct access if needed (e.g., for testing)
 */
export { db as formationDb };
