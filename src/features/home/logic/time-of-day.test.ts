import { APP_CONFIG } from '@/config/app-config';

import { dayPeriod, timeOfDayCategoryIds } from './time-of-day';

const at = (h: number, m = 0) => new Date(2026, 9, 16, h, m);
const hours = { morningStartHour: 3, eveningStartHour: 15 };

describe('dayPeriod', () => {
  it('is morning from the morning start until the evening start', () => {
    expect(dayPeriod(at(3), hours)).toBe('morning');
    expect(dayPeriod(at(9, 30), hours)).toBe('morning');
    expect(dayPeriod(at(14, 59), hours)).toBe('morning');
  });

  it('is evening from the evening start until the next morning', () => {
    expect(dayPeriod(at(15), hours)).toBe('evening');
    expect(dayPeriod(at(23, 59), hours)).toBe('evening');
    expect(dayPeriod(at(0), hours)).toBe('evening');
    expect(dayPeriod(at(2, 59), hours)).toBe('evening');
  });

  it('uses the app config by default', () => {
    expect(dayPeriod(at(APP_CONFIG.timeOfDay.morningStartHour))).toBe('morning');
    expect(dayPeriod(at(APP_CONFIG.timeOfDay.eveningStartHour))).toBe('evening');
  });
});

describe('timeOfDayCategoryIds', () => {
  const { morningCategoryId, eveningCategoryId } = APP_CONFIG.content;

  it('puts the current period first', () => {
    expect(timeOfDayCategoryIds('morning')).toEqual([morningCategoryId, eveningCategoryId]);
    expect(timeOfDayCategoryIds('evening')).toEqual([eveningCategoryId, morningCategoryId]);
  });
});
