import { describe, it, expect } from 'vitest';
import type { Playbook } from '../PlaybookModel';

describe('PlaybookModel', () => {
  it('Playbook has required fields and an optional default flag', () => {
    const now = new Date().toISOString();
    const p: Playbook = { name: 'My Plays', createdAt: now, updatedAt: now, isDefault: true };
    expect(p.name).toBe('My Plays');
    expect(p.isDefault).toBe(true);
  });
});
