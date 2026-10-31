/**
 * Which ward a moment belongs to (prompt §5, owner's defaults):
 * - morning of D: from "morning starts" to "evening starts" on D;
 *   on time until "morning on-time ends", late after (late still counts);
 * - evening of D: from "evening starts" on D to "morning starts" on D+1;
 *   on time until "evening on-time ends" (00:00 = midnight), late after.
 * So the two windows cover the whole day, and 01:30 belongs to the evening of
 * the day before.
 */
import { parseTime } from '@/features/reminders/reminder-time';

import { type DayKey, addDays, dayKeyOf, minuteOfDay } from './days';

export type Session = 'morning' | 'evening';
export const SESSIONS: readonly Session[] = ['morning', 'evening'];

/** "HH:MM", 24 hours, as the settings store them. */
export interface WardTimes {
  morningStart: string;
  morningOnTimeEnd: string;
  eveningStart: string;
  eveningOnTimeEnd: string;
}

export const DEFAULT_WARD_TIMES: WardTimes = {
  morningStart: '04:00',
  morningOnTimeEnd: '12:00',
  eveningStart: '16:00',
  eveningOnTimeEnd: '00:00',
};

const DAY = 24 * 60;
const minutes = (time: string) => {
  const { hour, minute } = parseTime(time);
  return hour * 60 + minute;
};

/** The four times in minutes, the evening's end after the evening's start (it may pass midnight). */
function bounds(times: WardTimes) {
  const ms = minutes(times.morningStart);
  const mo = minutes(times.morningOnTimeEnd);
  const es = minutes(times.eveningStart);
  let eo = minutes(times.eveningOnTimeEnd);
  if (eo <= es) eo += DAY;
  return { ms, mo, es, eo };
}

/**
 * Times make sense when: morning starts < morning on-time ends ≤ evening
 * starts < evening on-time ends ≤ the next morning start.
 */
export function validWardTimes(times: WardTimes): boolean {
  try {
    const { ms, mo, es, eo } = bounds(times);
    return ms < mo && mo <= es && es < eo && eo <= ms + DAY;
  } catch {
    return false;
  }
}

export interface WardSlot {
  session: Session;
  /** The date the ward counts for (an evening after midnight counts for the day before). */
  date: DayKey;
  late: boolean;
}

/** The ward whose window is open at a moment. */
export function slotAt(at: Date, times: WardTimes): WardSlot {
  const { ms, mo, es, eo } = bounds(times);
  const m = minuteOfDay(at);
  const today = dayKeyOf(at);
  if (m >= ms && m < es) return { session: 'morning', date: today, late: m >= mo };
  if (m >= es) return { session: 'evening', date: today, late: m >= eo };
  return { session: 'evening', date: addDays(today, -1), late: m + DAY >= eo };
}

/**
 * The record a ward finished at `at` makes: null when that session's window
 * is not open (e.g. the morning ward finished at 17:00 does not count).
 */
export function recordSlot(session: Session, at: Date, times: WardTimes): WardSlot | null {
  const slot = slotAt(at, times);
  return slot.session === session ? slot : null;
}
