import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import { useRepositories } from '@/data/DataProvider';
import type {
  AdwamuhaMoment,
  AdwamuhaText,
  DayKey,
  Session,
  UserPlan,
  WardRecord,
  Weekday,
} from '@/data/models';
import type { AdwamuhaStored, StoredPause } from '@/data/repositories/adwamuha-repository';
import { useSettings } from '@/data/settings/SettingsProvider';
import { isPaused } from '@/features/adwamuha/logic/commitment';
import { type DueMessage, dueMessages } from '@/features/adwamuha/logic/due-messages';
import type { MessageContent } from '@/features/adwamuha/logic/messages';
import { evaluate, shouldSuggestStepBack, type StepBack } from '@/features/adwamuha/logic/progress';
import { type WardSlot, slotAt } from '@/features/adwamuha/logic/sessions';
import { wardDhikrIds } from '@/features/adwamuha/logic/ward';

import { devNow } from './dev-clock';
import { useActionHandlers } from './useActionHandlers';
import { useAdwamuhaData } from './useAdwamuhaData';
import { useMessageLibrary } from './useMessageLibrary';

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
  /**
   * «جاهز لإضافة الذكر التالي؟» is due (until answered; never automatic). Not during a break:
   * it waits for the break's end (owner, 2026-11-27).
   */
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
  /**
   * «طرأ عليّ ظرف»: back to a step the user picked with − and +
   * (owner, 2026-11-22). History kept.
   */
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
   * moves on by as many. `unpassed`: steps done put back (owner, 2026-11-26), already
   * moved right after the current step: its number goes down by as many. Otherwise the
   * current step number stays.
   */
  savePlan: (plan: UserPlan, passed?: number, unpassed?: number) => Promise<void>;
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

type ActionName =
  | 'completeWard'
  | 'onCategoryFinished'
  | 'markFromMemory'
  | 'undoFromMemory'
  | 'advance'
  | 'postpone'
  | 'start'
  | 'stepBack'
  | 'takeBreak'
  | 'endBreak'
  | 'savePlan'
  | 'dismissSuggestion'
  | 'markShown'
  | 'dismissMessage'
  | 'setWeekStart'
  | 'turnOff'
  | 'resume'
  | 'reload'
  | 'now';

/** The actions and the clock: one object that never changes (RF5). */
export interface AdwamuhaActions extends Pick<AdwamuhaValue, ActionName> {
  /** Everything as it is now: for event handlers and effects (not while drawing). */
  current: () => AdwamuhaValue;
}

/** Whether the stored data was read, and whether the feature is on. */
export interface AdwamuhaStatus {
  ready: boolean;
  enabled: boolean;
}

/**
 * Three contexts, so a screen draws again only for what it uses: everything (changes with
 * the data), the actions (never change), the status (changes once at start and when the
 * feature is turned on or off).
 */
const AdwamuhaContext = createContext<AdwamuhaValue | null>(null);
const ActionsContext = createContext<AdwamuhaActions | null>(null);
const StatusContext = createContext<AdwamuhaStatus | null>(null);

/** The real time (moved by the dev clock in a dev build only). */
const systemNow = devNow;

export function AdwamuhaProvider({
  children,
  now = systemNow,
}: {
  children: ReactNode;
  /** The clock (tests pass a fixed one). */
  now?: () => Date;
}) {
  const { adwamuha: repo } = useRepositories();
  const { settings } = useSettings();
  const times = settings.wardTimes;
  const { ready, data, reload } = useAdwamuhaData();
  const { stored, records, pauses, events, shown, picks } = data;
  const { texts, library, textsRead, chooseMessage, textFor } = useMessageLibrary();

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

  const wardIds = useCallback(
    (session: Session) =>
      stored && enabled ? wardDhikrIds(stored.plan, stored.state.step, session) : [],
    [enabled, stored],
  );

  const activeBreak = useMemo(
    () => pauses.find((p) => p.kind === 'break' && isPaused(today, [p])) ?? null,
    [pauses, today],
  );

  // Hidden while a break goes on; it comes back when the break ends (owner, 2026-11-27).
  const readyToMoveOn = outcome?.event?.kind === 'ready' && !activeBreak;

  const suggestStepBack = useMemo(
    () =>
      Boolean(stored && enabled && !activeBreak) &&
      shouldSuggestStepBack(stored!.state, records, pauses, today, weekStart),
    [activeBreak, enabled, pauses, records, stored, today, weekStart],
  );

  const messages = useMemo<DueMessage[]>(
    () =>
      stored && enabled
        ? dueMessages({
            stored,
            events,
            shown,
            picks,
            records,
            pauses,
            today,
            weekStart,
            texts,
            library,
            textsRead,
          })
        : [],
    [
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
    ],
  );

  const actions = useActionHandlers({
    stored,
    enabled,
    records,
    pauses,
    shown,
    activeBreak,
    today,
    weekStart,
    times,
    now,
    slot,
    reload,
  });

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
      wardIds,
      readyToMoveOn,
      activeBreak,
      suggestStepBack,
      messages,
      chooseMessage,
      textFor,
      shown,
      reload,
      ...actions,
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
      wardIds,
      readyToMoveOn,
      activeBreak,
      suggestStepBack,
      messages,
      chooseMessage,
      textFor,
      shown,
      reload,
      actions,
    ],
  );

  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  const current = useCallback(() => latest.current, []);
  const actionsValue = useMemo<AdwamuhaActions>(
    () => ({ ...actions, reload, now, current }),
    [actions, reload, now, current],
  );
  const status = useMemo<AdwamuhaStatus>(() => ({ ready, enabled }), [ready, enabled]);

  return (
    <ActionsContext.Provider value={actionsValue}>
      <StatusContext.Provider value={status}>
        <AdwamuhaContext.Provider value={value}>{children}</AdwamuhaContext.Provider>
      </StatusContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Everything (draws again whenever «أدومها»'s data changes). */
export function useAdwamuha(): AdwamuhaValue {
  const value = useContext(AdwamuhaContext);
  if (!value) throw new Error('useAdwamuha must be used inside <AdwamuhaProvider>');
  return value;
}

/** For shared screens: null where Adwamuha is not provided. */
export function useAdwamuhaOptional(): AdwamuhaValue | null {
  return useContext(AdwamuhaContext);
}

/** Only the actions and the clock: never draws again. Null where Adwamuha is not provided. */
export function useAdwamuhaActionsOptional(): AdwamuhaActions | null {
  return useContext(ActionsContext);
}

/** Only whether the data was read and the feature is on. Null where it is not provided. */
export function useAdwamuhaStatusOptional(): AdwamuhaStatus | null {
  return useContext(StatusContext);
}

/** Whether «أدومها» is on (Home, Settings): draws again only when that changes. */
export function useAdwamuhaEnabled(): boolean {
  const status = useContext(StatusContext);
  if (!status) throw new Error('useAdwamuhaEnabled must be used inside <AdwamuhaProvider>');
  return status.enabled;
}
