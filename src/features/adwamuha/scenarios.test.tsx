/**
 * «أدومها» lived day by day with a fake clock, through the real provider and
 * user.db (milestone 13, owner 2026-10-30: "test all the states, I cannot
 * walk the path from start to end"). Each scenario is a kind of user; the
 * checks are what the app decides and shows. Whole plans (more than a year)
 * are walked with the same rules in logic/plan-walk.test.ts. The list of
 * states, and which test covers each: docs/adwamuha/states.md.
 */
import { screen } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/HomeScreen';
import { type DayPlan, type Scenario, startScenario } from '@/test-utils/adwamuha-scenario';
import { settleLists } from '@/test-utils/render-app';

import type { DueMessage } from './AdwamuhaProvider';
import { type DayKey, addDays } from './logic/days';
import { ProgressScreen } from './ProgressScreen';

/** Saturday 3 January 2026: weeks start on Saturday (the setting's default). */
const SAT = '2026-01-03';

afterEach(async () => {
  await settleLists();
});

/** The user reads each message («حسنًا»). Returns their kinds. */
async function readMessages(s: Scenario): Promise<DueMessage['kind'][]> {
  const due = [...s.app.messages];
  for (const m of due) await s.run((app) => app.dismissMessage(m));
  return due.map((m) => m.kind);
}

/** Today's two wards, read in the app (the start day: the morning at 09:00, the evening at 18:00). */
async function readToday(s: Scenario) {
  await s.read('morning');
  await s.setTime(s.today, 18);
  await s.read('evening');
}

/** The goal bars count the same days as the dots (design: «الأرقام يجب أن تطابق النقاط»). */
function expectNumbersMatchDots(s: Scenario) {
  const view = s.view!;
  if (!view.thisWeek.full) return;
  const done = (session: 'morning' | 'evening') =>
    view.grid.filter((d) => d[session] === 'done' || d[session] === 'late').length;
  expect([view.thisWeek.morning, view.thisWeek.evening]).toEqual([
    done('morning'),
    done('evening'),
  ]);
}

const days = (n: number, p: DayPlan) => () => p;
/** Read on the first `n` days of each week (Saturday first). */
const firstDaysOfWeek = (n: number) => (date: DayKey) => {
  const weekday = (new Date(`${date}T12:00:00`).getDay() + 1) % 7; // Saturday 0
  return { morning: weekday < n, evening: weekday < n };
};

describe('a steady user', () => {
  it('the welcome and the stage tip; week words; asked after 4 weeks; a new step gets its word', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    expect(await readMessages(s)).toEqual(['welcome', 'tip']);
    await readToday(s);
    expect(s.view!.status.daysLeft).toBe(27);
    const words: DayKey[] = [];
    await s.live(26, undefined, async (date) => {
      expectNumbersMatchDots(s);
      expect(s.app.readyToMoveOn).toBe(false);
      const kinds = await readMessages(s);
      if (kinds.includes('week')) words.push(date);
    });
    // A word at the end of each full week (Fridays), none in between.
    expect(words).toEqual(['2026-01-09', '2026-01-16', '2026-01-23']);
    await s.live(1);
    expect(s.today).toBe('2026-01-30');
    expect(s.app.readyToMoveOn).toBe(true);
    expect(s.view!.status).toMatchObject({ minimumPassed: true, conditionMet: true, daysLeft: 0 });

    // Home shows the question in «وردك اليوم» (after the week's word).
    await readMessages(s);
    await s.show(<HomeScreen />);
    expect(await screen.findByText('جاهز لإضافة الذكر التالي؟', { exact: false })).toBeTruthy();

    await s.run((app) => app.advance());
    expect(s.app.stored!.state).toMatchObject({ step: 2, stepStartedIn: 'evening' });
    expect(await readMessages(s)).toEqual(['newStep']); // same stage: no new tip
    // The new step began in the evening: its week is cut, the bars wait for a full week.
    expect(s.view!.thisWeek.full).toBe(false);
    expect(await s.events()).toEqual(['start:1', 'advance:2']);
  }, 60_000);
});

describe('special starts', () => {
  it('at a later step: two weeks on it, then asked', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 5 });
    expect(s.app.stored!.state.startWeeks).toBe(2);
    expect(s.view!.status.minimumDays).toBe(14);
    expect((await readMessages(s))[0]).toBe('welcome');
    await readToday(s);
    await s.live(12);
    expect(s.app.readyToMoveOn).toBe(false);
    await s.live(1);
    expect(s.app.readyToMoveOn).toBe(true);
  }, 60_000);

  it('turned on in the evening: that morning counts for nothing and the first week is cut', async () => {
    const s = await startScenario({ day: '2026-01-07', hour: 20 }); // a Wednesday
    expect(s.app.stored!.state).toMatchObject({
      planStartedIn: 'evening',
      stepStartedIn: 'evening',
    });
    expect(s.view!.todayStatus).toEqual({ morning: 'before', evening: 'open' });
    expect(s.view!.thisWeek.full).toBe(false); // no bars: the first-week line
    await s.read('evening');
    await s.live(2); // to Friday
    expect(s.view!.thisWeek.full).toBe(false);
    await s.live(1); // Saturday: a new, full week
    expect(s.view!.thisWeek).toMatchObject({ full: true, morning: 1, evening: 1 });
    expectNumbersMatchDots(s);
  }, 60_000);
});

describe('a user short of the target', () => {
  it('3 days a week: no question; the step is extended a week, with a word; the gentle suggestion', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await readToday(s);
    let suggestedOn: DayKey | null = null;
    await s.live(35, firstDaysOfWeek(3), async (date) => {
      expect(s.app.readyToMoveOn).toBe(false);
      if (s.app.suggestStepBack && !suggestedOn) {
        suggestedOn = date;
        await s.run((app) => app.dismissSuggestion());
      }
      // Once turned down, not again for 14 days.
      if (suggestedOn && date !== suggestedOn && addDays(suggestedOn, 14) > date) {
        expect(s.app.suggestStepBack).toBe(false);
      }
    });
    expect(suggestedOn).not.toBeNull();
    // Extended a week at a time, each time the new minimum passed short of the target.
    const extend = (await s.repos.adwamuha.listEvents()).filter((e) => e.kind === 'extend');
    expect(extend.length).toBeGreaterThanOrEqual(1);
    expect(extend.every((e) => (e.data as { weeks: number }).weeks === 1)).toBe(true);
    expect(s.view!.status.minimumDays).toBe(28 + 7 * extend.length);
    expect(s.app.messages.map((m) => m.kind)).toContain('extended');
  }, 60_000);

  it('the app not opened for weeks: one extension of enough weeks, at once', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await readToday(s);
    await s.live(13);
    await s.away(35, () => ({ morning: false, evening: false }));
    const extend = (await s.repos.adwamuha.listEvents()).filter((e) => e.kind === 'extend');
    expect(extend).toHaveLength(1);
    const weeks = (extend[0]!.data as { weeks: number }).weeks;
    expect(weeks).toBeGreaterThan(1);
    // The new minimum is ahead again.
    expect(s.view!.status.minimumPassed).toBe(false);
    expect(s.view!.status.minimumDays).toBe(28 + weeks * 7);
  }, 60_000);
});

describe('the user’s choices', () => {
  it('«أبقِني أسبوعًا آخر»: the question goes, and comes back 7 days later', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 5 });
    await readMessages(s);
    await readToday(s);
    await s.live(13);
    expect(s.app.readyToMoveOn).toBe(true);
    await s.run((app) => app.postpone());
    expect(s.app.readyToMoveOn).toBe(false);
    await s.live(6, undefined, () => expect(s.app.readyToMoveOn).toBe(false));
    await s.live(1);
    expect(s.app.readyToMoveOn).toBe(true);
  }, 60_000);

  it('«طرأ عليّ ظرف» back to half: a word; the steps reached before are climbed again a week each', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 7 });
    await readMessages(s);
    await s.run((app) => app.stepBack('half'));
    expect(s.app.stored!.state).toMatchObject({ step: 3, reclimb: true, highestStep: 7 });
    expect(await readMessages(s)).toContain('afterStepBack');
    expect(s.view!.status.minimumDays).toBe(7);
    await readToday(s);
    await s.live(6);
    expect(s.app.readyToMoveOn).toBe(true);
    await s.run((app) => app.advance());
    expect(s.app.stored!.state).toMatchObject({ step: 4, reclimb: true });
    expect(s.view!.status.minimumDays).toBe(7);
  }, 60_000);

  it('«طرأ عليّ ظرف» back to the first three', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 9 });
    await s.run((app) => app.stepBack('firstThree'));
    expect(s.app.stored!.state).toMatchObject({ step: 3, reclimb: true });
  }, 30_000);

  it('a break: its days count for nothing (a line in the grid, the week cut); ended early', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await readToday(s);
    await s.live(9); // to Monday 12 January
    const before = s.view!.status.daysOnStep;
    await s.run((app) => app.takeBreak(1));
    expect(s.app.activeBreak).toMatchObject({ from: '2026-01-12', to: '2026-01-18' });
    await s.live(2, () => ({ morning: false, evening: false }));
    // The paused days count for nothing: the step waits. The break began on Monday, already
    // read: its ticks stay in the grid, but it counts for nothing either (a break is "from today").
    expect(s.view!.status.daysOnStep).toBe(before - 1);
    expect(s.view!.grid.find((d) => d.date === '2026-01-12')!.morning).toBe('done');
    expect(s.view!.grid.filter((d) => d.morning === 'paused').map((d) => d.date)).toEqual([
      '2026-01-13',
      '2026-01-14',
    ]);
    await s.show(<ProgressScreen />);
    expect(screen.getByText(/^استراحة حتى/)).toBeTruthy();
    expect(await readMessages(s)).toContain('week'); // the full week before (3–9 January)
    await s.run((app) => app.endBreak());
    expect(s.app.activeBreak).toBeNull();
    expect(s.app.pauses[0]).toMatchObject({ from: '2026-01-12', to: '2026-01-13' });
    // This week has paused days: it does not count, and brings no week word.
    expect(s.view!.thisWeek.full).toBe(false);
    await s.live(3);
    expect(s.app.messages.map((m) => m.kind)).not.toContain('week');
  }, 60_000);

  it('turned off for 10 days and on again (continue): those days are like a break', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await readToday(s);
    await s.live(4);
    const before = s.view!.status.daysOnStep;
    await s.run((app) => app.turnOff());
    expect(s.app.enabled).toBe(false);
    expect(s.view).toBeNull();
    await s.setTime(addDays(s.today, 10), 9);
    await s.run((app) => app.resume());
    expect(s.app.enabled).toBe(true);
    // The day it was turned off (Wednesday, both wards read) still counts.
    expect(s.app.pauses).toEqual([
      expect.objectContaining({ kind: 'off', from: '2026-01-08', to: '2026-01-16' }),
    ]);
    expect(s.view!.status.daysOnStep).toBe(before);
    expect(s.app.stored!.state.step).toBe(1);
  }, 60_000);

  it('turned on again with «ابدأ من جديد»: a new plan from today, the history kept', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 4 });
    await readToday(s);
    await s.live(3);
    await s.run((app) => app.turnOff());
    await s.setTime(addDays(s.today, 2), 9);
    await s.run((app) => app.start(1));
    expect(s.app.stored!.state).toMatchObject({ step: 1, stepStartedOn: '2026-01-08' });
    expect(s.app.records.length).toBe(8); // the old days are still there
    expect(await s.events()).toEqual(['start:4', 'off:4', 'start:1']);
  }, 60_000);

  it('the plan edited on the way: the step stays, the ward follows the new plan', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 3 });
    const plan = s.app.stored!.plan;
    const before = s.app.wardIds('morning');
    // The user swaps steps 2 and 3.
    const steps = [...plan.steps];
    [steps[1], steps[2]] = [steps[2]!, steps[1]!];
    await s.run((app) => app.savePlan({ ...plan, steps }));
    expect(s.app.stored!.state.step).toBe(3);
    const after = s.app.wardIds('morning');
    expect([...after].sort()).toEqual([...before].sort());
    expect(after.slice(-2)).toEqual([before[3], before[2]]);
  }, 30_000);
});

describe('days and times', () => {
  it('a late ward still counts (a clock in the grid), on its own day', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readToday(s);
    await s.live(3, () => ({ morning: 'late', evening: 'late' }));
    const late = s.view!.grid.filter((d) => d.morning === 'late' && d.evening === 'late');
    expect(late.map((d) => d.date)).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
    expect(s.view!.thisWeek).toMatchObject({ morning: 4, evening: 4 });
    expectNumbersMatchDots(s);
  }, 60_000);

  it('recorded outside the app: today and yesterday only, and undone', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await s.live(2, () => ({ morning: false, evening: false }));
    const yesterday = addDays(s.today, -1);
    expect(await s.run((app) => app.markFromMemory('morning', yesterday))).toBe(true);
    expect(await s.run((app) => app.markFromMemory('morning', addDays(s.today, -2)))).toBe(false);
    expect(s.view!.grid.find((d) => d.date === yesterday)!.morning).toBe('done');
    expect(await s.run((app) => app.undoFromMemory('morning', yesterday))).toBe(true);
    expect(s.view!.grid.find((d) => d.date === yesterday)!.morning).toBe('missed');
  }, 60_000);

  it('the phone’s date moving back: nothing breaks, and going forward again is the same', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readToday(s);
    await s.live(5);
    const view = s.view!;
    await s.setTime('2026-01-05', 20); // two days back
    expect(s.today).toBe('2026-01-05');
    expect(s.view!.step).toBe(1);
    expect(s.app.readyToMoveOn).toBe(false);
    await s.show(<ProgressScreen />);
    expect(screen.getByText('تتبّع الأسبوع')).toBeTruthy();
    await s.setTime('2026-01-08', 20);
    expect(s.view!.status).toEqual(view.status);
  }, 60_000);
});

describe('the end of the path', () => {
  it('the last step done: maintenance by itself, «وضع المحافظة», no question, no suggestion', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 24 });
    await readMessages(s);
    await readToday(s);
    await s.live(13);
    const state = s.app.stored!.state;
    expect(state).toMatchObject({ step: 24, maintenance: true });
    expect(await s.events()).toContain('finish:24');
    expect(s.app.messages.map((m) => m.kind)).toEqual(expect.arrayContaining(['finished', 'tip']));
    expect(s.app.readyToMoveOn).toBe(false);
    expect(s.app.suggestStepBack).toBe(false);
    // Maintenance: the grid goes on, nothing more to add.
    await s.live(7, days(7, { morning: false, evening: false }));
    expect(s.app.stored!.state.maintenance).toBe(true);
    expect(s.app.suggestStepBack).toBe(false);
  }, 60_000);
});
