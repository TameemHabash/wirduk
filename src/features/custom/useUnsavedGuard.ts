import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Asks before leaving a screen with unsaved changes (back button, gesture).
 * `onDiscard` runs when the user chooses to leave anyway.
 */
export function useUnsavedGuard(
  dirty: boolean,
  onDiscard?: () => void,
): {
  /** Leave without asking (after a successful save or delete). */
  allowLeave: () => void;
} {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const allowed = useRef(false);
  const discardRef = useRef(onDiscard);

  useEffect(() => {
    discardRef.current = onDiscard;
  }, [onDiscard]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || allowed.current) return;
      e.preventDefault();
      Alert.alert(t('custom.discardTitle'), t('custom.discardBody'), [
        { text: t('custom.keepEditing'), style: 'cancel' },
        {
          text: t('custom.discard'),
          style: 'destructive',
          onPress: () => {
            allowed.current = true;
            discardRef.current?.();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty, t]);

  return {
    allowLeave: () => {
      allowed.current = true;
    },
  };
}
