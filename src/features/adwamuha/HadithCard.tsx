import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DhikrText } from '@/components/DhikrText';
import { useAppTheme } from '@/theme/ThemeProvider';

import { OWNER_TEXTS } from './owner-texts';

/**
 * The hadith of «أدومها», featured (design: between two small ornaments, no
 * source line; owner, 2026-10-29). A smaller size so it fits one line at the
 * default text size; with big system fonts it wraps.
 */
export function HadithCard() {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.xs,
        alignItems: 'center',
      }}
    >
      <Ornament color={colors.accent} />
      <DhikrText size={20} style={{ textAlign: 'center', alignSelf: 'stretch' }}>
        {OWNER_TEXTS.hadith.text}
      </DhikrText>
      <Ornament color={colors.accent} />
    </View>
  );
}

function Ornament({ color }: { color: string }) {
  return (
    <Svg width={44} height={12} viewBox="0 0 44 12" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M0 6h14M30 6h14" />
      <Path d="M22 1l5 5-5 5-5-5z" />
    </Svg>
  );
}
