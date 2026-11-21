import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';

/**
 * The one-time message due now on Home: the welcome, or a new stage's tip (owner's design,
 * 2026-10-29). Gone once dismissed with «حسنًا». (Owner, 2026-11-21: no encouraging words on
 * Home.)
 */
export function MessageCard() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { messages, dismissMessage } = useAdwamuha();
  const message = messages[0];
  if (!message) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <AppText>{message.text}</AppText>
      <Button
        title={t('adwamuha.message.ok')}
        kind="secondary"
        onPress={() => void dismissMessage(message)}
      />
    </View>
  );
}
