/**
 * Counting the days (prompt §5–§6, owner's defaults):
 * - morning and evening are counted separately; the target is 4 of 7 days;
 * - paused days (a break, or the feature off) count for nothing;
 * - today counts once read, and is never "missed" before it ends: a day is
 *   judged only when it is over, or when both of its wards are done.
 * Everything is worked out from the stored records, whenever the app opens.
 * The weeks themselves (calendar weeks) are in `weeks.ts`.
 */
import { type DayKey, addDays, daysBetween, daysFrom } from './days';
import { SESSIONS, type Session } from './sessions';
import type { Pause, WardRecord } from './types';

/** Days of a week a ward must be done (owner: missing 2–3 days a week is normal). */
export const WEEK_TARGET = 4;
export const WEEK_DAYS = 7;

export function isPaused(day: DayKey, pauses: readonly Pause[]): boolean {
  return pauses.some((p) => daysBetween(p.from, day) >= 0 && daysBetween(day, p.to) >= 0);
}

/** The days that count from `from` to `to` (both included), paused days left out. */
export function countedDays(from: DayKey, to: DayKey, pauses: readonly Pause[]): DayKey[] {
  return daysFrom(from, to).filter((d) => !isPaused(d, pauses));
}

/**
 * A ward that was already over when the plan or the step began (its first
 * morning, begun in the evening): it counts for nothing, neither done nor
 * missed.
 */
export type SkippedWard = { day: DayKey; session: Session } | null;

export function doneDays(records: readonly WardRecord[], session: Session): Set<DayKey> {
  return new Set(records.filter((r) => r.session === session).map((r) => r.date));
}

/** The last day that can be judged: today once both wards are done, otherwise yesterday. */
export function judgedUntil(records: readonly WardRecord[], today: DayKey): DayKey {
  const bothDone = SESSIONS.every((s) => doneDays(records, s).has(today));
  return bothDone ? today : addDays(today, -1);
}
