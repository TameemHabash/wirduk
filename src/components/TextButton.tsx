import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  title: string;
  onPress: () => void;
  icon?: IconName;
  /** primary: teal; danger: red (a delete on a screen; the dialog asks first). */
  tone?: 'primary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A link-like button: an optional icon and a short title, no box (design `.tbtn`). */
export function TextButton({
  title,
  onPress,
  icon,
  tone = 'primary',
  disabled = false,
  style,
}: Props) {
  const { colors, spacing } = useAppTheme();
  const color = tone === 'danger' ? colors.danger : colors.primaryInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { gap: spacing.sm - 2, paddingHorizontal: spacing.sm },
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <AppText key={title} roomy variant="bodyStrong" style={[styles.label, { color }]}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: TOUCH_TARGET,
  },
  label: { fontSize: 14, lineHeight: 22 },
});
