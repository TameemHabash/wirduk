import { View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { type Tone, toneColors } from '@/theme/tones';

import { Icon, type IconName } from './Icon';

/** teal (most), gold («أدومها», warnings), plain (quiet), sand (the user's own adhkar). */
export type TileTone = Tone;

/** A rounded square with one icon, at the start of a row or a card (design `.tile`). */
export function IconTile({
  icon,
  tone = 'primary',
  size = 34,
}: {
  icon: IconName;
  tone?: TileTone;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const look = toneColors(colors, tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: look.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.56)} color={look.icon} />
    </View>
  );
}
