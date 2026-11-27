import { showNotificationsDenied } from './notifications-denied';

const notAsked = { asked: false, reminderOn: false };
const denied = { granted: false, canAskAgain: true, status: 'denied' };

describe('showNotificationsDenied', () => {
  it('a new install (Android 13+ says "denied" before the app asked): no card', () => {
    expect(showNotificationsDenied(denied, notAsked)).toBe(false);
  });

  it('the app asked and the user said no: the card', () => {
    expect(showNotificationsDenied(denied, { asked: true, reminderOn: false })).toBe(true);
  });

  it('a reminder is on but notifications are off in the phone settings: the card', () => {
    expect(showNotificationsDenied(denied, { asked: false, reminderOn: true })).toBe(true);
  });

  it('Android will not ask again: the card, even if the app never asked', () => {
    expect(showNotificationsDenied({ granted: false, canAskAgain: false }, notAsked)).toBe(true);
  });

  it('allowed: no card', () => {
    const granted = { granted: true, canAskAgain: true, status: 'granted' };
    expect(showNotificationsDenied(granted, { asked: true, reminderOn: true })).toBe(false);
  });

  it('not decided yet (iOS "undetermined"): no card', () => {
    const undetermined = { granted: false, canAskAgain: true, status: 'undetermined' };
    expect(showNotificationsDenied(undetermined, { asked: true, reminderOn: true })).toBe(false);
  });
});
