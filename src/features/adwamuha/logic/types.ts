/**
 * Adwamuha's data, as the logic sees it. Stored in user.db (the user's own
 * copy of the plan, the state, the records, the breaks); the default plan
 * comes from the content database only to make that copy (owner, 2026-10-23).
 */
import type { DayKey } from './days';
import type { Session } from './sessions';

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
  /** Weeks added because the move-on condition was not met. */
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
