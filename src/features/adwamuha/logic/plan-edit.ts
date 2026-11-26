/**
 * Editing the user's plan (prompt §4.3; owner, 2026-10-23):
 * - each step adds exactly one dhikr (the structure cannot change);
 * - the current step and the ones before it stay where they are; only later
 *   steps can be reordered;
 * - weeks per step: 1–8, for the current step and later ones;
 * - reset copies the default plan again for the steps not done yet (the current
 *   step number and the steps done are kept);
 * - «قطعتها» (owner, 2026-11-22): a step the user already keeps, the current one
 *   or a later one, joins the steps done (`withPassed`, `passSteps`);
 * - «لم أقطعها بعد» (owner, 2026-11-26): a step done goes back to the plan, right after
 *   the current step, so its dhikr leaves the ward (`withEdits`).
 * The screen warns before saving any change and recommends the default plan.
 */
import type { DayKey } from './days';
import type { Session } from './sessions';
import type { PlanState, UserPlan, UserPlanStep } from './types';

export const MIN_STEP_WEEKS = 1;
export const MAX_STEP_WEEKS = 8;

export class PlanEditError extends Error {}

/** A step's identity: the dhikr it adds to each ward (no two steps add the same). */
export const stepKey = (s: UserPlanStep) => `${s.morningDhikrId}:${s.eveningDhikrId}`;

/** Can the step at `position` (1-based) be moved? Only steps after the current one. */
export function canMove(position: number, currentStep: number, plan: UserPlan): boolean {
  return position > currentStep && position <= plan.steps.length;
}

/** Moves the step at `from` to `to` (1-based); both must be after the current step. */
export function moveStep(plan: UserPlan, from: number, to: number, currentStep: number): UserPlan {
  if (!canMove(from, currentStep, plan) || !canMove(to, currentStep, plan)) {
    throw new PlanEditError(`Only steps after step ${currentStep} can move`);
  }
  const steps = [...plan.steps];
  const [moved] = steps.splice(from - 1, 1);
  steps.splice(to - 1, 0, moved!);
  return { ...plan, steps };
}

/** Changes a step's weeks (1–8); the current step and later ones only. */
export function setStepWeeks(
  plan: UserPlan,
  position: number,
  weeks: number,
  currentStep: number,
): UserPlan {
  if (!Number.isInteger(weeks) || weeks < MIN_STEP_WEEKS || weeks > MAX_STEP_WEEKS) {
    throw new PlanEditError(`Weeks must be ${MIN_STEP_WEEKS}–${MAX_STEP_WEEKS}`);
  }
  if (position < currentStep || position > plan.steps.length) {
    throw new PlanEditError(`Step ${position} cannot change any more`);
  }
  return {
    ...plan,
    steps: plan.steps.map((s, i) => (i === position - 1 ? { ...s, weeks } : s)),
  };
}

/** Same steps, same order, same weeks. */
export function samePlan(a: UserPlan, b: UserPlan): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * «استعادة الخطة الافتراضية»: the default order and weeks for the steps not done
 * yet. The steps done stay as they are (the ward keeps its adhkar), so they are
 * not always the default's first steps (after a reorder or «قطعتها»).
 */
export function restoreDefault(plan: UserPlan, currentStep: number, defaults: UserPlan): UserPlan {
  const done = plan.steps.slice(0, currentStep - 1);
  const doneKeys = new Set(done.map(stepKey));
  return {
    ...defaults,
    steps: [...done, ...defaults.steps.filter((s) => !doneKeys.has(stepKey(s)))],
  };
}

/**
 * The plan with the steps marked «قطعتها» (their keys, in the order marked)
 * moved right after the steps done; the others keep their order. Only the
 * current step and later ones can be marked.
 */
export function withPassed(
  plan: UserPlan,
  currentStep: number,
  passed: readonly string[],
): UserPlan {
  return withEdits(plan, currentStep, passed, []);
}

/**
 * The plan as it would be saved, with the steps marked «قطعتها» (`passed`) moved right
 * after the steps done, and the steps done marked «لم أقطعها بعد» (`unpassed`, owner,
 * 2026-11-26) moved out of them, right after the step the user will work on (they become
 * the next steps, in the order marked). The other steps keep their order.
 */
export function withEdits(
  plan: UserPlan,
  currentStep: number,
  passed: readonly string[],
  unpassed: readonly string[],
): UserPlan {
  const done = plan.steps.slice(0, currentStep - 1);
  const rest = plan.steps.slice(currentStep - 1);
  const back = unpassed.flatMap((key) => done.filter((s) => stepKey(s) === key));
  const kept = done.filter((s) => !unpassed.includes(stepKey(s)));
  const marked = passed.flatMap((key) => rest.filter((s) => stepKey(s) === key));
  const [now, ...later] = rest.filter((s) => !passed.includes(stepKey(s)));
  return {
    ...plan,
    steps: [...kept, ...marked, ...(now ? [now] : []), ...back, ...later],
  };
}

/** The step the user works on once saved, after these marks. */
export const editedCurrent = (currentStep: number, passed: number, unpassed: number): number =>
  currentStep + passed - unpassed;

/**
 * Can one more step be marked «قطعتها»? One step at least stays to work on (the
 * last one is reached the usual way, and ends the path).
 */
export const canPass = (plan: UserPlan, currentStep: number, passedCount: number): boolean =>
  currentStep + passedCount < plan.steps.length;

/**
 * A new order of the steps not done (`others`, from the order screen) put back
 * into `plan` around the marked steps, which keep their places: undoing a mark
 * puts its step back where it was.
 */
export function reorderOthers(
  plan: UserPlan,
  currentStep: number,
  passed: readonly string[],
  others: readonly UserPlanStep[],
): UserPlan {
  let next = 0;
  return {
    ...plan,
    steps: plan.steps.map((s, i) =>
      i < currentStep - 1 || passed.includes(stepKey(s)) ? s : others[next++]!,
    ),
  };
}

/**
 * Saving `after` (with `passed` steps marked «قطعتها», already moved by
 * `withPassed`): is the step the user works on still the current one? Yes when
 * only later steps were marked.
 */
export function keepsCurrent(
  state: PlanState,
  before: UserPlan,
  after: UserPlan,
  moved: number,
): boolean {
  const was = before.steps[state.step - 1];
  const now = after.steps[Math.max(1, Math.min(state.step + moved, after.steps.length)) - 1];
  return Boolean(was && now && stepKey(was) === stepKey(now));
}

/**
 * The state after saving a plan with `passed` steps marked «قطعتها» (owner,
 * 2026-11-22) and `unpassed` steps done put back («لم أقطعها بعد», owner, 2026-11-26):
 * the current step's number moves by as many. The step the user works on keeps its days
 * and weeks when it is still the same; when it was marked too, the new current step begins
 * today, as after «أضِف الذكر التالي». A step put back is a new step when reached again
 * (not a climb back after a step back), so the highest step reached moves down with it.
 */
export function passSteps(
  state: PlanState,
  before: UserPlan,
  after: UserPlan,
  passed: number,
  today: DayKey,
  startedIn: Session = 'morning',
  unpassed = 0,
): PlanState {
  if ((passed <= 0 && unpassed <= 0) || state.maintenance) return state;
  const moved = passed - unpassed;
  const step = Math.max(1, Math.min(state.step + moved, after.steps.length));
  const highestStep = Math.max(state.highestStep - unpassed, step);
  if (keepsCurrent(state, before, after, moved)) return { ...state, step, highestStep };
  return {
    ...state,
    step,
    stepStartedOn: today,
    stepStartedIn: startedIn,
    extraWeeks: 0,
    askAgainOn: null,
    reclimb: step <= state.highestStep,
    highestStep,
    startWeeks: undefined,
  };
}
