/**
 * Test-only helpers for Adwamuha's logic: days counted from 2026-01-01, and
 * ward records made in bulk.
 */
import { type DayKey, addDays } from '@/features/adwamuha/logic/days';
import type { Session } from '@/features/adwamuha/logic/sessions';
import type { PlanState, UserPlan, WardRecord } from '@/features/adwamuha/logic/types';

export const D0: DayKey = '2026-01-01';

/** Day n after 2026-01-01 (day(0) is 2026-01-01). */
export const day = (n: number): DayKey => addDays(D0, n);

export function rec(date: DayKey, session: Session, extra: Partial<WardRecord> = {}): WardRecord {
  return { date, session, completedAt: 0, late: false, source: 'reader', step: 1, ...extra };
}

/** Records on days `from`…`to` (both included), for the given sessions, except where `skip(n)`. */
export function daily(
  from: number,
  to: number,
  sessions: readonly Session[] = ['morning', 'evening'],
  skip: (n: number) => boolean = () => false,
): WardRecord[] {
  const out: WardRecord[] = [];
  for (let n = from; n <= to; n++) {
    if (skip(n)) continue;
    for (const s of sessions) out.push(rec(day(n), s));
  }
  return out;
}

/** A plan of `weeks.length` steps (each in both wards), with these weeks per step. */
export function planOf(...weeks: number[]): UserPlan {
  return {
    opening: { morning: 1901, evening: 133901 },
    steps: weeks.map((w, i) => ({
      stage: 1,
      weeks: w,
      morningDhikrId: 1001 + i,
      eveningDhikrId: 133001 + i,
    })),
  };
}

export function stateAt(
  step: number,
  startedOn: DayKey,
  extra: Partial<PlanState> = {},
): PlanState {
  return {
    step,
    stepStartedOn: startedOn,
    extraWeeks: 0,
    askAgainOn: null,
    reclimb: false,
    highestStep: step,
    maintenance: false,
    suggestedStepBackOn: null,
    ...extra,
  };
}
