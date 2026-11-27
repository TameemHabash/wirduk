/** Today's two wards as Home's card and «مساري» show them. */
import { type DayKey, type Session, SESSIONS, type WardRecord } from '@/data/models';

import { addDays } from './days';
import type { WardSlot } from './sessions';

/** A ward's state on Home (design: ✓ done, clock late, framed = its time now, dashed = not yet). */
export type WardState = 'done' | 'late' | 'now' | 'notYet' | 'missed';

export interface TodayWards {
  state: Record<Session, WardState>;
  bothDone: boolean;
  /**
   * The ward Home offers: the one that can count now (`open`), or, once it is done, the other
   * one, with the time it starts (not open).
   */
  show: { session: Session; open: boolean };
}

/** Today's wards, from the records and the ward window open now (its date is "today"). */
export function todayWards(records: readonly WardRecord[], now: WardSlot): TodayWards {
  const record = (s: Session) =>
    records.find((r) => r.date === now.date && r.session === s) ?? null;
  const stateOf = (s: Session): WardState => {
    const r = record(s);
    if (r) return r.late ? 'late' : 'done';
    if (s === now.session) return 'now';
    // The morning is over once the evening began; the evening is still ahead in the morning.
    return s === 'morning' ? 'missed' : 'notYet';
  };
  const other: Session = now.session === 'morning' ? 'evening' : 'morning';
  return {
    state: { morning: stateOf('morning'), evening: stateOf('evening') },
    bothDone: SESSIONS.every((s) => record(s) !== null),
    show: record(now.session)
      ? { session: other, open: false }
      : { session: now.session, open: true },
  };
}

/** A ward recorded from memory, today or yesterday: it can still be undone. */
export function undoableFromMemory(
  records: readonly WardRecord[],
  today: DayKey,
  date: DayKey,
  session: Session,
): boolean {
  return (
    (date === today || date === addDays(today, -1)) &&
    records.some((r) => r.date === date && r.session === session && r.source === 'manual')
  );
}
