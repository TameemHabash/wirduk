import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * Has the user turned notifications off for the app (denied, or "don't ask again")? Not
 * yet asked does not count. Checked again when the screen is shown and when the app comes
 * back (the user may have changed it in the phone's settings).
 */
export function useNotificationsDenied(): boolean {
  const [denied, setDenied] = useState(false);
  const check = useCallback(() => {
    let cancelled = false;
    Notifications.getPermissionsAsync()
      .then((p) => {
        if (cancelled) return;
        const status = (p as { status?: string }).status;
        setDenied(!p.granted && (status === 'denied' || p.canAskAgain === false));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useFocusEffect(check);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);
  return denied;
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
