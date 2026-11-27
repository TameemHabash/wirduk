/**
 * Whole plans walked day by day with the app's own rules (milestone 13): the
 * same functions the provider uses each time the app opens, for every day of
 * a path that takes more than a year. The app itself (provider, messages,
 * screens) is lived in shorter scenarios: ../scenarios.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DayKey, PlanState, Session, UserPlan, WardRecord, Weekday } from '@/data/models';

import { WEEK_TARGET } from './commitment';
import { addDays, daysBetween } from './days';
import { weekMessageKey } from './due-messages';
import {
  advance,
  evaluate,
  lastFinishedWeek,
  moveOnStatus,
  postpone,
  shouldSuggestStepBack,
  startPlan,
  stepSkipped,
} from './progress';
import { stepWeeks, weekGrid, weekdayOf } from './weeks';

/** The default plan, as the content build stores it (content-source/adwamuha-plan.json). */
function defaultPlan(): UserPlan {
  const file = JSON.parse(
    readFileSync(
      join(__dirname, '..', '..', '..', '..', 'content-source', 'adwamuha-plan.json'),
      'utf8',
    ),
  ) as {
    opening: { M: number; E: number };
    stages: { stage: number; weeks: number }[];
    steps: { step: number; stage: number; M: number | null; E: number | null }[];
  };
  const weeks = new Map(file.stages.map((s) => [s.stage, s.weeks]));
  return {
    opening: { morning: file.opening.M, evening: file.opening.E },
    steps: file.steps.map((s) => ({
      stage: s.stage,
      weeks: weeks.get(s.stage)!,
      morningDhikrId: s.M,
      eveningDhikrId: s.E,
    })),
  };
}

const PLAN = defaultPlan();
const SATURDAY: Weekday = 6;
/** Saturday 3 January 2026. */
const START = '2026-01-03';

/** A small seeded random (the same days every run). */
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

type Reads = (day: DayKey, index: number) => { morning: boolean; evening: boolean };

interface Walk {
  state: PlanState;
  records: WardRecord[];
  /** Each «جاهز لإضافة الذكر التالي؟»: the day (index), days on the step, good weeks, needed. */
  asked: { day: number; step: number; days: number; good: number; needed: number }[];
  /** The days (index) Home has a new end-of-week word, with its kind. */
  weekWords: { day: number; reached: boolean }[];
  suggested: number;
  days: number;
}

/**
 * Lives the plan from `START`: each day the user reads as `reads` says, and opens the app in
 * the evening; the app then does what the provider does. `answer`: what the user says to
 * «جاهز لإضافة الذكر التالي؟» (add the next one, or one more week).
 */
function walk(
  reads: Reads,
  maxDays: number,
  answer: (step: number) => 'add' | 'keep' = () => 'add',
): Walk {
  let state = startPlan(1, START, 'morning');
  const records: WardRecord[] = [];
  const w: Walk = { state, records, asked: [], weekWords: [], suggested: 0, days: 0 };
  /** The end-of-week words already shown (as Home keeps them). */
  const shownWeeks = new Set<string>();
  let today = START;
  for (let i = 0; i < maxDays; i++, today = addDays(today, 1)) {
    const r = reads(today, i);
    for (const session of ['morning', 'evening'] as Session[]) {
      if (r[session]) {
        records.push({
          date: today,
          session,
          completedAt: 0,
          late: false,
          source: 'reader',
          step: state.step,
        });
      }
    }
    // The numbers always match the dots (a full week: the grid's days are all in the step).
    const weeks = stepWeeks(records, [], state.stepStartedOn, today, SATURDAY, stepSkipped(state));
    const grid = weekGrid(records, [], START, today, SATURDAY);
    if (weeks[0]!.full) {
      const done = (s: Session) => grid.filter((g) => g[s] === 'done').length;
      expect([weeks[0]!.morning, weeks[0]!.evening]).toEqual([done('morning'), done('evening')]);
    }
    // Home's end-of-week word: once per step and week (dueMessages uses the same key).
    const week = lastFinishedWeek(state, records, [], today, SATURDAY);
    if (week && !shownWeeks.has(weekMessageKey(state, week.weekStart))) {
      shownWeeks.add(weekMessageKey(state, week.weekStart));
      w.weekWords.push({ day: i, reached: week.reachedTarget });
    }
    if (shouldSuggestStepBack(state, records, [], today, SATURDAY)) {
      w.suggested++;
      state = { ...state, suggestedStepBackOn: today };
    }
    const out = evaluate(state, PLAN, records, [], today, SATURDAY);
    const status = moveOnStatus(state, PLAN, records, [], today, SATURDAY);
    // The good weeks are exactly the weeks over with 4 and 4.
    expect(status.goodWeeks).toBe(
      status.weeks.filter((x) => x.complete && x.morning >= WEEK_TARGET && x.evening >= WEEK_TARGET)
        .length,
    );
    if (out.event?.kind === 'finished') {
      expect(status.conditionMet).toBe(true);
      state = out.state;
      w.days = i + 1;
      break;
    } else if (out.event?.kind === 'ready') {
      expect(status.conditionMet).toBe(true);
      w.asked.push({
        day: i,
        step: state.step,
        days: daysBetween(state.stepStartedOn, today) + 1,
        good: status.goodWeeks,
        needed: status.weeksNeeded,
      });
      state =
        answer(state.step) === 'add'
          ? advance(state, PLAN, today, 'evening')
          : postpone(state, today);
    } else {
      // Nothing to do: the step is short of good weeks, or the user asked for one more week.
      expect(out.state).toBe(state);
    }
    w.days = i + 1;
  }
  w.state = state;
  return w;
}

const every: Reads = () => ({ morning: true, evening: true });
/** 4 days of 7, on the same weekdays each week (the target exactly). */
const fourOfSeven: Reads = (_d, i) => ({ morning: i % 7 < 4, evening: i % 7 < 4 });
/** 3 days of 7: short of the target every week. */
const threeOfSeven: Reads = (_d, i) => ({ morning: i % 7 < 3, evening: i % 7 < 3 });

describe('whole plans, day by day with the app’s rules', () => {
  it('a steady user: asked on the last day of the last good week, then maintenance', () => {
    const w = walk(every, 900);
    expect(w.asked.map((a) => a.step)).toEqual(PLAN.steps.slice(0, -1).map((_, i) => i + 1));
    for (const a of w.asked) {
      expect(a.good).toBe(a.needed);
      // Asked on a week's last day (a Friday). Each later step begins that evening, so its
      // first week is that one day and does not count: the step is its weeks and a day.
      expect(weekdayOf(addDays(START, a.day))).toBe((SATURDAY + 6) % 7);
      expect(a.days).toBe(a.step === 1 ? a.needed * 7 : a.needed * 7 + 1);
    }
    expect(w.suggested).toBe(0);
    expect(w.state).toMatchObject({ step: PLAN.steps.length, maintenance: true });
    // Exactly the plan's weeks (the day of «أضِف الذكر التالي» is the old step's last day and the
    // new step's first).
    const planDays = PLAN.steps.reduce((n, s) => n + s.weeks * 7, 0);
    expect(w.days).toBe(planDays);
  });

  it('a steady user: an end-of-week word every Friday, the target reached, none in between', () => {
    const w = walk(every, 900);
    const friday = (SATURDAY + 6) % 7;
    expect(w.weekWords.length).toBeGreaterThan(0);
    for (const word of w.weekWords) {
      expect(weekdayOf(addDays(START, word.day))).toBe(friday);
      expect(word.reached).toBe(true);
    }
    // One per full week of the plan (a step's first, one-day week is no fair week: no word).
    expect(w.weekWords.map((x) => x.day)).toEqual(
      [...new Set(w.weekWords.map((x) => x.day))].sort((a, b) => a - b),
    );
    expect(w.weekWords.slice(0, 4).map((x) => addDays(START, x.day))).toEqual([
      '2026-01-09',
      '2026-01-16',
      '2026-01-23',
      '2026-01-30',
    ]);
  });

  it('3 of 7 days: the kind word for each week, the day after it (its last day could still be read)', () => {
    const w = walk(threeOfSeven, 64); // 9 weeks and a day
    expect(w.weekWords).toHaveLength(9);
    for (const word of w.weekWords) {
      expect(word.reached).toBe(false);
      expect(weekdayOf(addDays(START, word.day))).toBe(SATURDAY);
    }
  });

  it('exactly 4 of 7 days (the target): every full week is good, the whole plan done', () => {
    const w = walk(fourOfSeven, 1200);
    expect(w.suggested).toBe(0);
    expect(w.state.maintenance).toBe(true);
    for (const a of w.asked) expect(a.good).toBe(a.needed);
  });

  it('3 of 7 days: never asked, the step waits, the step-back suggestion every 14 days', () => {
    const w = walk(threeOfSeven, 120);
    expect(w.asked).toEqual([]);
    expect(w.state).toMatchObject({ step: 1, extraWeeks: 0 });
    // 120 days: the suggestion is shown, then waits 14 days each time.
    expect(w.suggested).toBeGreaterThanOrEqual(2);
    expect(w.suggested).toBeLessThanOrEqual(Math.ceil(120 / 14));
    expect(WEEK_TARGET).toBe(4);
  });

  it('good weeks with bad weeks between them: they add up, and the step moves on', () => {
    // Every other week read on 4 days, the weeks between on 2 days only.
    const w = walk((_d, i) => {
      const read = Math.floor(i / 7) % 2 === 0 ? i % 7 < 4 : i % 7 < 2;
      return { morning: read, evening: read };
    }, 200);
    expect(w.asked.length).toBeGreaterThan(0);
    // Step 1 (4 weeks) needed 4 good weeks, so 7 calendar weeks: the 7th counts the day after it
    // ends (its Friday is not read, so it is over only then).
    expect(w.asked[0]).toMatchObject({ step: 1, good: 4, needed: 4 });
    expect(w.asked[0]!.days).toBe(7 * 7 + 1);
  });

  it('«أبقِني أسبوعًا آخر» at every question: asked again a week later each time, never moved on', () => {
    const w = walk(every, 120, () => 'keep');
    expect(w.state.step).toBe(1);
    expect(w.asked.length).toBeGreaterThan(1);
    for (let i = 1; i < w.asked.length; i++) {
      expect(w.asked[i]!.day - w.asked[i - 1]!.day).toBe(7);
    }
  });

  it.each([1, 2, 3])('a random user (seed %i): the rules hold every day of 2 years', (seed) => {
    const random = seeded(seed);
    // Some weeks good, some not: about 3 to 6 days a week.
    const w = walk(() => ({ morning: random() < 0.65, evening: random() < 0.6 }), 730);
    // Checked inside walk() each day; and the step only moves forward by the user's answer.
    expect(w.asked.length).toBe(w.state.step - 1);
    for (const a of w.asked) expect(a.good).toBeGreaterThanOrEqual(a.needed);
  });
});
