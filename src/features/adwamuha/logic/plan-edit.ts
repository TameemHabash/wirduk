/**
 * Editing the user's plan (prompt §4.3; owner, 2026-10-23):
 * - each step adds exactly one dhikr (the structure cannot change);
 * - the current step and the ones before it stay where they are; only later
 *   steps can be reordered;
 * - weeks per step: 1–8, for the current step and later ones;
 * - reset copies the default plan again (the current step number is kept).
 * The screen warns before saving any change and recommends the default plan.
 */
import type { UserPlan } from './types';

export const MIN_STEP_WEEKS = 1;
export const MAX_STEP_WEEKS = 8;

export class PlanEditError extends Error {}

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
