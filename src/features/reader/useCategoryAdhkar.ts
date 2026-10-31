import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isCustomId } from '@/data/custom-ids';
import { useRepositories } from '@/data/DataProvider';
import type { Category, Dhikr } from '@/data/models';

type State =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; error: Error }
  /** `adhkar` is empty only for a new custom category. */
  | { status: 'ready'; category: Category; adhkar: Dhikr[] };

/** A category and its adhkar: shipped content (in the current language) or the user's own. */
export function useCategoryAdhkar(categoryId: number): State & { reload: () => void } {
  const { content, custom } = useRepositories();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const validId = Number.isInteger(categoryId) && categoryId !== 0;

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    const own = isCustomId(categoryId);
    const load = own
      ? Promise.all([custom.getCategory(categoryId), custom.listAdhkar(categoryId)])
      : Promise.all([content.getCategory(categoryId, lang), content.listAdhkar(categoryId, lang)]);
    load
      .then(([category, adhkar]) => {
        if (cancelled) return;
        // A shipped category always has adhkar; an own one may still be empty.
        if (!category || (!own && adhkar.length === 0)) setState({ status: 'notFound' });
        else setState({ status: 'ready', category, adhkar });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [content, custom, categoryId, lang, validId, reloadKey]);

  return validId ? { ...state, reload } : { status: 'notFound', reload };
}
