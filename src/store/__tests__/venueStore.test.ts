import { describe, it, expect, beforeEach } from 'vitest';
import { useVenueStore, venueTable, ACTIVE_VENUE_KEY } from '../venueStore';
import { playbookDB } from '../appDatabase';
import { STANDARD_GROUND_DIMENSIONS, STANDARD_GROUND_NAME } from '../../models/VenueModel';

beforeEach(async () => {
  await venueTable.clear();
  localStorage.clear();
  useVenueStore.setState({ venues: [], activeVenueId: null });
});

const TIGHT = { boundaryLength: 152, boundaryWidth: 118 };

describe('the Standard ground invariant', () => {
  it('seeds Standard ground on first load', async () => {
    await useVenueStore.getState().loadVenues();
    const all = await venueTable.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe(STANDARD_GROUND_NAME);
    expect(all[0].boundaryLength).toBe(STANDARD_GROUND_DIMENSIONS.boundaryLength);
    expect(all[0].boundaryWidth).toBe(STANDARD_GROUND_DIMENSIONS.boundaryWidth);
  });

  it('does not seed it twice across reloads', async () => {
    await useVenueStore.getState().loadVenues();
    await useVenueStore.getState().loadVenues();
    expect(await venueTable.count()).toBe(1);
  });

  it('seeds one default under concurrent callers', async () => {
    const { ensureStandardGround } = useVenueStore.getState();
    const [a, b, c] = await Promise.all([
      ensureStandardGround(),
      ensureStandardGround(),
      ensureStandardGround(),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect((await venueTable.toArray()).filter((v) => v.isDefault)).toHaveLength(1);
  });

  it('refuses to delete Standard ground', async () => {
    const standardId = await useVenueStore.getState().ensureStandardGround();
    await useVenueStore.getState().deleteVenue(standardId);
    expect(await venueTable.get(standardId)).toBeDefined();
  });

  it('refuses to edit Standard ground — it is generic, and the UI says so', async () => {
    const standardId = await useVenueStore.getState().ensureStandardGround();
    await expect(
      useVenueStore.getState().updateVenue(standardId, {
        name: 'My Home Ground',
        boundaryLength: 150,
        boundaryWidth: 120,
      }),
    ).rejects.toThrow(/cannot be edited/i);
    const after = await venueTable.get(standardId);
    expect(after?.boundaryLength).toBe(STANDARD_GROUND_DIMENSIONS.boundaryLength);
  });

  it('adopts Standard ground as the Active Venue on a fresh install', async () => {
    await useVenueStore.getState().loadVenues();
    const standardId = (await venueTable.toArray())[0].id;
    // Not null: every consumer resolves to a real record, so nothing needs a
    // "no ground selected" branch.
    expect(useVenueStore.getState().activeVenueId).toBe(standardId);
    expect(useVenueStore.getState().activeVenue()?.name).toBe(STANDARD_GROUND_NAME);
  });
});

describe('recording a ground', () => {
  it('creates a Venue and reads it back', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().loadVenues();
    const created = useVenueStore.getState().venues.find((v) => v.id === id);
    expect(created?.name).toBe('Jubilee Park');
    expect(created?.boundaryLength).toBe(152);
    expect(created?.boundaryWidth).toBe(118);
  });

  // A coach who has just recorded Saturday's ground is already standing on it: the
  // board renders it without them hunting for the row they just made. Done in the
  // store, so every door into creating a ground behaves the same way.
  it('makes the new ground the Active Venue', async () => {
    await useVenueStore.getState().loadVenues();
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    expect(useVenueStore.getState().activeVenueId).toBe(id);
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(TIGHT);
  });

  it('remembers the new ground as the selection across a reload', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    expect(localStorage.getItem(ACTIVE_VENUE_KEY)).toBe(String(id));
  });

  it('refuses to create a Venue with transposed dimensions', async () => {
    await expect(
      useVenueStore.getState().createVenue({ name: 'Wrong Way', boundaryLength: 118, boundaryWidth: 152 }),
    ).rejects.toThrow(/longer than it is wide/i);
    expect(await venueTable.count()).toBe(0);
  });

  it('accepts an unusual-but-real ground — the coach measured it, we did not', async () => {
    const id = await useVenueStore.getState().createVenue({
      name: 'Tiny Juniors',
      boundaryLength: 115,
      boundaryWidth: 92,
    });
    expect((await venueTable.get(id))?.boundaryLength).toBe(115);
  });

  it('updates a Venue after re-measuring', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().updateVenue(id, {
      name: 'Jubilee Park',
      boundaryLength: 155,
      boundaryWidth: 120,
    });
    const after = await venueTable.get(id);
    expect(after?.boundaryLength).toBe(155);
    expect(after?.boundaryWidth).toBe(120);
  });

  it('refuses an update that transposes the dimensions', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await expect(
      useVenueStore.getState().updateVenue(id, { name: 'Jubilee Park', boundaryLength: 100, boundaryWidth: 140 }),
    ).rejects.toThrow();
    expect((await venueTable.get(id))?.boundaryLength).toBe(152);
  });

  it('deletes a Venue the coach no longer plays at', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Old Ground', ...TIGHT });
    await useVenueStore.getState().deleteVenue(id);
    expect(await venueTable.get(id)).toBeUndefined();
  });
});

describe('the Active Venue', () => {
  it('answers Standard ground before anything has been loaded', () => {
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(STANDARD_GROUND_DIMENSIONS);
  });

  it('answers the selected ground once one is active', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().loadVenues();
    useVenueStore.getState().setActiveVenue(id);
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(TIGHT);
  });

  // What a shared link records as the ground its Play was designed on. Named as
  // well as measured, because the recipient is told which ground it was.
  it('answers as a named ground, for a link to carry', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().loadVenues();
    useVenueStore.getState().setActiveVenue(id);
    expect(useVenueStore.getState().activeDesignedGround()).toEqual({ name: 'Jubilee Park', ...TIGHT });
  });

  it('answers Standard ground as a named ground before anything has loaded', () => {
    expect(useVenueStore.getState().activeDesignedGround()).toEqual({
      name: STANDARD_GROUND_NAME,
      ...STANDARD_GROUND_DIMENSIONS,
    });
  });

  it('survives a reload', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    useVenueStore.getState().setActiveVenue(id);
    expect(localStorage.getItem(ACTIVE_VENUE_KEY)).toBe(String(id));

    // Simulate a fresh page: store state gone, localStorage kept.
    useVenueStore.setState({ venues: [], activeVenueId: null });
    await useVenueStore.getState().loadVenues();

    expect(useVenueStore.getState().activeVenueId).toBe(id);
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(TIGHT);
  });

  it('falls back to Standard ground when the stored id names a Venue that is gone', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    useVenueStore.getState().setActiveVenue(id);
    await venueTable.delete(id); // deleted behind the store's back
    useVenueStore.setState({ venues: [], activeVenueId: null });

    await useVenueStore.getState().loadVenues();

    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(STANDARD_GROUND_DIMENSIONS);
  });

  it('keeps a selection made when localStorage is unavailable', async () => {
    // Private browsing: the write throws, so the choice lives in memory only. The
    // reload that ends every create/update/delete must not quietly revert the coach
    // to Standard ground by re-reading the key that was never written.
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().createVenue({ name: 'Another Ground', boundaryLength: 160, boundaryWidth: 130 });
    const setItem = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('private mode'); };
    try {
      useVenueStore.getState().setActiveVenue(id);
    } finally {
      localStorage.setItem = setItem;
    }
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(TIGHT);

    await useVenueStore.getState().loadVenues();

    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(TIGHT);
  });

  it('falls back to Standard ground when the stored id is unreadable', async () => {
    localStorage.setItem(ACTIVE_VENUE_KEY, 'not-a-number');
    await useVenueStore.getState().loadVenues();
    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(STANDARD_GROUND_DIMENSIONS);
  });

  it('falls back to Standard ground when the Active Venue is deleted', async () => {
    await useVenueStore.getState().loadVenues();
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    useVenueStore.getState().setActiveVenue(id);

    await useVenueStore.getState().deleteVenue(id);

    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual(STANDARD_GROUND_DIMENSIONS);
  });

  it('re-renders on the new dimensions when the Active Venue is edited', async () => {
    const id = await useVenueStore.getState().createVenue({ name: 'Jubilee Park', ...TIGHT });
    await useVenueStore.getState().loadVenues();
    useVenueStore.getState().setActiveVenue(id);

    await useVenueStore.getState().updateVenue(id, {
      name: 'Jubilee Park',
      boundaryLength: 170,
      boundaryWidth: 140,
    });

    expect(useVenueStore.getState().activeBoundaryDimensions()).toEqual({
      boundaryLength: 170,
      boundaryWidth: 140,
    });
  });
});

describe('the schema change', () => {
  it('leaves saved Plays and Playbooks readable', async () => {
    const now = new Date().toISOString();
    const bookId = await playbookDB.playbookCollections.add({
      name: 'My Plays', isDefault: true, createdAt: now, updatedAt: now,
    });
    const playId = await playbookDB.scenarios.add({
      name: 'A Play', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, phases: [], playbookId: bookId as number,
    });

    await useVenueStore.getState().loadVenues();

    expect((await playbookDB.scenarios.get(playId))?.name).toBe('A Play');
    expect((await playbookDB.playbookCollections.get(bookId as number))?.name).toBe('My Plays');
  });
});
