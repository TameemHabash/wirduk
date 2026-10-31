import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useSettings } from '@/data/settings/SettingsProvider';
import { dhikrLineHeight, findDhikrFont } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  children: string;
  /** Overrides the size from settings (e.g. small previews). */
  size?: number;
  /** Overrides the font from settings (e.g. the font picker). */
  fontId?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Dhikr text with full tashkeel, in the user's font and size.
 * The line height comes from the font, so marks never touch the next line.
 */
export function DhikrText({ children, size, fontId, numberOfLines, style }: Props) {
  const { settings } = useSettings();
  const { colors } = useAppTheme();
  const id = fontId ?? settings.dhikrFont;
  const fontSize = size ?? settings.dhikrFontSize;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: findDhikrFont(id).family,
          fontSize,
          lineHeight: dhikrLineHeight(id, fontSize),
          color: colors.text,
          textAlign: 'center',
          writingDirection: 'rtl',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
