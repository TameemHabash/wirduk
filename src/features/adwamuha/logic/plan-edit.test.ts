import { planOf } from '@/test-utils/adwamuha';

import { startPlan } from './progress';
import {
  PlanEditError,
  canMove,
  canPass,
  keepsCurrent,
  moveStep,
  passSteps,
  reorderOthers,
  restoreDefault,
  samePlan,
  setStepWeeks,
  stepKey,
  withPassed,
} from './plan-edit';

const plan = planOf(4, 4, 3, 2, 2); // steps add 1001…1005 / 133001…133005
const order = (p: typeof plan) => p.steps.map((s) => s.morningDhikrId);
/** The key of the step that adds 100n / 13300n. */
const key = (n: number) => stepKey(plan.steps[n - 1]!);

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

  it('reset: the default for the steps not done; the steps done stay (the ward keeps them)', () => {
    // Done: steps 1 and 4 (4 was marked passed earlier); the rest in a changed order and weeks.
    const mine = {
      ...plan,
      steps: [1, 4, 5, 2, 3].map((n) => ({ ...plan.steps[n - 1]!, weeks: 1 })),
    };
    const back = restoreDefault(mine, 3, plan);
    expect(order(back)).toEqual([1001, 1004, 1002, 1003, 1005]);
    expect(back.steps.map((s) => s.weeks)).toEqual([1, 1, 4, 3, 2]);
    // Nothing changed before the current step: the default plan itself.
    expect(restoreDefault(setStepWeeks(plan, 4, 8, 2), 2, plan)).toEqual(plan);
  });
});

describe('«قطعتها»: a step the user already keeps (owner, 2026-11-22)', () => {
  it('the marked steps join the steps done, in the order marked; the others keep theirs', () => {
    expect(order(withPassed(plan, 2, []))).toEqual(order(plan));
    expect(order(withPassed(plan, 2, [key(2)]))).toEqual(order(plan)); // the current one
    expect(order(withPassed(plan, 2, [key(5), key(4)]))).toEqual([1001, 1005, 1004, 1002, 1003]);
    // A step done already cannot be marked again.
    expect(order(withPassed(plan, 2, [key(1)]))).toEqual(order(plan));
  });

  it('one step at least stays to work on', () => {
    expect(canPass(plan, 1, 0)).toBe(true);
    expect(canPass(plan, 1, 3)).toBe(true); // marking a 4th leaves step 5
    expect(canPass(plan, 1, 4)).toBe(false);
    expect(canPass(plan, 5, 0)).toBe(false); // on the last step
  });

  it('a new order of the other steps leaves the marked ones in their places (undo puts them back)', () => {
    const passed = [key(4)];
    // Shown: 1001 | 1004 (marked) | 1002 1003 1005 → the user moves 1005 before 1003.
    const others = [2, 5, 3].map((n) => plan.steps[n - 1]!);
    const base = reorderOthers(plan, 2, passed, others);
    expect(order(withPassed(base, 2, passed))).toEqual([1001, 1004, 1002, 1005, 1003]);
    // Undone, 1004 is step 4 again, where it was.
    expect(order(withPassed(base, 2, []))).toEqual([1001, 1002, 1005, 1004, 1003]);
  });

  it('only later steps marked: the same step goes on, its days and weeks kept', () => {
    const state = { ...startPlan(2, '2026-04-01'), askAgainOn: '2026-04-30' };
    const after = withPassed(plan, 2, [key(5), key(4)]);
    expect(keepsCurrent(state, plan, after, 2)).toBe(true);
    expect(passSteps(state, plan, after, 2, '2026-04-20', 'evening')).toEqual({
      ...state,
      step: 4,
      highestStep: 4,
    });
  });

  it('the current step marked: the next one begins today, as after «أضِف الذكر التالي»', () => {
    const state = { ...startPlan(2, '2026-04-01'), askAgainOn: '2026-04-30' };
    const after = withPassed(plan, 2, [key(2)]);
    expect(keepsCurrent(state, plan, after, 1)).toBe(false);
    expect(passSteps(state, plan, after, 1, '2026-04-20', 'evening')).toEqual({
      ...state,
      step: 3,
      stepStartedOn: '2026-04-20',
      stepStartedIn: 'evening',
      askAgainOn: null,
      reclimb: false,
      highestStep: 3,
      startWeeks: undefined,
    });
  });

  it('after a step back, a step reached before is climbed in a week, as usual', () => {
    const state = { ...startPlan(2, '2026-04-01'), highestStep: 5, reclimb: true };
    const after = withPassed(plan, 2, [key(2)]);
    expect(passSteps(state, plan, after, 1, '2026-04-20')).toMatchObject({
      step: 3,
      reclimb: true,
      highestStep: 5,
    });
  });

  it('nothing marked, or the path finished: the state stays', () => {
    const state = startPlan(2, '2026-04-01');
    expect(passSteps(state, plan, plan, 0, '2026-04-20')).toBe(state);
    const done = { ...startPlan(5, '2026-04-01'), maintenance: true };
    expect(passSteps(done, plan, plan, 1, '2026-04-20')).toBe(done);
  });
});
