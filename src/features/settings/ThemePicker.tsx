import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { IconName } from '@/components/Icon';
import { Segmented } from '@/components/Segmented';
import { THEME_PREFERENCES, type ThemePreference } from '@/theme/resolve';
import { useAppTheme, useThemePreference } from '@/theme/ThemeProvider';

const ICON: Record<ThemePreference, IconName> = { system: 'theme', light: 'sun', dark: 'moon' };

/** Light / Dark / System, as a small segmented control with an icon each (redesign). */
export function ThemePicker() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={{ margin: spacing.md }}>
      <Segmented
        options={THEME_PREFERENCES.map((option) => ({
          value: option,
          label: t(`settings.theme.${option}`),
          icon: ICON[option],
        }))}
        value={preference}
        onChange={setPreference}
      />
    </View>
  );
}
