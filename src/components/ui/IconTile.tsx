import { View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './Icon';

/** teal (most), gold («أدومها», warnings), plain (quiet), sand (the user's own adhkar). */
export type TileTone = 'primary' | 'gold' | 'plain' | 'sand' | 'danger';

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
  const look = {
    primary: { background: colors.primarySoft, icon: colors.primaryInk },
    gold: { background: colors.accentSoft, icon: colors.accentInk },
    plain: { background: colors.surfaceMuted, icon: colors.textMuted },
    sand: { background: colors.surface, icon: colors.customAccent },
    danger: { background: colors.dangerSoft, icon: colors.danger },
  }[tone];
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
