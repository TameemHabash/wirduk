import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import type { HomeCategory } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  category: HomeCategory;
  onOpen: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

/** One category in the home list: chapter number, title, count, star. */
export const CategoryRow = memo(function CategoryRow({
  category,
  onOpen,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { id, title, adhkarCount, defaultOrder, isFavorite, custom } = category;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: custom ? colors.customSurface : colors.surface,
          paddingStart: spacing.md,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.categoryLabel', {
          title,
          countText: t('home.adhkarCount', { count: adhkarCount }),
        })}
        onPress={() => onOpen(id)}
        style={({ pressed }) => [styles.main, { gap: spacing.md }, pressed && { opacity: 0.7 }]}
      >
        <View
          style={[
            styles.num,
            {
              borderRadius: radii.sm,
              backgroundColor: custom ? colors.customBorder : colors.surfaceMuted,
            },
          ]}
        >
          <AppText
            variant="label"
            tone="muted"
            style={custom ? { color: colors.customAccent } : undefined}
          >
            {String(defaultOrder)}
          </AppText>
        </View>
        <View style={styles.text}>
          <AppText>{title}</AppText>
          <AppText variant="caption" tone="faint">
            {t('home.adhkarCount', { count: adhkarCount })}
          </AppText>
        </View>
      </Pressable>
      <IconButton
        icon="star"
        solid={isFavorite}
        color={isFavorite ? colors.accent : colors.textFaint}
        label={t(isFavorite ? 'home.removeFavorite' : 'home.addFavorite', { title })}
        onPress={() => onToggleFavorite(id)}
        size={20}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  num: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
