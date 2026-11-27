import { day, rec } from '@/test-utils/adwamuha';

import { todayWards, undoableFromMemory } from './today-wards';

const morningNow = { session: 'morning' as const, date: day(5), late: false };
const eveningNow = { session: 'evening' as const, date: day(5), late: false };

describe("today's wards", () => {
  it('in the morning, nothing read: the morning is now, the evening not yet; open the morning', () => {
    expect(todayWards([], morningNow)).toEqual({
      state: { morning: 'now', evening: 'notYet' },
      bothDone: false,
      show: { session: 'morning', open: true },
    });
  });

  it('in the evening, the morning not read: missed; open the evening', () => {
    const w = todayWards([], eveningNow);
    expect(w.state).toEqual({ morning: 'missed', evening: 'now' });
    expect(w.show).toEqual({ session: 'evening', open: true });
  });

  it('the ward of now done: the other one is shown with its time, not open', () => {
    const w = todayWards([rec(day(5), 'morning')], morningNow);
    expect(w.state.morning).toBe('done');
    expect(w.show).toEqual({ session: 'evening', open: false });
  });

  it('a late ward shows late; both read: both done', () => {
    const records = [rec(day(5), 'morning', { late: true }), rec(day(5), 'evening')];
    const w = todayWards(records, eveningNow);
    expect(w.state).toEqual({ morning: 'late', evening: 'done' });
    expect(w.bothDone).toBe(true);
  });

  it("only today's records count", () => {
    expect(todayWards([rec(day(4), 'morning')], morningNow).state.morning).toBe('now');
  });
});

describe('undo a ward recorded from memory', () => {
  const manual = (n: number) => rec(day(n), 'morning', { source: 'manual' });
  it('today or yesterday, recorded from memory: yes', () => {
    expect(undoableFromMemory([manual(5)], day(5), day(5), 'morning')).toBe(true);
    expect(undoableFromMemory([manual(4)], day(5), day(4), 'morning')).toBe(true);
  });
  it('read in the app, or older than yesterday: no', () => {
    expect(undoableFromMemory([rec(day(5), 'morning')], day(5), day(5), 'morning')).toBe(false);
    expect(undoableFromMemory([manual(3)], day(5), day(3), 'morning')).toBe(false);
  });
});
