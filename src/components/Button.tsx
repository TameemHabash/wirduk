import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface Props {
  title: string;
  onPress: () => void;
  /** primary: filled; secondary: outlined; danger: outlined, red text (destructive). */
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, kind = 'primary', disabled = false, style }: Props) {
  const { colors, radii, spacing } = useAppTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radii.md,
          paddingHorizontal: spacing.xl,
          backgroundColor: primary ? colors.primary : colors.surface,
          borderColor: primary ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
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
        style={styles.label}
        variant="bodyStrong"
        tone={primary ? 'onPrimary' : kind === 'danger' ? 'danger' : 'default'}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { alignSelf: 'stretch', textAlign: 'center' },
});
