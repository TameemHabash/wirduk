import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { LibraryMessageView } from './LibraryMessageView';

/**
 * The message due now, once (prompt §9, §11): the end of the path (with the
 * offer to keep «أدومها» on or turn it off), a new step, a step back or break,
 * an extension, the end of a week, a new stage's tip. The owner's own words or
 * an approved verse / hadith. Shown on Home and on «مساري»; gone once dismissed.
 */
export function MessageCard() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { messages, dismissMessage, turnOff } = useAdwamuha();
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
      {message.content.kind === 'owner' ? (
        <AppText>{message.content.text}</AppText>
      ) : (
        <LibraryMessageView message={message.content.message} size={20} />
      )}
      {message.kind === 'finished' ? (
        <>
          <AppText tone="muted">{t('adwamuha.message.finishedOffer')}</AppText>
          <Button
            title={t('adwamuha.message.keepOn')}
            onPress={() => void dismissMessage(message)}
          />
          <Button
            title={t('adwamuha.message.turnOff')}
            kind="secondary"
            onPress={() => void dismissMessage(message).then(turnOff)}
          />
        </>
      ) : (
        <Button
          title={t('adwamuha.message.ok')}
          kind="secondary"
          onPress={() => void dismissMessage(message)}
        />
      )}
    </View>
  );
}
