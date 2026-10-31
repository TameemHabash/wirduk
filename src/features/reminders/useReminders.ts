import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/data/settings/SettingsProvider';
import { useAdwamuhaOptional } from '@/features/adwamuha/AdwamuhaProvider';
import { OWNER_TEXTS } from '@/features/adwamuha/owner-texts';

import { REMINDER_CATEGORY, type ReminderTexts, categoryOf, syncReminders } from './reminders';

/** Shared with "continue where I stopped": a reminder tap wins over restoring. */
export const startupFromNotification = { opened: false };

/** The reminders' words; with «أدومها» on they speak of the ward (prompt §10). */
export function reminderTexts(t: TFunction, adwamuha = false): ReminderTexts {
  return {
    channelName: t('reminders.channel'),
    title: { morning: t('reminders.morningTitle'), evening: t('reminders.eveningTitle') },
    body: adwamuha
      ? { morning: OWNER_TEXTS.labels.morningReminder, evening: t('adwamuha.eveningReminder') }
      : { morning: t('reminders.morningBody'), evening: t('reminders.eveningBody') },
  };
}

/** One sync at a time, in order: two quick changes never end with the older one scheduled. */
let syncing: Promise<void> = Promise.resolve();

/**
 * Keeps the scheduled reminders in step with the settings, the app language,
 * and «أدومها» on/off (the same two reminders, never a second set). Root layout.
 */
export function useReminderSync(): void {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const adwamuhaOn = useAdwamuhaOptional()?.enabled ?? false;
  const { morningReminder: morning, eveningReminder: evening } = settings;
  useEffect(() => {
    const reminders = {
      morning: { enabled: morning.enabled, time: morning.time },
      evening: { enabled: evening.enabled, time: evening.time },
    };
    const texts = reminderTexts(t, adwamuhaOn);
    syncing = syncing.then(() => syncReminders(reminders, texts)).catch(() => undefined);
  }, [adwamuhaOn, morning.enabled, morning.time, evening.enabled, evening.time, t]);
}

const SESSION_OF_CATEGORY: Record<number, 'morning' | 'evening'> = {
  [REMINDER_CATEGORY.morning]: 'morning',
  [REMINDER_CATEGORY.evening]: 'evening',
};

/**
 * A tap on a reminder opens its adhkar — or, with «أدومها» on, that session's
 * ward: at app start (the tap that opened the app) and while the app runs.
 * Used by the Home screen, the first screen.
 */
export function useNotificationTaps(): void {
  const router = useRouter();
  const adwamuha = useAdwamuhaOptional();
  const adwamuhaReady = adwamuha?.ready ?? true;
  const adwamuhaOn = adwamuha?.enabled ?? false;

  // The tap that opened the app: noted at once (it wins over "continue where I
  // stopped"), opened once «أدومها»'s state is known.
  const [launch] = useState(() => {
    const response = Notifications.getLastNotificationResponse();
    const ok =
      response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      categoryOf(response.notification) !== null;
    if (ok) startupFromNotification.opened = true;
    return ok ? response.notification : null;
  });
  const launchHandled = useRef(false);

  useEffect(() => {
    if (!adwamuhaReady) return;
    const open = (notification: Notifications.Notification) => {
      const categoryId = categoryOf(notification);
      if (categoryId === null) return;
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      const session = SESSION_OF_CATEGORY[categoryId];
      if (adwamuhaOn && session) {
        router.push({ pathname: '/adwamuha/ward/[session]', params: { session } });
      } else {
        router.push({ pathname: '/category/[id]', params: { id: String(categoryId) } });
      }
    };
    if (launch && !launchHandled.current) {
      launchHandled.current = true;
      open(launch);
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        open(response.notification);
      }
    });
    return () => sub.remove();
  }, [adwamuhaOn, adwamuhaReady, launch, router]);
}
