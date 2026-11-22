/**
 * Moving through the plan (prompt §6, §7, §11; owner's answers 2026-10-23,
 * calendar weeks 2026-10-29, good weeks 2026-11-14). Pure functions: they take
 * the stored state and return a new one, and are worked out lazily whenever
 * the app opens (it need not open every day).
 *
 * "today" is always the date of the ward window that is open now
 * (`slotAt(now).date`), so 01:30 still belongs to the day before.
 * `firstDay` is the first day of the week («بداية الأسبوع», see `weeks.ts`).
 */
import { type SkippedWard, WEEK_DAYS, WEEK_TARGET } from './commitment';
import { type DayKey, addDays, daysBetween } from './days';
import type { Session } from './sessions';
import type { Pause, PlanState, UserPlan, WardRecord } from './types';
import { type StepWeek, type Weekday, finishedWeeks, goodWeeks, stepWeeks } from './weeks';

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

/**
 * The good weeks the current step needs: 1 when climbing back, 2 for a later
 * start, else the plan's weeks. (`extraWeeks`, the old automatic extension, is
 * no longer used: a week short of the target simply does not count.)
 */
export function weeksNeeded(state: PlanState, plan: UserPlan): number {
  if (state.reclimb) return 1;
  const weeks = plan.steps[state.step - 1]?.weeks ?? 1;
  return state.startWeeks ? Math.min(state.startWeeks, weeks) : weeks;
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
  /** Good weeks the step needs (see `weeksNeeded`). */
  weeksNeeded: number;
  /** The step's good weeks so far: over, with 4 mornings and 4 evenings (owner, 2026-11-14). */
  goodWeeks: number;
  /** Good weeks still to go (0 once there are enough). */
  weeksLeft: number;
  /** The step's calendar weeks, newest first (the first is this week). */
  weeks: StepWeek[];
  /** The step has all the good weeks it needs. */
  conditionMet: boolean;
}

/**
 * The move-on condition (owner, 2026-11-14): a step of N weeks needs N good
 * weeks, each with 4 mornings and 4 evenings. They need not follow each other:
 * a week short of 4 and 4 just does not count (it is not held against the
 * user, and nothing is extended). A week counts once it is over (owner,
 * 2026-11-15: not on its 4th good day), and the step's first week counts too
 * when it gets there (only the days since the step began are counted in it).
 */
export function moveOnStatus(
  state: PlanState,
  plan: UserPlan,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): MoveOnStatus {
  const needed = weeksNeeded(state, plan);
  const weeks = weeksOfStep(state, records, pauses, today, firstDay);
  const good = goodWeeks(weeks).length;
  return {
    weeksNeeded: needed,
    goodWeeks: good,
    weeksLeft: Math.max(0, needed - good),
    weeks,
    conditionMet: good >= needed,
  };
}

export type ProgressEvent =
  /** Ask «جاهز لإضافة الذكر التالي؟»; the app never moves on by itself. */
  | { kind: 'ready' }
  /** The last step is done: maintenance from now on. */
  | { kind: 'finished' };

/** What the app should do now. Returns the (maybe finished) state. */
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
  if (!status.conditionMet) return { state, event: null };
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

/**
 * A step back: half the current step, the first three, or a step the user
 * picked with − and + («ارجع إلى الخطوة:», owner, 2026-11-22).
 */
export type StepBack = 'half' | 'firstThree' | { step: number };

/** The step a step back goes to (never past the current one, never below 1). */
export function stepBackTarget(step: number, kind: StepBack): number {
  if (typeof kind === 'object') return Math.min(step, Math.max(1, Math.floor(kind.step)));
  return kind === 'half' ? Math.max(1, Math.floor(step / 2)) : Math.min(step, 3);
}

/** The steps «ارجع إلى الخطوة:» offers: 1 up to the one before the current step (none on step 1). */
export const lastStepBackChoice = (step: number): number => step - 1;

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
 * The last week of this step that is over, for the end-of-week message: a full
 * week, or a cut one (the step began in it, or a break) that still had 4 and 4
 * (it counted). Null before one is over; a cut week short of the target has no
 * message (it was not a fair week).
 */
export function lastFinishedWeek(
  state: PlanState,
  records: readonly WardRecord[],
  pauses: readonly Pause[],
  today: DayKey,
  firstDay: Weekday,
): { weekStart: DayKey; reachedTarget: boolean } | null {
  const week = weeksOfStep(state, records, pauses, today, firstDay).find(
    (w) => w.complete && (w.full || w.met),
  );
  return week ? { weekStart: week.start, reachedTarget: week.met } : null;
}
