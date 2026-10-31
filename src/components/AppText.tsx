import { StyleSheet, Text, type TextProps } from 'react-native';

import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

export type TextTone =
  'default' | 'muted' | 'faint' | 'primary' | 'accent' | 'onPrimary' | 'danger';
export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

interface Props extends TextProps {
  tone?: TextTone;
  variant?: TextVariant;
}

/**
 * Text in the interface font, with theme colors (approved type scale).
 * Weights are separate font families: custom fonts on Android ignore `fontWeight`.
 * Not for dhikr text (see `DhikrText`).
 */
export function AppText({ tone = 'default', variant = 'body', style, ...rest }: Props) {
  const { colors } = useAppTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    accent: colors.accent,
    onPrimary: colors.onPrimary,
    danger: colors.danger,
  }[tone];
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: UI_FONTS.semibold, fontSize: 28, lineHeight: 42 },
  title: { fontFamily: UI_FONTS.semibold, fontSize: 20, lineHeight: 30 },
  heading: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 24 },
  body: { fontFamily: UI_FONTS.regular, fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: UI_FONTS.medium, fontSize: 16, lineHeight: 26 },
  caption: { fontFamily: UI_FONTS.regular, fontSize: 13, lineHeight: 20 },
  label: { fontFamily: UI_FONTS.medium, fontSize: 12, lineHeight: 18 },
});
