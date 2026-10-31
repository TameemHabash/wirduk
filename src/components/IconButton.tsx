import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  /** Read by screen readers. Required: icon buttons have no visible text. */
  label: string;
  onPress: () => void;
  color?: string;
  solid?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/** A 44×44 touch target with one icon. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  solid,
  size = 22,
  style,
  disabled,
}: Props) {
  const { colors, radii } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radii.md },
        pressed && { backgroundColor: colors.surfaceMuted },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Icon name={icon} size={size} color={color} solid={solid} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
