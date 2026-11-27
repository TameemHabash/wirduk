import { useTranslation } from 'react-i18next';

import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useAsync } from '@/hooks/useAsync';

const NO_TEXTS: ReadonlyMap<number, string> = new Map();

/**
 * The morning and evening adhkar's texts by id, for the plan's step labels
 * (`stepLabel`). Read when `enabled` turns on (e.g. when a sheet opens);
 * empty until then.
 */
export function useDhikrTexts(enabled = true): ReadonlyMap<number, string> {
  const { content } = useRepositories();
  const { i18n } = useTranslation();
  return useAsync(
    () => {
      if (!enabled) return undefined;
      const lang = i18n.language;
      return Promise.all([
        content.listAdhkar(APP_CONFIG.content.morningCategoryId, lang),
        content.listAdhkar(APP_CONFIG.content.eveningCategoryId, lang),
      ]).then(
        ([morning, evening]): ReadonlyMap<number, string> =>
          new Map([...morning, ...evening].map((d) => [d.id, d.text])),
      );
    },
    [content, enabled, i18n.language],
    NO_TEXTS,
  );
}
