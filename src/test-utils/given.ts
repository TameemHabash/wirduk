/**
 * Test-only: put the user's data in a known state before a screen opens
 * ("given … when … then"). Writes through the real repositories.
 */
import type { Repositories } from '@/data/DataProvider';
import type { DayKey, PlanState, Session } from '@/data/models';
import { addDays } from '@/features/adwamuha/logic/days';
import { startPlan } from '@/features/adwamuha/logic/progress';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';

export interface GivenAdwamuha {
  /** The current step (default 1). */
  step?: number;
  /** The day the step (and the plan) started. */
  startedOn: DayKey;
  /** The ward it was turned on in (default morning). */
  startedIn?: Session;
  /** Off (default on). */
  enabled?: boolean;
  /** While off: the day it was turned off (default null). */
  offSince?: DayKey | null;
  /** Changes to the state after `startPlan` (e.g. `{ maintenance: true }`). */
  state?: Partial<PlanState>;
  /** Log the 'start' event too, as the setup does. */
  logStart?: boolean;
  /** Messages already shown (their keys). */
  seen?: readonly string[];
}

/**
 * «أدومها» turned on with the default plan at `step`, as the setup leaves it.
 * Returns the same repositories, for chaining.
 */
export async function givenAdwamuha(
  repos: Repositories,
  {
    step = 1,
    startedOn,
    startedIn = 'morning',
    enabled = true,
    offSince = null,
    state = {},
    logStart = false,
    seen = [],
  }: GivenAdwamuha,
): Promise<Repositories> {
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  await repos.adwamuha.save({
    enabled,
    plan,
    state: { ...startPlan(step, startedOn, startedIn), ...state },
    startedOn,
    offSince,
  });
  if (logStart) await repos.adwamuha.logEvent(startedOn, 'start', step);
  for (const key of seen) await repos.adwamuha.markShown(key);
  return repos;
}

/** A ward read in the reader on `date` (on time, at step 1 unless said). */
export async function givenWardRead(
  repos: Repositories,
  date: DayKey,
  session: Session,
  { step = 1, late = false }: { step?: number; late?: boolean } = {},
): Promise<void> {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const hour = session === 'morning' ? (late ? 13 : 7) : late ? 25 : 18;
  await repos.adwamuha.addRecord({
    date,
    session,
    completedAt: new Date(y, m - 1, d, hour).getTime(),
    late,
    source: 'reader',
    step,
  });
}

/** Both wards read on each day from `from` to `to` (both included). */
export async function givenDaysRead(
  repos: Repositories,
  from: DayKey,
  to: DayKey,
  sessions: readonly Session[] = ['morning', 'evening'],
): Promise<void> {
  for (let date = from; date <= to; date = addDays(date, 1)) {
    for (const session of sessions) await givenWardRead(repos, date, session);
  }
}
