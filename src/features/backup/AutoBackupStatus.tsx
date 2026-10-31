import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useAppTheme } from '@/theme/ThemeProvider';

import { autoBackupKnown, autoBackupLooksOff, openBackupSettings } from './auto-backup';
import { formatBackupDate } from './useBackup';

/**
 * Android's automatic backup: when it last saved the app's data and, when it
 * looks off (never, or not for 30 days), a button to the phone's backup
 * settings (owner, 2026-10-25). Nothing on a phone that cannot tell (iOS).
 */
export function AutoBackupStatus({
  at,
  always = false,
  buttonTitle,
}: {
  at: number | null;
  /** Show the button even when the backup looks on (the «أدومها» settings card, design). */
  always?: boolean;
  buttonTitle?: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { spacing } = useAppTheme();
  if (!autoBackupKnown) return null;

  const enable = async () => {
    // Without a backup screen (Google's or stock Android's) the phone opens its main Settings.
    if ((await openBackupSettings()) !== 'backup') {
      toast.show({ message: t('backup.findInSettings') });
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" tone="muted">
        {at ? t('backup.lastAuto', { date: formatBackupDate(t, at) }) : t('backup.lastAutoNever')}
      </AppText>
      {always || autoBackupLooksOff(at) ? (
        <Button
          title={buttonTitle ?? t('backup.enableAuto')}
          kind="secondary"
          onPress={() => void enable()}
        />
      ) : null}
    </View>
  );
}
