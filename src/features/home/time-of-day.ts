import { APP_CONFIG } from '@/config/app-config';

export type DayPeriod = 'morning' | 'evening';

interface Hours {
  morningStartHour: number;
  eveningStartHour: number;
}

/** Morning from `morningStartHour` until `eveningStartHour`, evening otherwise. */
export function dayPeriod(date: Date, hours: Hours = APP_CONFIG.timeOfDay): DayPeriod {
  const h = date.getHours();
  return h >= hours.morningStartHour && h < hours.eveningStartHour ? 'morning' : 'evening';
}

/** Morning and evening category ids, the current one first. */
export function timeOfDayCategoryIds(period: DayPeriod): [now: number, other: number] {
  const { morningCategoryId, eveningCategoryId } = APP_CONFIG.content;
  return period === 'morning'
    ? [morningCategoryId, eveningCategoryId]
    : [eveningCategoryId, morningCategoryId];
}
