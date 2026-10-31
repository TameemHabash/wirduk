/**
 * Morning and evening reminders: daily LOCAL notifications (no push, no
 * server, nothing leaves the phone). Both off by default (docs/brief.md §12).
 * Each one opens its adhkar when tapped (see useNotificationTaps).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { ReminderSetting } from '@/data/settings/settings';

import { parseTime } from './reminder-time';

export type ReminderKind = 'morning' | 'evening';
export const REMINDER_KINDS: readonly ReminderKind[] = ['morning', 'evening'];

/** The category each reminder opens. */
export const REMINDER_CATEGORY: Record<ReminderKind, number> = { morning: 1, evening: 133 };

export const REMINDER_CHANNEL = 'reminders';
const IDENTIFIER: Record<ReminderKind, string> = {
  morning: 'reminder-morning',
  evening: 'reminder-evening',
};

export interface ReminderTexts {
  channelName: string;
  title: Record<ReminderKind, string>;
  body: Record<ReminderKind, string>;
}

/** Android needs a channel (and on Android 13+ one must exist before asking for permission). */
async function ensureChannel(name: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** True when notifications are allowed; asks once if they are not decided yet. */
export async function ensurePermission(channelName: string): Promise<boolean> {
  await ensureChannel(channelName);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Makes the scheduled reminders match the settings: one daily notification per enabled reminder. */
export async function syncReminders(
  reminders: Record<ReminderKind, ReminderSetting>,
  texts: ReminderTexts,
): Promise<void> {
  // No channel (an entry in the phone's settings) until a reminder is used.
  if (REMINDER_KINDS.some((kind) => reminders[kind].enabled)) {
    await ensureChannel(texts.channelName);
  }
  for (const kind of REMINDER_KINDS) {
    await Notifications.cancelScheduledNotificationAsync(IDENTIFIER[kind]).catch(() => undefined);
    const reminder = reminders[kind];
    if (!reminder.enabled) continue;
    const { hour, minute } = parseTime(reminder.time);
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER[kind],
      content: {
        title: texts.title[kind],
        body: texts.body[kind],
        data: { categoryId: REMINDER_CATEGORY[kind] },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: REMINDER_CHANNEL,
      },
    });
  }
}

/** A reminder that arrives while the app is open is still shown (no badge on the icon). */
export function showRemindersInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}

/** The category a notification opens, or null (not ours). */
export function categoryOf(notification: Notifications.Notification): number | null {
  const id = (notification.request.content.data as { categoryId?: unknown } | null)?.categoryId;
  return typeof id === 'number' && Number.isInteger(id) ? id : null;
}
