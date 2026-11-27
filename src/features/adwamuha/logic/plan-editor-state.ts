/**
 * The plan editor's changes before they are saved (`PlanEditorScreen`), as a reducer, and what
 * the screen shows from them. The rules themselves are in `plan-edit.ts`.
 */
import type { UserPlan, UserPlanStep } from '@/data/models';

import { editedCurrent, reorderOthers, samePlan, stepKey, withEdits } from './plan-edit';

export interface PlanEdits {
  /** The order and weeks as changed; null until the first change (the saved plan until then). */
  edited: UserPlan | null;
  /** Steps marked passed (the current one or later ones), by key, in the order marked. */
  passed: string[];
  /** Steps done put back (not passed yet), by key, in the order marked. */
  unpassed: string[];
}

export const NO_EDITS: PlanEdits = { edited: null, passed: [], unpassed: [] };

export type PlanEdit =
  /** A step's weeks (1–8), on the plan shown now (`base`). */
  | { type: 'weeks'; base: UserPlan; step: UserPlanStep; weeks: number }
  /** Marks a step passed, or takes the mark back. */
  | { type: 'pass'; step: UserPlanStep }
  /** Puts a step done back, or takes that back. */
  | { type: 'unpass'; step: UserPlanStep }
  /** The steps from the current one on, in a new order. */
  | { type: 'reorder'; base: UserPlan; savedStep: number; later: UserPlanStep[] }
  /** The default plan again (made with `restoreDefault`); the marks go. */
  | { type: 'reset'; plan: UserPlan };

const toggle = (list: string[], step: UserPlanStep) => {
  const key = stepKey(step);
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
};

export function planEditsReducer(state: PlanEdits, edit: PlanEdit): PlanEdits {
  switch (edit.type) {
    case 'weeks': {
      const key = stepKey(edit.step);
      const steps = edit.base.steps.map((s) =>
        stepKey(s) === key ? { ...s, weeks: edit.weeks } : s,
      );
      return { ...state, edited: { ...edit.base, steps } };
    }
    case 'pass':
      return { ...state, passed: toggle(state.passed, edit.step) };
    case 'unpass':
      return { ...state, unpassed: toggle(state.unpassed, edit.step) };
    case 'reorder':
      return {
        ...state,
        edited: reorderOthers(edit.base, edit.savedStep, state.passed, edit.later),
      };
    case 'reset':
      return { edited: edit.plan, passed: [], unpassed: [] };
  }
}

/** What the editor shows, from the saved plan and the edits. */
export function planEditorView(
  saved: UserPlan,
  savedStep: number,
  /** After the last step: no step can be marked passed. */
  maintenance: boolean,
  edits: PlanEdits,
) {
  const base = edits.edited ?? saved;
  const draft = withEdits(base, savedStep, edits.passed, edits.unpassed);
  const marks = edits.passed.length + edits.unpassed.length;
  /** The current step once saved. */
  const current = editedCurrent(savedStep, edits.passed.length, edits.unpassed.length);
  return {
    /** The plan the edits apply to. */
    base,
    /** The plan as it would be saved. */
    draft,
    marks,
    /** Something to save. */
    dirty: marks > 0 || !samePlan(draft, saved),
    current,
    /** The current step and later ones can be marked passed (not the last one). */
    mayPass: !maintenance && current < draft.steps.length,
    /** The steps done that stay done (folded in one row). */
    kept: current - 1 - edits.passed.length,
  };
}
