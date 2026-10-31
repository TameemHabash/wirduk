import { planOf } from '@/test-utils/adwamuha';

import { PlanEditError, canMove, moveStep, samePlan, setStepWeeks } from './plan-edit';

const plan = planOf(4, 4, 3, 2, 2); // steps add 1001…1005 / 133001…133005
const order = (p: typeof plan) => p.steps.map((s) => s.morningDhikrId);

describe('editing the plan', () => {
  it('moves only steps after the current one', () => {
    expect(canMove(3, 2, plan)).toBe(true);
    expect(canMove(2, 2, plan)).toBe(false); // the current step stays
    expect(canMove(1, 2, plan)).toBe(false);
    expect(order(moveStep(plan, 5, 3, 2))).toEqual([1001, 1002, 1005, 1003, 1004]);
    expect(() => moveStep(plan, 4, 2, 2)).toThrow(PlanEditError);
    expect(() => moveStep(plan, 1, 4, 2)).toThrow(PlanEditError);
  });

  it('keeps one dhikr per step (only the order changes)', () => {
    const moved = moveStep(plan, 3, 5, 1);
    expect(moved.steps).toHaveLength(plan.steps.length);
    expect([...order(moved)].sort()).toEqual([...order(plan)].sort());
  });

  it('changes weeks 1–8, for the current step and later ones', () => {
    expect(setStepWeeks(plan, 2, 1, 2).steps[1]!.weeks).toBe(1);
    expect(setStepWeeks(plan, 5, 8, 2).steps[4]!.weeks).toBe(8);
    expect(() => setStepWeeks(plan, 2, 9, 2)).toThrow(/1–8/);
    expect(() => setStepWeeks(plan, 2, 0, 2)).toThrow(/1–8/);
    expect(() => setStepWeeks(plan, 1, 2, 2)).toThrow(/cannot change/);
  });

  it('knows an unchanged plan', () => {
    expect(samePlan(plan, planOf(4, 4, 3, 2, 2))).toBe(true);
    expect(samePlan(plan, setStepWeeks(plan, 3, 1, 1))).toBe(false);
  });
});
