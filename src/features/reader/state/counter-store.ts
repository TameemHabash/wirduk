/**
 * Dhikr counters.
 *
 * Kept in memory only (brief §6), not saved to the database on purpose.
 * The reader resets its category's counters when the user leaves it
 * (owner decision 2026-10-17), and all reset when the app process ends.
 */

export type TapEvent =
  /** Counted, target not reached yet (an unlimited dhikr: always). */
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
 * `by` times ("count with the audio"). Never goes above the target; an
 * unlimited dhikr has none, so it never completes by counting.
 */
export function nextTap(current: number, target: number, by = 1, unlimited = false): TapResult {
  if (!Number.isInteger(target) || target < 1) throw new Error(`Invalid target: ${target}`);
  if (!Number.isInteger(by) || by < 1) throw new Error(`Invalid step: ${by}`);
  if (unlimited) return { count: current + by, event: 'counted' };
  if (current >= target) return { count: current, event: 'ignored' };
  const count = Math.min(current + by, target);
  return { count, event: count === target ? 'completed' : 'counted' };
}

export interface CountedItem {
  id: number;
  count: number;
  /**
   * No end («بلا حد», the user's own; owner, 2026-11-27): taps never complete it, only
   * «إتمام» does, and its count stays as it was.
   */
  unlimited?: boolean;
}

type Listener = () => void;

export class CounterStore {
  private counts = new Map<number, number>();
  /** Unlimited adhkar finished with «إتمام» (a count cannot tell it). */
  private done = new Set<number>();
  private listeners = new Set<Listener>();
  private version = 0;

  get(dhikrId: number): number {
    return this.counts.get(dhikrId) ?? 0;
  }

  tap(item: CountedItem, by = 1): TapResult {
    if (this.isComplete(item)) return { count: this.get(item.id), event: 'ignored' };
    const result = nextTap(this.get(item.id), item.count, by, item.unlimited);
    this.counts.set(item.id, result.count);
    this.emit();
    return result;
  }

  /**
   * "Complete" button: fills the count without tapping (an unlimited dhikr keeps its count
   * and is marked done). Returns false when the dhikr was already complete.
   */
  complete(item: CountedItem): boolean {
    if (!Number.isInteger(item.count) || item.count < 1) {
      throw new Error(`Invalid target: ${item.count}`);
    }
    if (this.isComplete(item)) return false;
    if (item.unlimited) this.done.add(item.id);
    else this.counts.set(item.id, item.count);
    this.emit();
    return true;
  }

  /**
   * "Continue where I stopped": puts saved counts back (never above each target; an unlimited
   * dhikr has none), and the unlimited ones that were finished (`done`).
   */
  restore(
    items: readonly CountedItem[],
    counts: Readonly<Record<string, number>>,
    done: readonly number[] = [],
  ): void {
    let changed = false;
    for (const item of items) {
      const n = counts[String(item.id)];
      if (n !== undefined) {
        const max = item.unlimited ? Number.MAX_SAFE_INTEGER : item.count;
        this.counts.set(item.id, Math.min(Math.max(0, Math.trunc(n)), max));
        changed = true;
      }
      if (item.unlimited && done.includes(item.id)) {
        this.done.add(item.id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  /** The unlimited adhkar among `items` that were finished with «إتمام» (to save them). */
  doneUnlimited(items: readonly CountedItem[]): number[] {
    return items.filter((i) => i.unlimited && this.done.has(i.id)).map((i) => i.id);
  }

  /** Reset button: this dhikr only. */
  reset(dhikrId: number): void {
    const counted = this.counts.delete(dhikrId);
    const done = this.done.delete(dhikrId);
    if (counted || done) this.emit();
  }

  /** "Start again" after finishing a category. */
  resetMany(dhikrIds: readonly number[]): void {
    let changed = false;
    for (const id of dhikrIds) {
      changed = this.counts.delete(id) || changed;
      changed = this.done.delete(id) || changed;
    }
    if (changed) this.emit();
  }

  isComplete(item: CountedItem): boolean {
    return item.unlimited ? this.done.has(item.id) : this.get(item.id) >= item.count;
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
