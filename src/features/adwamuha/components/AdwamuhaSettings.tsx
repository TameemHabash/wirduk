import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { GoldCard } from '@/components/ui/GoldCard';
import { Icon } from '@/components/ui/Icon';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuhaEnabled } from '@/features/adwamuha/state/AdwamuhaProvider';
import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';

/**
 * Settings → «أدومها», first, in a gold card (redesign; owner, 2026-11-25: "excellent"): one
 * row that opens its own settings screen (the switch, the ward order, the reminders, the
 * times, the plan, keeping the path safe), with «مفعّلة» or «غير مفعّلة».
 */
export function AdwamuhaSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const enabled = useAdwamuhaEnabled();
  const value = enabled ? t('adwamuha.settingsScreen.enabled') : t('adwamuha.settings.off');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${OWNER_TEXTS.featureName}، ${value}`}
      onPress={() => router.push('/adwamuha/settings')}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <GoldCard period="hadith" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.tile, { backgroundColor: colors.surface }]}>
            <Icon name="sprout" size={19} color={colors.accentInk} />
          </View>
          <View style={styles.text}>
            <AppText style={styles.title}>{OWNER_TEXTS.featureName}</AppText>
            <AppText variant="caption" tone="muted">
              {t('adwamuha.settings.about')}
            </AppText>
          </View>
          {/* More room than Android measured (Galaxy: «غير مفعّلة» showed «غير»). */}
          <AppText
            key={value}
            roomy
            style={[styles.value, { color: enabled ? colors.primaryInk : colors.textMuted }]}
          >
            {value}
          </AppText>
          <Icon name="forward" size={18} color={colors.textFaint} />
        </View>
      </GoldCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  tile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
  value: { fontFamily: UI_FONTS.medium, fontSize: 14, lineHeight: 22 },
});
