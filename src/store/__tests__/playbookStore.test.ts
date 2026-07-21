import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybookStore, playbookTable } from '../playbookStore';
import { playbookDB } from '../appDatabase';

beforeEach(async () => {
  await playbookTable.clear();
  await playbookDB.scenarios.clear();
  usePlaybookStore.setState({ playbooks: [], activePlaybookId: null });
});

describe('playbookStore', () => {
  it('ensureDefaultPlaybook creates "My Plays" once and is idempotent', async () => {
    const { ensureDefaultPlaybook } = usePlaybookStore.getState();
    const id1 = await ensureDefaultPlaybook();
    const id2 = await ensureDefaultPlaybook();
    expect(id1).toBe(id2);
    const all = await playbookTable.toArray();
    expect(all.filter((p) => p.isDefault)).toHaveLength(1);
    expect(all[0].name).toBe('My Plays');
  });

  it('createPlaybook persists and loadPlaybooks returns it', async () => {
    const { createPlaybook, loadPlaybooks } = usePlaybookStore.getState();
    const id = await createPlaybook('Set Plays');
    await loadPlaybooks();
    expect(usePlaybookStore.getState().playbooks.find((p) => p.id === id)?.name).toBe('Set Plays');
  });

  it('renamePlaybook updates name and updatedAt', async () => {
    const { createPlaybook, renamePlaybook } = usePlaybookStore.getState();
    const id = await createPlaybook('Original');
    const before = (await playbookTable.get(id))!.updatedAt;
    await renamePlaybook(id, 'Renamed');
    const after = await playbookTable.get(id);
    expect(after!.name).toBe('Renamed');
    expect(after!.updatedAt).not.toBe(before);
  });

  it('deletePlaybook reassigns its Plays to the default', async () => {
    const { createPlaybook, ensureDefaultPlaybook, deletePlaybook } = usePlaybookStore.getState();
    const defaultId = await ensureDefaultPlaybook();
    const bookId = await createPlaybook('Temp');
    const now = new Date().toISOString();
    const playId = await playbookDB.scenarios.add({
      name: 'P', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, phases: [], playbookId: bookId,
    });
    await deletePlaybook(bookId);
    expect(await playbookTable.get(bookId)).toBeUndefined();
    expect((await playbookDB.scenarios.get(playId))!.playbookId).toBe(defaultId);
  });

  it('deletePlaybook on the default is a no-op', async () => {
    const { ensureDefaultPlaybook, deletePlaybook } = usePlaybookStore.getState();
    const defaultId = await ensureDefaultPlaybook();
    await deletePlaybook(defaultId);
    expect(await playbookTable.get(defaultId)).toBeDefined();
  });
});
