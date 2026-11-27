import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { EmptyCustomCategory } from '@/features/reader/components/EmptyCustomCategory';
import { Reader } from '@/features/reader/components/Reader';
import { useCategoryAdhkar } from '@/features/reader/hooks/useCategoryAdhkar';
import { useAppTheme } from '@/theme/ThemeProvider';

/** A category in the reader (`wirduk://category/<id>?dhikr=<dhikrId>`). */
export function ReaderScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ id: string; dhikr?: string }>();
  const state = useCategoryAdhkar(Number(params.id));

  // Own categories can be edited from here: show the changes when coming back.
  useFocusEffect(state.reload);

  if (state.status === 'loading') {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }
  if (state.status !== 'ready') {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="muted">{t('reader.notFound')}</AppText>
      </SafeAreaView>
    );
  }
  if (state.adhkar.length === 0) return <EmptyCustomCategory category={state.category} />;
  return (
    <Reader
      // A new key after an edit restarts the pager with the updated list.
      key={state.adhkar.map((d) => `${d.id}:${d.count}${d.unlimited ? 'u' : ''}`).join(',')}
      category={state.category}
      adhkar={state.adhkar}
      startDhikrId={params.dhikr ? Number(params.dhikr) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
