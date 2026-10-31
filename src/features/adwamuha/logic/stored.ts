/**
 * Reading Adwamuha's stored JSON back safely: damaged or old data gives null
 * (the caller then treats the feature as never turned on), never a crash.
 */
import type { PlanState, UserPlan } from './types';

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isIdOrNull = (v: unknown) => v === null || isId(v);
const isPositive = (v: unknown): v is number => isId(v) && v >= 1;
const isSessionOrMissing = (v: unknown) => v === undefined || v === 'morning' || v === 'evening';

function parse(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

export function parseUserPlan(json: string): UserPlan | null {
  const v = parse(json) as UserPlan | null;
  if (!v || typeof v !== 'object' || !v.opening || !Array.isArray(v.steps)) return null;
  if (!isId(v.opening.morning) || !isId(v.opening.evening) || v.steps.length === 0) return null;
  const ok = v.steps.every(
    (s) =>
      s &&
      isPositive(s.stage) &&
      isPositive(s.weeks) &&
      s.weeks <= 8 &&
      isIdOrNull(s.morningDhikrId) &&
      isIdOrNull(s.eveningDhikrId) &&
      (s.morningDhikrId !== null || s.eveningDhikrId !== null),
  );
  return ok ? v : null;
}

export function parsePlanState(json: string, plan: UserPlan): PlanState | null {
  const v = parse(json) as PlanState | null;
  if (!v || typeof v !== 'object') return null;
  const ok =
    isPositive(v.step) &&
    v.step <= plan.steps.length &&
    isDay(v.stepStartedOn) &&
    isId(v.extraWeeks) &&
    v.extraWeeks >= 0 &&
    (v.askAgainOn === null || isDay(v.askAgainOn)) &&
    typeof v.reclimb === 'boolean' &&
    isPositive(v.highestStep) &&
    typeof v.maintenance === 'boolean' &&
    (v.suggestedStepBackOn === null || isDay(v.suggestedStepBackOn)) &&
    isSessionOrMissing(v.stepStartedIn) &&
    isSessionOrMissing(v.planStartedIn) &&
    (v.startWeeks === undefined || (isPositive(v.startWeeks) && v.startWeeks <= 8));
  return ok ? v : null;
}
