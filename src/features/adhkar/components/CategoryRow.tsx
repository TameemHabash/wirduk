import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import type { HomeCategory } from '@/data/models';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  category: HomeCategory;
  onOpen: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

/**
 * One chapter (design `.crow`): the book's number small and faint (no box), the title, the
 * count, the star at the end. The user's own chapters start with a tile instead.
 */
export const CategoryRow = memo(function CategoryRow({
  category,
  onOpen,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { id, title, adhkarCount, defaultOrder, isFavorite, custom } = category;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.categoryLabel', {
          title,
          countText: t('home.adhkarCount', { count: adhkarCount }),
        })}
        onPress={() => onOpen(id)}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        {custom ? (
          <IconTile icon="beads" tone="sand" />
        ) : (
          <AppText tone="faint" style={styles.num}>
            {String(defaultOrder)}
          </AppText>
        )}
        <View style={styles.text}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText variant="caption" tone="muted">
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingStart: 14,
    paddingEnd: 4,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  num: { width: 24, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  text: { flex: 1 },
  title: { fontFamily: UI_FONTS.medium, fontSize: 16, lineHeight: 24 },
});
