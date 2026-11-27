import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SettingsGroup } from '@/components/ui/SettingsRows';
import { useAppTheme } from '@/theme/ThemeProvider';

import { autoBackupKnown } from '@/features/backup/services/auto-backup';
import { AutoBackupStatus, StatusLine } from './AutoBackupStatus';
import { formatBackupDate, useBackup } from '@/features/backup/hooks/useBackup';

/**
 * Settings → «النسخ الاحتياطي» (milestone 12): the last backup file and the
 * phone's own automatic backup, save a file, restore one.
 */
export function BackupSettings() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const { fileSavedAt, autoBackupAt, busy, save, restore } = useBackup();

  return (
    <SettingsGroup title={t('backup.title')}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <AppText tone="muted">{t('backup.about')}</AppText>
        <StatusLine
          ok={fileSavedAt !== null}
          text={
            fileSavedAt
              ? t('backup.lastFile', { date: formatBackupDate(t, fileSavedAt) })
              : t('backup.lastFileNever')
          }
        />
        {autoBackupKnown ? <AutoBackupStatus at={autoBackupAt} /> : null}
        <Button
          title={busy === 'save' ? t('backup.saving') : t('backup.save')}
          onPress={() => void save()}
          disabled={busy !== null}
        />
        <Button
          title={busy === 'restore' ? t('backup.restoring') : t('backup.restore')}
          kind="secondary"
          onPress={() => void restore()}
          disabled={busy !== null}
        />
      </View>
    </SettingsGroup>
  );
}
