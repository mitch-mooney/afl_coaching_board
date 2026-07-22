/**
 * PlaybookModel - a Playbook is a named collection of Plays (containment:
 * each Play carries one playbookId). "My Plays" is the un-deletable default.
 */
export interface Playbook {
  id?: number;          // Dexie auto-increment PK
  name: string;
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  isDefault?: boolean;  // true for the un-deletable "My Plays"
}
