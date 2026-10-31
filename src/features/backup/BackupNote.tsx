import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useRepositories } from '@/data/DataProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import { lastAutoBackupAt } from './auto-backup';
import { shouldShowBackupNote } from './backup-note';
import { takeRestoredNotice, useBackup } from './useBackup';

/**
 * Home: a gentle note when nothing saved the user's data for 30 days (owner,
 * 2026-10-25), with «احفظ نسخة الآن». Shown once, then not for 30 days. Also
 * says "restored" once after a restore (the app started again).
 */
export function BackupNote({ now = Date.now }: { now?: () => number }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { colors, radii, spacing } = useAppTheme();
  const { backup } = useRepositories();
  const { save, busy } = useBackup();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (takeRestoredNotice()) toast.show({ message: t('backup.restored') });
  }, [t, toast]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([backup.dataSince(), backup.fileSavedAt(), backup.noteShownAt()])
      .then(async ([dataSince, fileSavedAt, noteShownAt]) => {
        const at = now();
        const due = shouldShowBackupNote({
          now: at,
          dataSince,
          lastAutoBackupAt: lastAutoBackupAt(),
          fileSavedAt,
          noteShownAt,
        });
        if (cancelled || !due) return;
        setShow(true);
        await backup.setNoteShownAt(at);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backup, now]);

  if (!show) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <AppText>{t('backup.note.text')}</AppText>
      <Button
        title={busy === 'save' ? t('backup.saving') : t('backup.note.save')}
        disabled={busy !== null}
        onPress={() => void save().then((saved) => saved && setShow(false))}
      />
      <Button title={t('backup.note.later')} kind="secondary" onPress={() => setShow(false)} />
    </View>
  );
}
