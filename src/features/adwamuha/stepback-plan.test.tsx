import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/HomeScreen';
import { afterMessages, expectMomentMessage } from '@/test-utils/adwamuha-messages';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import { weekdayOf } from './logic/weeks';
import { copyDefaultPlan } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { PlanEditorScreen } from './PlanEditorScreen';
import { ProgressScreen } from './ProgressScreen';

const DAY = '2026-04-20';
const at = (hh: number) => () => new Date(2026, 3, 20, hh, 0);
const LIFE_LINK = 'طرأ عليّ ظرف';

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
  it('back to half the step: climbing again is faster, history kept, a kind word', async () => {
    const repos = await withPlan(10);
    await openStepBack(repos);
    await fireEvent.press(screen.getByText('ارجع إلى نصف خطوتك: الخطوة 5'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(5));
    expect((await repos.adwamuha.load())?.state).toMatchObject({
      stepStartedOn: DAY,
      reclimb: true,
      highestStep: 10,
    });
    expect((await repos.adwamuha.listEvents()).map((e) => [e.kind, e.data])).toEqual([
      ['step-back', { from: 10, kind: 'half' }],
    ]);
    // The kind word shows on Home (one-time messages are there only).
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await expectMomentMessage(repos, 'afterStepBack');
  });

  it('back to the first three steps', async () => {
    const repos = await withPlan(10);
    await openStepBack(repos);
    await fireEvent.press(screen.getByText('ارجع إلى الخطوات الأولى: الخطوة 3'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.state.step).toBe(3));
  });

  it('cannot go back from step 1', async () => {
    await openStepBack(await withPlan(1));
    expect(screen.getByText('ارجع إلى نصف خطوتك: الخطوة 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ارجع إلى نصف خطوتك: الخطوة 1' })).toBeDisabled();
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
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const repos = await withPlan(2);
    const stored = (await repos.adwamuha.load())!;
    const edited = {
      ...stored.plan,
      steps: stored.plan.steps.map((s, i) => (i === 5 ? { ...s, weeks: 1 } : s)),
    };
    await repos.adwamuha.save({ ...stored, plan: edited });
    await renderWithApp(<PlanEditorScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText(OWNER_TEXTS.labels.resetPlan));
    await act(async () => (alert.mock.calls[0]![2] as AlertButton[])[1]!.onPress!());
    await fireEvent.press(screen.getByText('حفظ التعديل'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.plan).toEqual(stored.plan));
    expect(screen.queryByText('قبل أن تحفظ')).toBeNull();
    expect((await repos.adwamuha.load())?.state.step).toBe(2);
    alert.mockRestore();
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
