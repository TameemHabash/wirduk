/** «عدّل الخطة»: weeks, «قطعتها», «لم أقطعها بعد», reset, the order mode. */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { dialogButtons, pressInDialog } from '@/test-utils/dialog';
import { givenAdwamuha } from '@/test-utils/given';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

import { addDays } from '@/features/adwamuha/logic/days';
import { weekdayOf } from '@/features/adwamuha/logic/weeks';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';

import { PlanEditorScreen } from './PlanEditorScreen';

const DAY = '2026-04-20';
const at = (hh: number) => () => new Date(2026, 3, 20, hh, 0);
const PASSED = OWNER_TEXTS.labels.stepPassed;
const KURSI = OWNER_TEXTS.wardNames['1001'];
const QULS = OWNER_TEXTS.wardNames['1002'];
/** The light-plan warning (the owner asked for the same one before saving «قطعتها»). */
const PLAN_WARNING = tr('adwamuha.plan.confirmBody');

/** The feature on at `step` (highest = step), the step started `daysAgo` days ago. */
async function withPlan(step: number, daysAgo = 3): Promise<Repositories> {
  return givenAdwamuha(await createTestRepositories(), {
    step,
    startedOn: addDays(DAY, -daysAgo),
  });
}

// Lists draw more rows on a timer: let them finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('«عدّل الخطة»', () => {
  it('changes weeks of the current and later steps, never of steps already done', async () => {
    const repos = await withPlan(2);
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.plan.current'))).toBeOnTheScreen();
    expect(screen.queryByLabelText('أسبوع أكثر للخطوة 1')).toBeNull(); // done
    expect(screen.getByLabelText('أسبوع أقل للخطوة 2')).toBeEnabled();
    // Steps 4–7 (stage 2) already have 3 weeks; step 3 goes from 4 to 3.
    const threeWeeks = screen.getAllByText('3 أسابيع').length;
    await fireEvent.press(screen.getByLabelText('أسبوع أقل للخطوة 3'));
    expect(screen.getAllByText('3 أسابيع')).toHaveLength(threeWeeks + 1);
  });

  it('asks first, with the light-plan notice, before saving a change; can keep the plan', async () => {
    const repos = await withPlan(2);
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByLabelText('أسبوع أقل للخطوة 3'));
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    expect(await screen.findByText(tr('adwamuha.plan.confirmTitle'))).toBeOnTheScreen();
    expect(screen.getByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.confirmKeep')));
    expect((await repos.adwamuha.load())?.plan.steps[2]!.weeks).toBe(4);

    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    await fireEvent.press(await screen.findByText(tr('adwamuha.plan.confirmSave')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan.steps[2]!.weeks).toBe(3));
    expect((await repos.adwamuha.listEvents()).map((e) => e.kind)).toEqual(['plan-edit']);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('reset brings the default plan back, saved without a warning; the step stays', async () => {
    const repos = await withPlan(2);
    const stored = (await repos.adwamuha.load())!;
    const edited = {
      ...stored.plan,
      steps: stored.plan.steps.map((s, i) => (i === 5 ? { ...s, weeks: 1 } : s)),
    };
    await repos.adwamuha.save({ ...stored, plan: edited });
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText(OWNER_TEXTS.labels.resetPlan));
    expect(dialogButtons()).toEqual([OWNER_TEXTS.labels.resetPlan, tr('common.cancel')]);
    await pressInDialog(OWNER_TEXTS.labels.resetPlan);
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan).toEqual(stored.plan));
    expect(screen.queryByText(tr('adwamuha.plan.confirmTitle'))).toBeNull();
    expect((await repos.adwamuha.load())?.state.step).toBe(2);
  });

  it('steps 4 and 5 show by the owner’s names, as in «ترتيب الورد»', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(1), { now: at(9) });
    await screen.findByText(QULS);
    const shown = screen
      .getAllByText(new RegExp(`^(الخطوة [45]|${QULS}|${KURSI})$`))
      .map((node) => node.props.children as string);
    expect(shown).toEqual(['الخطوة 4', QULS, 'الخطوة 5', KURSI]);
  });

  it('«قطعتها» on later steps: they join the steps done once saved, after the warning; the step goes on', async () => {
    const repos = await withPlan(1);
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByLabelText(`${PASSED}: الخطوة 5`)); // آية الكرسي
    // آية الكرسي is step 1 now, so الإخلاص والمعوذتين is still step 5.
    await fireEvent.press(screen.getByLabelText(`${PASSED}: الخطوة 5`));
    expect(screen.getAllByText(tr('adwamuha.plan.done'))).toHaveLength(2);
    expect(screen.getByLabelText('تراجع: الخطوة 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('تراجع: الخطوة 2')).toBeOnTheScreen();
    expect(screen.queryByLabelText('أسبوع أقل للخطوة 2')).toBeNull(); // done now
    expect(screen.getByLabelText('أسبوع أقل للخطوة 3')).toBeOnTheScreen(); // the current step
    expect((await repos.adwamuha.load())?.state.step).toBe(1); // nothing saved yet

    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    expect(await screen.findByText(tr('adwamuha.plan.confirmTitle'))).toBeOnTheScreen();
    expect(screen.getByText(PLAN_WARNING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.confirmSave')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(3));
    const stored = (await repos.adwamuha.load())!;
    expect(stored.plan.steps.slice(0, 4).map((s) => s.morningDhikrId)).toEqual([
      1001, 1002, 1012, 1013,
    ]);
    // The same dhikr is worked on: its days go on.
    expect(stored.state).toMatchObject({ stepStartedOn: addDays(DAY, -3), highestStep: 3 });
    expect((await repos.adwamuha.listEvents()).map((e) => [e.kind, e.step, e.data])).toEqual([
      ['plan-edit', 3, { passed: 2, from: 1 }],
    ]);
  });

  it('«قطعتها» on the current step: the next step begins today', async () => {
    const repos = await withPlan(2);
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByLabelText(`${PASSED}: الخطوة 2`));
    expect(screen.getByLabelText('أسبوع أقل للخطوة 3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    await fireEvent.press(await screen.findByText(tr('adwamuha.plan.confirmSave')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(3));
    expect((await repos.adwamuha.load())?.state).toMatchObject({
      stepStartedOn: DAY,
      stepStartedIn: 'morning',
      reclimb: false,
    });
  });

  it('«تراجع» puts a marked step back: nothing left to save', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(1), { now: at(9) });
    await fireEvent.press(await screen.findByLabelText(`${PASSED}: الخطوة 5`));
    expect(screen.getByText(tr('adwamuha.plan.save'))).toBeEnabled();
    await fireEvent.press(screen.getByLabelText('تراجع: الخطوة 1'));
    expect(screen.queryByText(tr('adwamuha.plan.done'))).toBeNull();
    expect(screen.getByLabelText(`${PASSED}: الخطوة 5`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: tr('adwamuha.plan.save') })).toBeDisabled();
  });

  it('one step at least stays: the last one cannot be marked', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(23), { now: at(9) });
    expect(await screen.findByLabelText(`${PASSED}: الخطوة 24`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(`${PASSED}: الخطوة 23`));
    expect(screen.queryByLabelText(`${PASSED}: الخطوة 24`)).toBeNull();
  });

  it('reset after «قطعتها»: the steps done stay, the rest goes back to the default', async () => {
    const repos = await withPlan(3);
    const stored = (await repos.adwamuha.load())!;
    const order = [5, 4, 1, 2, 3, 6, 7, 8]; // آية الكرسي and the Quls passed, now at step 3
    const steps = [
      ...order.map((n) => stored.plan.steps[n - 1]!),
      ...stored.plan.steps.slice(order.length),
    ].map((s, i) => (i === 6 ? { ...s, weeks: 1 } : s));
    await repos.adwamuha.save({ ...stored, plan: { ...stored.plan, steps } });
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByLabelText(`${PASSED}: الخطوة 4`));
    await fireEvent.press(screen.getByText(OWNER_TEXTS.labels.resetPlan));
    await pressInDialog(OWNER_TEXTS.labels.resetPlan);
    expect(screen.queryByLabelText('تراجع: الخطوة 3')).toBeNull(); // the mark is gone too
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan.steps[6]!.weeks).toBe(3));
    expect(screen.queryByText(tr('adwamuha.plan.confirmTitle'))).toBeNull();
    const saved = (await repos.adwamuha.load())!;
    expect(saved.plan.steps.slice(0, 4).map((s) => s.morningDhikrId)).toEqual([
      1001, 1002, 1012, 1013,
    ]);
    expect(saved.state.step).toBe(3);
  });

  it('the step goes on under a new number: its last week’s message is not shown again', async () => {
    const repos = await withPlan(1, 10);
    const weekStart = addDays(DAY, -7);
    // The week just over was seen on Home under step 1.
    await repos.adwamuha.markShown(`week:1:${addDays(DAY, -10)}:${weekStart}`);
    await renderWithApp(<PlanEditorScreen />, repos, {
      now: at(9),
      weekStartsOn: weekdayOf(weekStart),
    });
    await fireEvent.press(await screen.findByLabelText(`${PASSED}: الخطوة 5`));
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    await fireEvent.press(await screen.findByText(tr('adwamuha.plan.confirmSave')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(2));
    expect(await repos.adwamuha.markShown(`week:2:${addDays(DAY, -10)}:${weekStart}`)).toBe(false);
  });

  it('in the order mode, only the steps after the current one have a handle', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(2), { now: at(9) });
    await fireEvent.press(await screen.findByText(tr('adwamuha.plan.reorder')));
    expect(screen.getByLabelText('اسحب لتغيير مكان الخطوة 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('اسحب لتغيير مكان الخطوة 4')).toBeOnTheScreen();
    expect(screen.queryByLabelText('اسحب لتغيير مكان الخطوة 2')).toBeNull();
    expect(screen.queryByLabelText('اسحب لتغيير مكان الخطوة 1')).toBeNull();
    await settleLists();
  });
});

describe('«عدّل الخطة» (redesign)', () => {
  it('the steps done are folded in one row; open, each has «لم أقطعها بعد»', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(4), { now: at(9) });
    const fold = await screen.findByText(tr('adwamuha.plan.doneSteps', { from: 1, to: 3 }));
    expect(screen.queryByLabelText(`${tr('adwamuha.plan.notPassed')}: الخطوة 2`)).toBeNull();
    await fireEvent.press(fold);
    expect(screen.getByLabelText(`${tr('adwamuha.plan.notPassed')}: الخطوة 2`)).toBeOnTheScreen();
    // Not on the current step.
    expect(screen.queryByLabelText(`${tr('adwamuha.plan.notPassed')}: الخطوة 4`)).toBeNull();
  });

  it('«لم أقطعها بعد»: back right after the current step, its dhikr leaves the ward; saved after the warning', async () => {
    const repos = await withPlan(4);
    const before = (await repos.adwamuha.load())!;
    const putBack = before.plan.steps[1]!; // step 2
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(
      await screen.findByText(tr('adwamuha.plan.doneSteps', { from: 1, to: 3 })),
    );
    await fireEvent.press(screen.getByLabelText(`${tr('adwamuha.plan.notPassed')}: الخطوة 2`));
    // It is now step 4, after the current step (now 3), with «تراجع».
    expect(screen.getByLabelText('تراجع: الخطوة 4')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.save')));
    expect(await screen.findByText(PLAN_WARNING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.plan.confirmSave')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(3));
    const saved = (await repos.adwamuha.load())!;
    expect(saved.plan.steps[3]).toEqual(putBack);
    // The ward (steps 1–3) no longer has its dhikr.
    expect(saved.plan.steps.slice(0, 3)).not.toContainEqual(putBack);
    // The same step goes on: its start day is kept.
    expect(saved.state.stepStartedOn).toBe(before.state.stepStartedOn);
  });

  it('«تراجع» undoes «لم أقطعها بعد» before saving: nothing left to save', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(4), { now: at(9) });
    await fireEvent.press(
      await screen.findByText(tr('adwamuha.plan.doneSteps', { from: 1, to: 3 })),
    );
    await fireEvent.press(screen.getByLabelText(`${tr('adwamuha.plan.notPassed')}: الخطوة 2`));
    await fireEvent.press(screen.getByLabelText('تراجع: الخطوة 4'));
    expect(screen.getByRole('button', { name: tr('adwamuha.plan.save') })).toBeDisabled();
  });
});
