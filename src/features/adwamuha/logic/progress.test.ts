import { daily, day, planOf, rec, stateAt } from '@/test-utils/adwamuha';

import {
  LATER_START_WEEKS,
  advance,
  breakFrom,
  endBreak,
  evaluate,
  lastFinishedWeek,
  minimumDays,
  moveOnStatus,
  offPause,
  planSkipped,
  postpone,
  shouldSuggestStepBack,
  startPlan,
  stepBack,
  stepBackTarget,
  stepSkipped,
} from './progress';
import { type Weekday, weekdayOf } from './weeks';

// Step 1: 4 weeks, step 2: 3 weeks, step 3: 1 week, step 4: 2 weeks.
const plan = planOf(4, 3, 1, 2);
/** Weeks that start on day 0 (a Thursday), so the step's weeks are days 0–6, 7–13, … */
const W = weekdayOf(day(0));
/** Weeks that start on day 3: a step begun on day 0 begins inside its first week. */
const W3 = ((W + 3) % 7) as Weekday;

describe('starting', () => {
  it('at step 1: its full time', () => {
    const s = startPlan(1, day(0));
    expect(s).toMatchObject({ step: 1, stepStartedOn: day(0), highestStep: 1, reclimb: false });
    expect(s.startWeeks).toBeUndefined();
    expect(minimumDays(s, plan)).toBe(28);
  });

  it('at a later step: 2 weeks (the user keeps it already); earlier steps count as reached', () => {
    const s = startPlan(2, day(0)); // step 2 is 3 weeks in the plan
    expect(s).toMatchObject({ step: 2, highestStep: 2, startWeeks: LATER_START_WEEKS });
    expect(minimumDays(s, plan)).toBe(14);
    // Never more than the step's own weeks (step 3: 1 week).
    expect(minimumDays(startPlan(3, day(0)), plan)).toBe(7);
  });

  it('the next step, or a step back, has its usual time again', () => {
    const s = startPlan(2, day(0));
    const next = advance(s, plan, day(14));
    expect(next.startWeeks).toBeUndefined();
    expect(minimumDays(next, plan)).toBe(7); // step 3: 1 week
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

  it('its week is cut: neither met nor missed; the next full week decides', () => {
    // Step 3 (one week) begun on day 0 in the evening: days 0–6 do not count.
    const s = startPlan(3, day(0), 'evening');
    const records = daily(0, 13);
    const first = moveOnStatus(s, plan, records, [], day(6), W);
    expect(first.weeks[0]).toMatchObject({ full: false, morning: 7 });
    expect(first.conditionMet).toBe(false);
    expect(evaluate(s, plan, daily(0, 6), [], day(7), W).event).toBeNull(); // waits, no extension
    // Days 7–10 have 4 and 4: the next week is met before it ends.
    expect(evaluate(s, plan, daily(0, 10), [], day(10), W).event).toEqual({ kind: 'ready' });
  });
});

describe('the move-on condition (calendar weeks)', () => {
  it('waits for the minimum time (4 weeks = 28 days that count)', () => {
    const s = stateAt(1, day(0));
    expect(minimumDays(s, plan)).toBe(28);
    // Day 27, both wards of today not done yet: 27 days judged (days 0–26).
    expect(moveOnStatus(s, plan, daily(0, 26), [], day(27), W)).toMatchObject({
      daysOnStep: 27,
      minimumPassed: false,
      daysLeft: 1,
    });
    expect(evaluate(s, plan, daily(0, 26), [], day(27), W).event).toBeNull();
    // Day 27 with today done: 28 days, ready.
    expect(evaluate(s, plan, daily(0, 27), [], day(27), W).event).toEqual({ kind: 'ready' });
  });

  it('needs 4 mornings AND 4 evenings in each of the last two full weeks', () => {
    const s = stateAt(1, day(0));
    const fourOfSeven = daily(0, 27, ['morning', 'evening'], (n) => n % 7 >= 4);
    const status = moveOnStatus(s, plan, fourOfSeven, [], day(28), W);
    expect(status.weeksNeeded).toBe(2);
    expect(status.conditionMet).toBe(true);
    // Evenings only 3 in the newest full week (days 21–27).
    const lowEvening = fourOfSeven.filter((r) => !(r.session === 'evening' && r.date === day(24)));
    expect(moveOnStatus(s, plan, lowEvening, [], day(28), W).conditionMet).toBe(false);
    // The older week too (days 14–20).
    const lowOlder = fourOfSeven.filter((r) => !(r.session === 'morning' && r.date === day(14)));
    expect(moveOnStatus(s, plan, lowOlder, [], day(28), W).conditionMet).toBe(false);
  });

  it('checks only one week for a step shorter than two weeks', () => {
    const s = stateAt(3, day(0)); // 1 week
    const status = moveOnStatus(
      s,
      plan,
      daily(0, 6, ['morning', 'evening'], (n) => n >= 4),
      [],
      day(7),
      W,
    );
    expect(status.weeksNeeded).toBe(1);
    expect(status.conditionMet).toBe(true);
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

  it('a week that began before the step does not count (weeks start on the phone’s first day)', () => {
    // Weeks start on day 3: days 0–2 are a cut week; full weeks are 3–9, 10–16, …
    const s = stateAt(4, day(0)); // 2 weeks
    const at14 = moveOnStatus(s, plan, daily(0, 13), [], day(14), W3);
    expect(at14.weeks.at(-1)).toMatchObject({ start: day(-4), full: false });
    // Days 0–13 judged: 14 days, the minimum. Full weeks 3–9 (over) and 10–16 (4 and 4 already).
    expect(at14).toMatchObject({ minimumPassed: true, conditionMet: true });
  });

  it('after the minimum, waits for a full week instead of extending', () => {
    // Step 3 (1 week) begun on day 0, weeks start on day 3: the first full week is days 3–9.
    const s = stateAt(3, day(0));
    const thin = daily(0, 6, ['morning', 'evening'], (n) => n >= 3 && n <= 5); // days 3–5 skipped
    // Day 7: the minimum passed; days 3–9 have only 1 and 1 so far, and are not over.
    expect(moveOnStatus(s, plan, thin, [], day(7), W3)).toMatchObject({
      minimumPassed: true,
      decided: false,
    });
    expect(evaluate(s, plan, thin, [], day(7), W3).event).toBeNull();
    // Day 10: days 3–9 are over with 1 and 1: one more week.
    expect(evaluate(s, plan, thin, [], day(10), W3).event).toEqual({ kind: 'extended', weeks: 1 });
  });
});

describe('automatic extension', () => {
  it('adds a week, without blame, when the time is up and the condition is not met', () => {
    const s = stateAt(1, day(0));
    const few = daily(0, 27, ['morning', 'evening'], (n) => n % 7 >= 2); // 2 of 7
    const { state, event } = evaluate(s, plan, few, [], day(28), W);
    expect(event).toEqual({ kind: 'extended', weeks: 1 });
    expect(state.extraWeeks).toBe(1);
    expect(minimumDays(state, plan)).toBe(35);
    // Next day: nothing new (the new minimum is a week away).
    expect(evaluate(state, plan, few, [], day(29), W).event).toBeNull();
  });

  it('adds enough weeks after a long time without opening the app', () => {
    const s = stateAt(1, day(0));
    const { state, event } = evaluate(s, plan, daily(0, 9), [], day(60), W); // 60 days judged
    expect(event).toEqual({ kind: 'extended', weeks: 5 }); // 28 + 5 weeks = 63 > 60
    expect(state.extraWeeks).toBe(5);
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
    expect(minimumDays(s, plan)).toBe(21);
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
    expect(minimumDays(backed, plan)).toBe(7);
    const two = advance(backed, plan, day(57));
    const three = advance(two, plan, day(64));
    expect([two, three].map((s) => [s.step, s.reclimb, minimumDays(s, plan)])).toEqual([
      [2, true, 7],
      [3, true, 7],
    ]);
    // A step never reached before keeps its normal time (step 4: 2 weeks).
    const four = advance(three, plan, day(71));
    expect([four.step, four.reclimb, minimumDays(four, plan)]).toEqual([4, false, 14]);
  });

  it('a break pauses the step: its days count for nothing, nor do the weeks it cuts', () => {
    const s = stateAt(1, day(0));
    const pause = breakFrom(day(10), 1); // days 10–16
    expect(pause).toEqual({ from: day(10), to: day(16), kind: 'break' });
    const records = daily(0, 40, ['morning', 'evening'], (n) => n >= 10 && n <= 16);
    // Day 28 (done): days 0–28 are 29 days, 7 of them paused → 22 count.
    expect(moveOnStatus(s, plan, records, [pause], day(28), W).daysOnStep).toBe(22);
    expect(evaluate(s, plan, records, [pause], day(28), W).event).toBeNull();
    // Day 34 (done): 35 days − 7 paused = 28: the 4 weeks are over.
    const status = moveOnStatus(s, plan, records, [pause], day(34), W);
    expect(status).toMatchObject({ daysOnStep: 28, minimumPassed: true, conditionMet: true });
    // The weeks of days 7–13 and 14–20 had break days: not full.
    expect(status.weeks.filter((w) => !w.full).map((w) => w.start)).toEqual([day(14), day(7)]);
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

describe('end of a week (for the encouragement messages)', () => {
  it('is the end of each full calendar week, with whether the target was reached', () => {
    const s = stateAt(1, day(0));
    expect(lastFinishedWeek(s, daily(0, 5), [], day(6), W)).toBeNull();
    expect(lastFinishedWeek(s, daily(0, 6), [], day(7), W)).toEqual({
      weekStart: day(0),
      reachedTarget: true,
    });
    const thin = [rec(day(0), 'morning'), rec(day(1), 'evening')];
    expect(lastFinishedWeek(s, thin, [], day(9), W)).toEqual({
      weekStart: day(0),
      reachedTarget: false,
    });
  });

  it('none for a week the step began inside', () => {
    expect(lastFinishedWeek(stateAt(1, day(0)), daily(0, 5), [], day(6), W3)).toBeNull();
  });
});
