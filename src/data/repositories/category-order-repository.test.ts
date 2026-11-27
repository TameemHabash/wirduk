import { createUserDb } from '@/test-utils/databases';

import { CategoryOrderRepository } from './category-order-repository';

describe('CategoryOrderRepository', () => {
  it('is empty (default order) at first', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    expect(await repo.get()).toEqual([]);
  });

  it('saves and replaces the full order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([3, 1, 2]);
    expect(await repo.get()).toEqual([3, 1, 2]);
    await repo.save([2, 3]);
    expect(await repo.get()).toEqual([2, 3]);
  });

  it('rejects duplicates and keeps the old order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([1, 2]);
    await expect(repo.save([1, 1])).rejects.toThrow(/duplicate/);
    expect(await repo.get()).toEqual([1, 2]);
  });

  it('resets to the default order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([2, 1]);
    await repo.reset();
    expect(await repo.get()).toEqual([]);
  });
});
