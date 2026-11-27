/**
 * «أدومها» lived day by day with a fake clock, through the real provider and
 * user.db (milestone 13, owner 2026-10-30: "test all the states, I cannot
 * walk the path from start to end"). Each scenario is a kind of user, written
 * as a short day-by-day script (`s.play`, day 1 = the first day); the checks
 * are what the app decides and shows.
 *
 * Kept short on purpose (each day through React costs ~0.1 s): the rules that
 * must hold on every day of a whole plan (the numbers match the dots, a word
 * each week, asked only with the good weeks, the suggestion every 14 days)
 * are walked in pure logic in logic/plan-walk.test.ts. Every state and its
 * test: docs/adwamuha/states.md.
 */
import { screen } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { type Scenario, startScenario } from '@/test-utils/adwamuha-scenario';
import { settleLists } from '@/test-utils/render-app';
import { tr, trPattern } from '@/test-utils/tr';

import type { DueMessage } from '@/features/adwamuha/logic/due-messages';
import { addDays } from '@/features/adwamuha/logic/days';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { ProgressScreen } from '@/features/adwamuha/screens/ProgressScreen';

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

const kinds = (s: Scenario) => s.app.messages.map((m) => m.kind);

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

/** Three days a week (Saturday to Monday) for `weeks` weeks, the app opened on the last day. */
function threeDaysAWeek(weeks: number): string {
  const lines = [
    'day 1: both wards',
    'days 2-3: both wards, app closed',
    'days 4-7: none, app closed',
  ];
  for (let w = 1; w < weeks; w++) {
    const sat = w * 7 + 1;
    lines.push(`days ${sat}-${sat + 2}: both wards, app closed`);
    lines.push(`days ${sat + 3}-${sat + 6}: none, app closed`);
  }
  return lines.join('\n');
}

describe('a steady user', () => {
  it('the welcome and the stage tip, then a word when the first week is over', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    expect(await readMessages(s)).toEqual(['welcome', 'tip']);
    await s.play(`
      day 1: both wards
      days 2-6: both wards     # to Thursday 8 January
    `);
    expect(kinds(s)).not.toContain('week');
    expect(s.view!.status).toMatchObject({ goodWeeks: 0, weeksNeeded: 4, weeksLeft: 4 });
    await s.play('day 7: both wards  # Friday 9: the week is over, 4 and 4');
    expect(await readMessages(s)).toEqual(['week']);
    expect(s.view!.status.goodWeeks).toBe(1);
    expectNumbersMatchDots(s);
  }, 30_000);

  it('asked at the end of the 4th good week; «أضِف الذكر التالي» starts step 2 with its word', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-27: both wards, app closed    # to Thursday 29 January
    `);
    // Thursday of the 4th week: it has 4 and 4 already, but counts only once it is over
    // (owner, 2026-11-15).
    expect(s.view!.status).toMatchObject({ goodWeeks: 3, weeksLeft: 1 });
    expect(s.view!.status.weeks[0]).toMatchObject({ met: true, complete: false });
    expect(s.app.readyToMoveOn).toBe(false);

    await s.play('day 28: both wards  # Friday 30: the 4th good week');
    expect(s.today).toBe('2026-01-30');
    expect(s.app.readyToMoveOn).toBe(true);
    expect(s.view!.status).toMatchObject({ goodWeeks: 4, weeksLeft: 0, conditionMet: true });
    expectNumbersMatchDots(s);

    // Home shows the question in «وردك اليوم» (after the week's word).
    await readMessages(s);
    await s.show(<HomeScreen />);
    expect(await screen.findByText(OWNER_TEXTS.labels.readyQuestion)).toBeTruthy();

    await s.run((app) => app.advance());
    expect(s.app.stored!.state).toMatchObject({ step: 2, stepStartedIn: 'evening' });
    expect(await readMessages(s)).toEqual(['newStep']); // same stage: no new tip
    // The new step began in the evening: its week is cut, and the bars count from the step's
    // start (that morning, read on step 1, counts for nothing; the evening counts).
    expect(s.view!.thisWeek).toMatchObject({
      full: false,
      stepBeganInside: true,
      morning: 0,
      evening: 1,
    });
    expect(s.view!.status).toMatchObject({ goodWeeks: 0, weeksNeeded: 4 }); // same stage
    expect(await s.events()).toEqual(['start:1', 'advance:2']);
  }, 30_000);
});

describe('special starts', () => {
  it('at a later step: two good weeks on it, then asked', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 5 });
    expect(s.app.stored!.state.startWeeks).toBe(2);
    expect(s.view!.status.weeksNeeded).toBe(2);
    expect((await readMessages(s))[0]).toBe('welcome');
    // The second week (from Saturday 10 January) counts at its end, Friday 16.
    await s.play(`
      day 1: both wards
      days 2-13: both wards, app closed
    `);
    expect(s.app.readyToMoveOn).toBe(false);
    await s.play('day 14: both wards');
    expect(s.today).toBe('2026-01-16');
    expect(s.app.readyToMoveOn).toBe(true);
  }, 30_000);

  it('turned on in the evening: that morning counts for nothing and the first week is cut', async () => {
    const s = await startScenario({ day: '2026-01-07', hour: 20 }); // a Wednesday
    expect(s.app.stored!.state).toMatchObject({
      planStartedIn: 'evening',
      stepStartedIn: 'evening',
    });
    expect(s.view!.todayStatus).toEqual({ morning: 'before', evening: 'open' });
    expect(s.view!.thisWeek.full).toBe(false);
    await s.read('evening');
    await s.play('days 2-3: both wards  # to Friday');
    // The bars show this cut week too: 2 mornings and 3 evenings cannot make it good.
    expect(s.view!.thisWeek).toMatchObject({ full: false, morning: 2, evening: 3 });
    expect(s.view!.status.goodWeeks).toBe(0);
    await s.play('day 4: both wards  # Saturday: a new, full week');
    expect(s.view!.thisWeek).toMatchObject({ full: true, morning: 1, evening: 1 });
    expectNumbersMatchDots(s);
  }, 30_000);
});

describe('a user short of the target', () => {
  it('3 days a week: no question, no week counts, nothing added', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(threeDaysAWeek(5));
    expect(s.app.readyToMoveOn).toBe(false);
    // Never extended (owner, 2026-11-14): the weeks short of 4 and 4 just do not count.
    expect(s.view!.status).toMatchObject({ goodWeeks: 0, weeksLeft: 4 });
    expect(s.app.stored!.state.extraWeeks).toBe(0);
    expect(await s.events()).toEqual(['start:1']);
  }, 30_000);

  it('the gentle suggestion after two short weeks; «لا، شكرًا» quiets it for 14 days', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(threeDaysAWeek(2)); // to Friday 16 January
    await s.play('day 15: none  # Saturday 17: both weeks are over');
    expect(s.app.suggestStepBack).toBe(true);
    await s.run((app) => app.dismissSuggestion());
    expect(s.app.suggestStepBack).toBe(false);
    await s.play('days 16-28: none, app closed');
    expect(s.app.suggestStepBack).toBe(false);
  }, 30_000);

  it('the app not opened for weeks: nothing added, the good weeks before stay', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-14: both wards, app closed     # two good weeks
    `);
    expect(s.view!.status.goodWeeks).toBe(2);
    await s.play('days 15-49: none, app closed');
    expect(s.view!.status).toMatchObject({ goodWeeks: 2, weeksLeft: 2 });
    expect(s.app.readyToMoveOn).toBe(false);
    expect(await s.events()).toEqual(['start:1']);
  }, 30_000);
});

describe('the user’s choices', () => {
  it('«أبقِني أسبوعًا آخر»: the question goes, and comes back 7 days later', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 5 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-14: both wards, app closed
    `);
    expect(s.app.readyToMoveOn).toBe(true);
    await s.run((app) => app.postpone());
    expect(s.app.readyToMoveOn).toBe(false);
    await s.play('days 15-20: both wards, app closed');
    expect(s.app.readyToMoveOn).toBe(false);
    await s.play('day 21: both wards');
    expect(s.app.readyToMoveOn).toBe(true);
  }, 30_000);

  it('the question waits for a break’s end: not on Home or «مساري» during the break (owner, 2026-11-27)', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 5 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-14: both wards, app closed
    `);
    expect(s.app.readyToMoveOn).toBe(true);
    await s.run((app) => app.takeBreak(1)); // days 14-20
    expect(s.app.readyToMoveOn).toBe(false);
    await s.play('days 15-20: none, app closed');
    expect(s.app.activeBreak).not.toBeNull();
    expect(s.app.readyToMoveOn).toBe(false);
    await readMessages(s);
    await s.show(<HomeScreen />);
    expect(screen.queryByText(OWNER_TEXTS.labels.readyQuestion)).toBeNull();
    await s.show(<ProgressScreen />);
    expect(screen.queryByText(OWNER_TEXTS.labels.readyQuestion)).toBeNull();
    // The break is over: the question is back (the break's days took nothing away).
    await s.play('day 21: none');
    expect(s.app.activeBreak).toBeNull();
    expect(s.app.readyToMoveOn).toBe(true);
    await readMessages(s);
    await s.show(<ProgressScreen />);
    expect(screen.getByText(OWNER_TEXTS.labels.readyQuestion)).toBeTruthy();
  }, 30_000);

  it('«طرأ عليّ ظرف» back to a picked step (3 of 7): a word; the steps reached before are climbed again a week each', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 7 });
    await readMessages(s);
    await s.run((app) => app.stepBack({ step: 3 }));
    expect(s.app.stored!.state).toMatchObject({ step: 3, reclimb: true, highestStep: 7 });
    expect(await readMessages(s)).toContain('afterStepBack');
    expect(s.view!.status.weeksNeeded).toBe(1);
    await s.play(`
      day 1: both wards
      days 2-7: both wards, app closed
    `);
    expect(s.app.readyToMoveOn).toBe(true);
    await s.run((app) => app.advance());
    expect(s.app.stored!.state).toMatchObject({ step: 4, reclimb: true });
    expect(s.view!.status.weeksNeeded).toBe(1);
  }, 30_000);

  it('«طرأ عليّ ظرف» back to step 3 from step 9', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 9 });
    await s.run((app) => app.stepBack({ step: 3 }));
    expect(s.app.stored!.state).toMatchObject({ step: 3, reclimb: true });
  }, 30_000);

  it('a break: its days count for nothing (a line in the grid, the week cut); ended early', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-10: both wards, app closed    # to Monday 12 January
    `);
    expect(s.view!.status.goodWeeks).toBe(1);
    await s.run((app) => app.takeBreak(1));
    expect(s.app.activeBreak).toMatchObject({ from: '2026-01-12', to: '2026-01-18' });
    await s.play('days 11-12: none');
    // The paused days count for nothing: the step waits. The break began on Monday, already
    // read: its ticks stay in the grid and in the bars (the numbers match the dots).
    expect(s.view!.status.goodWeeks).toBe(1);
    expect(s.view!.thisWeek).toMatchObject({ full: false, morning: 3, evening: 3 });
    expect(s.view!.grid.find((d) => d.date === '2026-01-12')!.morning).toBe('done');
    expect(s.view!.grid.filter((d) => d.morning === 'paused').map((d) => d.date)).toEqual([
      '2026-01-13',
      '2026-01-14',
    ]);
    await s.show(<ProgressScreen />);
    expect(screen.getByText(trPattern('adwamuha.masari.breakUntil'))).toBeTruthy();
    expect(await readMessages(s)).toContain('week'); // the full week before (3–9 January)
    await s.run((app) => app.endBreak());
    expect(s.app.activeBreak).toBeNull();
    expect(s.app.pauses[0]).toMatchObject({ from: '2026-01-12', to: '2026-01-13' });
    // This week has paused days: it is not full, but 4 and 4 on its other days still make it
    // good (owner, 2026-11-14), and then it brings its week word.
    expect(s.view!.thisWeek.full).toBe(false);
    await s.play('days 13-15: both wards  # Thursday 15 to Saturday 17');
    expect(s.view!.status.goodWeeks).toBe(2);
    expect(kinds(s)).toContain('week');
  }, 30_000);

  it('a break that cuts a week short of 4 and 4: no week word, no suggestion', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-7: both wards, app closed     # the first week, all read
    `);
    await readMessages(s);
    await s.play('day 8: both wards  # Saturday 10');
    await s.run((app) => app.takeBreak(1));
    await s.play('days 9-15: none, app closed');
    expect(s.view!.status.goodWeeks).toBe(1);
    expect(kinds(s)).not.toContain('week');
    expect(s.app.suggestStepBack).toBe(false);
  }, 30_000);

  it('turned off for 10 days and on again (continue): those days are like a break', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-7: both wards, app closed     # to Friday 9: the first week is over, and good
    `);
    expect(s.view!.status.goodWeeks).toBe(1);
    await s.run((app) => app.turnOff());
    expect(s.app.enabled).toBe(false);
    expect(s.view).toBeNull();
    await s.setTime(addDays(s.today, 10), 9);
    await s.run((app) => app.resume());
    expect(s.app.enabled).toBe(true);
    // The day it was turned off (Friday, both wards read) still counts.
    expect(s.app.pauses).toEqual([
      expect.objectContaining({ kind: 'off', from: '2026-01-10', to: '2026-01-18' }),
    ]);
    expect(s.view!.status.goodWeeks).toBe(1);
    expect(s.app.stored!.state.step).toBe(1);
  }, 30_000);

  it('turned on again with «ابدأ من جديد»: a new plan from today, the history kept', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 4 });
    await s.play(`
      day 1: both wards
      days 2-4: both wards, app closed
    `);
    await s.run((app) => app.turnOff());
    await s.setTime(addDays(s.today, 2), 9);
    await s.run((app) => app.start(1));
    expect(s.app.stored!.state).toMatchObject({ step: 1, stepStartedOn: '2026-01-08' });
    expect(s.app.records.length).toBe(8); // the old days are still there
    expect(await s.events()).toEqual(['start:4', 'off:4', 'start:1']);
  }, 30_000);

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
    await s.play(`
      day 1: both wards
      days 2-4: both wards late, app closed
    `);
    const late = s.view!.grid.filter((d) => d.morning === 'late' && d.evening === 'late');
    expect(late.map((d) => d.date)).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
    expect(s.view!.thisWeek).toMatchObject({ morning: 4, evening: 4 });
    expectNumbersMatchDots(s);
  }, 30_000);

  it('recorded outside the app: today and yesterday only, and undone', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await s.play('days 2-3: none');
    const yesterday = addDays(s.today, -1);
    expect(await s.run((app) => app.markFromMemory('morning', yesterday))).toBe(true);
    expect(await s.run((app) => app.markFromMemory('morning', addDays(s.today, -2)))).toBe(false);
    expect(s.view!.grid.find((d) => d.date === yesterday)!.morning).toBe('done');
    expect(await s.run((app) => app.undoFromMemory('morning', yesterday))).toBe(true);
    expect(s.view!.grid.find((d) => d.date === yesterday)!.morning).toBe('missed');
  }, 30_000);

  it('the phone’s date moving back: nothing breaks, and going forward again is the same', async () => {
    const s = await startScenario({ day: SAT, hour: 9 });
    await s.play(`
      day 1: both wards
      days 2-6: both wards, app closed
    `);
    const view = s.view!;
    await s.setTime('2026-01-05', 20); // three days back
    expect(s.today).toBe('2026-01-05');
    expect(s.view!.step).toBe(1);
    expect(s.app.readyToMoveOn).toBe(false);
    await s.show(<ProgressScreen />);
    expect(screen.getByText(tr('adwamuha.masari.weekTitle'))).toBeTruthy();
    await s.setTime('2026-01-08', 20);
    expect(s.view!.status).toEqual(view.status);
  }, 30_000);
});

describe('the end of the path', () => {
  it('the last step done: maintenance by itself, «وضع المحافظة», no question, no suggestion', async () => {
    const s = await startScenario({ day: SAT, hour: 9, step: 24 });
    await readMessages(s);
    await s.play(`
      day 1: both wards
      days 2-14: both wards, app closed
    `);
    expect(s.app.stored!.state).toMatchObject({ step: 24, maintenance: true });
    expect(await s.events()).toContain('finish:24');
    expect(kinds(s)).toEqual(expect.arrayContaining(['finished', 'tip']));
    expect(s.app.readyToMoveOn).toBe(false);
    expect(s.app.suggestStepBack).toBe(false);
    // Maintenance: the grid goes on, nothing more to add.
    await s.play('days 15-21: none, app closed');
    expect(s.app.stored!.state.maintenance).toBe(true);
    expect(s.app.suggestStepBack).toBe(false);
  }, 30_000);
});
