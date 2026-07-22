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

  it('ensureDefaultPlaybook is concurrency-safe — parallel calls create one default', async () => {
    const { ensureDefaultPlaybook } = usePlaybookStore.getState();
    // Fire concurrently (the race the old check-then-add lost, e.g. StrictMode
    // double-invoking a mount effect).
    const [id1, id2, id3] = await Promise.all([
      ensureDefaultPlaybook(),
      ensureDefaultPlaybook(),
      ensureDefaultPlaybook(),
    ]);
    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
    const all = await playbookTable.toArray();
    expect(all.filter((p) => p.isDefault)).toHaveLength(1);
  });

  it('ensureDefaultPlaybook self-heals pre-existing duplicate defaults, keeping the earliest', async () => {
    // Seed two default "My Plays" books directly (as a lost race would leave them),
    // each owning a Play.
    const survivorId = (await playbookTable.add({
      name: 'My Plays', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    })) as number;
    const dupeId = (await playbookTable.add({
      name: 'My Plays', isDefault: true, createdAt: '2026-01-01T00:00:00.001Z', updatedAt: '2026-01-01T00:00:00.001Z',
    })) as number;
    const now = new Date().toISOString();
    const dupePlayId = await playbookDB.scenarios.add({
      name: 'P', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, phases: [], playbookId: dupeId,
    });

    const resolvedId = await usePlaybookStore.getState().ensureDefaultPlaybook();

    expect(resolvedId).toBe(survivorId); // earliest kept
    const all = await playbookTable.toArray();
    expect(all.filter((p) => p.isDefault)).toHaveLength(1);
    expect(await playbookTable.get(dupeId)).toBeUndefined(); // dupe removed
    // The dupe's Play was reassigned to the survivor, not orphaned.
    expect((await playbookDB.scenarios.get(dupePlayId))!.playbookId).toBe(survivorId);
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
