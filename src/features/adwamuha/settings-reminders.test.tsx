import { Alert, type AlertButton, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/HomeScreen';
import { useReminderSync } from '@/features/reminders/useReminders';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { notificationState, pickTime, responseFor } from '@/test-utils/notifications-mock';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { AdwamuhaSettingsScreen } from './AdwamuhaSettingsScreen';
import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import { copyDefaultPlan } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { ProgressScreen } from './ProgressScreen';

const DAY = '2026-03-04';
const at = (hh: number) => () => new Date(2026, 2, 4, hh, 0);
const TOGGLE = 'مفعّلة';

async function withPlan(enabled: boolean, offSince: string | null = null): Promise<Repositories> {
  const repos = await createTestRepositories();
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  await repos.adwamuha.save({
    enabled,
    plan,
    state: startPlan(2, addDays(DAY, -10)),
    startedOn: addDays(DAY, -10),
    offSince,
  });
  return repos;
}

// Home's list draws more rows on a timer: let it finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('Settings → «أدومها»', () => {
  it('comes first, as one row that opens its own screen', async () => {
    await renderWithApp(<SettingsScreen />, undefined, { now: at(9) });
    const off = await screen.findByText('غير مفعّلة');
    // More room than measured, so its last word is not cut on a Galaxy S21+ (owner, 2026-10-30).
    expect(StyleSheet.flatten(off.props.style)).toMatchObject({ flexGrow: 0.25, flexShrink: 0 });
    await fireEvent.press(off);
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/settings');
    // The reminders stay in Settings while «أدومها» is off.
    expect(screen.getByText('التذكير بأذكار الصباح')).toBeOnTheScreen();
  });

  it('while on, Settings no longer has the reminders (they are in «أدومها»)', async () => {
    await renderWithApp(<SettingsScreen />, await withPlan(true), { now: at(9) });
    expect(await screen.findByText('مفعّلة')).toBeOnTheScreen();
    expect(screen.queryByText('التذكير بأذكار الصباح')).toBeNull();
  });
});

describe('the «أدومها» settings screen', () => {
  it('off: turning it on the first time opens the setup', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, undefined, { now: at(9) });
    const toggle = await screen.findByLabelText(TOGGLE);
    expect(toggle.props.value).toBe(false);
    expect(screen.queryByText('أوقات الورد')).toBeNull();
    await fireEvent(toggle, 'valueChange', true);
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/intro');
  });

  it('on: the ward order, the reminders (as the wards), the times, the plan', async () => {
    await renderWithApp(<AdwamuhaSettingsScreen />, await withPlan(true), { now: at(9) });
    expect((await screen.findByLabelText(TOGGLE)).props.value).toBe(true);
    expect(screen.getByText('ترتيب الورد')).toBeOnTheScreen();
    expect(screen.getByText('التذكير')).toBeOnTheScreen();
    expect(screen.getByLabelText('ورد الصباح')).toBeOnTheScreen();
    expect(screen.getByText('أوقات الورد')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('عدّل الخطة. الترتيب ومدة كل خطوة'));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/plan');
  });

  it('«ترتيب الورد»: «ننصح به» as a badge, the first four, the owner’s names, all on request', async () => {
    const repos = await createTestRepositories();
    const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
    await repos.adwamuha.save({
      enabled: true,
      plan,
      state: startPlan(6, addDays(DAY, -10)), // the opening and 6 adhkar
      startedOn: addDays(DAY, -10),
      offSince: null,
    });
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText('مثال لوردك الآن:')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^ترتيب الخطة\. ننصح به\. / })).toBeOnTheScreen();
    expect(screen.getByText('ننصح به')).toBeOnTheScreen();
    // Plan order: the two named adhkar are 5th and 6th, so hidden at first.
    const kursi = OWNER_TEXTS.wardNames['1001'];
    const quls = OWNER_TEXTS.wardNames['1002'];
    expect(screen.queryByText(kursi)).toBeNull();
    await fireEvent.press(screen.getByText('عرض الورد كله (7)'));
    expect(screen.getByText(kursi)).toBeOnTheScreen();
    expect(screen.getByText(quls)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('عرض أول أربعة'));
    expect(screen.queryByText(kursi)).toBeNull();
    // The category's order puts them right after the opening.
    await fireEvent.press(screen.getByRole('radio', { name: /^ترتيب الأبواب/ }));
    expect(await screen.findByText(kursi)).toBeOnTheScreen();
    expect(screen.getByText(quls)).toBeOnTheScreen();
  });

  it('«بداية الأسبوع»: Saturday by default, four days, a preview of the week, saved at once', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText('بداية الأسبوع')).toBeOnTheScreen();
    const names = ['الجمعة', 'السبت', 'الأحد', 'الاثنين'];
    for (const name of names) expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'السبت' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    // The preview starts on the chosen day (the grid's short names; hidden from TalkBack, as the
    // design's aria-hidden).
    const hidden = { includeHiddenElements: true };
    const firstDay = () => within(screen.getByTestId('week-first-day', hidden));
    expect(firstDay().getByText('سبت', hidden)).toBeTruthy();
    expect(screen.getByText(/^من هذا اليوم يبدأ تتبّع الأسبوع في «مساري»/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'الاثنين' }));
    await waitFor(async () => expect((await repos.settings.getAll()).weekStart).toBe(1));
    expect(firstDay().getByText('اثنين', hidden)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'الاثنين' }).props.accessibilityState).toMatchObject({
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
    await screen.findByText('ترتيب الورد');
    const titles = screen.getAllByRole('header').map((h) => h.props.children as string);
    expect(titles.slice(-2)).toEqual(['الخطة', 'ترتيب الورد']);
  });

  it('«ترتيب الورد»: the category order with its gentle note, and back to the plan order', async () => {
    const repos = await withPlan(true);
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText('مثال لوردك الآن:')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /^ترتيب الأبواب/ }));
    await waitFor(async () => expect((await repos.settings.getAll()).wardOrder).toBe('category'));
    expect(await screen.findByText(/^ترتيب الخطة أسهل للالتزام/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('العودة إلى ترتيب الخطة'));
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
    expect(screen.queryByText('أوقات الورد')).toBeNull();
  });

  it('on again: continue where they stopped — the days off count like a break', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const repos = await withPlan(false, addDays(DAY, -3));
    await renderWithApp(<AdwamuhaSettingsScreen />, repos, { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', true);
    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    expect(buttons.map((b) => b.text)).toEqual(['إلغاء', 'ابدأ من جديد', 'أكمل من حيث توقفت']);
    await act(async () => buttons[2]!.onPress!());
    await waitFor(async () => expect((await repos.adwamuha.load())?.enabled).toBe(true));
    // Off 3 days ago: the days after it, to yesterday (the days it was turned off and on count).
    expect(await repos.adwamuha.listPauses()).toEqual([
      { id: expect.any(Number), from: addDays(DAY, -2), to: addDays(DAY, -1), kind: 'off' },
    ]);
    expect((await repos.adwamuha.load())?.state.step).toBe(2);
    alert.mockRestore();
  });

  it('on again: «ابدأ من جديد» opens the setup where to start', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderWithApp(<AdwamuhaSettingsScreen />, await withPlan(false, DAY), { now: at(9) });
    await fireEvent(await screen.findByLabelText(TOGGLE), 'valueChange', true);
    (alert.mock.calls[0]![2] as AlertButton[])[1]!.onPress!();
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/start');
    alert.mockRestore();
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
    expect(await screen.findByText('هذا الوقت لا يناسب ترتيب الأوقات.')).toBeOnTheScreen();
    expect((await repos.settings.getAll()).wardTimes.eveningStart).toBe('16:00');
  });
});
describe('reminders with «أدومها» on', () => {
  function Sync() {
    useReminderSync();
    return null;
  }

  it('speak of the ward (the same two reminders)', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    notificationState.permission = { granted: true, canAskAgain: true };
    const repos = await withPlan(true);
    await repos.settings.set('morningReminder', { enabled: true, time: '06:00' });
    await renderWithApp(<Sync />, repos, { now: at(9) });
    await waitFor(() =>
      expect(notificationState.scheduled.get('reminder-morning')?.content.body).toBe(
        OWNER_TEXTS.labels.morningReminder,
      ),
    );
    expect(notificationState.scheduled.size).toBe(1);
    os.restore();
  });

  it('a tap opens the ward, not the whole category', async () => {
    notificationState.lastResponse = responseFor(1);
    await renderWithApp(<HomeScreen />, await withPlan(true), { now: at(7) });
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/adwamuha/ward/[session]',
        params: { session: 'morning' },
      }),
    );
  });

  it('with it off, a tap opens the category as before', async () => {
    notificationState.lastResponse = responseFor(133);
    await renderWithApp(<HomeScreen />, await withPlan(false), { now: at(18) });
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/category/[id]',
        params: { id: '133' },
      }),
    );
  });
});
