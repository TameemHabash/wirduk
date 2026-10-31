import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { useToast } from '@/components/Toast';
import { BackupError, type BackupSummary } from '@/data/backup/backup-db';
import { useRepositories, useRestartApp } from '@/data/DataProvider';

import { lastAutoBackupAt } from './auto-backup';
import {
  discardPickedBackup,
  makeBackupFile,
  pickBackupFile,
  restorePickedBackup,
  shareBackupFile,
} from './backup-files';

/** Set just before the app restarts after a restore; Home shows "restored" once. */
let restoredNotice = false;

/** True once after a restore (the app has started again since). */
export function takeRestoredNotice(): boolean {
  const notice = restoredNotice;
  restoredNotice = false;
  return notice;
}

/** "25/10/2026" (a backup's day, as the rest of the app writes dates). */
export function formatBackupDate(t: TFunction, at: number): string {
  const d = new Date(at);
  return t('backup.date', { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
}

/** What a backup holds, one line each, for the confirmation. */
function describe(t: TFunction, s: BackupSummary): string {
  const lines = [
    s.customAdhkar > 0 ? t('backup.contents.customAdhkar', { n: s.customAdhkar }) : null,
    s.recordings > 0 ? t('backup.contents.recordings', { n: s.recordings }) : null,
    s.adwamuhaStep !== null ? t('backup.contents.adwamuhaStep', { n: s.adwamuhaStep }) : null,
    s.wardDays > 0 ? t('backup.contents.wardDays', { n: s.wardDays }) : null,
    s.favorites > 0 ? t('backup.contents.favorites', { n: s.favorites }) : null,
  ].filter((line): line is string => line !== null);
  return t('backup.confirmBody', {
    date: formatBackupDate(t, s.createdAt),
    contents: lines.length > 0 ? lines.join('\n') : t('backup.contents.settingsOnly'),
  });
}

/**
 * The backup file's actions (Settings and the note on Home): save it through
 * the share sheet, or pick one, confirm and restore it (the app then starts
 * again on the restored data).
 */
export function useBackup() {
  const { t } = useTranslation();
  const toast = useToast();
  const { backup } = useRepositories();
  const restartApp = useRestartApp();
  const [fileSavedAt, setFileSavedAt] = useState<number | null>(null);
  const [autoBackupAt] = useState(lastAutoBackupAt);
  const [busy, setBusy] = useState<'save' | 'restore' | null>(null);

  useEffect(() => {
    let cancelled = false;
    backup
      .fileSavedAt()
      .then((at) => !cancelled && setFileSavedAt(at))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backup]);

  const save = useCallback(async () => {
    if (busy) return;
    setBusy('save');
    try {
      const made = await makeBackupFile(backup);
      await shareBackupFile(made.uri, t('backup.shareTitle'));
      // The share sheet cannot tell whether the user really saved it: counted when it was offered.
      await backup.setFileSavedAt(made.summary.createdAt);
      setFileSavedAt(made.summary.createdAt);
      return true;
    } catch {
      toast.show({ message: t('backup.errors.saveFailed') });
      return false;
    } finally {
      setBusy(null);
    }
  }, [backup, busy, t, toast]);

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy('restore');
    let summary: BackupSummary | null;
    try {
      summary = await pickBackupFile(backup);
    } catch (e) {
      setBusy(null);
      const problem = e instanceof BackupError ? e.problem : 'failed';
      toast.show({ message: t(`backup.errors.${problem}`) });
      return;
    }
    if (!summary) {
      setBusy(null);
      return;
    }
    const picked = summary;
    const cancel = () => {
      void discardPickedBackup().catch(() => undefined);
      setBusy(null);
    };
    Alert.alert(
      t('backup.confirmTitle'),
      describe(t, picked),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: cancel },
        {
          text: t('backup.confirm'),
          style: 'destructive',
          onPress: () => {
            void restorePickedBackup(backup, picked).then(
              () => {
                restoredNotice = true;
                restartApp();
              },
              () => {
                setBusy(null);
                toast.show({ message: t('backup.errors.failed') });
              },
            );
          },
        },
      ],
      { cancelable: true, onDismiss: cancel },
    );
  }, [backup, busy, restartApp, t, toast]);

  return { fileSavedAt, autoBackupAt, busy, save, restore };
}
