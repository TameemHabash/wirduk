import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { pickTime } from '@/test-utils/mocks/notifications';
import { dialogButtons, openDialog, pressInDialog } from '@/test-utils/dialog';
import { givenAdwamuha } from '@/test-utils/given';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';

import { addDays } from '@/features/adwamuha/logic/days';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { ProgressScreen } from '@/features/adwamuha/screens/ProgressScreen';

import { AdwamuhaSettingsScreen } from './AdwamuhaSettingsScreen';
import { tr, trList } from '@/test-utils/tr';

const DAY = '2026-03-04';
const at = (hh: number) => () => new Date(2026, 2, 4, hh, 0);
const TOGGLE = tr('adwamuha.settingsScreen.enabled');

/** At step 2 since 10 days; off since `offSince` when not `enabled`. */
async function withPlan(enabled: boolean, offSince: string | null = null): Promise<Repositories> {
  return givenAdwamuha(await createTestRepositories(), {
    step: 2,
    startedOn: addDays(DAY, -10),
    enabled,
    offSince,
  });
}

// Home's list draws more rows on a timer: let it finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('the «أدومها» settings screen', () => {
  it('off: turning it on the first time opens the setup', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, undefined, { now: at(9) });
    const toggle = await screen.findByLabelText(TOGGLE);
    expect(toggle.props.value).toBe(false);
    expect(screen.queryByText(tr('adwamuha.settingsScreen.timesTitle'))).toBeNull();
    await fireEvent(toggle, 'valueChange', true);
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/intro');
  });

  it('on: the ward order, the reminders (as the wards), the times, the plan', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, await withPlan(true), { now: at(9) });
    expect((await screen.findByLabelText(TOGGLE)).props.value).toBe(true);
    expect(screen.getByText(tr('adwamuha.settingsScreen.orderTitle'))).toBeOnTheScreen();
    expect(screen.getByText(tr('adwamuha.settingsScreen.remindersTitle'))).toBeOnTheScreen();
    expect(screen.getByLabelText(tr('adwamuha.wardTitle.morning'))).toBeOnTheScreen();
    expect(screen.getByText(tr('adwamuha.settingsScreen.timesTitle'))).toBeOnTheScreen();
    // The two rows of «مساري», with their notes (owner, 2026-11-25).
    expect(screen.getByText(tr('adwamuha.rows.easeTitle'))).toBeOnTheScreen();
    expect(screen.getByText(/^ارجع إلى خطوة سابقة/)).toBeOnTheScreen();
    expect(screen.getByText(/^غيّر ترتيبها ومدة كل خطوة/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(OWNER_TEXTS.labels.editPlan));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/plan');
  });

  it('«ترتيب الورد»: «ننصح به» as a badge, the first four, the owner’s names, all on request', async () => {
    // Step 6: the opening and 6 adhkar.
    const repos = await givenAdwamuha(await createTestRepositories(), {
      step: 6,
      startedOn: addDays(DAY, -10),
    });
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.settingsScreen.previewTitle'))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^ترتيب الخطة\. ننصح به\. / })).toBeOnTheScreen();
    expect(screen.getByText(tr('adwamuha.settingsScreen.recommended'))).toBeOnTheScreen();
    // Plan order: the two named adhkar are 5th and 6th, so hidden at first.
    const kursi = OWNER_TEXTS.wardNames['1001'];
    const quls = OWNER_TEXTS.wardNames['1002'];
    expect(screen.queryByText(kursi)).toBeNull();
    await fireEvent.press(screen.getByText('عرض الورد كله (7)'));
    expect(screen.getByText(kursi)).toBeOnTheScreen();
    expect(screen.getByText(quls)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.orderHelp.showLess')));
    expect(screen.queryByText(kursi)).toBeNull();
    // The category's order puts them right after the opening.
    await fireEvent.press(screen.getByRole('radio', { name: /^ترتيب الأبواب/ }));
    expect(await screen.findByText(kursi)).toBeOnTheScreen();
    expect(screen.getByText(quls)).toBeOnTheScreen();
  });

  it('«بداية الأسبوع»: Saturday by default, four days, a preview of the week, saved at once', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.settingsScreen.weekStartTitle'))).toBeOnTheScreen();
    const names = [
      trList('adwamuha.masariHelp.dayNames')[5]!,
      trList('adwamuha.masariHelp.dayNames')[6]!,
      trList('adwamuha.masariHelp.dayNames')[0]!,
      trList('adwamuha.masariHelp.dayNames')[1]!,
    ];
    for (const name of names) expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: trList('adwamuha.masariHelp.dayNames')[6]! }).props
        .accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    // The preview starts on the chosen day (the grid's short names; hidden from TalkBack, as the
    // design's aria-hidden).
    const hidden = { includeHiddenElements: true };
    const firstDay = () => within(screen.getByTestId('week-first-day', hidden));
    expect(firstDay().getByText(trList('adwamuha.weekdays')[6]!, hidden)).toBeTruthy();
    expect(screen.getByText(/^من هذا اليوم يبدأ تتبّع الأسبوع في «مساري»/)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('radio', { name: trList('adwamuha.masariHelp.dayNames')[1]! }),
    );
    await waitFor(async () => expect((await repos.settings.getAll()).weekStart).toBe(1));
    expect(firstDay().getByText(trList('adwamuha.weekdays')[1]!, hidden)).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: trList('adwamuha.masariHelp.dayNames')[1]! }).props
        .accessibilityState,
    ).toMatchObject({
      selected: true,
    });
  });

  it('«مساري» follows «بداية الأسبوع»: its grid starts on the chosen day', async () => {
    const repos = await withPlan(true);
    await repos.settings.set('weekStart', 1); // Monday
    await renderWithApp(<ProgressScreen />, repos, { now: at(9) });
    // 4 March 2026 is a Wednesday: the week began on Monday 2 March.
    expect(await screen.findByLabelText('الاثنين، الصباح: لم يُقرأ')).toBeOnTheScreen();
    expect(screen.queryByLabelText('السبت، الصباح: لم يُقرأ')).toBeNull();
  });

  it('«ترتيب الورد» comes right after «الخطة» (then «احفظ مسارك», on a phone)', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, await withPlan(true), { now: at(9) });
    await screen.findByText(tr('adwamuha.settingsScreen.orderTitle'));
    const titles = screen.getAllByRole('header').map((h) => h.props.children as string);
    expect(titles.slice(-2)).toEqual([
      tr('adwamuha.settingsScreen.planTitle'),
      tr('adwamuha.settingsScreen.orderTitle'),
    ]);
  });

  it('«ترتيب الورد»: the category order with its gentle note, and back to the plan order', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.settingsScreen.previewTitle'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /^ترتيب الأبواب/ }));
    await waitFor(async () => expect((await repos.settings.getAll()).wardOrder).toBe('category'));
    expect(await screen.findByText(/^ترتيب الخطة أسهل للالتزام/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('adwamuha.settingsScreen.backToPlan')));
    await waitFor(async () => expect((await repos.settings.getAll()).wardOrder).toBe('plan'));
  });

  it('turning it off keeps everything (the day it stopped is saved)', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', false);
    await waitFor(async () =>
      expect(await repos.adwamuha.load()).toMatchObject({ enabled: false, offSince: DAY }),
    );
    expect((await repos.adwamuha.load())?.state.step).toBe(2);
    expect(await screen.findByText(/^عند الإطفاء تعود الرئيسية/)).toBeOnTheScreen();
    expect(screen.queryByText(tr('adwamuha.settingsScreen.timesTitle'))).toBeNull();
  });

  it('on again: continue where they stopped — the days off count like a break', async () => {
    const repos = await withPlan(false, addDays(DAY, -3));
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', true);
    expect(dialogButtons()).toEqual([
      tr('adwamuha.continue.continue'),
      tr('adwamuha.continue.restart'),
      tr('common.cancel'),
    ]);
    await pressInDialog(tr('adwamuha.continue.continue'));
    await waitFor(async () => expect((await repos.adwamuha.load())?.enabled).toBe(true));
    // Off 3 days ago: the days after it, to yesterday (the days it was turned off and on count).
    expect(await repos.adwamuha.listPauses()).toEqual([
      { id: expect.any(Number), from: addDays(DAY, -2), to: addDays(DAY, -1), kind: 'off' },
    ]);
    expect((await repos.adwamuha.load())?.state.step).toBe(2);
  });

  it('on again: «ابدأ من جديد» opens the setup where to start', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, await withPlan(false, DAY), { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', true);
    await pressInDialog(tr('adwamuha.continue.restart'));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/start');
  });

  it('on again: cancel leaves it off', async () => {
    const repos = await withPlan(false, DAY);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', true);
    expect(openDialog().getByText(tr('adwamuha.continue.title'))).toBeOnTheScreen();
    await pressInDialog(tr('common.cancel'));
    expect(screen.queryByTestId('dialog')).toBeNull();
    expect((await repos.adwamuha.load())?.enabled).toBe(false);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('changes a ward time, and refuses a time out of order', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByLabelText('تغيير «يبدأ الصباح»، الوقت الآن 4:00 ص'));
    await act(async () => pickTime(5, 30));
    await waitFor(async () =>
      expect((await repos.settings.getAll()).wardTimes.morningStart).toBe('05:30'),
    );
    await fireEvent.press(screen.getByLabelText('تغيير «يبدأ المساء»، الوقت الآن 4:00 م'));
    await act(async () => pickTime(10, 0)); // before the morning's on-time end
    expect(await screen.findByText(tr('adwamuha.settings.badTimes'))).toBeOnTheScreen();
    expect((await repos.settings.getAll()).wardTimes.eveningStart).toBe('16:00');
  });
});
