import { useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useDialog } from '@/components/ui/Dialog';

/**
 * Asks before leaving a screen with unsaved changes (back button, gesture).
 * `onDiscard` runs when the user chooses to leave anyway. Keeping on editing is the
 * main button (the safe one, redesign).
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
  const dialog = useDialog();
  const allowed = useRef(false);
  const discardRef = useRef(onDiscard);

  useEffect(() => {
    discardRef.current = onDiscard;
  }, [onDiscard]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || allowed.current) return;
      e.preventDefault();
      dialog.show({
        icon: 'info',
        tone: 'gold',
        title: t('custom.discardTitle'),
        body: t('custom.discardBody'),
        actions: [
          { label: t('custom.keepEditing'), cancel: true },
          {
            label: t('custom.discard'),
            destructive: true,
            onPress: () => {
              allowed.current = true;
              discardRef.current?.();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
    });
    return unsubscribe;
  }, [navigation, dirty, t, dialog]);

  return {
    allowLeave: () => {
      allowed.current = true;
    },
  };
}
