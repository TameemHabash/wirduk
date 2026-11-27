import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import {
  type NotificationPermission,
  showNotificationsDenied,
} from '@/features/reminders/logic/notifications-denied';

/**
 * Has the user turned notifications off for the app? Not yet asked does not count, even though
 * Android 13+ says "denied" then (`showNotificationsDenied`). Checked again when the screen is
 * shown, when the app comes back (the user may have changed it in the phone's settings), and
 * right after the app asked.
 */
export function useNotificationsDenied(): boolean {
  const { settings } = useSettings();
  const asked = settings.notificationsAsked;
  const reminderOn = settings.morningReminder.enabled || settings.eveningReminder.enabled;
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const check = useCallback(() => {
    let cancelled = false;
    Notifications.getPermissionsAsync()
      .then((p) => {
        if (cancelled) return;
        const status = (p as { status?: string }).status;
        setPermission({ granted: p.granted, canAskAgain: p.canAskAgain, status });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useFocusEffect(check);
  // The question's answer: Android's dialog does not always send the app to the background.
  useEffect(() => (asked ? check() : undefined), [asked, check]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);
  return permission !== null && showNotificationsDenied(permission, { asked, reminderOn });
}

/**
 * A lasting gold card above the reminder rows while notifications are not allowed (owner,
 * 2026-11-25: before, only a toast said so, once). A tap opens the app's page in the phone's
 * settings.
 */
export function NotificationsDeniedCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const denied = useNotificationsDenied();
  if (!denied) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.notificationsDenied')}
      onPress={() => void Linking.openSettings()}
      testID="notifications-denied"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: colors.surface }]}>
        <Icon name="bell" size={19} color={colors.accentInk} />
      </View>
      <AppText style={styles.text}>{t('settings.notificationsDenied')}</AppText>
      <Icon name="external" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  tile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13.5, lineHeight: 23 },
});
