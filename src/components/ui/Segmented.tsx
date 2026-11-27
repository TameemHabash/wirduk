import { Pressable, StyleSheet, View } from 'react-native';

import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

/** A small segmented control: one choice of a few, each with an icon (design `.seg.icons`). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const { colors, scheme } = useAppTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, { backgroundColor: colors.surfaceMuted }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? colors.primaryInk : colors.textMuted;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              selected && { backgroundColor: colors.surface },
              // A soft lift in light; none in dark (design).
              selected && scheme === 'light' && [styles.lifted, { shadowColor: colors.text }],
            ]}
          >
            {option.icon ? <Icon name={option.icon} size={16} color={color} /> : null}
            <AppText
              key={`${option.label}:${selected}`}
              roomy
              style={[
                styles.label,
                { color, fontFamily: selected ? UI_FONTS.semibold : UI_FONTS.regular },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  lifted: {
    elevation: 1,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { fontSize: 13, lineHeight: 20 },
});
