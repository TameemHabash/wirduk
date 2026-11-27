import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositories } from '@/data/DataProvider';
import type { Category, HomeCategory } from '@/data/models';
import { buildHomeCategories, favoriteCategories } from '@/data/services/home-categories';

interface HomeData {
  /** All shipped categories, custom order applied, favorite flags set. */
  categories: HomeCategory[];
  /** The user's own categories, in their own order. */
  customCategories: HomeCategory[];
  /** Favorite categories (shipped and own) in the order they were added. */
  favorites: Category[];
}

/** Home screen data and the actions that change it. */
export function useHomeCategories() {
  const repos = useRepositories();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      repos.content.listCategories(lang),
      repos.categoryOrder.get(),
      repos.favorites.list(),
      repos.custom.listCategories(),
    ])
      .then(([content, order, favoriteIds, custom]) => {
        if (cancelled) return;
        const favoriteSet = new Set(favoriteIds);
        setData({
          categories: buildHomeCategories(content, order, favoriteIds),
          customCategories: custom.map((c) => ({ ...c, isFavorite: favoriteSet.has(c.id) })),
          favorites: favoriteCategories([...content, ...custom], favoriteIds),
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [repos, lang, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const toggleFavorite = useCallback(
    async (categoryId: number) => {
      await repos.favorites.toggle(categoryId);
      reload();
    },
    [repos, reload],
  );

  /** Saves the order of the reorderable list (time-of-day categories stay first). */
  const saveOrder = useCallback(
    async (orderedIds: number[]) => {
      // Show the new order at once, then save.
      setData((d) => {
        if (!d) return d;
        const byId = new Map(d.categories.map((c) => [c.id, c]));
        const moved = orderedIds.map((id) => byId.get(id)).filter((c): c is HomeCategory => !!c);
        const rest = d.categories.filter((c) => !orderedIds.includes(c.id));
        return { ...d, categories: [...rest, ...moved] };
      });
      await repos.categoryOrder.save(orderedIds);
    },
    [repos],
  );

  const resetOrder = useCallback(async () => {
    await repos.categoryOrder.reset();
    reload();
  }, [repos, reload]);

  return {
    categories: data?.categories ?? null,
    customCategories: data?.customCategories ?? [],
    favorites: data?.favorites ?? [],
    error,
    reload,
    toggleFavorite,
    saveOrder,
    resetOrder,
  };
}
