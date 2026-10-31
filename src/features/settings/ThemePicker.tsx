import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { THEME_PREFERENCES } from '@/theme/resolve';
import { useAppTheme, useThemePreference } from '@/theme/ThemeProvider';

/** Light / Dark / System, as a segmented control. */
export function ThemePicker() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.md,
          margin: spacing.md,
          padding: 3,
        },
      ]}
    >
      {THEME_PREFERENCES.map((option) => {
        const selected = option === preference;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setPreference(option)}
            style={[
              styles.option,
              { borderRadius: radii.sm },
              selected && { backgroundColor: colors.surface },
            ]}
          >
            <AppText
              variant={selected ? 'bodyStrong' : 'body'}
              tone={selected ? 'primary' : 'muted'}
            >
              {t(`settings.theme.${option}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  option: { flex: 1, alignItems: 'center', paddingVertical: 8 },
});
