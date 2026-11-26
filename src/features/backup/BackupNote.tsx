import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextButton } from '@/components/TextButton';
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
  const { colors, spacing } = useAppTheme();
  const { backup } = useRepositories();
  const { save, busy } = useBackup();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (takeRestoredNotice())
      toast.show({ message: t('backup.restored'), icon: 'check', tone: 'gold' });
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
      style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.accentLine }]}
    >
      <View style={[styles.row, styles.top]}>
        <View style={[styles.tile, { backgroundColor: colors.surface }]}>
          <Icon name="shield" size={19} color={colors.accentInk} />
        </View>
        <AppText style={styles.text}>{t('backup.note.text')}</AppText>
      </View>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button
          title={busy === 'save' ? t('backup.saving') : t('backup.note.save')}
          size="small"
          disabled={busy !== null}
          onPress={() => void save().then((saved) => saved && setShow(false))}
        />
        <TextButton title={t('backup.note.later')} onPress={() => setShow(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  top: { alignItems: 'flex-start', gap: 10 },
  tile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 14, lineHeight: 24 },
});
