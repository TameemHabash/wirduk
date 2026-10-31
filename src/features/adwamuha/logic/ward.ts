/**
 * The ward of a step (prompt §4.1): the opening first, then the dhikr of every
 * step up to the current one, in plan order. A morning-only or evening-only
 * step changes only that ward. In maintenance, the whole plan.
 */
import type { DefaultPlan } from '@/data/models';

import type { Session } from './sessions';
import type { UserPlan } from './types';

export function wardDhikrIds(plan: UserPlan, step: number, session: Session): number[] {
  const upTo = Math.min(Math.max(step, 0), plan.steps.length);
  const ids = [plan.opening[session]];
  for (const s of plan.steps.slice(0, upTo)) {
    const id = session === 'morning' ? s.morningDhikrId : s.eveningDhikrId;
    if (id !== null) ids.push(id);
  }
  return ids;
}

/**
 * «ترتيب الورد» (owner, 2026-10-29): 'plan' (the default, recommended) reads
 * the ward in plan order, the new dhikr last; 'category' reads the same adhkar
 * in their order in the morning or evening category (the book's order). Only
 * the order changes; the opening is always first.
 */
export type WardOrder = 'plan' | 'category';

export const WARD_ORDERS: readonly WardOrder[] = ['plan', 'category'];

/** The ward's ids (from `wardDhikrIds`) in the chosen order; `categoryIds`: the category in order. */
export function orderWard(
  wardIds: readonly number[],
  order: WardOrder,
  categoryIds: readonly number[],
): number[] {
  if (order === 'plan' || wardIds.length <= 2) return [...wardIds];
  const [opening, ...rest] = wardIds as [number, ...number[]];
  const position = new Map(categoryIds.map((id, i) => [id, i]));
  // An id not in the category (it should not happen) keeps its place at the end.
  const at = (id: number) => position.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [opening, ...rest.sort((a, b) => at(a) - at(b))];
}

/** The user's copy of the default plan (made when the feature is turned on, or on reset). */
export function copyDefaultPlan(plan: DefaultPlan): UserPlan {
  const opening = plan.steps.find((s) => s.step === 0);
  if (!opening?.morningDhikrId || !opening.eveningDhikrId) {
    throw new Error('The default plan has no opening');
  }
  const weeksOf = new Map(plan.stages.map((s) => [s.stage, s.weeks]));
  return {
    opening: { morning: opening.morningDhikrId, evening: opening.eveningDhikrId },
    steps: plan.steps
      .filter((s) => s.step > 0)
      .sort((a, b) => a.step - b.step)
      .map((s) => ({
        stage: s.stage ?? 1,
        weeks: weeksOf.get(s.stage ?? 1) ?? 1,
        morningDhikrId: s.morningDhikrId,
        eveningDhikrId: s.eveningDhikrId,
      })),
  };
}
