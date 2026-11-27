import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { SESSION_OF_CATEGORY } from '@/config/categories';
import { useRepositories } from '@/data/DataProvider';
import type { DayKey, Session, UserPlan, WardRecord, WardTimes, Weekday } from '@/data/models';
import type { AdwamuhaStored, StoredPause } from '@/data/repositories/adwamuha-repository';
import { useSettings } from '@/data/settings/SettingsProvider';
import { addDays, daysBetween } from '@/features/adwamuha/logic/days';
import { type DueMessage, weekMessageKey } from '@/features/adwamuha/logic/due-messages';
import { keepsCurrent, passSteps } from '@/features/adwamuha/logic/plan-edit';
import {
  advance as advanceState,
  breakFrom,
  endBreak as endBreakPause,
  lastFinishedWeek,
  offPause,
  postpone as postponeState,
  startPlan,
  type StepBack,
  stepBack as stepBackState,
} from '@/features/adwamuha/logic/progress';
import { type WardSlot, recordSlot, slotAt } from '@/features/adwamuha/logic/sessions';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';

/** What the actions need to know about «أدومها» now (from `AdwamuhaProvider`). */
export interface ActionInputs {
  stored: AdwamuhaStored | null;
  enabled: boolean;
  records: WardRecord[];
  pauses: StoredPause[];
  shown: ReadonlySet<string>;
  /** The break going on today, if any. */
  activeBreak: StoredPause | null;
  today: DayKey;
  weekStart: Weekday;
  times: WardTimes;
  now: () => Date;
  slot: () => WardSlot;
  /** Reads everything again after a change. */
  reload: () => Promise<void>;
}

/** Today or yesterday only (prompt §5). */
function isRecent(date: DayKey, today: DayKey): boolean {
  const d = daysBetween(date, today);
  return d === 0 || d === 1;
}

/**
 * Every action that changes «أدومها»'s data: each saves to user.db, logs the event when it is
 * one, then reads everything again (their meaning: `AdwamuhaValue` in `AdwamuhaProvider`).
 * The actions read the inputs of the latest render, so the object never changes (RF5): a
 * screen that only acts (the reader, a button) does not draw again when the data changes.
 */
export function useActionHandlers(input: ActionInputs) {
  const { adwamuha: repo, content } = useRepositories();
  const { update } = useSettings();
  const { i18n } = useTranslation();
  const latest = useRef({ ...input, lang: i18n.language });
  useLayoutEffect(() => {
    latest.current = { ...input, lang: i18n.language };
  });

  const completeWard = useCallback(
    async (session: Session): Promise<WardRecord | null> => {
      const { stored, enabled, now, times, reload } = latest.current;
      if (!stored || !enabled) return null;
      const at = now();
      const s = recordSlot(session, at, times);
      if (!s) return null;
      const record: WardRecord = {
        date: s.date,
        session,
        completedAt: at.getTime(),
        late: s.late,
        source: 'reader',
        step: stored.state.step,
      };
      await repo.addRecord(record);
      await reload();
      return record;
    },
    [repo],
  );

  const onCategoryFinished = useCallback(
    async (categoryId: number) => {
      const session = SESSION_OF_CATEGORY[categoryId];
      if (session) await completeWard(session);
    },
    [completeWard],
  );

  const markFromMemory = useCallback(
    async (session: Session, date: DayKey) => {
      const { stored, enabled, today, now, reload } = latest.current;
      if (!stored || !enabled || !isRecent(date, today)) return false;
      const added = await repo.addRecord({
        date,
        session,
        completedAt: now().getTime(),
        late: false,
        source: 'manual',
        step: stored.state.step,
      });
      await reload();
      return added;
    },
    [repo],
  );

  const undoFromMemory = useCallback(
    async (session: Session, date: DayKey) => {
      const { today, reload } = latest.current;
      if (!isRecent(date, today)) return false;
      const removed = await repo.removeManualRecord(date, session);
      await reload();
      return removed;
    },
    [repo],
  );

  const advance = useCallback(async () => {
    const { stored, today, slot, reload } = latest.current;
    if (!stored) return;
    const state = advanceState(stored.state, stored.plan, today, slot().session);
    await repo.save({ ...stored, state });
    await repo.logEvent(today, state.maintenance ? 'finish' : 'advance', state.step);
    await reload();
  }, [repo]);

  const postpone = useCallback(async () => {
    const { stored, today, reload } = latest.current;
    if (!stored) return;
    await repo.save({ ...stored, state: postponeState(stored.state, today) });
    await repo.logEvent(today, 'postpone', stored.state.step, { until: addDays(today, 7) });
    await reload();
  }, [repo]);

  const start = useCallback(
    async (startStep: number) => {
      const { now, times, lang, reload } = latest.current;
      const plan = copyDefaultPlan(await content.getDefaultPlan(lang));
      const { date: day, session } = slotAt(now(), times);
      const step = Math.min(Math.max(1, startStep), plan.steps.length);
      await repo.save({
        enabled: true,
        plan,
        state: startPlan(step, day, session),
        startedOn: day,
        offSince: null,
      });
      await repo.logEvent(day, 'start', step);
      await reload();
    },
    [content, repo],
  );

  const stepBack = useCallback(
    async (kind: StepBack) => {
      const { stored, today, slot, reload } = latest.current;
      if (!stored) return;
      const state = stepBackState(stored.state, kind, today, slot().session);
      await repo.save({ ...stored, state });
      await repo.logEvent(today, 'step-back', state.step, {
        from: stored.state.step,
        kind: 'chosen',
      });
      await reload();
    },
    [repo],
  );

  const takeBreak = useCallback(
    async (weeks: 1 | 2) => {
      const { stored, activeBreak, today, reload } = latest.current;
      if (!stored || activeBreak) return;
      const pause = breakFrom(today, weeks);
      await repo.addPause(pause);
      await repo.logEvent(today, 'break', stored.state.step, { weeks, to: pause.to });
      await reload();
    },
    [repo],
  );

  const endBreak = useCallback(async () => {
    const { stored, activeBreak, today, reload } = latest.current;
    if (!activeBreak) return;
    await repo.updatePause(activeBreak.id, endBreakPause(activeBreak, today));
    await repo.logEvent(today, 'break-end', stored?.state.step ?? null);
    await reload();
  }, [repo]);

  const savePlan = useCallback(
    async (plan: UserPlan, passed = 0, unpassed = 0) => {
      const { stored, records, pauses, shown, today, weekStart, slot, reload } = latest.current;
      if (!stored) return;
      const state = passSteps(
        stored.state,
        stored.plan,
        plan,
        passed,
        today,
        slot().session,
        unpassed,
      );
      if (
        state.step !== stored.state.step &&
        keepsCurrent(stored.state, stored.plan, plan, passed - unpassed)
      ) {
        // Same step, new number: its last week's message, once seen, stays seen.
        const week = lastFinishedWeek(stored.state, records, pauses, today, weekStart);
        if (week && shown.has(weekMessageKey(stored.state, week.weekStart))) {
          await repo.markShown(weekMessageKey(state, week.weekStart));
        }
      }
      await repo.save({ ...stored, plan, state });
      await repo.logEvent(
        today,
        'plan-edit',
        state.step,
        state.step !== stored.state.step || unpassed > 0
          ? { passed, ...(unpassed > 0 ? { unpassed } : {}), from: stored.state.step }
          : undefined,
      );
      await reload();
    },
    [repo],
  );

  const dismissSuggestion = useCallback(async () => {
    const { stored, today, reload } = latest.current;
    if (!stored) return;
    await repo.save({ ...stored, state: { ...stored.state, suggestedStepBackOn: today } });
    await reload();
  }, [repo]);

  const markShown = useCallback(
    async (key: string) => {
      const first = await repo.markShown(key);
      await latest.current.reload();
      return first;
    },
    [repo],
  );

  const dismissMessage = useCallback(
    async (message: DueMessage) => {
      if (message.pick) {
        const { moment, ...pick } = message.pick;
        await repo.addPick(moment, pick);
      }
      for (const key of message.keys) await repo.markShown(key);
      await latest.current.reload();
    },
    [repo],
  );

  const setWeekStart = useCallback(
    async (day: Weekday) => {
      const { stored, enabled, records, pauses, today, reload } = latest.current;
      if (stored && enabled) {
        const week = lastFinishedWeek(stored.state, records, pauses, today, day);
        if (week) await repo.markShown(weekMessageKey(stored.state, week.weekStart));
      }
      await update('weekStart', day);
      await reload();
    },
    [repo, update],
  );

  const turnOff = useCallback(async () => {
    const { stored, today, reload } = latest.current;
    if (!stored || !stored.enabled) return;
    await repo.save({ ...stored, enabled: false, offSince: today });
    await repo.logEvent(today, 'off', stored.state.step);
    await reload();
  }, [repo]);

  const resume = useCallback(async () => {
    const { stored, today, reload } = latest.current;
    if (!stored || stored.enabled) return;
    const pause = stored.offSince ? offPause(stored.offSince, today) : null;
    if (pause) await repo.addPause(pause);
    await repo.save({ ...stored, enabled: true, offSince: null });
    await repo.logEvent(today, 'on', stored.state.step);
    await reload();
  }, [repo]);

  return useMemo(
    () => ({
      completeWard,
      onCategoryFinished,
      markFromMemory,
      undoFromMemory,
      advance,
      postpone,
      start,
      stepBack,
      takeBreak,
      endBreak,
      savePlan,
      dismissSuggestion,
      markShown,
      dismissMessage,
      setWeekStart,
      turnOff,
      resume,
    }),
    [
      completeWard,
      onCategoryFinished,
      markFromMemory,
      undoFromMemory,
      advance,
      postpone,
      start,
      stepBack,
      takeBreak,
      endBreak,
      savePlan,
      dismissSuggestion,
      markShown,
      dismissMessage,
      setWeekStart,
      turnOff,
      resume,
    ],
  );
}
