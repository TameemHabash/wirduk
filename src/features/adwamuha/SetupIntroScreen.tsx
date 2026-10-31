import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { HadithCard } from './HadithCard';
import { SetupLayout } from './SetupParts';

const POINTS = [
  ['١', 'adwamuha.setup.point1', 'adwamuha.setup.point1Note'],
  ['٢', 'adwamuha.setup.point2', 'adwamuha.setup.point2Note'],
  ['٣', 'adwamuha.setup.point3', 'adwamuha.setup.point3Note'],
] as const;

/**
 * Setup 1 of 4 (design): what «أدومها» is, the hadith first, three short
 * points, numbered in rounded squares. On the first launch, and once after
 * each app update while it is off; «لاحقًا» goes back to Home (it can be
 * turned on in Settings any time).
 */
export function SetupIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const { stored, resume } = useAdwamuha();

  const enable = () => {
    if (!stored) {
      router.push('/adwamuha/start');
      return;
    }
    // On before and turned off: continue, or start over (the history stays either way).
    Alert.alert(t('adwamuha.continue.title'), t('adwamuha.continue.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('adwamuha.continue.restart'), onPress: () => router.push('/adwamuha/start') },
      {
        text: t('adwamuha.continue.continue'),
        onPress: () => void resume().then(() => router.dismissTo('/')),
      },
    ]);
  };

  return (
    <SetupLayout
      page={0}
      actions={
        <>
          <Button title={t('adwamuha.setup.enable')} onPress={enable} />
          <Button title={t('adwamuha.later')} kind="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <HadithCard />
      <AppText variant="title" accessibilityRole="header" style={styles.center}>
        {t('adwamuha.setup.title')}
      </AppText>
      {POINTS.map(([number, point, note]) => (
        <View key={number} style={[styles.row, { gap: spacing.md }]}>
          <View style={[styles.number, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="label" tone="accent">
              {number}
            </AppText>
          </View>
          <View style={[styles.fill, { gap: 2 }]}>
            <AppText variant="bodyStrong">{t(point)}</AppText>
            <AppText tone="muted">{t(note)}</AppText>
          </View>
        </View>
      ))}
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  // A rounded square, not a circle (design: «.feat .n»; owner, 2026-10-30).
  number: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
