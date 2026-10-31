import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { type DayKey, addDays } from './logic/days';
import type { Session } from './logic/sessions';

/** A sheet from the bottom of the screen (design), dimming what is behind. */
function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopStartRadius: radii.lg,
              borderTopEndRadius: radii.lg,
              padding: spacing.lg,
              gap: spacing.md,
            },
          ]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** The wards of today and yesterday not recorded yet whose time has begun, newest first. */
export function unrecordedWards(
  records: readonly { date: DayKey; session: Session }[],
  today: DayKey,
  nowSession: Session,
): { date: DayKey; session: Session }[] {
  const yesterday = addDays(today, -1);
  const all: { date: DayKey; session: Session }[] = [
    { date: today, session: 'morning' },
    ...(nowSession === 'evening' ? [{ date: today, session: 'evening' as const }] : []),
    { date: yesterday, session: 'morning' },
    { date: yesterday, session: 'evening' },
  ];
  return all.filter((w) => !records.some((r) => r.date === w.date && r.session === w.session));
}

/**
 * «قرأتُ وردي بدون التطبيق» (design): only today's and yesterday's wards not
 * recorded; a tap records one at once (it counts as if read in the app).
 */
export function ReadOutsideSheet({
  visible,
  onClose,
  onRecorded,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after a ward was recorded (e.g. for a short word of thanks). */
  onRecorded: () => void;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { records, slot, markFromMemory } = useAdwamuha();
  const now = slot();
  const wards = unrecordedWards(records, now.date, now.session);

  const record = async (date: DayKey, session: Session) => {
    const added = await markFromMemory(session, date).catch(() => false);
    onClose();
    if (added) onRecorded();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <AppText variant="heading" accessibilityRole="header">
        {t('adwamuha.masari.pickTitle')}
      </AppText>
      <AppText tone="muted">{t('adwamuha.masari.pickText')}</AppText>
      {wards.length === 0 ? (
        <AppText style={styles.center}>{t('adwamuha.masari.nothingLeft')}</AppText>
      ) : (
        wards.map(({ date, session }) => {
          const ward = t(`adwamuha.wardTitle.${session}`);
          const when = t(
            date === now.date ? 'adwamuha.masari.todayWord' : 'adwamuha.masari.yesterdayWord',
          );
          return (
            <Pressable
              key={`${date}:${session}`}
              accessibilityRole="button"
              accessibilityLabel={`${ward}، ${when}`}
              onPress={() => void record(date, session)}
              style={({ pressed }) => [
                styles.row,
                {
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                },
              ]}
            >
              <Icon
                name={session === 'morning' ? 'sun' : 'moon'}
                color={session === 'morning' ? colors.accent : colors.primary}
              />
              <AppText variant="bodyStrong" style={styles.fill}>
                {ward}
              </AppText>
              <AppText variant="caption" tone="muted">
                {when}
              </AppText>
              <Icon name="plus" size={18} color={colors.primary} />
            </Pressable>
          );
        })
      )}
      <AppText variant="caption" tone="faint" style={styles.center}>
        {t('adwamuha.masari.onlyTwoDays')}
      </AppText>
    </Sheet>
  );
}

/** A tap on yesterday's empty dot: record that ward, after a yes. */
export function YesterdaySheet({
  session,
  onClose,
  onRecorded,
}: {
  session: Session | null;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const { t } = useTranslation();
  const { slot, markFromMemory } = useAdwamuha();
  const yesterday = addDays(slot().date, -1);
  const dayNames = t('adwamuha.masariHelp.dayNames', { returnObjects: true }) as string[];
  const [y, m, d] = yesterday.split('-').map(Number) as [number, number, number];
  const ward = session ? t(`adwamuha.sessionName.${session}`) : '';

  const confirm = async () => {
    if (!session) return;
    const added = await markFromMemory(session, yesterday).catch(() => false);
    onClose();
    if (added) onRecorded();
  };

  return (
    <Sheet visible={session !== null} onClose={onClose}>
      <AppText variant="heading" accessibilityRole="header">
        {t('adwamuha.masari.yesterdayTitle', { ward })}
      </AppText>
      <AppText tone="muted">
        {t('adwamuha.masari.yesterdayText', {
          ward,
          day: dayNames[new Date(y, m - 1, d).getDay()] ?? '',
        })}
      </AppText>
      <Button title={t('adwamuha.masari.yesterdayConfirm')} onPress={() => void confirm()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // The screen behind, dimmed (same in light and dark).
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  sheet: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
