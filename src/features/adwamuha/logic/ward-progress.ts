/**
 * The day's ward read in parts (owner, 2026-11-14): the ward is new each day,
 * so its counts are kept (user.db, `WardProgress`) while its window is open.
 * Leaving the ward and coming back later the same morning or evening goes on
 * where the user stopped; the next window (the next day's ward) starts fresh.
 * Finishing the ward clears them.
 */

export type WardCounts = Record<string, number>;

/**
 * Writes counts one at a time, in order: a quick series of taps leaves at most
 * one write waiting, always the newest. `null` clears (the ward was finished).
 * No timers (they wait while the screen is off; the audio can count then).
 */
export function latestWriter(
  write: (counts: WardCounts | null) => Promise<void>,
): (counts: WardCounts | null) => void {
  let running = false;
  let waiting: { counts: WardCounts | null } | null = null;
  const pump = async () => {
    running = true;
    while (waiting) {
      const next = waiting;
      waiting = null;
      await write(next.counts).catch(() => undefined);
    }
    running = false;
  };
  return (counts) => {
    waiting = { counts };
    if (!running) void pump();
  };
}
