import type { Session } from '@/data/models';

import { APP_CONFIG } from './app-config';

const { morningCategoryId, eveningCategoryId } = APP_CONFIG.content;

/** The morning and evening categories: on Home's golden cards, not in the adhkar tab's list. */
export const TIME_OF_DAY_CATEGORY_IDS: ReadonlySet<number> = new Set([
  morningCategoryId,
  eveningCategoryId,
]);

/** The ward («أدومها») of the morning and evening categories. */
export const SESSION_OF_CATEGORY: Readonly<Record<number, Session>> = {
  [morningCategoryId]: 'morning',
  [eveningCategoryId]: 'evening',
};
