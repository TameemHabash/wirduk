/**
 * Calendar days for Adwamuha, as "YYYY-MM-DD" strings in the phone's local
 * time. Day arithmetic is done on the calendar date only (never on hours), so
 * daylight saving time and time zone changes cannot shift a day.
 */

/** A local calendar date, "YYYY-MM-DD". */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date of a moment. */
export function dayKeyOf(at: Date): DayKey {
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

function parse(day: DayKey): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error(`Bad day: ${day}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function format(utcMs: number): DayKey {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(day: DayKey, n: number): DayKey {
  return format(parse(day) + n * DAY_MS);
}

/** Whole days from `a` to `b` (b − a); negative when b is before a. */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parse(b) - parse(a)) / DAY_MS);
}

/** Every day from `from` to `to`, both included (empty when `to` is before `from`). */
export function daysFrom(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Minutes after midnight, local time. */
export function minuteOfDay(at: Date): number {
  return at.getHours() * 60 + at.getMinutes();
}
