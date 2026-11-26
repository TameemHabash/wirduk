import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextButton } from '@/components/TextButton';
import { useToast } from '@/components/Toast';
import { UI_FONTS } from '@/theme/fonts';
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
      <StatusLine
        ok={!autoBackupLooksOff(at)}
        text={
          at ? t('backup.lastAuto', { date: formatBackupDate(t, at) }) : t('backup.lastAutoNever')
        }
      />
      {always ? (
        <Button
          title={buttonTitle ?? t('backup.enableAuto')}
          kind="secondary"
          onPress={() => void enable()}
        />
      ) : autoBackupLooksOff(at) ? (
        <TextButton title={t('backup.enableAuto')} onPress={() => void enable()} />
      ) : null}
    </View>
  );
}

/** A backup's state in one line: a teal check when fine, gold info when not (design). */
export function StatusLine({ ok, text }: { ok: boolean; text: string }) {
  const { colors } = useAppTheme();
  const color = ok ? colors.primaryInk : colors.accentInk;
  return (
    <View style={styles.status}>
      <Icon name={ok ? 'check' : 'info'} size={15} color={color} strokeWidth={2.2} />
      <AppText style={[styles.statusText, { color }]}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { flexShrink: 1, fontFamily: UI_FONTS.semibold, fontSize: 12, lineHeight: 19 },
});
