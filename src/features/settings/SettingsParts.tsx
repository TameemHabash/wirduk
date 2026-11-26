import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { IconTile, type TileTone } from '@/components/IconTile';
import { UI_FONTS } from '@/theme/fonts';
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
  const { colors, spacing } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText
        variant="label"
        tone="muted"
        accessibilityRole="header"
        style={[styles.groupTitle, { paddingHorizontal: spacing.xs + 2 }]}
      >
        {title}
      </AppText>
      <View
        style={[
          styles.group,
          {
            backgroundColor: colors.surface,
            borderColor: highlight ? colors.primary : colors.border,
            borderWidth: highlight ? 1.5 : 1,
          },
        ]}
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

/** The start of a row: an optional icon tile, the label and an optional note under it. */
function RowText({
  icon,
  iconTone,
  label,
  hint,
}: {
  icon?: IconName;
  iconTone?: TileTone;
  label: string;
  hint?: string;
}) {
  return (
    <>
      {icon ? <IconTile icon={icon} tone={iconTone} /> : null}
      <View style={styles.label}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
    </>
  );
}

/** A row that opens another screen. */
export function LinkRow({
  label,
  value,
  hint,
  icon,
  iconTone,
  onPress,
}: {
  label: string;
  value?: string;
  /** A short note under the label. */
  hint?: string;
  icon?: IconName;
  iconTone?: TileTone;
  onPress: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg - 2, gap: spacing.md },
        hint ? { paddingVertical: spacing.sm + 3 } : null,
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <RowText icon={icon} iconTone={iconTone} label={label} hint={hint} />
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
  icon,
  iconTone,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  icon?: IconName;
  iconTone?: TileTone;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg - 2, gap: spacing.md },
        hint ? { paddingVertical: spacing.sm + 3 } : null,
      ]}
    >
      <RowText icon={icon} iconTone={iconTone} label={label} hint={hint} />
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.knob}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 20, overflow: 'hidden' },
  groupTitle: { fontFamily: UI_FONTS.semibold, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  label: { flex: 1 },
  // More room than Android measured, at the end next to the chevron ('right' is the end in
  // RTL): on a Galaxy S21+ the drawn text came out wider, its last word wrapped and was cut
  // («غير مفعّلة» showed «غير», owner 2026-10-30; as in wirduk-reports#2).
  value: { flexGrow: 0.25, flexShrink: 0, textAlign: 'right', fontSize: 14 },
});
