import { daily, day, planOf, stateAt } from '@/test-utils/adwamuha';

import {
  LATER_START_WEEKS,
  advance,
  breakFrom,
  endBreak,
  evaluate,
  moveOnStatus,
  offPause,
  planSkipped,
  postpone,
  shouldSuggestStepBack,
  startPlan,
  stepBack,
  stepBackTarget,
  stepSkipped,
  weeksNeeded,
} from './progress';
import { type Weekday, weekdayOf } from './weeks';

// Step 1: 4 weeks, step 2: 3 weeks, step 3: 1 week, step 4: 2 weeks.
const plan = planOf(4, 3, 1, 2);
/** Weeks that start on day 0 (a Thursday), so the step's weeks are days 0–6, 7–13, … */
const W = weekdayOf(day(0));
/** Weeks that start on day 3: a step begun on day 0 begins inside its first week. */
const W3 = ((W + 3) % 7) as Weekday;

describe('starting', () => {
  it('at step 1: its full weeks', () => {
    const s = startPlan(1, day(0));
    expect(s).toMatchObject({ step: 1, stepStartedOn: day(0), highestStep: 1, reclimb: false });
    expect(s.startWeeks).toBeUndefined();
    expect(weeksNeeded(s, plan)).toBe(4);
  });

  it('at a later step: 2 weeks (the user keeps it already); earlier steps count as reached', () => {
    const s = startPlan(2, day(0)); // step 2 is 3 weeks in the plan
    expect(s).toMatchObject({ step: 2, highestStep: 2, startWeeks: LATER_START_WEEKS });
    expect(weeksNeeded(s, plan)).toBe(2);
    // Never more than the step's own weeks (step 3: 1 week).
    expect(weeksNeeded(startPlan(3, day(0)), plan)).toBe(1);
  });

  it('the next step, or a step back, has its usual weeks again', () => {
    const s = startPlan(2, day(0));
    const next = advance(s, plan, day(14));
    expect(next.startWeeks).toBeUndefined();
    expect(weeksNeeded(next, plan)).toBe(1); // step 3: 1 week
    expect(stepBack(s, 'half', day(5)).startWeeks).toBeUndefined();
  });
});

describe('begun in the evening: that first morning counts for nothing', () => {
  it('is remembered for the plan and the step; older data (no field) counts it', () => {
    expect(startPlan(1, day(0), 'evening')).toMatchObject({
      stepStartedIn: 'evening',
      planStartedIn: 'evening',
    });
    expect(stepSkipped(startPlan(1, day(0), 'evening'))).toEqual({
      day: day(0),
      session: 'morning',
    });
    expect(stepSkipped(startPlan(1, day(0)))).toBeNull();
    expect(stepSkipped(stateAt(1, day(0)))).toBeNull();
    expect(planSkipped(startPlan(1, day(0), 'evening'), day(0))).toEqual({
      day: day(0),
      session: 'morning',
    });
  });

  it('a new step or a step back in the evening skips that morning for the step only', () => {
    const started = startPlan(1, day(0));
    const next = advance(started, plan, day(28), 'evening');
    expect(stepSkipped(next)).toEqual({ day: day(28), session: 'morning' });
    expect(planSkipped(next, day(0))).toBeNull();
    expect(stepSkipped(stepBack(next, 'half', day(30)))).toBeNull();
  });

  it('its week can still count with 4 and 4 on the days left; otherwise the next week decides', () => {
    // Step 3 (one week) begun on day 0 (Thursday) in the evening, weeks from Thursday. Day 0's
    // morning (read on the step before) counts for nothing.
    const s = startPlan(3, day(0), 'evening');
    const first = moveOnStatus(s, plan, daily(0, 6), [], day(6), W);
    expect(first.weeks[0]).toMatchObject({ full: false, morning: 6, evening: 7, met: true });
    expect(first.conditionMet).toBe(true);
    // Only 2 mornings and 3 evenings in it: it does not count; days 7–10 make the next one good
    // (once it is over).
    const thin = daily(0, 2);
    expect(evaluate(s, plan, thin, [], day(7), W).event).toBeNull();
    expect(evaluate(s, plan, [...thin, ...daily(7, 10)], [], day(14), W).event).toEqual({
      kind: 'ready',
    });
  });
});

describe('the move-on condition (good weeks, owner 2026-11-14)', () => {
  it('a step of 4 weeks needs 4 good weeks; a week counts once it is over (2026-11-15)', () => {
    const s = stateAt(1, day(0));
    // Days 0–23: weeks 0–6, 7–13, 14–20 good, and days 21–23 (3 and 3) so far.
    expect(moveOnStatus(s, plan, daily(0, 23), [], day(23), W)).toMatchObject({
      weeksNeeded: 4,
      goodWeeks: 3,
      weeksLeft: 1,
      conditionMet: false,
    });
    // Day 24: the fourth week has 4 and 4 already, but it is not over: it does not count yet.
    const at24 = moveOnStatus(s, plan, daily(0, 24), [], day(24), W);
    expect(at24.weeks[0]).toMatchObject({ met: true, complete: false });
    expect(at24.goodWeeks).toBe(3);
    expect(evaluate(s, plan, daily(0, 24), [], day(24), W).event).toBeNull();
    // Its last day (27): once both wards are done; or the day after.
    expect(evaluate(s, plan, daily(0, 26), [], day(27), W).event).toBeNull();
    expect(evaluate(s, plan, daily(0, 27), [], day(27), W).event).toEqual({ kind: 'ready' });
    expect(evaluate(s, plan, daily(0, 26), [], day(28), W).event).toEqual({ kind: 'ready' });
  });

  it('needs 4 mornings AND 4 evenings in the week', () => {
    const s = stateAt(3, day(0)); // 1 week
    const mornings = daily(0, 6, ['morning']);
    const threeEvenings = daily(0, 2, ['evening']);
    expect(moveOnStatus(s, plan, [...mornings, ...threeEvenings], [], day(7), W).conditionMet).toBe(
      false,
    );
    expect(
      moveOnStatus(s, plan, [...mornings, ...daily(0, 3, ['evening'])], [], day(7), W).conditionMet,
    ).toBe(true);
  });

  it('a week short of 4 and 4 just does not count: the good weeks need not follow each other', () => {
    const s = stateAt(4, day(0)); // 2 weeks
    // Week 0–6 good, week 7–13 only 3 and 3, week 14–20 good.
    const records = [...daily(0, 6), ...daily(7, 9), ...daily(14, 17)];
    expect(moveOnStatus(s, plan, records.slice(0, -6), [], day(14), W)).toMatchObject({
      goodWeeks: 1,
      weeksLeft: 1,
    });
    expect(evaluate(s, plan, records, [], day(17), W).event).toBeNull(); // week 14–20 not over
    // Two good weeks: done (step 4 is the plan's last, so the path is finished).
    expect(evaluate(s, plan, records, [], day(21), W).event).toEqual({ kind: 'finished' });
    // Nothing is ever added to the step (no automatic extension any more).
    expect(evaluate(s, plan, daily(0, 2), [], day(60), W)).toEqual({ state: s, event: null });
  });

  it('the numbers are those of the calendar weeks, newest first (this week first)', () => {
    const s = stateAt(1, day(0));
    const records = [...daily(0, 6), ...daily(7, 8, ['morning'])];
    const { weeks } = moveOnStatus(s, plan, records, [], day(9), W);
    expect(weeks.map((w) => [w.start, w.morning, w.evening, w.complete])).toEqual([
      [day(7), 2, 0, false],
      [day(0), 7, 7, true],
    ]);
  });

  it('a week the step began in counts only its days in the step', () => {
    // Weeks start on day 3: days 0–2 are the step's first week, too short for 4 and 4.
    const s = stateAt(4, day(0)); // 2 weeks
    const at9 = moveOnStatus(s, plan, daily(0, 9), [], day(9), W3);
    expect(at9.weeks.at(-1)).toMatchObject({ start: day(-4), full: false, morning: 3, met: false });
    expect(at9).toMatchObject({ goodWeeks: 1, conditionMet: false });
    // The week 10–16, over with 4 and 4.
    expect(moveOnStatus(s, plan, daily(0, 13), [], day(17), W3).conditionMet).toBe(true);
  });
});

describe('«أبقِني أسبوعًا آخر»', () => {
  it('asks again after 7 days, never moving on by itself', () => {
    const s = postpone(stateAt(1, day(0)), day(28));
    expect(evaluate(s, plan, daily(0, 33), [], day(34), W).event).toBeNull();
    expect(evaluate(s, plan, daily(0, 34), [], day(35), W).event).toEqual({ kind: 'ready' });
    expect(evaluate(s, plan, daily(0, 34), [], day(35), W).state.step).toBe(1);
  });
});

describe('«أضِف الذكر التالي»', () => {
  it('starts the next step today, with its full time', () => {
    const s = advance(stateAt(1, day(0)), plan, day(28));
    expect(s).toMatchObject({ step: 2, stepStartedOn: day(28), extraWeeks: 0, reclimb: false });
    expect(s.highestStep).toBe(2);
    expect(weeksNeeded(s, plan)).toBe(3);
    // An old extension in the stored data is not read any more.
    expect(weeksNeeded({ ...s, extraWeeks: 2 }, plan)).toBe(3);
  });
});

describe('step back («طرأ عليّ ظرف»)', () => {
  it.each([
    [1, 'half', 1],
    [2, 'half', 1],
    [5, 'half', 2],
    [10, 'half', 5],
    [24, 'half', 12],
    [2, 'firstThree', 2],
    [3, 'firstThree', 3],
    [10, 'firstThree', 3],
  ] as const)('step %i, %s → step %i', (step, kind, target) => {
    expect(stepBackTarget(step, kind)).toBe(target);
  });

  it('climbs back faster: a step reached before takes 1 week', () => {
    const backed = stepBack(stateAt(3, day(0), { highestStep: 3 }), 'half', day(50));
    expect(backed).toMatchObject({
      step: 1,
      stepStartedOn: day(50),
      reclimb: true,
      highestStep: 3,
    });
    expect(weeksNeeded(backed, plan)).toBe(1);
    const two = advance(backed, plan, day(57));
    const three = advance(two, plan, day(64));
    expect([two, three].map((s) => [s.step, s.reclimb, weeksNeeded(s, plan)])).toEqual([
      [2, true, 1],
      [3, true, 1],
    ]);
    // A step never reached before keeps its normal weeks (step 4: 2 weeks).
    const four = advance(three, plan, day(71));
    expect([four.step, four.reclimb, weeksNeeded(four, plan)]).toEqual([4, false, 2]);
  });

  it('a break pauses the step: no good week while away; a week it cut still counts with 4 and 4', () => {
    const s = stateAt(1, day(0));
    const pause = breakFrom(day(10), 1); // days 10–16
    expect(pause).toEqual({ from: day(10), to: day(16), kind: 'break' });
    const records = daily(0, 40, ['morning', 'evening'], (n) => n >= 10 && n <= 16);
    const upTo = (n: number) => records.filter((r) => r.date <= day(n));
    // Day 28 (done): weeks 0–6 good, 7–13 only 3 and 3 (days 7–9), 14–20 good with days
    // 17–20, 21–27 good, 28– just begun: 3 good weeks of 4.
    const at28 = moveOnStatus(s, plan, upTo(28), [pause], day(28), W);
    expect(at28).toMatchObject({ goodWeeks: 3, conditionMet: false });
    expect(evaluate(s, plan, upTo(28), [pause], day(28), W).event).toBeNull();
    // The weeks of days 7–13 and 14–20 had break days: not full.
    expect(at28.weeks.filter((w) => !w.full).map((w) => w.start)).toEqual([day(14), day(7)]);
    // The week 28–34 has 4 and 4 by day 31, and counts once it is over (day 34, both done).
    expect(evaluate(s, plan, upTo(31), [pause], day(31), W).event).toBeNull();
    expect(evaluate(s, plan, upTo(34), [pause], day(34), W).event).toEqual({ kind: 'ready' });
  });

  it('a break can end early; one that has not begun goes away', () => {
    expect(endBreak(breakFrom(day(10), 2), day(12))).toEqual({
      from: day(10),
      to: day(11),
      kind: 'break',
    });
    expect(endBreak(breakFrom(day(10), 1), day(10))).toBeNull();
  });

  it('days with the feature off are like a break (not the days it was turned off and on)', () => {
    expect(offPause(day(5), day(9))).toEqual({ from: day(6), to: day(8), kind: 'off' });
    expect(offPause(day(8), day(9))).toBeNull(); // off one evening, on the next day
    expect(offPause(day(9), day(9))).toBeNull();
  });
});

describe('the gentle step-back suggestion', () => {
  const low = daily(0, 13, ['morning', 'evening'], (n) => n % 7 >= 3); // 3 of 7

  it('comes when a ward is below 4 in the last two full weeks that are over', () => {
    expect(shouldSuggestStepBack(stateAt(1, day(0)), low, [], day(14), W)).toBe(true);
  });

  it('never twice within 14 days', () => {
    expect(
      shouldSuggestStepBack(
        stateAt(1, day(0), { suggestedStepBackOn: day(1) }),
        low,
        [],
        day(14),
        W,
      ),
    ).toBe(false);
    expect(
      shouldSuggestStepBack(
        stateAt(1, day(0), { suggestedStepBackOn: day(0) }),
        low,
        [],
        day(14),
        W,
      ),
    ).toBe(true);
  });

  it('not with one low week only, nor before a week is over, nor in maintenance', () => {
    const oneLow = [...daily(0, 6), ...daily(7, 13, ['morning', 'evening'], (n) => n % 7 >= 3)];
    expect(shouldSuggestStepBack(stateAt(1, day(0)), oneLow, [], day(14), W)).toBe(false);
    // Day 13 not done yet: the second week is not over.
    expect(shouldSuggestStepBack(stateAt(1, day(0)), low, [], day(13), W)).toBe(false);
    expect(
      shouldSuggestStepBack(stateAt(1, day(0), { maintenance: true }), low, [], day(14), W),
    ).toBe(false);
  });
});

describe('after the last step', () => {
  it('finishes into maintenance: tracking only, no more steps', () => {
    const last = stateAt(4, day(0)); // 2 weeks
    const { state, event } = evaluate(last, plan, daily(0, 13), [], day(14), W);
    expect(event).toEqual({ kind: 'finished' });
    expect(state.maintenance).toBe(true);
    expect(evaluate(state, plan, daily(0, 40), [], day(41), W).event).toBeNull();
    expect(advance(last, plan, day(14)).maintenance).toBe(true);
  });
});
