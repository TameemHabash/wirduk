import type { Category, HomeCategory } from '../models';

/**
 * Applies the user's custom order to the categories.
 *
 * - Categories in the custom order come first, in that order.
 * - Categories not in it (for example new ones from a content update) follow,
 *   in their default order.
 * - Ids in the custom order that no longer exist are ignored.
 */
export function applyCustomOrder<T extends Category>(
  categories: readonly T[],
  customOrder: readonly number[],
): T[] {
  if (customOrder.length === 0) {
    return [...categories].sort((a, b) => a.defaultOrder - b.defaultOrder);
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered: T[] = [];
  const placed = new Set<number>();
  for (const id of customOrder) {
    const c = byId.get(id);
    if (c && !placed.has(id)) {
      ordered.push(c);
      placed.add(id);
    }
  }
  const rest = categories
    .filter((c) => !placed.has(c.id))
    .sort((a, b) => a.defaultOrder - b.defaultOrder);
  return [...ordered, ...rest];
}

/** Home list: custom order applied, favorite flags set. */
export function buildHomeCategories(
  categories: readonly Category[],
  customOrder: readonly number[],
  favoriteIds: readonly number[],
): HomeCategory[] {
  const favorites = new Set(favoriteIds);
  return applyCustomOrder(categories, customOrder).map((c) => ({
    ...c,
    isFavorite: favorites.has(c.id),
  }));
}

/** Favorite categories, in the order they were added. Unknown ids are skipped. */
export function favoriteCategories(
  categories: readonly Category[],
  favoriteIds: readonly number[],
): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return favoriteIds.map((id) => byId.get(id)).filter((c): c is Category => c != null);
}
