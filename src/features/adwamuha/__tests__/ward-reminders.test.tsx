/** The morning and evening reminders while «أدومها» is on: they open the ward, in its time. */
import { Platform } from 'react-native';
import { act, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { useReminderSync } from '@/features/reminders/hooks/useReminders';
import { notificationState, responseFor, tapNotification } from '@/test-utils/mocks/notifications';
import { givenAdwamuha, givenWardRead } from '@/test-utils/given';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';

import { addDays } from '@/features/adwamuha/logic/days';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { DEFAULT_WARD_TIMES } from '@/data/models';
import { tr } from '@/test-utils/tr';

const DAY = '2026-03-04';
const at = (hh: number) => () => new Date(2026, 2, 4, hh, 0);

/** At step 2 since 10 days (on, or off). */
async function withPlan(enabled: boolean): Promise<Repositories> {
  return givenAdwamuha(await createTestRepositories(), {
    step: 2,
    startedOn: addDays(DAY, -10),
    enabled,
    offSince: enabled ? null : DAY,
  });
}

// Home's list draws more rows on a timer: let it finish inside the test.
afterEach(async () => {
  await settleLists();
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

  it('a tap on a ward already read today: Home stays, with a toast (owner, 2026-11-14)', async () => {
    notificationState.lastResponse = responseFor(1);
    const repos = await withPlan(true);
    await givenWardRead(repos, DAY, 'morning', { step: 2 });
    await renderWithApp(<HomeScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.alreadyRead.morning'))).toBeOnTheScreen();
    expect(notificationState.lastResponse).toBeNull(); // handled once
    expect(mockRouter.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/adwamuha/ward/[session]' }),
    );
  });

  it("a tap after its ward's time: Home stays, with a note (owner, 2026-11-21)", async () => {
    notificationState.lastResponse = responseFor(1);
    await renderWithApp(<HomeScreen />, await withPlan(true), { now: at(17) });
    expect(await screen.findByText(tr('adwamuha.wardOver.morning'))).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/adwamuha/ward/[session]' }),
    );
    // A tap while the app runs, on the evening reminder (its time now): its ward opens.
    await act(async () => tapNotification(133));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/adwamuha/ward/[session]',
      params: { session: 'evening' },
    });
  });

  it("last night's evening reminder tapped in the morning: its time is over", async () => {
    notificationState.lastResponse = responseFor(133);
    await renderWithApp(<HomeScreen />, await withPlan(true), { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.wardOver.evening'))).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/adwamuha/ward/[session]' }),
    );
  });

  it('the ward times come from the settings', async () => {
    const repos = await withPlan(true);
    await repos.settings.set('wardTimes', { ...DEFAULT_WARD_TIMES, eveningStart: '17:30' });
    // 17:00 is still the morning with these times: its ward opens.
    notificationState.lastResponse = responseFor(1);
    await renderWithApp(<HomeScreen />, repos, { now: at(17) });
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/adwamuha/ward/[session]',
        params: { session: 'morning' },
      }),
    );
  });

  it('a reminder set before its ward begins: when the ward starts, from the settings', async () => {
    const repos = await withPlan(true);
    await repos.settings.set('wardTimes', { ...DEFAULT_WARD_TIMES, eveningStart: '17:30' });
    await repos.settings.set('eveningReminder', { enabled: true, time: '16:00' });
    notificationState.lastResponse = responseFor(133);
    await renderWithApp(<HomeScreen />, repos, { now: () => new Date(2026, 2, 4, 16, 5) });
    expect(await screen.findByText('يبدأ ورد المساء الساعة 5:30 م')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/adwamuha/ward/[session]' }),
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
