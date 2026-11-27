/**
 * Test-only: a UI string from `common.json`, as the app shows it. Tests find text
 * with `tr('key')` and never type the app's Arabic UI text, so a wording change
 * in `common.json` does not break them. The checks of the owner's exact words
 * (`i18n/owner-words.test.ts`, the owner's labels in `OWNER_TEXTS`) stay exact.
 *
 *   screen.getByText(tr('home.start'))
 *   screen.getByText(tr('reader.position', { current: 2, total: 24 }))
 */
import type { ParseKeys, TOptions } from 'i18next';

import i18n from '@/i18n';

/** A key of `common.json` (checked by TypeScript). */
export type UiKey = ParseKeys<'common'>;

export function tr(key: UiKey, options?: TOptions): string {
  return (i18n.t as (k: string, o?: TOptions) => string)(key, options);
}

/** A list of UI strings in `common.json` (e.g. `adwamuha.weekdays`, Sunday first). */
export function trList(key: string): string[] {
  const list = i18n.getResource(i18n.language, 'common', key) as unknown;
  if (!Array.isArray(list)) throw new Error(`No list of UI strings at ${key}`);
  return list as string[];
}

/**
 * A UI string as a full-match pattern, its `{{placeholders}}` matching anything:
 * `getByLabelText(trPattern('reader.counter'))` finds «تم 2 من 3».
 */
export function trPattern(key: UiKey): RegExp {
  const raw = i18n.getResource(i18n.language, 'common', key) as unknown;
  if (typeof raw !== 'string') throw new Error(`No plain UI string for ${key}`);
  const parts = raw.split(/\{\{[^}]+\}\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('.+?')}$`);
}
