/**
 * «أدومها»'s data: the default plan (content database) and the user's own plan, state and
 * records (user.db), with the defaults the settings need. Types and constants only, so any layer
 * (and the content scripts, run by Node) can use them.
 */

/** A stage of Adwamuha's default plan (owner's names, e.g. «الأساس»). */
export interface PlanStage {
  stage: number;
  title: string;
  /** Minimum weeks per step in this stage. */
  weeks: number;
}

/**
 * One step of Adwamuha's default plan: the dhikr it adds to the morning ward,
 * the evening ward, or both (null: not for that session). Step 0 is the
 * opening, first in every ward (stage null).
 */
export interface PlanStep {
  step: number;
  stage: number | null;
  morningDhikrId: number | null;
  eveningDhikrId: number | null;
}

export interface DefaultPlan {
  stages: PlanStage[];
  steps: PlanStep[];
}

/** The owner's moments for Adwamuha's messages (same list as scripts/adwamuha/messages.ts). */
export const ADWAMUHA_MOMENTS = [
  'wardDone',
  'bothDone',
  'weekReached',
  'weekBelow',
  'extended',
  'newStep',
  'afterStepBack',
  'finished',
] as const;

export type AdwamuhaMoment = (typeof ADWAMUHA_MOMENTS)[number];

/**
 * One approved message of Adwamuha's library: a verse (from the Tanzil text)
 * or a hadith / athar (from Dorar), with the moments it may be shown at.
 */
export interface AdwamuhaMessage {
  id: string;
  kind: 'verse' | 'hadith' | 'athar';
  moments: AdwamuhaMoment[];
  /** Verses: one entry per verse. Hadiths: one entry, Dorar's text. */
  texts: string[];
  verse: { sura: number; suraName: string; from: number; to: number } | null;
  hadith: {
    rawi: string;
    muhaddith: string;
    book: string;
    number: string;
    grading: string;
    dorarUrl: string;
  } | null;
}

/**
 * One of Adwamuha's own messages or tips (the owner's words, the owner's design's, or
 * Claude's drafts joined with them), shown in one state: '' for a message of its moment,
 * 'stage:N' or 'maintenance' for a tip, '<first|later>:<morning|evening>' for the welcome.
 */
export interface AdwamuhaText {
  id: string;
  moment: AdwamuhaMoment | 'welcome' | 'tip';
  state: string;
  text: string;
}

/** A local calendar date, "YYYY-MM-DD" (`features/adwamuha/logic/days.ts`). */
export type DayKey = string;

export type Session = 'morning' | 'evening';

export const SESSIONS: readonly Session[] = ['morning', 'evening'];

/** "HH:MM", 24 hours, as the settings store them. */
export interface WardTimes {
  morningStart: string;
  morningOnTimeEnd: string;
  eveningStart: string;
  eveningOnTimeEnd: string;
}

export const DEFAULT_WARD_TIMES: WardTimes = {
  morningStart: '04:00',
  morningOnTimeEnd: '12:00',
  eveningStart: '16:00',
  eveningOnTimeEnd: '00:00',
};

/** A day of the week: 0 = Sunday … 6 = Saturday (as `Date.getDay()`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Saturday, until the user picks another day (owner, 2026-10-30). */
export const DEFAULT_WEEK_START: Weekday = 6;

/**
 * «ترتيب الورد» (owner, 2026-10-29): 'plan' (the default, recommended) reads
 * the ward in plan order, the new dhikr last; 'category' reads the same adhkar
 * in their order in the morning or evening category (the book's order). Only
 * the order changes; the opening is always first.
 */
export type WardOrder = 'plan' | 'category';

export const WARD_ORDERS: readonly WardOrder[] = ['plan', 'category'];

/** One step of the user's plan: the one dhikr it adds to each ward (null: not that session). */
export interface UserPlanStep {
  stage: number;
  /** Minimum weeks on this step (1–8). */
  weeks: number;
  morningDhikrId: number | null;
  eveningDhikrId: number | null;
}

/** The user's own plan. Step n is `steps[n - 1]`. */
export interface UserPlan {
  /** The opening: first in every ward, not a step of its own. */
  opening: { morning: number; evening: number };
  steps: UserPlanStep[];
}

/** A day's ward, done. One per date and session. */
export interface WardRecord {
  date: DayKey;
  session: Session;
  /** When it was done (ms since 1970); the date was worked out from local time then. */
  completedAt: number;
  late: boolean;
  /** Read in the app, or «قرأتُها من حفظي». */
  source: 'reader' | 'manual';
  /** The step the user was on. */
  step: number;
}

/**
 * Days that count for nothing: a break the user chose, or days with the
 * feature off (owner, 2026-10-23). Both days included.
 */
export interface Pause {
  from: DayKey;
  to: DayKey;
  kind: 'break' | 'off';
}

export interface PlanState {
  /** Current step, 1-based. */
  step: number;
  stepStartedOn: DayKey;
  /**
   * Weeks the old rule added when the move-on condition was not met. Kept in
   * stored data, always 0 for new steps, and no longer read: since 2026-11-14
   * a week short of the target just does not count (`moveOnStatus`).
   */
  extraWeeks: number;
  /** After «أبقِني أسبوعًا آخر»: do not ask again before this day. */
  askAgainOn: DayKey | null;
  /** This step was reached before a step back: its minimum is 1 week. */
  reclimb: boolean;
  /** The highest step ever reached (steps before the starting step count as reached). */
  highestStep: number;
  /** After the last step: tracking only, no more steps. */
  maintenance: boolean;
  /** The low-commitment suggestion was last shown on this day. */
  suggestedStepBackOn: DayKey | null;
  /**
   * The ward window open when this step began. 'evening': that day's morning
   * was already over, so it counts for nothing in this step. Missing (older
   * data): 'morning'.
   */
  stepStartedIn?: Session;
  /** The same for the day the plan began (the stored `startedOn`). */
  planStartedIn?: Session;
  /**
   * Weeks on this step when it is the one the user started at, past the first:
   * 2 (owner, 2026-10-29), or its plan weeks if fewer. Missing: the plan's.
   */
  startWeeks?: number;
}

/** The message an occasion (a day's ward, an event, a week) got, kept in user.db. */
export interface MessagePick {
  occasion: string;
  /** The message's `PoolMessage.key`. */
  messageId: string;
  /** Messages go in rounds: a round ends once each message of the pool came once. */
  round: number;
}
