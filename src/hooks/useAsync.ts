import { type DependencyList, useEffect, useState } from 'react';

/**
 * Loads data when `deps` change (as when a screen opens) and returns the last result, or
 * `initial` until the first one comes. A result that comes after `deps` changed again, or after
 * the component is gone, is dropped. A failed load keeps the old value: use this for data a
 * screen can show without (a preview, labels); a screen that must show a load error keeps its
 * own state. `load` may return undefined to skip (e.g. while a sheet is closed).
 */
export function useAsync<T>(
  load: () => Promise<T> | undefined,
  deps: DependencyList,
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const promise = load();
    if (!promise) return;
    let current = true;
    promise.then(
      (result) => {
        if (current) setValue(result);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
    // `deps` are the caller's (checked by the lint rule's additionalHooks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
