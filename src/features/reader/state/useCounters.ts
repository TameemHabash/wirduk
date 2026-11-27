import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { type CountedItem, counterStore, type CounterStore } from './counter-store';

/** One dhikr's count. The component draws again only when this count changes. */
export function useCount(dhikrId: number, store: CounterStore = counterStore): number {
  const read = useCallback(() => store.get(dhikrId), [store, dhikrId]);
  return useSyncExternalStore(store.subscribe, read, read);
}

/**
 * Whether each item is complete, in order. The component draws again only when one of them
 * becomes complete (or not), not on every tap.
 */
export function useCompleteFlags(
  items: readonly CountedItem[],
  store: CounterStore = counterStore,
): readonly boolean[] {
  const read = useCallback(
    () => items.map((item) => (store.isComplete(item) ? '1' : '0')).join(''),
    [items, store],
  );
  const flags = useSyncExternalStore(store.subscribe, read, read);
  return useMemo(() => Array.from(flags, (f) => f === '1'), [flags]);
}
