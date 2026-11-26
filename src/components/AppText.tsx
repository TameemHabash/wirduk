import { useState } from 'react';
import { StyleSheet, Text, type LayoutChangeEvent, type TextProps } from 'react-native';

import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

export type TextTone =
  | 'default'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'accent'
  | 'onPrimary'
  | 'danger'
  | 'primaryInk'
  | 'accentInk';
export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

interface Props extends TextProps {
  tone?: TextTone;
  variant?: TextVariant;
  /**
   * A few dp wider than Android measured it, for a short label in a box as wide as its
   * content (a text button, a small button). On a Galaxy S21+ the drawn text came out a
   * little wider than measured and its last word wrapped ("إضافة / صور", wirduk-reports#2).
   * Remount it (`key`) when its text changes.
   */
  roomy?: boolean;
}

const ROOM = 6;

/**
 * Text in the interface font, with theme colors (approved type scale).
 * Weights are separate font families: custom fonts on Android ignore `fontWeight`.
 * Not for dhikr text (see `DhikrText`).
 */
export function AppText({
  tone = 'default',
  variant = 'body',
  roomy = false,
  style,
  onLayout,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    accent: colors.accent,
    onPrimary: colors.onPrimary,
    danger: colors.danger,
    primaryInk: colors.primaryInk,
    accentInk: colors.accentInk,
  }[tone];
  const measure = roomy
    ? (e: LayoutChangeEvent) => {
        // Once: the width Android measured, plus room. Never grows again after that.
        if (minWidth === undefined) setMinWidth(Math.ceil(e.nativeEvent.layout.width) + ROOM);
        onLayout?.(e);
      }
    : onLayout;
  return (
    <Text
      {...rest}
      onLayout={measure}
      style={[styles[variant], { color }, style, minWidth !== undefined && { minWidth }]}
    />
  );
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
