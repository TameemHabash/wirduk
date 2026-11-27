import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import type { Category } from '@/data/models';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

/** The reader's top bar: back, the category's name, edit (own category) and reset. */
export function ReaderHeader({ category, onReset }: { category: Category; onReset?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: spacing.xs }]}>
      <IconButton icon="back" label={t('common.back')} onPress={() => router.back()} />
      <AppText numberOfLines={1} style={styles.title} accessibilityRole="header">
        {category.title}
      </AppText>
      {category.custom && (
        <IconButton
          icon="edit"
          label={t('custom.editCategory')}
          onPress={() =>
            router.push({ pathname: '/custom/[id]', params: { id: String(category.id) } })
          }
        />
      )}
      {onReset && <IconButton icon="reset" label={t('reader.reset')} onPress={onReset} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: UI_FONTS.semibold,
    fontSize: 17,
    lineHeight: 26,
  },
});
