/**
 * Which ward a moment belongs to (prompt §5, owner's defaults):
 * - morning of D: from "morning starts" to "evening starts" on D;
 *   on time until "morning on-time ends", late after (late still counts);
 * - evening of D: from "evening starts" on D to "morning starts" on D+1;
 *   on time until "evening on-time ends" (00:00 = midnight), late after.
 * So the two windows cover the whole day, and 01:30 belongs to the evening of
 * the day before.
 */
import type { DayKey, Session, WardTimes } from '@/data/models';
import { DAY_MINUTES, wardBounds } from '@/data/settings/ward-times';
import { parseTime } from '@/lib/time';

import { addDays, dayKeyOf, minuteOfDay } from './days';

export interface WardSlot {
  session: Session;
  /** The date the ward counts for (an evening after midnight counts for the day before). */
  date: DayKey;
  late: boolean;
}

/** The ward whose window is open at a moment. */
export function slotAt(at: Date, times: WardTimes): WardSlot {
  const { ms, mo, es, eo } = wardBounds(times);
  const m = minuteOfDay(at);
  const today = dayKeyOf(at);
  if (m >= ms && m < es) return { session: 'morning', date: today, late: m >= mo };
  if (m >= es) return { session: 'evening', date: today, late: m >= eo };
  return { session: 'evening', date: addDays(today, -1), late: m + DAY_MINUTES >= eo };
}

/**
 * The record a ward finished at `at` makes: null when that session's window
 * is not open (e.g. the morning ward finished at 17:00 does not count).
 */
export function recordSlot(session: Session, at: Date, times: WardTimes): WardSlot | null {
  const slot = slotAt(at, times);
  return slot.session === session ? slot : null;
}

/**
 * Why a ward cannot be opened at `at` (owner, 2026-11-21: never outside its window, even from
 * a reminder); null while its window is open. 'over': its window has ended. 'notYet': a
 * reminder set at a time outside the window (`reminderTime`, "HH:MM") came before the window
 * began. A reminder set inside the window, or no reminder, can only be late: 'over'.
 */
export function closedWard(
  session: Session,
  at: Date,
  times: WardTimes,
  reminderTime?: string,
): 'over' | 'notYet' | null {
  if (slotAt(at, times).session === session) return null;
  if (reminderTime === undefined) return 'over';
  const { hour, minute } = parseTime(reminderTime);
  const reminder = new Date(at);
  reminder.setHours(hour, minute, 0, 0);
  return slotAt(reminder, times).session === session ? 'over' : 'notYet';
}
