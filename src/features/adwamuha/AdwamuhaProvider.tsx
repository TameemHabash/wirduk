import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import type { AdwamuhaMessage, AdwamuhaMoment, AdwamuhaText } from '@/data/models';
import type {
  AdwamuhaEvent,
  AdwamuhaStored,
  StoredPause,
} from '@/data/repositories/adwamuha-repository';
import { useSettings } from '@/data/settings/SettingsProvider';

import { type DayKey, addDays, daysBetween } from './logic/days';
import { isPaused } from './logic/commitment';
import {
  type MessageContent,
  type MessagePick,
  messagePool,
  nextPick,
  stableRandom,
  textFor,
} from './logic/messages';
import {
  advance as advanceState,
  breakFrom,
  endBreak as endBreakPause,
  evaluate,
  lastFinishedWeek,
  offPause,
  postpone as postponeState,
  shouldSuggestStepBack,
  startPlan,
  type StepBack,
  stepBack as stepBackState,
} from './logic/progress';
import { keepsCurrent, passSteps } from './logic/plan-edit';
import { type Session, type WardSlot, recordSlot, slotAt } from './logic/sessions';
import type { UserPlan, WardRecord } from './logic/types';
import type { Weekday } from './logic/weeks';
import { copyDefaultPlan, wardDhikrIds } from './logic/ward';
import { devNow, onDevClock } from './dev-clock';

/**
 * Adwamuha (أدومها) for the whole app: the user's plan and where they are,
 * their day records and pauses, and the actions that change them. Everything
 * is stored on the phone (user.db) and worked out from it whenever the app
 * opens (it need not open every day).
 */
export interface AdwamuhaValue {
  /** The stored data has been read. */
  ready: boolean;
  /** The feature is on. */
  enabled: boolean;
  stored: AdwamuhaStored | null;
  records: WardRecord[];
  pauses: StoredPause[];
  now: () => Date;
  /** The ward window open now (its date is Adwamuha's "today"). */
  slot: () => WardSlot;
  /** The first day of the week («بداية الأسبوع» in the settings): every week starts on it. */
  weekStart: Weekday;
  /**
   * Saves a new first day of the week. The weeks are cut again from the stored days at once;
   * the week that just ended on the new days brings no end-of-week message (it is no news).
   */
  setWeekStart: (day: Weekday) => Promise<void>;
  /** The current ward's dhikr ids (the opening first); empty when the feature is off. */
  wardIds: (session: Session) => number[];
  /** «جاهز لإضافة الذكر التالي؟» is due (until answered; never automatic). */
  readyToMoveOn: boolean;
  /**
   * A ward was finished in the reader: records the day if that ward's window is
   * open. Returns the record (an earlier one of the same day stays), or null.
   */
  completeWard: (session: Session) => Promise<WardRecord | null>;
  /** The whole morning / evening category was finished: it counts as the ward (owner). */
  onCategoryFinished: (categoryId: number) => Promise<void>;
  /** «قرأتُها من حفظي» for today or yesterday. False when that ward is already recorded. */
  markFromMemory: (session: Session, date: DayKey) => Promise<boolean>;
  /** Undoes «قرأتُها من حفظي» (today or yesterday; a ward read in the app stays). */
  undoFromMemory: (session: Session, date: DayKey) => Promise<boolean>;
  /** «أضِف الذكر التالي». */
  advance: () => Promise<void>;
  /** «أبقِني أسبوعًا آخر». */
  postpone: () => Promise<void>;
  /** Turns the feature on with a fresh copy of the default plan, at `startStep`. */
  start: (startStep: number) => Promise<void>;
  /** «طرأ عليّ ظرف»: back to half the step, or to the first three (history kept). */
  stepBack: (kind: StepBack) => Promise<void>;
  /** A break of 1 or 2 weeks from today (those days count for nothing). */
  takeBreak: (weeks: 1 | 2) => Promise<void>;
  /** The break going on today, if any. */
  activeBreak: StoredPause | null;
  /** Ends the break today. */
  endBreak: () => Promise<void>;
  /**
   * Saves the user's own plan (after the warning). `passed`: steps marked «قطعتها»
   * (owner, 2026-11-22), already moved right after the steps done: the current step
   * moves on by as many. Otherwise the current step number stays.
   */
  savePlan: (plan: UserPlan, passed?: number) => Promise<void>;
  /** The gentle step-back suggestion is due (low commitment; at most once every 14 days). */
  suggestStepBack: boolean;
  /** The suggestion was shown (accepted or not): not again for 14 days. */
  dismissSuggestion: () => Promise<void>;
  /**
   * The one-time messages due now on Home, the most important first (the end of the path, the
   * welcome, a new step, a step back or break, the end of a week, a new stage's tip). Show one.
   */
  messages: DueMessage[];
  /**
   * The message for an occasion of a moment shown in place (a day's ward done): the owner's own
   * message or one from the approved library. None comes again until every message of the
   * moment has been shown (owner, 2026-11-21); the occasion keeps its message (saved in
   * user.db). Null until the texts are read.
   */
  chooseMessage: (moment: AdwamuhaMoment, occasion: string) => Promise<MessageContent | null>;
  /**
   * A text chosen by a state (content database): a tip ('stage:N',
   * 'maintenance'), the welcome ('first:evening'), or with '' the owner's own
   * message for a moment. Null when none or not read yet.
   */
  textFor: (moment: AdwamuhaText['moment'], state: string) => string | null;
  dismissMessage: (message: DueMessage) => Promise<void>;
  /** Keys of messages already shown (e.g. 'intro'). */
  shown: ReadonlySet<string>;
  /** Marks a message as shown; false if it already was. */
  markShown: (key: string) => Promise<boolean>;
  /** Turns the feature off: everything is kept (the days off count like a break). */
  turnOff: () => Promise<void>;
  /** Turns it on again where the user stopped. */
  resume: () => Promise<void>;
  reload: () => Promise<void>;
}

const AdwamuhaContext = createContext<AdwamuhaValue | null>(null);

const SESSION_OF_CATEGORY: Record<number, Session> = {
  [APP_CONFIG.content.morningCategoryId]: 'morning',
  [APP_CONFIG.content.eveningCategoryId]: 'evening',
};

/** The real time (moved by the dev clock in a dev build only). */
const systemNow = devNow;

interface Loaded {
  stored: AdwamuhaStored | null;
  records: WardRecord[];
  pauses: StoredPause[];
  events: AdwamuhaEvent[];
  /** Keys of the messages already shown. */
  shown: ReadonlySet<string>;
  /** The message each occasion of a moment got, the latest first. */
  picks: (MessagePick & { moment: string })[];
}

const EMPTY: Loaded = {
  stored: null,
  records: [],
  pauses: [],
  events: [],
  shown: new Set(),
  picks: [],
};

/** A message due now on Home (each is shown once). */
export interface DueMessage {
  /** Marked as shown when dismissed (all of them: e.g. several new steps the same day). */
  keys: string[];
  kind: 'finished' | 'welcome' | 'newStep' | 'afterStepBack' | 'week' | 'tip';
  content: MessageContent;
  /** A message of a moment's pool: saved as its pick when dismissed (no repeats). */
  pick?: MessagePick & { moment: AdwamuhaMoment };
}

/** The end-of-week message's key: once per step and week. */
const weekMessageKey = (state: { step: number; stepStartedOn: DayKey }, weekStart: DayKey) =>
  `week:${state.step}:${state.stepStartedOn}:${weekStart}`;

/** Event kinds behind a message shown only soon after (today or yesterday). */
const RECENT_EVENT_MOMENTS: { kinds: string[]; moment: 'newStep' | 'afterStepBack' }[] = [
  { kinds: ['advance'], moment: 'newStep' },
  { kinds: ['step-back', 'break'], moment: 'afterStepBack' },
];

export function AdwamuhaProvider({
  children,
  now = systemNow,
}: {
  children: ReactNode;
  /** The clock (tests pass a fixed one). */
  now?: () => Date;
}) {
  const { adwamuha: repo, content } = useRepositories();
  const { settings, update } = useSettings();
  const { i18n } = useTranslation();
  const times = settings.wardTimes;

  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Loaded>(EMPTY);
  const { stored, records, pauses, events, shown, picks } = data;

  const readAll = useCallback(async (): Promise<Loaded> => {
    const [s, r, p, e, k, m] = await Promise.all([
      repo.load(),
      repo.listRecords(),
      repo.listPauses(),
      repo.listEvents(),
      repo.listShown(),
      repo.listAllPicks(),
    ]);
    return { stored: s, records: r, pauses: p, events: e, shown: new Set(k), picks: m };
  }, [repo]);
  const reload = useCallback(async () => {
    setData(await readAll());
    setReady(true);
  }, [readAll]);

  useEffect(() => {
    let cancelled = false;
    readAll()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setReady(true);
      })
      .catch(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [readAll]);

  // The owner's messages and tips, and the approved library (content database), read once per
  // language, both before any message is chosen (a pool without the library would be short).
  const [texts, setTexts] = useState<AdwamuhaText[]>([]);
  const [library, setLibrary] = useState<AdwamuhaMessage[]>([]);
  const [textsRead, setTextsRead] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      content.listAdwamuhaTexts(i18n.language).catch(() => []),
      content.listAdwamuhaMessages(i18n.language).catch(() => []),
    ])
      .then(([ownTexts, messages]) => {
        if (cancelled) return;
        setTexts(ownTexts);
        setLibrary(messages);
        setTextsRead(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);
  const chooseMessage = useCallback(
    async (moment: AdwamuhaMoment, occasion: string): Promise<MessageContent | null> => {
      if (!textsRead) return null;
      const pool = messagePool(moment, texts, library);
      const picks = await repo.listPicks(moment);
      const earlier = picks.find((p) => p.occasion === occasion);
      if (earlier) {
        const same = pool.find((m) => m.key === earlier.messageId);
        if (same) return same.content;
        // Its message left the content: the occasion gets a new one.
        await repo.removePick(moment, occasion);
      }
      const next = nextPick(
        pool,
        picks.filter((p) => p.occasion !== occasion),
        Math.random,
      );
      if (!next) return null;
      const saved = await repo.addPick(moment, {
        occasion,
        messageId: next.message.key,
        round: next.round,
      });
      return (pool.find((m) => m.key === saved) ?? next.message).content;
    },
    [library, repo, texts, textsRead],
  );
  const textForState = useCallback(
    (moment: AdwamuhaText['moment'], state: string) => textFor(texts, moment, state),
    [texts],
  );

  // Back on screen (maybe the next day): read again, so everything is worked out for now.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload().catch(() => undefined);
    });
    return () => sub.remove();
  }, [reload]);
  // The same when the dev clock moves (dev builds only).
  useEffect(() => onDevClock(() => void reload().catch(() => undefined)), [reload]);

  const enabled = stored?.enabled ?? false;
  const slot = useCallback(() => slotAt(now(), times), [now, times]);
  const today = slot().date;
  // The only source of the week's first day (owner, 2026-10-30: not the phone's region). A
  // change applies at once: everything is worked out again from the stored days.
  const weekStart = settings.weekStart;

  // What the plan says now: the end of the path is saved; "ready" is only shown. (No automatic
  // extension since 2026-11-14: a week short of the target just does not count.)
  const outcome = useMemo(
    () =>
      stored && enabled
        ? evaluate(stored.state, stored.plan, records, pauses, today, weekStart)
        : null,
    [enabled, pauses, records, stored, today, weekStart],
  );
  const saving = useRef(false);
  useEffect(() => {
    if (!stored || outcome?.event?.kind !== 'finished' || saving.current) return;
    saving.current = true;
    repo
      .save({ ...stored, state: outcome.state })
      .then(() => repo.logEvent(today, 'finish', stored.state.step))
      .then(reload)
      .catch(() => undefined)
      .finally(() => {
        saving.current = false;
      });
  }, [outcome, reload, repo, stored, today]);
  const readyToMoveOn = outcome?.event?.kind === 'ready';

  const wardIds = useCallback(
    (session: Session) =>
      stored && enabled ? wardDhikrIds(stored.plan, stored.state.step, session) : [],
    [enabled, stored],
  );

  const completeWard = useCallback(
    async (session: Session): Promise<WardRecord | null> => {
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
    [enabled, now, reload, repo, stored, times],
  );

  const onCategoryFinished = useCallback(
    async (categoryId: number) => {
      const session = SESSION_OF_CATEGORY[categoryId];
      if (session) await completeWard(session);
    },
    [completeWard],
  );

  /** Today or yesterday only (prompt §5). */
  const isRecent = useCallback(
    (date: DayKey) => {
      const d = daysBetween(date, today);
      return d === 0 || d === 1;
    },
    [today],
  );

  const markFromMemory = useCallback(
    async (session: Session, date: DayKey) => {
      if (!stored || !enabled || !isRecent(date)) return false;
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
    [enabled, isRecent, now, reload, repo, stored],
  );

  const undoFromMemory = useCallback(
    async (session: Session, date: DayKey) => {
      if (!isRecent(date)) return false;
      const removed = await repo.removeManualRecord(date, session);
      await reload();
      return removed;
    },
    [isRecent, reload, repo],
  );

  const advance = useCallback(async () => {
    if (!stored) return;
    const state = advanceState(stored.state, stored.plan, today, slot().session);
    await repo.save({ ...stored, state });
    await repo.logEvent(today, state.maintenance ? 'finish' : 'advance', state.step);
    await reload();
  }, [reload, repo, slot, stored, today]);

  const postpone = useCallback(async () => {
    if (!stored) return;
    await repo.save({ ...stored, state: postponeState(stored.state, today) });
    await repo.logEvent(today, 'postpone', stored.state.step, { until: addDays(today, 7) });
    await reload();
  }, [reload, repo, stored, today]);

  const start = useCallback(
    async (startStep: number) => {
      const plan = copyDefaultPlan(await content.getDefaultPlan(i18n.language));
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
    [content, i18n.language, now, reload, repo, times],
  );

  const stepBack = useCallback(
    async (kind: StepBack) => {
      if (!stored) return;
      const state = stepBackState(stored.state, kind, today, slot().session);
      await repo.save({ ...stored, state });
      await repo.logEvent(today, 'step-back', state.step, { from: stored.state.step, kind });
      await reload();
    },
    [reload, repo, slot, stored, today],
  );

  const activeBreak = useMemo(
    () => pauses.find((p) => p.kind === 'break' && isPaused(today, [p])) ?? null,
    [pauses, today],
  );

  const takeBreak = useCallback(
    async (weeks: 1 | 2) => {
      if (!stored || activeBreak) return;
      const pause = breakFrom(today, weeks);
      await repo.addPause(pause);
      await repo.logEvent(today, 'break', stored.state.step, { weeks, to: pause.to });
      await reload();
    },
    [activeBreak, reload, repo, stored, today],
  );

  const endBreak = useCallback(async () => {
    if (!activeBreak) return;
    await repo.updatePause(activeBreak.id, endBreakPause(activeBreak, today));
    await repo.logEvent(today, 'break-end', stored?.state.step ?? null);
    await reload();
  }, [activeBreak, reload, repo, stored, today]);

  const savePlan = useCallback(
    async (plan: UserPlan, passed = 0) => {
      if (!stored) return;
      const state = passSteps(stored.state, stored.plan, plan, passed, today, slot().session);
      if (
        state.step !== stored.state.step &&
        keepsCurrent(stored.state, stored.plan, plan, passed)
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
        state.step !== stored.state.step ? { passed, from: stored.state.step } : undefined,
      );
      await reload();
    },
    [pauses, records, reload, repo, shown, slot, stored, today, weekStart],
  );

  const suggestStepBack = useMemo(
    () =>
      Boolean(stored && enabled && !activeBreak) &&
      shouldSuggestStepBack(stored!.state, records, pauses, today, weekStart),
    [activeBreak, enabled, pauses, records, stored, today, weekStart],
  );

  const dismissSuggestion = useCallback(async () => {
    if (!stored) return;
    await repo.save({ ...stored, state: { ...stored.state, suggestedStepBackOn: today } });
    await reload();
  }, [reload, repo, stored, today]);

  // Home's one-time messages (owner, 2026-11-21: all of them stay on Home).
  const messages = useMemo<DueMessage[]>(() => {
    if (!stored || !enabled) return [];
    const out: DueMessage[] = [];
    const own = (keys: string[], kind: DueMessage['kind'], text: string | null) => {
      if (keys.length > 0 && text !== null) {
        out.push({ keys, kind, content: { kind: 'owner', text } });
      }
    };
    /**
     * A message of a moment's pool for an occasion: none again until every message of the
     * moment was shown (as after a ward, owner 2026-11-21). The same on screen until dismissed;
     * saved as the moment's pick then.
     */
    const fromPool = (keys: string[], kind: DueMessage['kind'], moment: AdwamuhaMoment) => {
      const occasion = keys[0];
      if (!occasion || !textsRead) return;
      const pool = messagePool(moment, texts, library);
      const earlier = picks.filter((p) => p.moment === moment && p.occasion !== occasion);
      const next = nextPick(pool, earlier, () => stableRandom(`${moment}:${occasion}`));
      if (!next) return;
      out.push({
        keys,
        kind,
        content: next.message.content,
        pick: { moment, occasion, messageId: next.message.key, round: next.round },
      });
    };
    /** Unshown events of these kinds (`recent`: today or yesterday only). */
    const unshown = (kinds: string[], recent = false) =>
      events
        .filter(
          (e) =>
            kinds.includes(e.kind) &&
            !shown.has(`event:${e.id}`) &&
            (!recent || daysBetween(e.day, today) <= 1),
        )
        .map((e) => `event:${e.id}`);

    fromPool(unshown(['finish']), 'finished', 'finished');
    // The welcome right after turning it on: for the starting step and the ward open then.
    const start = events.find(
      (e) => e.kind === 'start' && !shown.has(`event:${e.id}`) && daysBetween(e.day, today) <= 1,
    );
    if (start) {
      const state = `${(start.step ?? 1) > 1 ? 'later' : 'first'}:${stored.state.planStartedIn ?? 'morning'}`;
      own([`event:${start.id}`], 'welcome', textFor(texts, 'welcome', state));
    }
    // A new step, a step back or a break: a word right after (not days later).
    for (const { kinds, moment } of RECENT_EVENT_MOMENTS) {
      fromPool(unshown(kinds, true), moment, moment);
    }
    // No word for an extension any more (2026-11-14: the step is never extended; an old
    // 'extend' event stays in the history only).
    const week = lastFinishedWeek(stored.state, records, pauses, today, weekStart);
    const weekKey = week ? weekMessageKey(stored.state, week.weekStart) : '';
    if (week && !shown.has(weekKey)) {
      fromPool([weekKey], 'week', week.reachedTarget ? 'weekReached' : 'weekBelow');
    }
    // A new stage's tip (stored as 'stage:N'), or the maintenance tip after the last step.
    const stage = stored.plan.steps[stored.state.step - 1]?.stage;
    const tipState = stored.state.maintenance ? 'maintenance' : `stage:${stage}`;
    const tipKey = stored.state.maintenance ? 'tip:maintenance' : `tip:${stage}`;
    if (!shown.has(tipKey)) own([tipKey], 'tip', textFor(texts, 'tip', tipState));
    return out;
  }, [
    enabled,
    events,
    library,
    pauses,
    picks,
    records,
    shown,
    stored,
    texts,
    textsRead,
    today,
    weekStart,
  ]);

  const markShown = useCallback(
    async (key: string) => {
      const first = await repo.markShown(key);
      await reload();
      return first;
    },
    [reload, repo],
  );

  const dismissMessage = useCallback(
    async (message: DueMessage) => {
      if (message.pick) {
        const { moment, ...pick } = message.pick;
        await repo.addPick(moment, pick);
      }
      for (const key of message.keys) await repo.markShown(key);
      await reload();
    },
    [reload, repo],
  );

  const setWeekStart = useCallback(
    async (day: Weekday) => {
      if (stored && enabled) {
        const week = lastFinishedWeek(stored.state, records, pauses, today, day);
        if (week) await repo.markShown(weekMessageKey(stored.state, week.weekStart));
      }
      await update('weekStart', day);
      await reload();
    },
    [enabled, pauses, records, reload, repo, stored, today, update],
  );

  const turnOff = useCallback(async () => {
    if (!stored || !stored.enabled) return;
    await repo.save({ ...stored, enabled: false, offSince: today });
    await repo.logEvent(today, 'off', stored.state.step);
    await reload();
  }, [reload, repo, stored, today]);

  const resume = useCallback(async () => {
    if (!stored || stored.enabled) return;
    const pause = stored.offSince ? offPause(stored.offSince, today) : null;
    if (pause) await repo.addPause(pause);
    await repo.save({ ...stored, enabled: true, offSince: null });
    await repo.logEvent(today, 'on', stored.state.step);
    await reload();
  }, [reload, repo, stored, today]);

  const value = useMemo<AdwamuhaValue>(
    () => ({
      ready,
      enabled,
      stored,
      records,
      pauses,
      now,
      slot,
      weekStart,
      setWeekStart,
      wardIds,
      readyToMoveOn,
      completeWard,
      onCategoryFinished,
      markFromMemory,
      undoFromMemory,
      advance,
      postpone,
      stepBack,
      takeBreak,
      activeBreak,
      endBreak,
      savePlan,
      suggestStepBack,
      dismissSuggestion,
      messages,
      chooseMessage,
      textFor: textForState,
      dismissMessage,
      shown,
      markShown,
      start,
      turnOff,
      resume,
      reload,
    }),
    [
      ready,
      enabled,
      stored,
      records,
      pauses,
      now,
      slot,
      weekStart,
      setWeekStart,
      wardIds,
      readyToMoveOn,
      completeWard,
      onCategoryFinished,
      markFromMemory,
      undoFromMemory,
      advance,
      postpone,
      stepBack,
      takeBreak,
      activeBreak,
      endBreak,
      savePlan,
      suggestStepBack,
      dismissSuggestion,
      messages,
      chooseMessage,
      textForState,
      dismissMessage,
      shown,
      markShown,
      start,
      turnOff,
      resume,
      reload,
    ],
  );

  return <AdwamuhaContext.Provider value={value}>{children}</AdwamuhaContext.Provider>;
}

export function useAdwamuha(): AdwamuhaValue {
  const value = useContext(AdwamuhaContext);
  if (!value) throw new Error('useAdwamuha must be used inside <AdwamuhaProvider>');
  return value;
}

/** For shared screens (the reader): null where Adwamuha is not provided. */
export function useAdwamuhaOptional(): AdwamuhaValue | null {
  return useContext(AdwamuhaContext);
}
