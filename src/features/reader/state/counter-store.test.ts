import { CounterStore, nextTap } from './counter-store';

/** A dhikr to count, said `count` times. */
const item = (id: number, count: number) => ({ id, count });
/** The user's own dhikr with no end («بلا حد»); 33 is only the number kept for later. */
const unlimited = (id: number) => ({ id, count: 33, unlimited: true });

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

  it('an unlimited dhikr goes past its number and never completes by counting', () => {
    expect(nextTap(33, 33, 1, true)).toEqual({ count: 34, event: 'counted' });
    expect(nextTap(500, 33, 4, true)).toEqual({ count: 504, event: 'counted' });
  });
});

describe('CounterStore', () => {
  it('starts at zero for every dhikr', () => {
    expect(new CounterStore().get(1001)).toBe(0);
  });

  it('counts each dhikr separately', () => {
    const s = new CounterStore();
    s.tap(item(1, 3));
    s.tap(item(1, 3));
    s.tap(item(2, 3));
    expect(s.get(1)).toBe(2);
    expect(s.get(2)).toBe(1);
  });

  it('reports completion once, then ignores taps', () => {
    const s = new CounterStore();
    expect(s.tap(item(1, 2)).event).toBe('counted');
    expect(s.tap(item(1, 2)).event).toBe('completed');
    expect(s.tap(item(1, 2)).event).toBe('ignored');
    expect(s.get(1)).toBe(2);
  });

  it('completes a dhikr in one step, once', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    s.subscribe(listener);
    s.tap(item(1, 33));
    expect(s.complete(item(1, 33))).toBe(true);
    expect(s.get(1)).toBe(33);
    expect(s.isComplete(item(1, 33))).toBe(true);
    expect(s.complete(item(1, 33))).toBe(false); // already complete: nothing changes
    expect(listener).toHaveBeenCalledTimes(2);
    expect(() => s.complete(item(2, 0))).toThrow();
  });

  it('puts saved counts back, never above the target', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    s.subscribe(listener);
    s.restore([item(1, 33), item(2, 3), item(3, 1)], { '1': 10, '2': 9 });
    expect([s.get(1), s.get(2), s.get(3)]).toEqual([10, 3, 0]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets only the given dhikr', () => {
    const s = new CounterStore();
    s.tap(item(1, 5));
    s.tap(item(2, 5));
    s.reset(1);
    expect(s.get(1)).toBe(0);
    expect(s.get(2)).toBe(1);
  });

  it('resets a whole category', () => {
    const s = new CounterStore();
    s.tap(item(1, 1));
    s.tap(item(2, 1));
    s.tap(item(3, 1));
    s.resetMany([1, 2]);
    expect([s.get(1), s.get(2), s.get(3)]).toEqual([0, 0, 1]);
  });

  it('knows when a category is complete and where to continue', () => {
    const s = new CounterStore();
    const items = [item(1, 1), item(2, 2)];
    expect(s.allComplete(items)).toBe(false);
    expect(s.firstIncomplete(items)).toBe(0);
    s.tap(item(1, 1));
    s.tap(item(2, 2));
    expect(s.firstIncomplete(items)).toBe(1);
    s.tap(item(2, 2));
    expect(s.allComplete(items)).toBe(true);
    expect(s.firstIncomplete(items)).toBe(-1);
    expect(s.allComplete([])).toBe(false);
  });

  it('notifies subscribers only on real changes', () => {
    const s = new CounterStore();
    const listener = jest.fn();
    const unsubscribe = s.subscribe(listener);
    s.tap(item(1, 1)); // counted
    s.tap(item(1, 1)); // ignored
    s.reset(2); // nothing to reset
    s.reset(1); // reset
    expect(listener).toHaveBeenCalledTimes(2);
    const v = s.getVersion();
    unsubscribe();
    s.tap(item(1, 1));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(s.getVersion()).toBe(v + 1);
  });
});

describe('CounterStore — an unlimited dhikr («بلا حد», owner 2026-11-27)', () => {
  it('counts past its number and is never complete by counting', () => {
    const s = new CounterStore();
    for (let i = 0; i < 40; i++) expect(s.tap(unlimited(-1)).event).toBe('counted');
    expect(s.get(-1)).toBe(40);
    expect(s.isComplete(unlimited(-1))).toBe(false);
  });

  it('«إتمام» marks it done and keeps its count; then taps are ignored', () => {
    const s = new CounterStore();
    s.tap(unlimited(-1));
    s.tap(unlimited(-1));
    expect(s.complete(unlimited(-1))).toBe(true);
    expect(s.get(-1)).toBe(2);
    expect(s.isComplete(unlimited(-1))).toBe(true);
    expect(s.tap(unlimited(-1)).event).toBe('ignored');
    expect(s.complete(unlimited(-1))).toBe(false);
  });

  it('a category with it is complete only once «إتمام» finished it', () => {
    const s = new CounterStore();
    const items = [item(1, 1), unlimited(-2)];
    s.tap(item(1, 1));
    s.tap(unlimited(-2));
    expect(s.allComplete(items)).toBe(false);
    expect(s.firstIncomplete(items)).toBe(1);
    s.complete(unlimited(-2));
    expect(s.allComplete(items)).toBe(true);
  });

  it('reset clears its count and «done»', () => {
    const s = new CounterStore();
    s.tap(unlimited(-1));
    s.complete(unlimited(-1));
    s.reset(-1);
    expect(s.get(-1)).toBe(0);
    expect(s.isComplete(unlimited(-1))).toBe(false);
    s.complete(unlimited(-2));
    s.resetMany([-2]);
    expect(s.isComplete(unlimited(-2))).toBe(false);
  });

  it('"continue where I stopped": its count above its number, and «done», come back', () => {
    const s = new CounterStore();
    s.restore([unlimited(-1), unlimited(-2), item(3, 3)], { '-1': 250, '-2': 7 }, [-2, 3]);
    expect([s.get(-1), s.get(-2)]).toEqual([250, 7]);
    expect(s.isComplete(unlimited(-1))).toBe(false);
    expect(s.isComplete(unlimited(-2))).toBe(true);
    expect(s.isComplete(item(3, 3))).toBe(false); // «done» is only for unlimited ones
    expect(s.doneUnlimited([unlimited(-1), unlimited(-2), item(3, 3)])).toEqual([-2]);
  });
});
