/** True when two flat objects have the same keys and the same values (`Object.is`). */
export function shallowEqual(a: object, b: object): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;
  return keysA.every((k) => k in recordB && Object.is(recordA[k], recordB[k]));
}

/**
 * The new list, with the old objects kept where nothing changed (flat objects, found by `key`),
 * and the old list itself when every item and the order are the same. A list read again from
 * the database then looks unchanged to React: `memo` rows and effects do not run again.
 */
export function keepSame<T extends object>(
  prev: readonly T[] | null | undefined,
  next: readonly T[],
  key: (item: T) => unknown,
): readonly T[] {
  if (!prev) return next;
  const old = new Map(prev.map((item) => [key(item), item]));
  const kept = next.map((item) => {
    const before = old.get(key(item));
    return before && shallowEqual(before, item) ? before : item;
  });
  const same = kept.length === prev.length && kept.every((item, i) => item === prev[i]);
  return same ? prev : kept;
}
