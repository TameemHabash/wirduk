/**
 * Calendar weeks (owner, 2026-10-29). A week starts on the day chosen in
 * «أدومها»'s settings (Saturday by default; never the phone's region settings,
 * owner 2026-10-30), and everything uses the same weeks:
 * the grid of «مساري», the goal bars, the move-on rule, the end-of-week
 * messages and the step-back suggestion, so the numbers always match the dots.
 *
 * A week counts for the step only when it is "full": all 7 days in the step,
 * none of them paused (a break, the feature off), and not cut by a first
 * morning that was already over when the step began. A cut week is neither
 * met nor missed; its wards are never counted as done that were not (the
 * dots and the numbers always match).
 */
import {
  type SkippedWard,
  WEEK_DAYS,
  WEEK_TARGET,
  doneDays,
  isPaused,
  judgedUntil,
} from './commitment';
import { type DayKey, addDays, daysBetween } from './days';
import type { Session } from './sessions';
import type { Pause, WardRecord } from './types';

/** A day of the week: 0 = Sunday … 6 = Saturday (as `Date.getDay()`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Saturday, until the user picks another day (owner, 2026-10-30). */
export const DEFAULT_WEEK_START: Weekday = 6;

/** The day of the week of a calendar date. */
export function weekdayOf(day: DayKey): Weekday {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/** The first day of the week holding `day`, for weeks that start on `firstDay`. */
export function weekStartOf(day: DayKey, firstDay: Weekday): DayKey {
  return addDays(day, -((weekdayOf(day) - firstDay + WEEK_DAYS) % WEEK_DAYS));
}

/** The 7 days of the week that starts on `start`. */
export function weekDays(start: DayKey): DayKey[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => addDays(start, i));
}

export interface StepWeek {
  /** Its first and last day. */
  start: DayKey;
  end: DayKey;
  /** Days with the morning / evening ward done, in this week and in the step. */
  morning: number;
  evening: number;
  /** All 7 days are in the step and none is paused: the week can count. */
  full: boolean;
  /** Its last day can be judged (it is over, or today with both wards done). */
  complete: boolean;
  /** 4 mornings and 4 evenings or more. */
  met: boolean;
}

/**
 * The calendar weeks of a step, newest first: from this week (the one
 * holding `today`) back to the week holding `since`, the step's first day.
 * `skipped`: the step's first morning, when it was already over.
 */
export function stepWeeks(
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  since: DayKey,
  today: DayKey,
  firstDay: Weekday,
  skipped: SkippedWard = null,
): StepWeek[] {
  const until = judgedUntil(records, today);
  const done = { morning: doneDays(records, 'morning'), evening: doneDays(records, 'evening') };
  const out: StepWeek[] = [];
  for (
    let start = weekStartOf(today, firstDay);
    daysBetween(since, addDays(start, WEEK_DAYS - 1)) >= 0;
    start = addDays(start, -WEEK_DAYS)
  ) {
    const days = weekDays(start);
    const end = days[WEEK_DAYS - 1]!;
    const inStep = days.filter((d) => daysBetween(since, d) >= 0);
    const morning = inStep.filter((d) => done.morning.has(d)).length;
    const evening = inStep.filter((d) => done.evening.has(d)).length;
    out.push({
      start,
      end,
      morning,
      evening,
      full:
        inStep.length === WEEK_DAYS &&
        !days.some((d) => isPaused(d, pauses)) &&
        !(skipped && days.includes(skipped.day)),
      complete: daysBetween(end, until) >= 0,
      met: morning >= WEEK_TARGET && evening >= WEEK_TARGET,
    });
  }
  return out;
}

/**
 * Weeks that settle the move-on rule, newest first: full weeks that are over,
 * or already met (4 and 4 before the week ends cannot be lost).
 */
export const settledWeeks = (weeks: readonly StepWeek[]) =>
  weeks.filter((w) => w.full && (w.complete || w.met));

/** Full weeks that are over, newest first (a week can only fall short once it is over). */
export const finishedWeeks = (weeks: readonly StepWeek[]) =>
  weeks.filter((w) => w.full && w.complete);

export type DayStatus = 'done' | 'late' | 'missed' | 'paused' | 'open' | 'before' | 'future';

export interface GridDay {
  date: DayKey;
  morning: DayStatus;
  evening: DayStatus;
}

/**
 * The week grid of «مساري»: this calendar week, a status per ward. `since`:
 * the day the plan started (earlier days, and a skipped ward, show "before");
 * days after today are "future".
 */
export function weekGrid(
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  since: DayKey,
  today: DayKey,
  firstDay: Weekday,
  skipped: SkippedWard = null,
): GridDay[] {
  const status = (date: DayKey, session: Session): DayStatus => {
    const record = records.find((r) => r.date === date && r.session === session);
    if (record) return record.late ? 'late' : 'done';
    if (daysBetween(today, date) > 0) return 'future';
    if (
      daysBetween(since, date) < 0 ||
      (skipped !== null && skipped.day === date && skipped.session === session)
    ) {
      return 'before';
    }
    if (isPaused(date, pauses)) return 'paused';
    return date === today ? 'open' : 'missed';
  };
  return weekDays(weekStartOf(today, firstDay)).map((date) => ({
    date,
    morning: status(date, 'morning'),
    evening: status(date, 'evening'),
  }));
}
