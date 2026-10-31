import { useSyncExternalStore } from 'react';

import { counterStore, type CounterStore } from './counter-store';

/** Re-renders the component whenever any counter changes. */
export function useCounters(store: CounterStore = counterStore): CounterStore {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}
