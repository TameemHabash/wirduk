import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositories } from '@/data/DataProvider';
import type { Category, HomeCategory } from '@/data/models';
import { buildHomeCategories, favoriteCategories } from '@/data/services/home-categories';
import { keepSame } from '@/lib/keep-same';

interface CategoriesData {
  /** All shipped categories, custom order applied, favorite flags set. */
  categories: readonly HomeCategory[];
  /** The user's own categories, in their own order. */
  customCategories: readonly HomeCategory[];
  /** Favorite categories (shipped and own) in the order they were added. */
  favorites: readonly Category[];
}

export interface CategoriesValue {
  /** Null until the first read. */
  categories: readonly HomeCategory[] | null;
  customCategories: readonly HomeCategory[];
  favorites: readonly Category[];
  error: Error | null;
  /** Reads everything again (a screen shown again: own chapters and favorites change elsewhere). */
  reload: () => void;
  toggleFavorite: (categoryId: number) => Promise<void>;
  /** Saves the order of the reorderable list (time-of-day categories stay first). */
  saveOrder: (orderedIds: number[]) => Promise<void>;
  resetOrder: () => Promise<void>;
}

const NONE: readonly never[] = [];
const byId = (c: Category) => c.id;
const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

const CategoriesContext = createContext<CategoriesValue | null>(null);

/**
 * The chapters, read once for Home, the «الأذكار» tab and the reorder screen. A read that finds
 * nothing changed keeps the same objects, so the lists do not draw their rows again.
 */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const repos = useRepositories();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<CategoriesData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  /** Each read gets a number: only the latest one is kept. */
  const latest = useRef(0);
  /** The first read is running: the first screen's "shown" reload is the same read. */
  const firstRead = useRef(true);

  const read = useCallback(
    () =>
      Promise.all([
        repos.content.listCategories(lang),
        repos.categoryOrder.get(),
        repos.favorites.list(),
        repos.custom.listCategories(),
      ]),
    [repos, lang],
  );

  const apply = useCallback(
    ([content, order, favoriteIds, custom]: Awaited<ReturnType<typeof read>>) => {
      const favoriteSet = new Set(favoriteIds);
      setData((prev) => {
        const next: CategoriesData = {
          categories: keepSame(
            prev?.categories,
            buildHomeCategories(content, order, favoriteIds),
            byId,
          ),
          customCategories: keepSame(
            prev?.customCategories,
            custom.map((c) => ({ ...c, isFavorite: favoriteSet.has(c.id) })),
            byId,
          ),
          favorites: keepSame(
            prev?.favorites,
            favoriteCategories([...content, ...custom], favoriteIds),
            byId,
          ),
        };
        const same =
          prev &&
          next.categories === prev.categories &&
          next.customCategories === prev.customCategories &&
          next.favorites === prev.favorites;
        return same ? prev : next;
      });
      setError(null);
    },
    [],
  );

  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const rows = await read();
      if (id === latest.current) apply(rows);
    } catch (e: unknown) {
      if (id === latest.current) setError(toError(e));
    }
  }, [read, apply]);

  useEffect(() => {
    let active = true;
    firstRead.current = true;
    const id = ++latest.current;
    read()
      .then(
        (rows) => active && id === latest.current && apply(rows),
        (e: unknown) => active && id === latest.current && setError(toError(e)),
      )
      .finally(() => {
        firstRead.current = false;
      });
    return () => {
      // Unmounted (or a new language): a read still running is not kept.
      active = false;
    };
  }, [read, apply]);

  const reload = useCallback(() => {
    if (!firstRead.current) void load();
  }, [load]);

  const toggleFavorite = useCallback(
    async (categoryId: number) => {
      await repos.favorites.toggle(categoryId);
      await load();
    },
    [repos, load],
  );

  const saveOrder = useCallback(
    async (orderedIds: number[]) => {
      // Show the new order at once, then save.
      setData((d) => {
        if (!d) return d;
        const index = new Map(d.categories.map((c) => [c.id, c]));
        const moved = orderedIds.map((id) => index.get(id)).filter((c): c is HomeCategory => !!c);
        const rest = d.categories.filter((c) => !orderedIds.includes(c.id));
        return { ...d, categories: [...rest, ...moved] };
      });
      await repos.categoryOrder.save(orderedIds);
    },
    [repos],
  );

  const resetOrder = useCallback(async () => {
    await repos.categoryOrder.reset();
    await load();
  }, [repos, load]);

  const value = useMemo<CategoriesValue>(
    () => ({
      categories: data?.categories ?? null,
      customCategories: data?.customCategories ?? NONE,
      favorites: data?.favorites ?? NONE,
      error,
      reload,
      toggleFavorite,
      saveOrder,
      resetOrder,
    }),
    [data, error, reload, toggleFavorite, saveOrder, resetOrder],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

/** The chapters and the actions that change them (see `CategoriesProvider`). */
export function useHomeCategories(): CategoriesValue {
  const value = useContext(CategoriesContext);
  if (!value) throw new Error('useHomeCategories must be used inside <CategoriesProvider>');
  return value;
}
