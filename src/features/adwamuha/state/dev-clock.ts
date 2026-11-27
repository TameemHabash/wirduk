/**
 * Dev builds only (milestone 13): «أدومها»'s clock can be moved days ahead on
 * the emulator, to see its later states without waiting weeks
 * (`wirduk://dev-clock`, see src/app/dev-clock.tsx). A release build never
 * moves it: `devNow()` is then the real time.
 */
let offsetMs = 0;
const listeners = new Set<() => void>();

/** The time «أدومها» uses: the real time, moved in a dev build. */
export function devNow(): Date {
  return new Date(Date.now() + (__DEV__ ? offsetMs : 0));
}

/** Moves the dev clock to `target` (dev builds only). */
export function setDevClock(target: Date): void {
  if (!__DEV__) return;
  offsetMs = target.getTime() - Date.now();
  for (const listener of listeners) listener();
}

/** Called when the dev clock moves; returns the unsubscribe. */
export function onDevClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
