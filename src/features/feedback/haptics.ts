import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Length of the "category finished" vibration on Android (iOS uses its fixed system vibration). */
export const COMPLETION_VIBRATION_MS = 600;

/** Moving on to the next dhikr: longer than a count, shorter than a finished category. */
export const NEXT_DHIKR_VIBRATION_MS = 200;

/**
 * Vibration feedback. Every call is a no-op when its setting is off.
 * Failures (devices without a vibrator) are ignored on purpose.
 */
export const haptics = {
  /** One count. The lightest feedback, so long sessions are not tiring. */
  count(enabled: boolean): void {
    if (enabled) void Haptics.selectionAsync().catch(() => undefined);
  },
  /** A dhikr reached its count and the reader moves on to the next one (its own setting). */
  nextDhikr(enabled: boolean): void {
    if (!enabled) return;
    if (Platform.OS === 'android') Vibration.vibrate(NEXT_DHIKR_VIBRATION_MS);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  },
  /** The whole category is done: one long vibration (its own setting). */
  categoryComplete(enabled: boolean): void {
    if (!enabled) return;
    if (Platform.OS === 'android') Vibration.vibrate(COMPLETION_VIBRATION_MS);
    else Vibration.vibrate(); // iOS: fixed-length system vibration
  },
};
