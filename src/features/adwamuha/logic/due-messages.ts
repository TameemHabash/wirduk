import type {
  AdwamuhaMessage,
  AdwamuhaMoment,
  AdwamuhaText,
  DayKey,
  MessagePick,
  WardRecord,
  Weekday,
} from '@/data/models';
import type {
  AdwamuhaEvent,
  AdwamuhaStored,
  StoredPause,
} from '@/data/repositories/adwamuha-repository';

import { daysBetween } from './days';
import { type MessageContent, messagePool, nextPick, stableRandom, textFor } from './messages';
import { lastFinishedWeek } from './progress';

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
export const weekMessageKey = (state: { step: number; stepStartedOn: DayKey }, weekStart: DayKey) =>
  `week:${state.step}:${state.stepStartedOn}:${weekStart}`;

/** Event kinds behind a message shown only soon after (today or yesterday). */
const RECENT_EVENT_MOMENTS: { kinds: string[]; moment: 'newStep' | 'afterStepBack' }[] = [
  { kinds: ['advance'], moment: 'newStep' },
  { kinds: ['step-back', 'break'], moment: 'afterStepBack' },
];

export interface DueMessagesInput {
  /** The stored plan (the feature is on). */
  stored: AdwamuhaStored;
  events: AdwamuhaEvent[];
  /** Keys of the messages already shown. */
  shown: ReadonlySet<string>;
  /** The message each occasion of a moment got, the latest first. */
  picks: (MessagePick & { moment: string })[];
  records: WardRecord[];
  pauses: StoredPause[];
  today: DayKey;
  weekStart: Weekday;
  /** The owner's messages and tips, and the approved library (content database). */
  texts: AdwamuhaText[];
  library: AdwamuhaMessage[];
  /** Both were read: no message of a pool before that (a pool without the library is short). */
  textsRead: boolean;
}

/**
 * Home's one-time messages due now, the most important first (owner, 2026-11-21: all of them
 * stay on Home): the end of the path, the welcome, a new step, a step back or break, the end of
 * a week, a new stage's tip. A message of a moment's pool is the same on screen until dismissed,
 * and none comes again until every message of the moment was shown.
 */
export function dueMessages(input: DueMessagesInput): DueMessage[] {
  const { stored, events, shown, picks, records, pauses, today, weekStart } = input;
  const { texts, library, textsRead } = input;
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
}
