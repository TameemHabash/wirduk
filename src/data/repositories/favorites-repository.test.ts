import { fakeClock } from '@/test-utils/clock';
import { createUserDb } from '@/test-utils/databases';

import { FavoritesRepository } from './favorites-repository';

describe('FavoritesRepository', () => {
  it('adds, lists in the order added, and removes', async () => {
    const repo = new FavoritesRepository(await createUserDb(), fakeClock());
    await repo.add(5);
    await repo.add(2);
    await repo.add(5); // already there
    expect(await repo.list()).toEqual([5, 2]);
    await repo.remove(5);
    expect(await repo.list()).toEqual([2]);
  });

  it('toggles and reports the new state', async () => {
    const repo = new FavoritesRepository(await createUserDb(), fakeClock());
    expect(await repo.toggle(7)).toBe(true);
    expect(await repo.toggle(7)).toBe(false);
    expect(await repo.list()).toEqual([]);
  });
});
