import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import type { CountedItem } from '@/features/reader/state/counter-store';
import { useCount } from '@/features/reader/state/useCounters';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { ProgressRing } from './ProgressRing';

/**
 * The counter under the dhikr: the ring, the count, the hint. Part of the tap zone; for
 * TalkBack it is one button that counts. Only this part draws again on a tap.
 */
export function ReaderCounter({
  dhikr,
  landscape,
  onTap,
}: {
  dhikr: CountedItem;
  landscape: boolean;
  onTap: () => void;
}) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const done = useCount(dhikr.id);

  return (
    <View
      style={[
        styles.counter,
        landscape
          ? { justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm }
          : { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('reader.counter', { done, total: dhikr.count })}
      accessibilityHint={t('reader.counterHint')}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate') onTap();
      }}
    >
      <ProgressRing progress={done / dhikr.count} completeColor={colors.primary}>
        <AppText style={styles.count}>{String(done)}</AppText>
        <AppText variant="caption" tone="muted">
          {t('reader.of', { total: dhikr.count })}
        </AppText>
      </ProgressRing>
      <AppText variant="caption" tone="faint" style={styles.hint}>
        {t('reader.hint')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { alignItems: 'center' },
  hint: { textAlign: 'center', maxWidth: 260 },
  count: { fontFamily: UI_FONTS.semibold, fontSize: 40, lineHeight: 48 },
});
