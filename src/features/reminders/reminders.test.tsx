import { Linking, Platform } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/HomeScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import {
  mockNotifications,
  notificationState,
  pickTime,
  responseFor,
  tapNotification,
} from '@/test-utils/notifications-mock';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { useReminderSync } from './useReminders';

const MORNING = 'التذكير بأذكار الصباح';
const EVENING = 'التذكير بأذكار المساء';
const DENIED = 'الإشعارات غير مسموحة لوِرْدُك. اضغط هنا لفتح إعدادات التطبيق والسماح بها.';

/** Settings plus the root sync, the way the app has them. */
function SettingsWithSync() {
  useReminderSync();
  return <SettingsScreen />;
}

const scheduled = (id: string) => notificationState.scheduled.get(id);

describe('Reminders — settings', () => {
  // Channels exist on Android only (the tests run as iOS, where a switch shows `value`).
  let os: jest.ReplaceProperty<typeof Platform.OS> | undefined;
  const asAndroid = () => {
    os = jest.replaceProperty(Platform, 'OS', 'android');
  };
  afterEach(() => {
    os?.restore();
    os = undefined;
  });

  it('are both off by default, at 6:00 ص and 5:00 م', async () => {
    await renderWithApp(<SettingsScreen />);
    expect((await screen.findByLabelText(MORNING)).props.value).toBe(false);
    expect(screen.getByLabelText(EVENING).props.value).toBe(false);
    expect(screen.getByText('6:00 ص')).toBeOnTheScreen();
    expect(screen.getByText('5:00 م')).toBeOnTheScreen();
  });

  it('schedules nothing and adds no channel while both are off', async () => {
    asAndroid();
    await renderWithApp(<SettingsWithSync />);
    await screen.findByLabelText(MORNING);
    await waitFor(() =>
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2),
    );
    expect(notificationState.scheduled.size).toBe(0);
    // No channel in the phone's settings until a reminder is used.
    expect(notificationState.channels.size).toBe(0);
  });

  it('asks for permission once, then schedules a daily reminder that opens the adhkar', async () => {
    asAndroid();
    const { repos } = await renderWithApp(<SettingsWithSync />);
    await fireEvent(await screen.findByLabelText(MORNING), 'valueChange', true);
    await waitFor(() => expect(scheduled('reminder-morning')).toBeDefined());
    expect(notificationState.asked).toBe(1);
    expect(scheduled('reminder-morning')).toMatchObject({
      content: { title: 'أذكار الصباح', data: { categoryId: 1 } },
      trigger: { type: 'daily', hour: 6, minute: 0, channelId: 'reminders' },
    });
    expect(notificationState.channels.get('reminders')).toMatchObject({ name: 'التذكير بالأذكار' });
    expect((await repos.settings.getAll()).morningReminder).toEqual({
      enabled: true,
      time: '06:00',
    });
    expect(scheduled('reminder-evening')).toBeUndefined();

    // Already allowed: the evening one does not ask again.
    await fireEvent(screen.getByLabelText(EVENING), 'valueChange', true);
    await waitFor(() => expect(scheduled('reminder-evening')).toBeDefined());
    expect(scheduled('reminder-evening')).toMatchObject({
      content: { title: 'أذكار المساء', data: { categoryId: 133 } },
      trigger: { hour: 17, minute: 0 },
    });
    expect(notificationState.asked).toBe(1);

    // Off again: cancelled.
    await fireEvent(screen.getByLabelText(MORNING), 'valueChange', false);
    await waitFor(() => expect(scheduled('reminder-morning')).toBeUndefined());
    expect(scheduled('reminder-evening')).toBeDefined();
  });

  it('changes the time from the picker and moves the reminder', async () => {
    const repos = await createTestRepositories();
    await repos.settings.set('eveningReminder', { enabled: true, time: '17:00' });
    notificationState.permission = { granted: true, canAskAgain: true };
    await renderWithApp(<SettingsWithSync />, repos);
    await waitFor(() => expect(scheduled('reminder-evening')?.trigger).toMatchObject({ hour: 17 }));

    await fireEvent.press(
      screen.getByLabelText('تغيير وقت التذكير بأذكار المساء، الوقت الآن 5:00 م'),
    );
    await act(async () => pickTime(18, 45));
    expect(await screen.findByText('6:45 م')).toBeOnTheScreen();
    await waitFor(() =>
      expect(scheduled('reminder-evening')?.trigger).toMatchObject({ hour: 18, minute: 45 }),
    );
    expect((await repos.settings.getAll()).eveningReminder).toEqual({
      enabled: true,
      time: '18:45',
    });
  });

  it('keeps the newest time when the time changes quickly (one sync at a time)', async () => {
    const repos = await createTestRepositories();
    await repos.settings.set('eveningReminder', { enabled: true, time: '17:00' });
    notificationState.permission = { granted: true, canAskAgain: true };
    await renderWithApp(<SettingsWithSync />, repos);
    await waitFor(() => expect(scheduled('reminder-evening')?.trigger).toMatchObject({ hour: 17 }));

    // The phone is slow to schedule the first change.
    let release: (() => void) | undefined;
    mockNotifications.scheduleNotificationAsync.mockImplementationOnce(
      (request) =>
        new Promise((resolve) => {
          release = () => {
            notificationState.scheduled.set(request.identifier, request);
            resolve(request.identifier);
          };
        }),
    );
    const timeButton = /^تغيير وقت التذكير بأذكار المساء/;
    await fireEvent.press(screen.getByLabelText(timeButton));
    await act(async () => pickTime(18, 0));
    await waitFor(() => expect(release).toBeDefined());
    await fireEvent.press(screen.getByLabelText(timeButton));
    await act(async () => pickTime(19, 30));
    await act(async () => release?.());
    await waitFor(() =>
      expect(scheduled('reminder-evening')?.trigger).toMatchObject({ hour: 19, minute: 30 }),
    );
  });

  it('can change the time while the reminder is off, without scheduling it', async () => {
    const { repos } = await renderWithApp(<SettingsWithSync />);
    await fireEvent.press(await screen.findByLabelText(/^تغيير وقت التذكير بأذكار الصباح/));
    await act(async () => pickTime(5, 15));
    expect(await screen.findByText('5:15 ص')).toBeOnTheScreen();
    await waitFor(async () =>
      expect((await repos.settings.getAll()).morningReminder).toEqual({
        enabled: false,
        time: '05:15',
      }),
    );
    expect(notificationState.scheduled.size).toBe(0);
  });

  it('stays off when notifications are not allowed, and the message opens the phone settings', async () => {
    notificationState.answer = false;
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { repos } = await renderWithApp(<SettingsWithSync />);
    await fireEvent(await screen.findByLabelText(MORNING), 'valueChange', true);
    expect(await screen.findByText(DENIED)).toBeOnTheScreen();
    expect(screen.getByLabelText(MORNING).props.value).toBe(false);
    expect((await repos.settings.getAll()).morningReminder.enabled).toBe(false);
    expect(notificationState.scheduled.size).toBe(0);
    await fireEvent.press(screen.getByText(DENIED));
    expect(openSettings).toHaveBeenCalled();

    // "Never ask again": no question, the same message.
    await fireEvent(screen.getByLabelText(EVENING), 'valueChange', true);
    await waitFor(() => expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(2));
    expect(notificationState.asked).toBe(1);
    openSettings.mockRestore();
  });
});

describe('Reminders — a tap opens the adhkar', () => {
  it('opens the morning adhkar when the app was started by a tap, instead of restoring', async () => {
    const repos = await createTestRepositories();
    await repos.session.save({ categoryId: 27, dhikrId: 27001, counts: {} });
    notificationState.lastResponse = responseFor(1);
    await renderWithApp(<HomeScreen />, repos);
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/category/[id]',
        params: { id: '1' },
      }),
    );
    expect(notificationState.lastResponse).toBeNull(); // handled once
    await waitFor(async () => expect(await repos.session.load()).toBeNull());
    expect(mockRouter.push).toHaveBeenCalledTimes(1); // the saved state is not reopened
  });

  it('opens the evening adhkar on a tap while the app runs', async () => {
    await renderWithApp(<HomeScreen />);
    await screen.findByText('كل الأذكار');
    tapNotification(133);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '133' },
    });
  });

  it('ignores a notification that is not a reminder', async () => {
    notificationState.lastResponse = responseFor(null);
    await renderWithApp(<HomeScreen />);
    await screen.findByText('كل الأذكار');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
