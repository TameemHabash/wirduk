/**
 * Test-only stand-ins for expo-notifications and the Android time picker
 * (wired in jest.setup.ui.ts). Tests read what was scheduled and act as the
 * user: answer the permission question, tap a notification, pick a time.
 */
import type * as Notifications from 'expo-notifications';

type Request = Notifications.NotificationRequestInput & { identifier: string };
type Response = { actionIdentifier: string; notification: { request: { content: unknown } } };

export const notificationState = {
  /** What the system answers. `canAskAgain: false` = the user said "never". */
  permission: { granted: false, canAskAgain: true },
  /** The answer to the question, when it is asked. */
  answer: true,
  asked: 0,
  scheduled: new Map<string, Request>(),
  channels: new Map<string, unknown>(),
  lastResponse: null as Response | null,
  listeners: new Set<(response: Response) => void>(),
};

export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

/** A reminder notification the way the system hands it back. */
export function responseFor(categoryId: number | null): Response {
  return {
    actionIdentifier: DEFAULT_ACTION,
    notification: {
      request: {
        content: { title: '', body: '', data: categoryId === null ? {} : { categoryId } },
      },
    },
  };
}

/** The user taps a notification while the app runs. */
export function tapNotification(categoryId: number): void {
  const response = responseFor(categoryId);
  notificationState.lastResponse = response;
  for (const listener of notificationState.listeners) listener(response);
}

export const mockNotifications = {
  DEFAULT_ACTION_IDENTIFIER: DEFAULT_ACTION,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn((id: string, channel: unknown) => {
    notificationState.channels.set(id, channel);
    return Promise.resolve(channel);
  }),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ ...notificationState.permission })),
  requestPermissionsAsync: jest.fn(() => {
    notificationState.asked += 1;
    notificationState.permission = {
      granted: notificationState.answer,
      canAskAgain: notificationState.answer,
    };
    return Promise.resolve({ ...notificationState.permission });
  }),
  scheduleNotificationAsync: jest.fn((request: Request) => {
    notificationState.scheduled.set(request.identifier, request);
    return Promise.resolve(request.identifier);
  }),
  cancelScheduledNotificationAsync: jest.fn((id: string) => {
    notificationState.scheduled.delete(id);
    return Promise.resolve();
  }),
  getLastNotificationResponse: jest.fn(() => notificationState.lastResponse),
  clearLastNotificationResponseAsync: jest.fn(() => {
    notificationState.lastResponse = null;
    return Promise.resolve();
  }),
  addNotificationResponseReceivedListener: jest.fn((listener: (r: Response) => void) => {
    notificationState.listeners.add(listener);
    return { remove: () => notificationState.listeners.delete(listener) };
  }),
};

type PickerArgs = { value: Date; onValueChange?: (event: unknown, date: Date) => void };

export const timePicker = { last: null as PickerArgs | null };

/** The user picks this time in the open picker. */
export function pickTime(hour: number, minute: number): void {
  const args = timePicker.last;
  if (!args) throw new Error('The time picker is not open');
  const date = new Date(args.value);
  date.setHours(hour, minute, 0, 0);
  timePicker.last = null;
  args.onValueChange?.({ nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } }, date);
}

export const mockDateTimePicker = {
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: {
    open: jest.fn((args: PickerArgs) => {
      timePicker.last = args;
    }),
    dismiss: jest.fn(() => Promise.resolve(true)),
  },
};

export function resetNotificationMocks(): void {
  notificationState.permission = { granted: false, canAskAgain: true };
  notificationState.answer = true;
  notificationState.asked = 0;
  notificationState.scheduled.clear();
  notificationState.channels.clear();
  notificationState.lastResponse = null;
  notificationState.listeners.clear();
  timePicker.last = null;
}
