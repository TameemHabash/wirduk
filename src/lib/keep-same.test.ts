import { keepSame, shallowEqual } from './keep-same';

describe('shallowEqual', () => {
  it('compares the keys and values of flat objects', () => {
    expect(shallowEqual({ a: 1, b: 'x' }, { b: 'x', a: 1 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(false);
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });
});

describe('keepSame', () => {
  const row = (id: number, title: string) => ({ id, title });
  const byId = (r: { id: number }) => r.id;

  it('returns the old list when nothing changed', () => {
    const prev = [row(1, 'a'), row(2, 'b')];
    expect(keepSame(prev, [row(1, 'a'), row(2, 'b')], byId)).toBe(prev);
  });

  it('keeps the unchanged objects and takes the changed ones', () => {
    const prev = [row(1, 'a'), row(2, 'b')];
    const next = keepSame(prev, [row(1, 'a'), row(2, 'B')], byId);
    expect(next).not.toBe(prev);
    expect(next[0]).toBe(prev[0]);
    expect(next[1]).toEqual(row(2, 'B'));
  });

  it('a new order, a new row or a removed one is a new list of the same objects', () => {
    const prev = [row(1, 'a'), row(2, 'b')];
    const moved = keepSame(prev, [row(2, 'b'), row(1, 'a')], byId);
    expect(moved).toEqual([row(2, 'b'), row(1, 'a')]);
    expect(moved[0]).toBe(prev[1]);
    expect(keepSame(prev, [row(1, 'a')], byId)).toEqual([row(1, 'a')]);
    expect(keepSame(prev, [...prev, row(3, 'c')], byId)).toHaveLength(3);
  });

  it('takes the new list when there is no old one', () => {
    const next = [row(1, 'a')];
    expect(keepSame(null, next, byId)).toBe(next);
  });
});
