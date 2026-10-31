import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/HomeScreen';
import { notificationState, pickTime } from '@/test-utils/notifications-mock';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { addDays } from './logic/days';
import { startPlan } from './logic/progress';
import { copyDefaultPlan, wardDhikrIds } from './logic/ward';
import { OWNER_TEXTS } from './owner-texts';
import { ProgressScreen } from './ProgressScreen';
import { dhikrLabel, firstWords, setupShownKey } from './setup';
import { SetupIntroScreen } from './SetupIntroScreen';
import { SetupOrderScreen } from './SetupOrderScreen';
import { SetupRemindersScreen } from './SetupRemindersScreen';
import { SetupStartScreen } from './SetupStartScreen';

const KURSI = OWNER_TEXTS.wardNames['1001'];
const QULS = OWNER_TEXTS.wardNames['1002'];

const DAY = '2026-03-04';
const at = (hh: number) => () => new Date(2026, 2, 4, hh, 0);

/** `newInstall`: the setup not seen yet for this version. */
async function withPlan(enabled: boolean, newInstall = false): Promise<Repositories> {
  const repos = await createTestRepositories({ newInstall });
  const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
  await repos.adwamuha.save({
    enabled,
    plan,
    state: startPlan(2, addDays(DAY, -10)),
    startedOn: addDays(DAY, -10),
    offSince: enabled ? null : DAY,
  });
  return repos;
}

afterEach(async () => {
  await settleLists();
});

describe('when the setup shows', () => {
  it('on the first launch, while «أدومها» is off', async () => {
    const repos = await createTestRepositories({ newInstall: true });
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/intro'));
    expect(await repos.adwamuha.wasShown(setupShownKey())).toBe(true);
  });

  it('once per app version: not again until the next update («لاحقًا» hides it until then)', async () => {
    const repos = await createTestRepositories();
    await repos.adwamuha.markShown(setupShownKey());
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await screen.findByText('كل الأذكار');
    expect(mockRouter.push).not.toHaveBeenCalledWith('/adwamuha/intro');
  });

  it('after an update too, when it was turned off', async () => {
    const repos = await withPlan(false, true);
    await repos.adwamuha.markShown('setup:0.9.0+0'); // seen for an older version only
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/intro'));
  });

  it('never while it is on', async () => {
    const repos = await withPlan(true, true);
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    await screen.findByText(OWNER_TEXTS.labels.todayWard);
    expect(mockRouter.push).not.toHaveBeenCalledWith('/adwamuha/intro');
    expect(await repos.adwamuha.wasShown(setupShownKey())).toBe(false);
  });
});

describe('setup 1: what «أدومها» is', () => {
  it('the hadith, three points (the owner’s «النية لكل يوم» kept), «فعّل أدومها» and «لاحقًا»', async () => {
    await renderWithApp(<SetupIntroScreen />, undefined, { now: at(9) });
    expect(await screen.findByText(OWNER_TEXTS.hadith.text)).toBeOnTheScreen();
    expect(screen.getByText('ابنِ وردك خطوةً خطوة')).toBeOnTheScreen();
    expect(screen.getByText(/^النية لكل يوم، /)).toBeOnTheScreen();
    expect(screen.getByLabelText('الشاشة 1 من 4')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('فعّل أدومها'));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/start');
    await fireEvent.press(screen.getByText('لاحقًا'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('turned off before: continue where they stopped, or start again', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const repos = await withPlan(false);
    await renderWithApp(<SetupIntroScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText('فعّل أدومها'));
    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    expect(buttons.map((b) => b.text)).toEqual(['إلغاء', 'ابدأ من جديد', 'أكمل من حيث توقفت']);
    await act(async () => buttons[2]!.onPress!());
    await waitFor(async () => expect((await repos.adwamuha.load())?.enabled).toBe(true));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
    alert.mockRestore();
  });
});

describe('setup 2: where to start', () => {
  it('step 1 by default; «أحافظ على بعضها» picks a step from 2, with the ward’s first words', async () => {
    const repos = await createTestRepositories();
    await renderWithApp(<SetupStartScreen />, repos, { now: at(9) });
    // «ابدأ», not «أبدأ» (owner, 2026-10-30).
    const first = await screen.findByRole('radio', { name: /^ابدأ من أول خطوة/ });
    expect(first.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByLabelText('خطوة أكثر')).toBeNull();
    await fireEvent.press(screen.getByText('التالي'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/adwamuha/order',
      params: { step: '1' },
    });

    await fireEvent.press(screen.getByText('أحافظ على بعضها'));
    expect(screen.getByText('الخطوة 2 من 24')).toBeOnTheScreen();
    expect(screen.getByLabelText('خطوة أقل')).toBeDisabled();
    // The preview: the first words of the morning ward, from the database.
    const opening = (await repos.content.getDhikr(1901, 'ar'))!;
    expect(screen.getByText(firstWords(opening.text))).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('خطوة أكثر'));
    expect(screen.getByText('الخطوة 3 من 24')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('التالي'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/adwamuha/order',
      params: { step: '3' },
    });
  });

  it('every dhikr of the step shows, two of them by the owner’s names (owner, 2026-10-30)', async () => {
    const repos = await createTestRepositories();
    await renderWithApp(<SetupStartScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText('أحافظ على بعضها'));
    for (let i = 2; i < 8; i++) await fireEvent.press(screen.getByLabelText('خطوة أكثر'));
    expect(screen.getByText('الخطوة 8 من 24')).toBeOnTheScreen();
    const plan = copyDefaultPlan(await repos.content.getDefaultPlan('ar'));
    const ids = wardDhikrIds(plan, 8, 'morning');
    const texts = new Map(
      (await repos.content.listAdhkar(APP_CONFIG.content.morningCategoryId, 'ar')).map(
        (d) => [d.id, d.text] as const,
      ),
    );
    const labels = ids.map((id) => dhikrLabel(id, texts.get(id) ?? ''));
    expect(labels).toContain(KURSI);
    expect(labels).toContain(QULS);
    const preview = screen.getByLabelText(/^أذكار ورد الصباح: /);
    expect(preview.props.accessibilityLabel).toBe(`أذكار ورد الصباح: ${labels.join('، ')}`);
    expect(screen.queryByText('…')).toBeNull();
  });

  it('first words end with «…» when cut; the two named adhkar show their names', () => {
    expect(firstWords('أ ب ت ث')).toBe('أ ب ت…');
    expect(firstWords('أ ب')).toBe('أ ب');
    expect(firstWords('أ ب ت، ث')).toBe('أ ب ت…');
    expect(dhikrLabel(1001, 'أ ب ت ث')).toBe(KURSI);
    expect(dhikrLabel(133002, 'أ ب ت ث')).toBe(QULS);
    expect(dhikrLabel(1012, 'أ ب ت ث')).toBe('أ ب ت…');
  });
});

describe('setup 3: the ward order (owner, 2026-10-30)', () => {
  it('as in the settings: «ننصح به», the whole ward first, four on request, saved at once', async () => {
    const repos = await createTestRepositories();
    setRouteParams({ step: '6' }); // the opening and 6 adhkar
    await renderWithApp(<SetupOrderScreen />, repos, { now: at(9) });
    expect(await screen.findByText('مثال لوردك الآن:')).toBeOnTheScreen();
    expect(screen.getByLabelText('الشاشة 3 من 4')).toBeOnTheScreen();
    const plan = await screen.findByRole('radio', { name: /^ترتيب الخطة\. ننصح به\. / });
    expect(plan.props.accessibilityState).toMatchObject({ selected: true });
    // All of it first, with the owner's names.
    expect(await screen.findByText(KURSI)).toBeOnTheScreen();
    expect(screen.getByText(QULS)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('عرض أول أربعة'));
    expect(screen.queryByText(KURSI)).toBeNull();
    await fireEvent.press(screen.getByText('عرض الورد كله (7)'));
    expect(screen.getByText(KURSI)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: /^ترتيب الأبواب/ }));
    await waitFor(async () => expect((await repos.settings.getAll()).wardOrder).toBe('category'));
    expect(await screen.findByText(/^ترتيب الخطة أسهل للالتزام/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('التالي'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/adwamuha/reminders',
      params: { step: '6' },
    });
  });
});

describe('setup 4: the reminders, then the path begins', () => {
  it('both on here; «ابدأ مساري» asks for notifications, saves them, starts and opens Home', async () => {
    notificationState.permission = { granted: false, canAskAgain: true };
    const repos = await createTestRepositories();
    setRouteParams({ step: '3' });
    await renderWithApp(<SetupRemindersScreen />, repos, { now: at(9) });
    const morning = await screen.findByLabelText('ورد الصباح');
    expect(morning.props.value).toBe(true);
    expect(screen.getByLabelText('ورد المساء').props.value).toBe(true);
    // A new time for the morning.
    await fireEvent.press(screen.getByLabelText('تغيير وقت ورد الصباح، الوقت الآن 6:00 ص'));
    await act(async () => pickTime(7, 0));
    await fireEvent.press(screen.getByText('ابدأ مساري'));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/'));
    expect(notificationState.asked).toBe(1);
    const settings = await repos.settings.getAll();
    expect(settings.morningReminder).toEqual({ enabled: true, time: '07:00' });
    expect(settings.eveningReminder).toEqual({ enabled: true, time: '17:00' });
    expect(await repos.adwamuha.load()).toMatchObject({
      enabled: true,
      startedOn: DAY,
      state: { step: 3, startWeeks: 2, planStartedIn: 'morning' },
    });
    expect((await repos.adwamuha.listEvents()).map((e) => [e.kind, e.step])).toEqual([
      ['start', 3],
    ]);
  });

  it('both turned off: no question, and they stay off', async () => {
    notificationState.permission = { granted: false, canAskAgain: true };
    const repos = await createTestRepositories();
    setRouteParams({ step: '1' });
    await renderWithApp(<SetupRemindersScreen />, repos, { now: at(9) });
    await fireEvent(await screen.findByLabelText('ورد الصباح'), 'valueChange', false);
    await fireEvent(screen.getByLabelText('ورد المساء'), 'valueChange', false);
    await fireEvent.press(screen.getByText('ابدأ مساري'));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/'));
    expect(notificationState.asked).toBe(0);
    const settings = await repos.settings.getAll();
    expect([settings.morningReminder.enabled, settings.eveningReminder.enabled]).toEqual([
      false,
      false,
    ]);
  });

  it('notifications refused: the reminders stay off, and the path still begins', async () => {
    notificationState.permission = { granted: false, canAskAgain: true };
    notificationState.answer = false;
    const repos = await createTestRepositories();
    setRouteParams({ step: '1' });
    await renderWithApp(<SetupRemindersScreen />, repos, { now: at(9) });
    await fireEvent.press(await screen.findByText('ابدأ مساري'));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/'));
    expect((await repos.settings.getAll()).morningReminder.enabled).toBe(false);
    expect((await repos.adwamuha.load())?.enabled).toBe(true);
  });

  it('started in the evening: that morning shows "—" and is not counted', async () => {
    notificationState.permission = { granted: true, canAskAgain: true };
    const repos = await createTestRepositories();
    setRouteParams({ step: '1' });
    await renderWithApp(<SetupRemindersScreen />, repos, { now: at(20) });
    await fireEvent.press(await screen.findByText('ابدأ مساري'));
    await waitFor(async () =>
      expect((await repos.adwamuha.load())?.state).toMatchObject({
        stepStartedIn: 'evening',
        planStartedIn: 'evening',
      }),
    );
    await renderWithApp(<ProgressScreen />, repos, { now: at(20) });
    expect(await screen.findByLabelText('اليوم، الصباح: —')).toBeOnTheScreen();
    expect(screen.getByLabelText('اليوم، المساء: لم يُقرأ بعد')).toBeOnTheScreen();
  });
});
