/**
 * The user's own categories and adhkar get NEGATIVE ids in the app
 * (database row 5 → id -5). Shipped content always has positive ids, so the
 * two never collide in shared places: counters, favorites, routes, search.
 */
export const toCustomId = (rowId: number): number => -rowId;

export const fromCustomId = (id: number): number => -id;

export const isCustomId = (id: number): boolean => id < 0;
