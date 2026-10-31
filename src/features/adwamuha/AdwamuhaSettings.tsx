import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { LinkRow, SettingsGroup } from '@/features/settings/SettingsParts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { OWNER_TEXTS } from './owner-texts';

/**
 * Settings → «أدومها» (on top, highlighted; owner): one row that opens its own
 * settings screen (design: the switch, the ward order, the reminders, the
 * times, the plan, keeping the path safe).
 */
export function AdwamuhaSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const { enabled } = useAdwamuha();
  return (
    <SettingsGroup title={OWNER_TEXTS.featureName} highlight>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <AppText variant="caption" tone="muted">
          {t('adwamuha.settings.about')}
        </AppText>
      </View>
      <LinkRow
        label={OWNER_TEXTS.featureName}
        value={enabled ? t('adwamuha.settingsScreen.enabled') : t('adwamuha.settings.off')}
        onPress={() => router.push('/adwamuha/settings')}
      />
    </SettingsGroup>
  );
}
