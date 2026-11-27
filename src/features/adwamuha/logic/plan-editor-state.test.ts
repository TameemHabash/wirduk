import { planOf } from '@/test-utils/adwamuha';

import { stepKey } from './plan-edit';
import { NO_EDITS, type PlanEdits, planEditorView, planEditsReducer } from './plan-editor-state';

/** Five steps of 1–5 weeks; the user is on step 3 (steps 1 and 2 done). */
const saved = planOf(1, 2, 3, 4, 5);
const STEP = 3;
const view = (edits: PlanEdits, maintenance = false) =>
  planEditorView(saved, STEP, maintenance, edits);
const apply = (...edits: Parameters<typeof planEditsReducer>[1][]) =>
  edits.reduce(planEditsReducer, NO_EDITS);
const keys = (edits: PlanEdits) => view(edits).draft.steps.map(stepKey);
const step = (n: number) => saved.steps[n - 1]!;

describe('the plan editor', () => {
  it('shows the saved plan until a change, with nothing to save', () => {
    const v = view(NO_EDITS);
    expect(v.draft).toEqual(saved);
    expect(v).toMatchObject({ dirty: false, current: 3, kept: 2, mayPass: true, marks: 0 });
  });

  it("a step's weeks: the plan changes and can be saved", () => {
    const edits = apply({ type: 'weeks', base: saved, step: step(4), weeks: 8 });
    expect(view(edits).draft.steps[3]!.weeks).toBe(8);
    expect(view(edits).dirty).toBe(true);
  });

  it('a step marked passed joins the steps done; a second tap takes it back', () => {
    const marked = apply({ type: 'pass', step: step(4) });
    expect(view(marked)).toMatchObject({ current: 4, kept: 2, marks: 1, dirty: true });
    expect(keys(marked).slice(0, 3)).toEqual([step(1), step(2), step(4)].map(stepKey));
    expect(planEditsReducer(marked, { type: 'pass', step: step(4) })).toEqual(NO_EDITS);
  });

  it('a step done put back comes right after the current step', () => {
    const back = apply({ type: 'unpass', step: step(1) });
    expect(view(back)).toMatchObject({ current: 2, kept: 1, marks: 1, dirty: true });
    expect(keys(back)).toEqual([2, 3, 1, 4, 5].map((n) => stepKey(step(n))));
  });

  it('reset: the plan given, and the marks go', () => {
    const other = planOf(2, 2, 2, 2, 2);
    const edits = apply({ type: 'pass', step: step(3) }, { type: 'reset', plan: other });
    expect(edits).toEqual({ edited: other, passed: [], unpassed: [] });
  });

  it('reorder: the later steps in the new order, the steps done stay', () => {
    const later = [step(5), step(3), step(4)];
    const edits = apply({ type: 'reorder', base: saved, savedStep: STEP, later });
    expect(keys(edits)).toEqual([1, 2, 5, 3, 4].map((n) => stepKey(step(n))));
  });

  it('no step can be marked passed on the last step or after the path', () => {
    expect(planEditorView(saved, 5, false, NO_EDITS).mayPass).toBe(false);
    expect(view(NO_EDITS, true).mayPass).toBe(false);
  });
});
