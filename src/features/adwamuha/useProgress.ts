import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositories } from '@/data/DataProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import type { DayKey } from './logic/days';
import { type MoveOnStatus, moveOnStatus, planSkipped } from './logic/progress';
import type { Session } from './logic/sessions';
import { type DayStatus, type GridDay, weekGrid } from './logic/weeks';

export interface ProgressView {
  today: DayKey;
  step: number;
  total: number;
  stage: number;
  stageTitle: string;
  maintenance: boolean;
  status: MoveOnStatus;
  /**
   * This calendar week on the step: wards done so far, and whether it is full
   * (it counts for the move-on rule; not when the step began inside it or a
   * break cut it). The same days as the grid, so the numbers match the dots.
   */
  thisWeek: { morning: number; evening: number; full: boolean };
  grid: GridDay[];
  todayStatus: Record<Session, DayStatus>;
}

/** Stage names (the owner's, from the content database). */
function useStageTitles(): Map<number, string> {
  const { content } = useRepositories();
  const { i18n } = useTranslation();
  const [titles, setTitles] = useState(new Map<number, string>());
  useEffect(() => {
    let cancelled = false;
    content
      .getDefaultPlan(i18n.language)
      .then((plan) => {
        if (!cancelled) setTitles(new Map(plan.stages.map((s) => [s.stage, s.title])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);
  return titles;
}

/** Everything «مساري» and the home card show; null while off or not loaded. */
export function useProgress(): ProgressView | null {
  const { stored, enabled, records, pauses, slot, weekStart } = useAdwamuha();
  const titles = useStageTitles();
  const today = slot().date;

  return useMemo(() => {
    if (!stored || !enabled) return null;
    const { plan, state } = stored;
    // A first morning that was over before the plan began shows as "before".
    const grid = weekGrid(
      records,
      pauses,
      stored.startedOn,
      today,
      weekStart,
      planSkipped(state, stored.startedOn),
    );
    const status = moveOnStatus(state, plan, records, pauses, today, weekStart);
    const week = status.weeks[0]!;
    const now = grid.find((g) => g.date === today)!;
    const stage = plan.steps[state.step - 1]?.stage ?? 1;
    return {
      today,
      step: state.step,
      total: plan.steps.length,
      stage,
      stageTitle: titles.get(stage) ?? '',
      maintenance: state.maintenance,
      status,
      thisWeek: { morning: week.morning, evening: week.evening, full: week.full },
      grid,
      todayStatus: { morning: now.morning, evening: now.evening },
    };
  }, [enabled, pauses, records, stored, titles, today, weekStart]);
}
