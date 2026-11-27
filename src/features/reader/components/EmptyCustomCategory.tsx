import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';

import { ReaderHeader } from './ReaderHeader';

/** A new own category with no adhkar yet. */
export function EmptyCustomCategory({ category }: { category: Category }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <ReaderHeader category={category} />
      <View style={[styles.fill, styles.center, { padding: spacing.xl, gap: spacing.lg }]}>
        <AppText tone="muted">{t('custom.noAdhkar')}</AppText>
        <Button
          title={t('custom.addDhikr')}
          onPress={() =>
            router.push({
              pathname: '/custom/[id]/dhikr/[dhikrId]',
              params: { id: String(category.id), dhikrId: 'new' },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
