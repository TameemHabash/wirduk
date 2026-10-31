import { daily, day, rec } from '@/test-utils/adwamuha';

import type { Pause } from './types';
import { finishedWeeks, settledWeeks, stepWeeks, weekGrid, weekStartOf, weekdayOf } from './weeks';

const SUNDAY = 0;
const MONDAY = 1;
const SATURDAY = 6;

const breakDays = (from: number, to: number): Pause => ({
  from: day(from),
  to: day(to),
  kind: 'break',
});

describe('calendar weeks', () => {
  it('know the day of the week', () => {
    expect(weekdayOf('2026-01-01')).toBe(4); // a Thursday
    expect(weekdayOf('2026-10-31')).toBe(SATURDAY);
  });

  it("start on the phone's first day of the week", () => {
    // 2026-10-29 is a Thursday.
    expect(weekStartOf('2026-10-29', SATURDAY)).toBe('2026-10-24');
    expect(weekStartOf('2026-10-29', SUNDAY)).toBe('2026-10-25');
    expect(weekStartOf('2026-10-29', MONDAY)).toBe('2026-10-26');
    expect(weekStartOf('2026-10-31', SATURDAY)).toBe('2026-10-31');
  });
});

describe("a step's weeks", () => {
  // day(0) is a Thursday: with weeks from Saturday, the first week (days -5…1) began before it.
  const weeks = (records = daily(0, 12), today = day(12), pauses: Pause[] = []) =>
    stepWeeks(records, pauses, day(0), today, SATURDAY);

  it('go from this week back to the one holding the first day', () => {
    expect(weeks().map((w) => [w.start, w.end])).toEqual([
      [day(9), day(15)],
      [day(2), day(8)],
      [day(-5), day(1)],
    ]);
  });

  it('count only the days in the step; a week that began before it is not full', () => {
    const [now, last, first] = weeks();
    expect(first).toMatchObject({ morning: 2, evening: 2, full: false, complete: true });
    expect(last).toMatchObject({ morning: 7, evening: 7, full: true, complete: true, met: true });
    expect(now).toMatchObject({ morning: 4, evening: 4, full: true, complete: false, met: true });
  });

  it('a week is over when its last day is, or when today ends it with both wards done', () => {
    const records = daily(0, 8);
    expect(stepWeeks(records, [], day(0), day(8), SATURDAY)[0]).toMatchObject({ complete: true });
    expect(stepWeeks(daily(0, 7), [], day(0), day(8), SATURDAY)[0]).toMatchObject({
      complete: false,
    });
  });

  it('a break day or a skipped first morning cuts the week', () => {
    expect(weeks(daily(0, 12), day(12), [breakDays(3, 3)])[1]!.full).toBe(false);
    const skipped = { day: day(2), session: 'morning' as const };
    const cut = stepWeeks(daily(2, 12), [], day(2), day(12), SATURDAY, skipped);
    expect(cut.map((w) => w.full)).toEqual([true, false]);
  });

  it('settled weeks: full and over, or full and met already; finished weeks: full and over', () => {
    const list = weeks();
    expect(settledWeeks(list).map((w) => w.start)).toEqual([day(9), day(2)]);
    expect(finishedWeeks(list).map((w) => w.start)).toEqual([day(2)]);
    const thin = weeks([...daily(0, 8), rec(day(9), 'morning')]);
    expect(settledWeeks(thin).map((w) => w.start)).toEqual([day(2)]);
  });
});

describe('the week grid', () => {
  it('shows this calendar week: done, late, missed, paused, open (today), before and future', () => {
    const records = [rec(day(1), 'morning'), rec(day(2), 'evening', { late: true })];
    // Plan started on day 0 (a Thursday); today is day 3 (Sunday); weeks start on Saturday.
    const grid = weekGrid(records, [breakDays(-1, -1)], day(0), day(3), SATURDAY);
    expect(grid.map((g) => [g.date, g.morning, g.evening])).toEqual([
      [day(2), 'missed', 'late'],
      [day(3), 'open', 'open'],
      [day(4), 'future', 'future'],
      [day(5), 'future', 'future'],
      [day(6), 'future', 'future'],
      [day(7), 'future', 'future'],
      [day(8), 'future', 'future'],
    ]);
    const before = weekGrid(records, [breakDays(1, 1)], day(0), day(1), SATURDAY);
    expect(before.map((g) => [g.date, g.morning, g.evening]).slice(0, 4)).toEqual([
      [day(-5), 'before', 'before'],
      [day(-4), 'before', 'before'],
      [day(-3), 'before', 'before'],
      [day(-2), 'before', 'before'],
    ]);
    expect(before.slice(5).map((g) => [g.date, g.morning, g.evening])).toEqual([
      [day(0), 'missed', 'missed'],
      [day(1), 'done', 'paused'],
    ]);
  });

  it('a first morning that was over before the start shows as "before"', () => {
    const skipped = { day: day(0), session: 'morning' as const };
    const grid = weekGrid([rec(day(0), 'evening')], [], day(0), day(1), SATURDAY, skipped);
    expect(grid.find((g) => g.date === day(0))).toEqual({
      date: day(0),
      morning: 'before',
      evening: 'done',
    });
  });
});
