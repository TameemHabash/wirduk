import { day, rec } from '@/test-utils/adwamuha';

import { countedDays, judgedUntil } from './commitment';
import type { Pause } from './types';

const breakDays = (from: number, to: number): Pause => ({
  from: day(from),
  to: day(to),
  kind: 'break',
});

describe('judgedUntil: today counts once read, and is never missed before it ends', () => {
  it('is yesterday until both wards of today are done', () => {
    expect(judgedUntil([], day(10))).toBe(day(9));
    expect(judgedUntil([rec(day(10), 'morning')], day(10))).toBe(day(9));
    expect(judgedUntil([rec(day(10), 'morning'), rec(day(10), 'evening')], day(10))).toBe(day(10));
  });
});

describe('counted days', () => {
  it('leave paused days out', () => {
    expect(countedDays(day(0), day(9), [breakDays(8, 9)])).toHaveLength(8);
  });
});
