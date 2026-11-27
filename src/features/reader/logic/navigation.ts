/** What the reader does after a dhikr reaches its count. */
export type AfterComplete = { type: 'finished' } | { type: 'goto'; index: number };

/**
 * After the dhikr at `current` is completed:
 * - all complete → the completion screen;
 * - otherwise → the next incomplete dhikr after `current`, wrapping to the
 *   start (the user may have skipped some by swiping).
 */
export function afterComplete(
  current: number,
  total: number,
  isComplete: (index: number) => boolean,
): AfterComplete {
  for (let step = 1; step <= total; step++) {
    const index = (current + step) % total;
    if (!isComplete(index)) return { type: 'goto', index };
  }
  return { type: 'finished' };
}

/** Start page: the requested dhikr if present, else the first incomplete one, else 0. */
export function initialIndex(
  ids: readonly number[],
  requestedId: number | undefined,
  isComplete: (index: number) => boolean,
): number {
  if (requestedId != null) {
    const i = ids.indexOf(requestedId);
    if (i >= 0) return i;
  }
  const firstOpen = ids.findIndex((_, i) => !isComplete(i));
  return firstOpen >= 0 ? firstOpen : 0;
}
