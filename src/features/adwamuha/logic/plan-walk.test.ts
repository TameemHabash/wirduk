/**
 * Whole plans walked day by day with the app's own rules (milestone 13): the
 * same functions the provider uses each time the app opens, for every day of
 * a path that takes more than a year. The app itself (provider, messages,
 * screens) is lived in shorter scenarios: ../scenarios.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WEEK_TARGET } from './commitment';
import { type DayKey, addDays, daysBetween } from './days';
import {
  advance,
  evaluate,
  moveOnStatus,
  postpone,
  shouldSuggestStepBack,
  startPlan,
  stepSkipped,
} from './progress';
import type { Session } from './sessions';
import type { PlanState, UserPlan, WardRecord } from './types';
import { type Weekday, stepWeeks, weekGrid } from './weeks';

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
  const w: Walk = { state, records, asked: [], suggested: 0, days: 0 };
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
    if (shouldSuggestStepBack(state, records, [], today, SATURDAY)) {
      w.suggested++;
      state = { ...state, suggestedStepBackOn: today };
    }
    const out = evaluate(state, PLAN, records, [], today, SATURDAY);
    const status = moveOnStatus(state, PLAN, records, [], today, SATURDAY);
    // The good weeks are exactly the weeks with 4 and 4, and never more than the weeks so far.
    expect(status.goodWeeks).toBe(
      status.weeks.filter((x) => x.morning >= WEEK_TARGET && x.evening >= WEEK_TARGET).length,
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
  it('a steady user: asked on the day the last good week has 4 and 4, then maintenance', () => {
    const w = walk(every, 900);
    expect(w.asked.map((a) => a.step)).toEqual(PLAN.steps.slice(0, -1).map((_, i) => i + 1));
    for (const a of w.asked) {
      expect(a.good).toBe(a.needed);
      // The last good week is met on its 4th day; the step's first week counts when it can
      // still have 4 and 4 (each step begins in the evening of the question).
      expect(a.days).toBeGreaterThan((a.needed - 1) * 7);
      expect(a.days).toBeLessThanOrEqual(a.needed * 7 + 1);
    }
    expect(w.suggested).toBe(0);
    expect(w.state).toMatchObject({ step: PLAN.steps.length, maintenance: true });
    // Never longer than the plan's weeks.
    const planDays = PLAN.steps.reduce((n, s) => n + s.weeks * 7, 0);
    expect(w.days).toBeLessThanOrEqual(planDays + PLAN.steps.length);
    expect(w.days).toBeGreaterThan(planDays - 7 * PLAN.steps.length);
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
    // Step 1 (4 weeks) needed 4 good weeks, so about 7 calendar weeks.
    expect(w.asked[0]).toMatchObject({ step: 1, good: 4, needed: 4 });
    expect(w.asked[0]!.days).toBeGreaterThan(6 * 7);
    expect(w.asked[0]!.days).toBeLessThanOrEqual(7 * 7);
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
