/**
 * Moving through the plan (prompt §6, §7, §11; owner's answers 2026-10-23,
 * calendar weeks 2026-10-29). Pure functions: they take the stored state and
 * return a new one, and are worked out lazily whenever the app opens (it need
 * not open every day).
 *
 * "today" is always the date of the ward window that is open now
 * (`slotAt(now).date`), so 01:30 still belongs to the day before.
 * `firstDay` is the phone's first day of the week (see `weeks.ts`).
 */
import { type SkippedWard, WEEK_DAYS, WEEK_TARGET, countedDays, judgedUntil } from './commitment';
import { type DayKey, addDays, daysBetween } from './days';
import type { Session } from './sessions';
import type { Pause, PlanState, UserPlan, WardRecord } from './types';
import { type StepWeek, type Weekday, finishedWeeks, settledWeeks, stepWeeks } from './weeks';

/**
 * Weeks on the step the user starts at when it is not the first: they already
 * keep its adhkar (owner, 2026-10-29: «الخطوة المختارة تبدأ بمدة أسبوعين»).
 */
export const LATER_START_WEEKS = 2;

/**
 * The state when the user turns the feature on, at the step they chose
 * (default 1). `startedIn`: the ward window open now (begun in the evening,
 * today's morning was already over and counts for nothing).
 */
export function startPlan(
  startStep: number,
  today: DayKey,
  startedIn: Session = 'morning',
): PlanState {
  return {
    step: startStep,
    stepStartedOn: today,
    extraWeeks: 0,
    askAgainOn: null,
    // The steps before the starting one count as reached (owner: a later step
    // back climbs them in a week each).
    reclimb: false,
    highestStep: startStep,
    maintenance: false,
    suggestedStepBackOn: null,
    stepStartedIn: startedIn,
    planStartedIn: startedIn,
    ...(startStep > 1 && { startWeeks: LATER_START_WEEKS }),
  };
}

/** The ward the current step does not count: its first morning, when it began in the evening. */
export const stepSkipped = (state: PlanState): SkippedWard =>
  state.stepStartedIn === 'evening' ? { day: state.stepStartedOn, session: 'morning' } : null;

/** The same for the whole plan (the week grid). */
export const planSkipped = (state: PlanState, startedOn: DayKey): SkippedWard =>
  state.planStartedIn === 'evening' ? { day: startedOn, session: 'morning' } : null;

/** The current step's weeks: 1 when climbing back, 2 for a later start, else the plan's. */
function stepWeeksOf(state: PlanState, plan: UserPlan): number {
  if (state.reclimb) return 1;
  const weeks = plan.steps[state.step - 1]?.weeks ?? 1;
  return state.startWeeks ? Math.min(state.startWeeks, weeks) : weeks;
}

/** Minimum counted days on the current step: its weeks, plus extensions. */
export function minimumDays(state: PlanState, plan: UserPlan): number {
  return (stepWeeksOf(state, plan) + state.extraWeeks) * WEEK_DAYS;
}

/** The step's calendar weeks, newest first (this week first). */
export const weeksOfStep = (
  state: PlanState,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): StepWeek[] =>
  stepWeeks(records, pauses, state.stepStartedOn, today, firstDay, stepSkipped(state));

export interface MoveOnStatus {
  /** Counted days on this step that can be judged so far. */
  daysOnStep: number;
  minimumDays: number;
  minimumPassed: boolean;
  /** Counted days left before the minimum passes (0 once passed). */
  daysLeft: number;
  /** Full weeks the rule checks: 2, or 1 for a step shorter than two weeks. */
  weeksNeeded: number;
  /** The step's calendar weeks, newest first (the first is this week). */
  weeks: StepWeek[];
  /** The last `weeksNeeded` settled full weeks each have 4 mornings and 4 evenings. */
  conditionMet: boolean;
  /** Enough full weeks are settled for a verdict (otherwise the rule waits for them). */
  decided: boolean;
}

/**
 * The move-on condition: the minimum has passed, and in each of the last two
 * full calendar weeks (only one when the step is shorter than two weeks) the
 * morning and the evening were each done on 4 days or more. A week that
 * already has 4 and 4 counts before it ends.
 */
export function moveOnStatus(
  state: PlanState,
  plan: UserPlan,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): MoveOnStatus {
  const until = judgedUntil(records, today);
  const daysOnStep = countedDays(state.stepStartedOn, until, pauses).length;
  const min = minimumDays(state, plan);
  const needed = min >= 2 * WEEK_DAYS ? 2 : 1;
  const weeks = weeksOfStep(state, records, pauses, today, firstDay);
  const last = settledWeeks(weeks).slice(0, needed);
  return {
    daysOnStep,
    minimumDays: min,
    minimumPassed: daysOnStep >= min,
    daysLeft: Math.max(0, min - daysOnStep),
    weeksNeeded: needed,
    weeks,
    conditionMet: last.length === needed && last.every((w) => w.met),
    decided: last.length === needed,
  };
}

export type ProgressEvent =
  /** Not ready when the time was up: the step got `weeks` more weeks (no blame). */
  | { kind: 'extended'; weeks: number }
  /** Ask «جاهز لإضافة الذكر التالي؟»; the app never moves on by itself. */
  | { kind: 'ready' }
  /** The last step is done: maintenance from now on. */
  | { kind: 'finished' };

/** What the app should do now. Returns the (maybe extended or finished) state. */
export function evaluate(
  state: PlanState,
  plan: UserPlan,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): { state: PlanState; event: ProgressEvent | null } {
  if (state.maintenance) return { state, event: null };
  const status = moveOnStatus(state, plan, records, pauses, today, firstDay);
  if (!status.minimumPassed) return { state, event: null };
  if (!status.conditionMet) {
    // A week started inside the step is not full: wait for the full weeks to settle.
    if (!status.decided) return { state, event: null };
    // Enough weeks that the new minimum is still ahead (the app may not have opened for a while).
    const weeks = Math.floor((status.daysOnStep - status.minimumDays) / WEEK_DAYS) + 1;
    return {
      state: { ...state, extraWeeks: state.extraWeeks + weeks },
      event: { kind: 'extended', weeks },
    };
  }
  if (state.step >= plan.steps.length) {
    return {
      state: { ...state, maintenance: true, askAgainOn: null },
      event: { kind: 'finished' },
    };
  }
  if (state.askAgainOn && daysBetween(today, state.askAgainOn) > 0) return { state, event: null };
  return { state, event: { kind: 'ready' } };
}

/** «أضِف الذكر التالي». `startedIn`: the ward window open now. */
export function advance(
  state: PlanState,
  plan: UserPlan,
  today: DayKey,
  startedIn: Session = 'morning',
): PlanState {
  if (state.step >= plan.steps.length) return { ...state, maintenance: true, askAgainOn: null };
  const step = state.step + 1;
  return {
    ...state,
    step,
    stepStartedOn: today,
    stepStartedIn: startedIn,
    extraWeeks: 0,
    askAgainOn: null,
    reclimb: step <= state.highestStep,
    highestStep: Math.max(state.highestStep, step),
    startWeeks: undefined,
  };
}

/** «أبقِني أسبوعًا آخر»: ask again in 7 days. */
export function postpone(state: PlanState, today: DayKey): PlanState {
  return { ...state, askAgainOn: addDays(today, WEEK_DAYS) };
}

export type StepBack = 'half' | 'firstThree';

/** The step a step back goes to: half the current one, or the first three. */
export function stepBackTarget(step: number, kind: StepBack): number {
  return kind === 'half' ? Math.max(1, Math.floor(step / 2)) : Math.min(step, 3);
}

/**
 * «طرأ عليّ ظرف»: go back. History is kept; the steps reached before are
 * climbed again in a week each.
 */
export function stepBack(
  state: PlanState,
  kind: StepBack,
  today: DayKey,
  startedIn: Session = 'morning',
): PlanState {
  const step = stepBackTarget(state.step, kind);
  return {
    ...state,
    step,
    stepStartedOn: today,
    stepStartedIn: startedIn,
    extraWeeks: 0,
    askAgainOn: null,
    reclimb: step <= state.highestStep,
    maintenance: false,
    startWeeks: undefined,
  };
}

/** A break of 1 or 2 weeks from today: those days count for nothing, and the step waits. */
export function breakFrom(today: DayKey, weeks: 1 | 2): Pause {
  return { from: today, to: addDays(today, weeks * WEEK_DAYS - 1), kind: 'break' };
}

/** Ends a break early (owner): it keeps the days before today; a break that has not begun goes. */
export function endBreak(pause: Pause, today: DayKey): Pause | null {
  if (daysBetween(pause.from, today) <= 0) return null;
  return { ...pause, to: addDays(today, -1) };
}

/**
 * The feature was off from `offSince` until today (continue): the days in between are like a
 * break. The day it was turned off and the day it is turned on again both count as on (they
 * were used; milestone 13: turned off in the evening, after both wards, lost that day).
 */
export function offPause(offSince: DayKey, today: DayKey): Pause | null {
  const from = addDays(offSince, 1);
  if (daysBetween(from, today) <= 0) return null;
  return { from, to: addDays(today, -1), kind: 'off' };
}

/** Days between two low-commitment suggestions. */
export const SUGGESTION_PAUSE_DAYS = 14;

/**
 * The gentle step-back suggestion: morning or evening below 4 in the last two
 * full weeks that are over (on this step), at most once every 14 days.
 */
export function shouldSuggestStepBack(
  state: PlanState,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): boolean {
  if (state.maintenance) return false;
  if (
    state.suggestedStepBackOn &&
    daysBetween(state.suggestedStepBackOn, today) < SUGGESTION_PAUSE_DAYS
  ) {
    return false;
  }
  const last = finishedWeeks(weeksOfStep(state, records, pauses, today, firstDay)).slice(0, 2);
  if (last.length < 2) return false;
  return last.every((w) => w.morning < WEEK_TARGET) || last.every((w) => w.evening < WEEK_TARGET);
}

/**
 * The last full week of this step that is over, for the end-of-week message.
 * Null before one is over (a week cut by the step's start or a break has no
 * message: it does not count).
 */
export function lastFinishedWeek(
  state: PlanState,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): { weekStart: DayKey; reachedTarget: boolean } | null {
  const week = finishedWeeks(weeksOfStep(state, records, pauses, today, firstDay))[0];
  return week ? { weekStart: week.start, reachedTarget: week.met } : null;
}
