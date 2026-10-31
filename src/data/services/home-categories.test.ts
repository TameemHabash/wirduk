import type { Category } from '../models';

import { applyCustomOrder, buildHomeCategories, favoriteCategories } from './home-categories';

const cat = (id: number, defaultOrder: number): Category => ({
  id,
  title: `c${id}`,
  defaultOrder,
  adhkarCount: 1,
  custom: false,
});
const categories = [cat(10, 1), cat(20, 2), cat(30, 3), cat(40, 4)];
const ids = (list: { id: number }[]) => list.map((c) => c.id);

describe('applyCustomOrder', () => {
  it('uses the default order when there is no custom order', () => {
    expect(ids(applyCustomOrder([cat(30, 3), cat(10, 1), cat(20, 2)], []))).toEqual([10, 20, 30]);
  });

  it('applies the custom order', () => {
    expect(ids(applyCustomOrder(categories, [40, 10, 30, 20]))).toEqual([40, 10, 30, 20]);
  });

  it('puts categories missing from the custom order (e.g. new content) at the end', () => {
    expect(ids(applyCustomOrder(categories, [30, 10]))).toEqual([30, 10, 20, 40]);
  });

  it('ignores ids that no longer exist and duplicates', () => {
    expect(ids(applyCustomOrder(categories, [99, 20, 20, 10]))).toEqual([20, 10, 30, 40]);
  });

  it('does not change the input array', () => {
    const input = [cat(20, 2), cat(10, 1)];
    applyCustomOrder(input, []);
    expect(ids(input)).toEqual([20, 10]);
  });
});

describe('buildHomeCategories', () => {
  it('marks favorites and keeps the order', () => {
    const home = buildHomeCategories(categories, [20, 10], [10, 40]);
    expect(home.map((c) => [c.id, c.isFavorite])).toEqual([
      [20, false],
      [10, true],
      [30, false],
      [40, true],
    ]);
  });
});

describe('favoriteCategories', () => {
  it('keeps the order the favorites were added in and skips unknown ids', () => {
    expect(ids(favoriteCategories(categories, [30, 99, 10]))).toEqual([30, 10]);
  });
});
