import { CounterStore, nextTap } from './counter-store';

describe('nextTap', () => {
  it('counts up and completes exactly at the target', () => {
    expect(nextTap(0, 3)).toEqual({ count: 1, event: 'counted' });
    expect(nextTap(2, 3)).toEqual({ count: 3, event: 'completed' });
    expect(nextTap(0, 1)).toEqual({ count: 1, event: 'completed' });
  });

  it('never goes past the target', () => {
    expect(nextTap(3, 3)).toEqual({ count: 3, event: 'ignored' });
  });

  it('rejects a bad target', () => {
    expect(() => nextTap(0, 0)).toThrow();
    expect(() => nextTap(0, 2.5)).toThrow();
  });

  it('counts several at once for a recording that says the dhikr several times', () => {
    expect(nextTap(0, 100, 4)).toEqual({ count: 4, event: 'counted' });
    expect(nextTap(96, 100, 4)).toEqual({ count: 100, event: 'completed' });
    // After counting by hand: never above the target.
    expect(nextTap(98, 100, 4)).toEqual({ count: 100, event: 'completed' });
    expect(nextTap(100, 100, 4)).toEqual({ count: 100, event: 'ignored' });
    expect(() => nextTap(0, 100, 0)).toThrow();
  });
});

describe('CounterStore', () => {
  it('starts at zero for every dhikr', () => {
    expect(new CounterStore().get(1001)).toBe(0);
  });

  it('counts each dhikr separately', () => {
    const s = new CounterStore();
    s.tap(1, 3);
    s.tap(1, 3);
    s.tap(2, 3);
    expect(s.get(1)).toBe(2);
    expect(s.get(2)).toBe(1);
  });

  it('reports completion once, then ignores taps', () => {
    const s = new CounterStore();
    expect(s.tap(1, 2).event).toBe('counted');
    expect(s.tap(1, 2).event).toBe('completed');
    expect(s.tap(1, 2).event).toBe('ignored');
    expect(s.get(1)).toBe(2);
  });

  it('completes a dhikr in one step, once', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    s.subscribe(listener);
    s.tap(1, 33);
    expect(s.complete(1, 33)).toBe(true);
    expect(s.get(1)).toBe(33);
    expect(s.isComplete({ id: 1, count: 33 })).toBe(true);
    expect(s.complete(1, 33)).toBe(false); // already complete: nothing changes
    expect(listener).toHaveBeenCalledTimes(2);
    expect(() => s.complete(2, 0)).toThrow();
  });

  it('puts saved counts back, never above the target', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    s.subscribe(listener);
    s.restore(
      [
        { id: 1, count: 33 },
        { id: 2, count: 3 },
        { id: 3, count: 1 },
      ],
      { '1': 10, '2': 9 },
    );
    expect([s.get(1), s.get(2), s.get(3)]).toEqual([10, 3, 0]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets only the given dhikr', () => {
    const s = new CounterStore();
    s.tap(1, 5);
    s.tap(2, 5);
    s.reset(1);
    expect(s.get(1)).toBe(0);
    expect(s.get(2)).toBe(1);
  });

  it('resets a whole category', () => {
    const s = new CounterStore();
    s.tap(1, 1);
    s.tap(2, 1);
    s.tap(3, 1);
    s.resetMany([1, 2]);
    expect([s.get(1), s.get(2), s.get(3)]).toEqual([0, 0, 1]);
  });

  it('knows when a category is complete and where to continue', () => {
    const s = new CounterStore();
    const items = [
      { id: 1, count: 1 },
      { id: 2, count: 2 },
    ];
    expect(s.allComplete(items)).toBe(false);
    expect(s.firstIncomplete(items)).toBe(0);
    s.tap(1, 1);
    s.tap(2, 2);
    expect(s.firstIncomplete(items)).toBe(1);
    s.tap(2, 2);
    expect(s.allComplete(items)).toBe(true);
    expect(s.firstIncomplete(items)).toBe(-1);
    expect(s.allComplete([])).toBe(false);
  });

  it('notifies subscribers only on real changes', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    const unsubscribe = s.subscribe(listener);
    s.tap(1, 1); // counted
    s.tap(1, 1); // ignored
    s.reset(2); // nothing to reset
    s.reset(1); // reset
    expect(listener).toHaveBeenCalledTimes(2);
    const v = s.getVersion();
    unsubscribe();
    s.tap(1, 1);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(s.getVersion()).toBe(v + 1);
  });
});
