/**
 * Dhikr counters.
 *
 * Kept in memory only (brief §6), not saved to the database on purpose.
 * The reader resets its category's counters when the user leaves it
 * (owner decision 2026-10-17), and all reset when the app process ends.
 */

export type TapEvent =
  /** Counted, target not reached yet. */
  | 'counted'
  /** This tap reached the target: the reader moves to the next dhikr. */
  | 'completed'
  /** Already complete: nothing changes. */
  | 'ignored';

export interface TapResult {
  count: number;
  event: TapEvent;
}

/**
 * Pure rule for one tap, or for one play of a recording that says the dhikr
 * `by` times ("count with the audio"). Never goes above the target.
 */
export function nextTap(current: number, target: number, by = 1): TapResult {
  if (!Number.isInteger(target) || target < 1) throw new Error(`Invalid target: ${target}`);
  if (!Number.isInteger(by) || by < 1) throw new Error(`Invalid step: ${by}`);
  if (current >= target) return { count: current, event: 'ignored' };
  const count = Math.min(current + by, target);
  return { count, event: count === target ? 'completed' : 'counted' };
}

export interface CountedItem {
  id: number;
  count: number;
}

type Listener = () => void;

export class CounterStore {
  private counts = new Map<number, number>();
  private listeners = new Set<Listener>();
  private version = 0;

  get(dhikrId: number): number {
    return this.counts.get(dhikrId) ?? 0;
  }

  tap(dhikrId: number, target: number, by = 1): TapResult {
    const result = nextTap(this.get(dhikrId), target, by);
    if (result.event !== 'ignored') {
      this.counts.set(dhikrId, result.count);
      this.emit();
    }
    return result;
  }

  /**
   * "Complete" button: fills the count without tapping.
   * Returns false when the dhikr was already complete.
   */
  complete(dhikrId: number, target: number): boolean {
    if (!Number.isInteger(target) || target < 1) throw new Error(`Invalid target: ${target}`);
    if (this.get(dhikrId) >= target) return false;
    this.counts.set(dhikrId, target);
    this.emit();
    return true;
  }

  /** "Continue where I stopped": puts saved counts back (never above each target). */
  restore(items: readonly CountedItem[], counts: Readonly<Record<string, number>>): void {
    let changed = false;
    for (const item of items) {
      const n = counts[String(item.id)];
      if (n === undefined) continue;
      this.counts.set(item.id, Math.min(Math.max(0, Math.trunc(n)), item.count));
      changed = true;
    }
    if (changed) this.emit();
  }

  /** Reset button: this dhikr only. */
  reset(dhikrId: number): void {
    if (this.counts.delete(dhikrId)) this.emit();
  }

  /** "Start again" after finishing a category. */
  resetMany(dhikrIds: readonly number[]): void {
    let changed = false;
    for (const id of dhikrIds) changed = this.counts.delete(id) || changed;
    if (changed) this.emit();
  }

  isComplete(item: CountedItem): boolean {
    return this.get(item.id) >= item.count;
  }

  allComplete(items: readonly CountedItem[]): boolean {
    return items.length > 0 && items.every((i) => this.isComplete(i));
  }

  /** Index of the first item not yet complete, or -1 when all are complete. */
  firstIncomplete(items: readonly CountedItem[]): number {
    return items.findIndex((i) => !this.isComplete(i));
  }

  // useSyncExternalStore support.
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = (): number => this.version;

  private emit(): void {
    this.version++;
    for (const l of this.listeners) l();
  }
}

/** The app-wide counters. Lives as long as the app process. */
export const counterStore = new CounterStore();
