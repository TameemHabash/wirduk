import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

/** A titled group of settings in one rounded box (`highlight`: a stronger border, for «أدومها»). */
export function SettingsGroup({
  title,
  children,
  highlight = false,
}: {
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText
        variant="label"
        tone="muted"
        accessibilityRole="header"
        style={{ paddingHorizontal: spacing.xs }}
      >
        {title}
      </AppText>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: highlight ? colors.primary : colors.border,
          borderWidth: highlight ? 1.5 : 1,
          borderRadius: radii.lg,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Thin line between rows inside a group. */
export function RowDivider() {
  const { colors } = useAppTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

/** A row that opens another screen. */
export function LinkRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg, gap: spacing.sm },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <AppText style={styles.label}>{label}</AppText>
      {value ? (
        <AppText variant="caption" tone="muted" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      <Icon name="forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

/** A row with an on/off switch, and an optional short explanation under the label. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg, gap: spacing.md },
        hint ? { paddingVertical: spacing.sm } : null,
      ]}
    >
      <View style={styles.label}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  label: { flex: 1 },
  // More room than Android measured, at the end next to the chevron ('right' is the end in
  // RTL): on a Galaxy S21+ the drawn text came out wider, its last word wrapped and was cut
  // («غير مفعّلة» showed «غير», owner 2026-10-30; as in wirduk-reports#2).
  value: { flexGrow: 0.25, flexShrink: 0, textAlign: 'right' },
});
