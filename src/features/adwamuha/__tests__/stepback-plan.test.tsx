import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { resources } from '@/i18n/resources';
import { afterMessages, expectMomentMessage } from '@/test-utils/adwamuha-messages';
import { dialogButtons, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { addDays } from '@/features/adwamuha/logic/days';
import { startPlan } from '@/features/adwamuha/logic/progress';
import { weekdayOf } from '@/features/adwamuha/logic/weeks';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { PlanEditorScreen } from '@/features/adwamuha/screens/PlanEditorScreen';
import { ProgressScreen } from '@/features/adwamuha/screens/ProgressScreen';
import { stepLabel } from '@/features/adwamuha/logic/setup';

const DAY = '2026-04-20';
const at = (hh: number) => () => new Date(2026, 3, 20, hh, 0);
/** «مساري»'s row (owner's choice, 2026-11-26). */
const LIFE_LINK = resources.ar.common.adwamuha.rows.easeTitle;
const PASSED = OWNER_TEXTS.labels.stepPassed;
const KURSI = OWNER_TEXTS.wardNames['1001'];
const QULS = OWNER_TEXTS.wardNames['1002'];
/** The light-plan warning (the owner asked for the same one before saving «قطعتها»). */
const PLAN_WARNING = resources.ar.common.adwamuha.plan.confirmBody;
const STEP_BACK = resources.ar.common.adwamuha.stepBack;
const PLAN = resources.ar.common.adwamuha.plan;

/** The feature on at `step` (highest = step), the step started `daysAgo` days ago. */
async function withPlan(step: number, daysAgo = 3): Promise<Repositories> {
  const repos = await createTestRepositories();
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  const startedOn = addDays(DAY, -daysAgo);
  await repos.adwamuha.save({
    enabled: true,
    plan,
    state: startPlan(step, startedOn),
    startedOn,
    offSince: null,
  });
  return repos;
}

async function openStepBack(repos: Repositories) {
  await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
  // «مساري»'s link (design: the short form).
  await fireEvent.press(await screen.findByText(LIFE_LINK));
}

// Lists draw more rows on a timer: let them finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('«طرأ عليّ ظرف أو مستجد في حياتي»', () => {
  it('back to a picked step: climbing again is faster, history kept, a kind word', async () => {
    const repos = await withPlan(10);
    await openStepBack(repos);
    // «نصف الخطوة» and «الخطوات الأولى» are gone (owner, 2026-11-25).
    expect(screen.queryByText(/نصف خطوتك/)).toBeNull();
    expect(screen.queryByText(/الخطوات الأولى/)).toBeNull();
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByLabelText(STEP_BACK.earlier));
    await fireEvent.press(screen.getByText(STEP_BACK.toStep.replace('{{step}}', '5')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(5));
    expect((await repos.adwamuha.load())?.state).toMatchObject({
      stepStartedOn: DAY,
      reclimb: true,
      highestStep: 10,
    });
    // The kind word shows on Home (one-time messages are there only).
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'afterStepBack');
  });

  it('an old event log with the removed kinds still loads, with its kind word', async () => {
    const repos = await withPlan(5);
    await repos.adwamuha.logEvent(DAY, 'step-back', 5, { from: 10, kind: 'half' });
    await repos.adwamuha.logEvent(DAY, 'step-back', 3, { from: 5, kind: 'firstThree' });
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'afterStepBack');
    expect((await repos.adwamuha.listEvents()).map((e) => e.data)).toEqual([
      { from: 10, kind: 'half' },
      { from: 5, kind: 'firstThree' },
    ]);
  });

  it('on step 1: only the breaks', async () => {
    await openStepBack(await withPlan(1));
    expect(screen.queryByText(OWNER_TEXTS.labels.stepBackTo)).toBeNull();
    expect(screen.getByText(STEP_BACK.break1)).toBeOnTheScreen();
    expect(screen.getByText(STEP_BACK.break2)).toBeOnTheScreen();
  });

  it('«ارجع إلى الخطوة:» (owner, 2026-11-22): − and + pick a step, shown by its first words or the owner’s name', async () => {
    const repos = await withPlan(10);
    const plan = (await repos.adwamuha.load())!.plan;
    const texts = new Map(
      [
        ...(await repos.content.listAdhkar(APP_CONFIG.content.morningCategoryId, 'ar')),
        ...(await repos.content.listAdhkar(APP_CONFIG.content.eveningCategoryId, 'ar')),
      ].map((d) => [d.id, d.text] as const),
    );
    await openStepBack(repos);
    expect(screen.getByText(OWNER_TEXTS.labels.stepBackTo)).toBeOnTheScreen();
    // One step back to begin with: step 9, by its first words and «…».
    const nine = stepLabel(plan.steps[8]!, texts);
    expect(nine).toMatch(/…$/);
    expect(await screen.findByText(nine)).toBeOnTheScreen();
    expect(screen.getByText(STEP_BACK.toStep.replace('{{step}}', '9'))).toBeOnTheScreen();
    expect(screen.getByText(PLAN.both)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: STEP_BACK.later })).toBeDisabled();

    // Steps 5 and 4: the owner's names, without «…».
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByLabelText(STEP_BACK.earlier));
    expect(screen.getByText(KURSI)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(STEP_BACK.earlier));
    expect(screen.getByText(QULS)).toBeOnTheScreen();
    expect(screen.queryByText(nine)).toBeNull();

    await fireEvent.press(screen.getByText(STEP_BACK.toStep.replace('{{step}}', '4')));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(4));
    expect((await repos.adwamuha.load())?.state).toMatchObject({
      stepStartedOn: DAY,
      reclimb: true,
      highestStep: 10,
    });
    expect((await repos.adwamuha.listEvents()).map((e) => [e.kind, e.data])).toEqual([
      ['step-back', { from: 10, kind: 'chosen' }],
    ]);
  });

  it('«ارجع إلى الخطوة:» stops at step 1, and starts one step back each time it opens', async () => {
    await openStepBack(await withPlan(3));
    await fireEvent.press(screen.getByLabelText(STEP_BACK.earlier));
    expect(screen.getByText(STEP_BACK.toStep.replace('{{step}}', '1'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: STEP_BACK.earlier })).toBeDisabled();
    expect(screen.getByRole('button', { name: STEP_BACK.later })).toBeEnabled();
    await fireEvent.press(screen.getByText(resources.ar.common.common.cancel));
    await fireEvent.press(screen.getByText(LIFE_LINK));
    expect(await screen.findByText(STEP_BACK.toStep.replace('{{step}}', '2'))).toBeOnTheScreen();
  });

  it('a break of a week, which can end early', async () => {
    const repos = await withPlan(4);
    await openStepBack(repos);
    await fireEvent.press(screen.getByText('استراحة أسبوع'));
    await waitFor(async () =>
      expect(await repos.adwamuha.listPauses()).toEqual([
        { id: expect.any(Number), from: DAY, to: addDays(DAY, 6), kind: 'break' },
      ]),
    );
    await fireEvent.press(screen.getByText(LIFE_LINK));
    expect(await screen.findByText('أنت في استراحة حتى 26/4.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('أنهِ الاستراحة الآن'));
    // It began today, so it goes away.
    await waitFor(async () => expect(await repos.adwamuha.listPauses()).toEqual([]));
  });
});

describe('the gentle suggestion', () => {
  it('shows on Home after two thin weeks; «لا، شكرًا» waits 14 days', async () => {
    const repos = await withPlan(3, 15);
    // 2 mornings and 2 evenings in each of the last two calendar weeks (days -14…-8, -7…-1).
    for (const daysAgo of [1, 2, 8, 9]) {
      for (const session of ['morning', 'evening'] as const) {
        await repos.adwamuha.addRecord({
          date: addDays(DAY, -daysAgo),
          session,
          completedAt: 1,
          late: false,
          source: 'reader',
          step: 3,
        });
      }
    }
    await renderWithApp(<HomeScreen />, repos, {
      now: at(9),
      weekStartsOn: weekdayOf(addDays(DAY, -14)),
    });
    // The end-of-week message comes first.
    await afterMessages('لا، شكرًا');
    await fireEvent.press(screen.getByText('لا، شكرًا'));
    await waitFor(async () =>
      expect((await repos.adwamuha.load())?.state.suggestedStepBackOn).toBe(DAY),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(
          'يبدو أن الأيام الأخيرة كانت أصعب، ولا بأس في ذلك. هل تريد أن تخفّف وردك قليلًا؟',
        ),
      ).toBeNull(),
    );
  });
});

describe('«عدّل الخطة»', () => {
  it('changes weeks of the current and later steps, never of steps already done', async () => {
    const repos = await withPlan(2);
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    expect(await screen.findByText('خطوتك الآن')).toBeOnTheScreen();
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
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    expect(await screen.findByText('قبل أن تحفظ')).toBeOnTheScreen();
    expect(screen.getByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('أبقِ الخطة كما كانت'));
    expect((await repos.adwamuha.load())?.plan.steps[2]!.weeks).toBe(4);

    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await fireEvent.press(await screen.findByText('نعم، احفظ التعديل'));
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
    expect(dialogButtons()).toEqual([OWNER_TEXTS.labels.resetPlan, 'إلغاء']);
    await pressInDialog(OWNER_TEXTS.labels.resetPlan);
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan).toEqual(stored.plan));
    expect(screen.queryByText('قبل أن تحفظ')).toBeNull();
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
    expect(screen.getAllByText('قطعتَها')).toHaveLength(2);
    expect(screen.getByLabelText('تراجع: الخطوة 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('تراجع: الخطوة 2')).toBeOnTheScreen();
    expect(screen.queryByLabelText('أسبوع أقل للخطوة 2')).toBeNull(); // done now
    expect(screen.getByLabelText('أسبوع أقل للخطوة 3')).toBeOnTheScreen(); // the current step
    expect((await repos.adwamuha.load())?.state.step).toBe(1); // nothing saved yet

    await fireEvent.press(screen.getByText('حفظ التعديل'));
    expect(await screen.findByText('قبل أن تحفظ')).toBeOnTheScreen();
    expect(screen.getByText(PLAN_WARNING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('نعم، احفظ التعديل'));
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
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await fireEvent.press(await screen.findByText('نعم، احفظ التعديل'));
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
    expect(screen.getByText('حفظ التعديل')).toBeEnabled();
    await fireEvent.press(screen.getByLabelText('تراجع: الخطوة 1'));
    expect(screen.queryByText('قطعتَها')).toBeNull();
    expect(screen.getByLabelText(`${PASSED}: الخطوة 5`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'حفظ التعديل' })).toBeDisabled();
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
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan.steps[6]!.weeks).toBe(3));
    expect(screen.queryByText('قبل أن تحفظ')).toBeNull();
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
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await fireEvent.press(await screen.findByText('نعم، احفظ التعديل'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(2));
    expect(await repos.adwamuha.markShown(`week:2:${addDays(DAY, -10)}:${weekStart}`)).toBe(false);
  });

  it('in the order mode, only the steps after the current one have a handle', async () => {
    await renderWithApp(<PlanEditorScreen />, await withPlan(2), { now: at(9) });
    await fireEvent.press(await screen.findByText('تغيير الترتيب'));
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
    const fold = await screen.findByText(
      PLAN.doneSteps.replace('{{from}}', '1').replace('{{to}}', '3'),
    );
    expect(screen.queryByLabelText(`${PLAN.notPassed}: الخطوة 2`)).toBeNull();
    await fireEvent.press(fold);
    expect(screen.getByLabelText(`${PLAN.notPassed}: الخطوة 2`)).toBeOnTheScreen();
    // Not on the current step.
    expect(screen.queryByLabelText(`${PLAN.notPassed}: الخطوة 4`)).toBeNull();
  });

  it('«لم أقطعها بعد»: back right after the current step, its dhikr leaves the ward; saved after the warning', async () => {
    const repos = await withPlan(4);
    const before = (await repos.adwamuha.load())!;
    const putBack = before.plan.steps[1]!; // step 2
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(
      await screen.findByText(PLAN.doneSteps.replace('{{from}}', '1').replace('{{to}}', '3')),
    );
    await fireEvent.press(screen.getByLabelText(`${PLAN.notPassed}: الخطوة 2`));
    // It is now step 4, after the current step (now 3), with «تراجع».
    expect(screen.getByLabelText('تراجع: الخطوة 4')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    expect(await screen.findByText(PLAN_WARNING)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('نعم، احفظ التعديل'));
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
      await screen.findByText(PLAN.doneSteps.replace('{{from}}', '1').replace('{{to}}', '3')),
    );
    await fireEvent.press(screen.getByLabelText(`${PLAN.notPassed}: الخطوة 2`));
    await fireEvent.press(screen.getByLabelText('تراجع: الخطوة 4'));
    expect(screen.getByRole('button', { name: 'حفظ التعديل' })).toBeDisabled();
  });
});
