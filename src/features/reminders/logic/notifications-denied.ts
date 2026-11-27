/** What the phone says about the app's notifications (expo-notifications' permission answer). */
export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status?: string;
}

export interface NotificationsContext {
  /** The app has asked (setting `notificationsAsked`). */
  asked: boolean;
  /** The morning or the evening reminder is on. */
  reminderOn: boolean;
}

/**
 * Does Settings show the card «notifications not allowed»? Android 13+ answers "denied" before
 * the app ever asked, so "denied" alone is not enough (the card showed on a new install; found in
 * RF6, owner: fix it, 2026-11-27). It shows when notifications are not allowed and:
 *  - the app has asked (the user said no; Android may still let the app ask once more), or
 *  - a reminder is on (allowed once, then turned off in the phone's settings; also a phone that
 *    was asked before `notificationsAsked` existed), or
 *  - Android will not ask again.
 */
export function showNotificationsDenied(
  permission: NotificationPermission,
  { asked, reminderOn }: NotificationsContext,
): boolean {
  if (permission.granted) return false;
  if (permission.canAskAgain === false) return true;
  return permission.status === 'denied' && (asked || reminderOn);
}
