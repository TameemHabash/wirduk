import { addDays, dayKeyOf, daysBetween, daysFrom } from './days';
import { DEFAULT_WARD_TIMES, recordSlot, slotAt, validWardTimes } from './sessions';

/** A local moment on 2026-01-15 (day 15) or the next day (16). */
const at = (day: 15 | 16, hh: number, mm: number) => new Date(2026, 0, day, hh, mm);

describe('days', () => {
  it('works on calendar dates only', () => {
    expect(dayKeyOf(at(15, 23, 59))).toBe('2026-01-15');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-01-01', '2026-01-29')).toBe(28);
    expect(daysFrom('2026-01-30', '2026-02-02')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
    expect(daysFrom('2026-01-02', '2026-01-01')).toEqual([]);
  });
});

describe('which ward a moment belongs to (default times)', () => {
  it.each([
    [15, 3, 59, 'evening', '2026-01-14', true], // the evening before, late
    [15, 4, 0, 'morning', '2026-01-15', false],
    [15, 11, 59, 'morning', '2026-01-15', false],
    [15, 12, 0, 'morning', '2026-01-15', true], // late still counts
    [15, 15, 59, 'morning', '2026-01-15', true],
    [15, 16, 0, 'evening', '2026-01-15', false],
    [15, 23, 59, 'evening', '2026-01-15', false],
    [16, 0, 0, 'evening', '2026-01-15', true], // after midnight: the day before, late
    [16, 1, 30, 'evening', '2026-01-15', true],
    [16, 3, 59, 'evening', '2026-01-15', true],
  ] as const)('day %i %i:%i → %s of %s (late: %s)', (day, hh, mm, session, date, late) => {
    expect(slotAt(at(day, hh, mm), DEFAULT_WARD_TIMES)).toEqual({ session, date, late });
  });

  it('counts a ward only in its own window', () => {
    expect(recordSlot('morning', at(15, 17, 0), DEFAULT_WARD_TIMES)).toBeNull();
    expect(recordSlot('evening', at(15, 9, 0), DEFAULT_WARD_TIMES)).toBeNull();
    expect(recordSlot('evening', at(16, 1, 30), DEFAULT_WARD_TIMES)).toEqual({
      session: 'evening',
      date: '2026-01-15',
      late: true,
    });
  });

  it('follows changed times', () => {
    const times = { ...DEFAULT_WARD_TIMES, morningStart: '05:00', eveningOnTimeEnd: '22:00' };
    expect(slotAt(at(15, 4, 30), times)).toEqual({
      session: 'evening',
      date: '2026-01-14',
      late: true,
    });
    expect(slotAt(at(15, 22, 30), times).late).toBe(true);
    expect(slotAt(at(15, 21, 59), times).late).toBe(false);
  });
});

describe('validWardTimes', () => {
  it('accepts the defaults and refuses times out of order', () => {
    expect(validWardTimes(DEFAULT_WARD_TIMES)).toBe(true);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, morningOnTimeEnd: '03:00' })).toBe(false);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, eveningStart: '11:00' })).toBe(false);
    // The evening's on-time end after the next morning starts.
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, eveningOnTimeEnd: '05:00' })).toBe(false);
    expect(validWardTimes({ ...DEFAULT_WARD_TIMES, morningStart: '4:00' })).toBe(false);
  });
});
