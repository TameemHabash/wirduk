import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { RowDivider, SettingsGroup } from '@/features/settings/SettingsParts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { autoBackupKnown } from './auto-backup';
import { AutoBackupStatus } from './AutoBackupStatus';
import { formatBackupDate, useBackup } from './useBackup';

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
        <AppText variant="caption" tone="muted">
          {fileSavedAt
            ? t('backup.lastFile', { date: formatBackupDate(t, fileSavedAt) })
            : t('backup.lastFileNever')}
        </AppText>
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
      {autoBackupKnown ? (
        <>
          <RowDivider />
          <View style={{ padding: spacing.lg }}>
            <AutoBackupStatus at={autoBackupAt} />
          </View>
        </>
      ) : null}
    </SettingsGroup>
  );
}
