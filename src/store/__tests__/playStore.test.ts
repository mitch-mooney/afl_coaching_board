import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayStore, playTable } from '../playStore';

beforeEach(async () => {
  await playTable.clear();
  usePlayStore.setState({ plays: [], activePlayId: null });
});

describe('playStore', () => {
  it('creates a play and persists it', async () => {
    const { createPlay } = usePlayStore.getState();
    const id = await createPlay('Test Play');
    const all = usePlayStore.getState().plays;
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Test Play');
    expect(typeof id).toBe('number');
  });

  it('updates a play', async () => {
    const { createPlay, updatePlay } = usePlayStore.getState();
    const id = await createPlay('Original');
    const originalUpdatedAt = usePlayStore.getState().plays[0].updatedAt;
    await updatePlay(id, { name: 'Updated' });
    const updated = usePlayStore.getState().plays[0];
    expect(updated.name).toBe('Updated');
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('deletes a play', async () => {
    const { createPlay, deletePlay } = usePlayStore.getState();
    const id = await createPlay('To Delete');
    await deletePlay(id);
    expect(usePlayStore.getState().plays).toHaveLength(0);
  });

  it('clears activePlayId when deleting the active play', async () => {
    const { createPlay, deletePlay, setActivePlay } = usePlayStore.getState();
    const id = await createPlay('Active');
    setActivePlay(id);
    expect(usePlayStore.getState().activePlayId).toBe(id);
    await deletePlay(id);
    expect(usePlayStore.getState().activePlayId).toBeNull();
  });

  it('loads plays from DB', async () => {
    const { createPlay, loadPlays } = usePlayStore.getState();
    await createPlay('Persisted');
    usePlayStore.setState({ plays: [] });
    await loadPlays();
    expect(usePlayStore.getState().plays).toHaveLength(1);
  });
});
