import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

/**
 * The redesign's buttons:
 * - primary: filled teal (the main action);
 * - secondary: the surface with a strong line (the second choice, cancel);
 * - soft: a soft teal fill (a quiet action that still stands out);
 * - danger: filled red (a delete);
 * - plain: no fill, no line (the quietest choice).
 */
export type ButtonKind = 'primary' | 'secondary' | 'soft' | 'danger' | 'plain';

interface Props {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  /** small: 40 high, as wide as its title (rows, cards). Default: 52 high. */
  size?: 'default' | 'small';
  /** Red text on a secondary or plain button (e.g. «تجاهل» when keeping is the main action). */
  destructive?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** What a screen reader says, when the title alone is not enough (e.g. «قطعتُها: الخطوة 5»). */
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  size = 'default',
  destructive = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const { colors, radii, spacing } = useAppTheme();
  const look = {
    primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary },
    secondary: { background: colors.surface, border: colors.borderStrong, text: colors.text },
    soft: { background: colors.primarySoft, border: colors.primarySoft, text: colors.primaryInk },
    danger: { background: colors.danger, border: colors.danger, text: colors.onDanger },
    plain: { background: 'transparent', border: 'transparent', text: colors.textMuted },
  }[kind];
  const small = size === 'small';
  const strong = kind === 'primary' || kind === 'soft' || kind === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: small ? 40 : kind === 'plain' ? 46 : 52,
          borderRadius: small ? 12 : radii.md,
          paddingHorizontal: small ? spacing.lg : spacing.xl,
          backgroundColor: look.background,
          borderColor: look.border,
          borderWidth: kind === 'secondary' ? 1.5 : 0,
        },
        small && styles.small,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <AppText
        // Remount when the title changes ("إرسال" → "جارٍ الإرسال…" → "إرسال"): Android
        // otherwise keeps a width measured for another title and cuts the text.
        key={title}
        // As wide as the button, not as wide as Android measured the text: on a Galaxy
        // S21+ the drawn text came out a little wider than measured and its last word
        // wrapped ("إضافة / صور", wirduk-reports#2).
        style={[
          styles.label,
          {
            color:
              destructive && (kind === 'secondary' || kind === 'plain') ? colors.danger : look.text,
            fontFamily: strong ? UI_FONTS.semibold : UI_FONTS.medium,
            fontSize: small ? 14 : 16,
          },
        ]}
        // A small button is as wide as its title: give the title room too.
        roomy={small}
        variant="bodyStrong"
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  // As wide as its title plus room: the title still stretches over the whole button.
  small: { alignSelf: 'flex-start', minWidth: 88 },
  label: { alignSelf: 'stretch', textAlign: 'center' },
});
