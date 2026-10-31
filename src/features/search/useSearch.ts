import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositories } from '@/data/DataProvider';
import type { SearchResults } from '@/data/models';

const DEBOUNCE_MS = 200;
const EMPTY: SearchResults = { categories: [], adhkar: [] };

/**
 * Debounced, tashkeel-insensitive search in shipped content and the user's
 * own adhkar (own results first). `results` is null until the first search ran.
 */
export function useSearch(query: string) {
  const { content, custom } = useRepositories();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [state, setState] = useState<{ query: string; results: SearchResults } | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all([custom.search(trimmed), content.search(trimmed, lang)])
        .then(([own, shipped]) => {
          if (cancelled) return;
          setState({
            query: trimmed,
            results: {
              categories: [...own.categories, ...shipped.categories],
              adhkar: [...own.adhkar, ...shipped.adhkar],
            },
          });
        })
        .catch(() => !cancelled && setState({ query: trimmed, results: EMPTY }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, custom, lang, trimmed]);

  if (!trimmed) return { results: null, searchedFor: '' };
  return { results: state?.results ?? null, searchedFor: state?.query ?? '' };
}
