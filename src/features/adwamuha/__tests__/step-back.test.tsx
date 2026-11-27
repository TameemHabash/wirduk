/** «طرأ عليّ ظرف»: back to a step, the breaks, and the gentle suggestion on Home. */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { afterMessages, expectMomentMessage } from '@/test-utils/adwamuha-messages';
import { givenAdwamuha, givenWardRead } from '@/test-utils/given';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { tr } from '@/test-utils/tr';

import { addDays } from '@/features/adwamuha/logic/days';
import { weekdayOf } from '@/features/adwamuha/logic/weeks';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { ProgressScreen } from '@/features/adwamuha/screens/ProgressScreen';
import { stepLabel } from '@/features/adwamuha/logic/setup';

const DAY = '2026-04-20';
const at = (hh: number) => () => new Date(2026, 3, 20, hh, 0);
/** «مساري»'s row (owner's choice, 2026-11-26). */
const LIFE_LINK = tr('adwamuha.rows.easeTitle');
const KURSI = OWNER_TEXTS.wardNames['1001'];
const QULS = OWNER_TEXTS.wardNames['1002'];

/** The feature on at `step` (highest = step), the step started `daysAgo` days ago. */
async function withPlan(step: number, daysAgo = 3): Promise<Repositories> {
  return givenAdwamuha(await createTestRepositories(), {
    step,
    startedOn: addDays(DAY, -daysAgo),
  });
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
    for (let i = 0; i < 4; i++)
      await fireEvent.press(screen.getByLabelText(tr('adwamuha.stepBack.earlier')));
    await fireEvent.press(screen.getByText(tr('adwamuha.stepBack.toStep', { step: 5 })));
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
    expect(screen.getByText(tr('adwamuha.stepBack.break1'))).toBeOnTheScreen();
    expect(screen.getByText(tr('adwamuha.stepBack.break2'))).toBeOnTheScreen();
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
    expect(screen.getByText(tr('adwamuha.stepBack.toStep', { step: 9 }))).toBeOnTheScreen();
    expect(screen.getByText(tr('adwamuha.plan.both'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: tr('adwamuha.stepBack.later') })).toBeDisabled();

    // Steps 5 and 4: the owner's names, without «…».
    for (let i = 0; i < 4; i++)
      await fireEvent.press(screen.getByLabelText(tr('adwamuha.stepBack.earlier')));
    expect(screen.getByText(KURSI)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(tr('adwamuha.stepBack.earlier')));
    expect(screen.getByText(QULS)).toBeOnTheScreen();
    expect(screen.queryByText(nine)).toBeNull();

    await fireEvent.press(screen.getByText(tr('adwamuha.stepBack.toStep', { step: 4 })));
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
    await fireEvent.press(screen.getByLabelText(tr('adwamuha.stepBack.earlier')));
    expect(screen.getByText(tr('adwamuha.stepBack.toStep', { step: 1 }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: tr('adwamuha.stepBack.earlier') })).toBeDisabled();
    expect(screen.getByRole('button', { name: tr('adwamuha.stepBack.later') })).toBeEnabled();
    await fireEvent.press(screen.getByText(tr('common.cancel')));
    await fireEvent.press(screen.getByText(LIFE_LINK));
    expect(await screen.findByText(tr('adwamuha.stepBack.toStep', { step: 2 }))).toBeOnTheScreen();
  });

  it('a break of a week, which can end early', async () => {
    const repos = await withPlan(4);
    await openStepBack(repos);
    await fireEvent.press(screen.getByText(tr('adwamuha.stepBack.break1')));
    await waitFor(async () =>
      expect(await repos.adwamuha.listPauses()).toEqual([
        { id: expect.any(Number), from: DAY, to: addDays(DAY, 6), kind: 'break' },
      ]),
    );
    await fireEvent.press(screen.getByText(LIFE_LINK));
    expect(await screen.findByText('أنت في استراحة حتى 26/4.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.stepBack.endBreak')));
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
        await givenWardRead(repos, addDays(DAY, -daysAgo), session, { step: 3 });
      }
    }
    await renderWithApp(<HomeScreen />, repos, {
      now: at(9),
      weekStartsOn: weekdayOf(addDays(DAY, -14)),
    });
    // The end-of-week message comes first.
    await afterMessages(tr('adwamuha.stepBack.suggestionNo'));
    await fireEvent.press(screen.getByText(tr('adwamuha.stepBack.suggestionNo')));
    await waitFor(async () =>
      expect((await repos.adwamuha.load())?.state.suggestedStepBackOn).toBe(DAY),
    );
    await waitFor(() => expect(screen.queryByText(tr('adwamuha.stepBack.suggestion'))).toBeNull());
  });
});
