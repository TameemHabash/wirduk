import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { type CountedItem, counterStore, type CounterStore } from './counter-store';

/** One dhikr's count. The component draws again only when this count changes. */
export function useCount(dhikrId: number, store: CounterStore = counterStore): number {
  const read = useCallback(() => store.get(dhikrId), [store, dhikrId]);
  return useSyncExternalStore(store.subscribe, read, read);
}

/** Whether one dhikr is complete (an unlimited one: after «إتمام»). Draws again only when it changes. */
export function useIsComplete(item: CountedItem, store: CounterStore = counterStore): boolean {
  const { id, count, unlimited } = item;
  const read = useCallback(
    () => store.isComplete({ id, count, unlimited }),
    [store, id, count, unlimited],
  );
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
