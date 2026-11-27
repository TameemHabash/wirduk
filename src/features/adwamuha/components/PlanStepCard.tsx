import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DhikrText } from '@/components/ui/DhikrText';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { toneColors } from '@/theme/tones';

/** One step of the plan editor (design `.pstep`): the current one framed in teal. */
export function PlanStepCard({
  title,
  current,
  badge,
  action,
  label,
  session,
  stepper,
}: {
  title: string;
  current: boolean;
  badge: ReactNode;
  action: ReactNode;
  label: string;
  session: string;
  stepper: ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: current ? colors.primary : colors.border,
          borderWidth: current ? 2 : 1,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText style={styles.strong}>{title}</AppText>
        {badge}
        <View style={styles.fill} />
        {action}
      </View>
      <DhikrText size={17} style={styles.start}>
        {label}
      </DhikrText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="caption" tone="muted" style={styles.fill}>
          {session}
        </AppText>
        {stepper}
      </View>
    </View>
  );
}

/** A small pill next to a step's title (the current step, done, put back). */
export function PlanBadge({ tone, children }: { tone: 'primary' | 'gold'; children: string }) {
  const { colors } = useAppTheme();
  const look = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: look.background }]}>
      <AppText style={[styles.badgeText, { color: look.icon }]}>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  strong: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
  start: { textAlign: 'auto' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontFamily: UI_FONTS.semibold, fontSize: 12, lineHeight: 18 },
});
