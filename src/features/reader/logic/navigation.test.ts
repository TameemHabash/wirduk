import { afterComplete, initialIndex } from './navigation';

const doneSet = (...indexes: number[]) => {
  const set = new Set(indexes);
  return (i: number) => set.has(i);
};

describe('afterComplete', () => {
  it('goes to the next dhikr', () => {
    expect(afterComplete(0, 5, doneSet(0))).toEqual({ type: 'goto', index: 1 });
  });

  it('skips adhkar that are already complete', () => {
    expect(afterComplete(0, 5, doneSet(0, 1, 2))).toEqual({ type: 'goto', index: 3 });
  });

  it('wraps to the start for adhkar skipped by swiping', () => {
    // Swiped past 1, then completed the last one.
    expect(afterComplete(4, 5, doneSet(0, 2, 3, 4))).toEqual({ type: 'goto', index: 1 });
  });

  it('finishes when every dhikr is complete', () => {
    expect(afterComplete(4, 5, doneSet(0, 1, 2, 3, 4))).toEqual({ type: 'finished' });
    expect(afterComplete(0, 1, doneSet(0))).toEqual({ type: 'finished' });
  });
});

describe('initialIndex', () => {
  const ids = [11, 22, 33];

  it('opens the requested dhikr (from search)', () => {
    expect(initialIndex(ids, 33, doneSet())).toBe(2);
  });

  it('ignores an unknown requested dhikr', () => {
    expect(initialIndex(ids, 99, doneSet())).toBe(0);
  });

  it('otherwise continues at the first incomplete dhikr', () => {
    expect(initialIndex(ids, undefined, doneSet(0))).toBe(1);
  });

  it('starts at the beginning when everything is complete', () => {
    expect(initialIndex(ids, undefined, doneSet(0, 1, 2))).toBe(0);
  });
});
