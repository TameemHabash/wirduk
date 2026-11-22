import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';

/**
 * The morning and evening adhkar's texts by id, for the plan's step labels
 * (`stepLabel`). Read when `enabled` turns on (e.g. when a sheet opens);
 * empty until then.
 */
export function useDhikrTexts(enabled = true): ReadonlyMap<number, string> {
  const { content } = useRepositories();
  const { i18n } = useTranslation();
  const [texts, setTexts] = useState<ReadonlyMap<number, string>>(() => new Map());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const lang = i18n.language;
    Promise.all([
      content.listAdhkar(APP_CONFIG.content.morningCategoryId, lang),
      content.listAdhkar(APP_CONFIG.content.eveningCategoryId, lang),
    ])
      .then(([morning, evening]) => {
        if (!cancelled) setTexts(new Map([...morning, ...evening].map((d) => [d.id, d.text])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, enabled, i18n.language]);

  return texts;
}
