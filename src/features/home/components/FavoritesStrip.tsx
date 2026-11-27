import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/data/models';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  favorites: readonly Category[];
  onOpen: (categoryId: number) => void;
}

/**
 * The favorite categories as tiles, two per row (redesign). With none: a dashed card that
 * says how to add one.
 */
export function FavoritesStrip({ favorites, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText style={styles.section} accessibilityRole="header">
        {t('home.favorites')}
      </AppText>
      {favorites.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.borderStrong }]}>
          <Icon name="star" color={colors.accent} />
          <AppText tone="muted" style={styles.emptyText}>
            {t('home.favoritesEmpty')}
          </AppText>
        </View>
      ) : (
        <View style={styles.grid}>
          {favorites.map((c) => {
            const countText = t('home.adhkarCount', { count: c.adhkarCount });
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={t('home.categoryLabel', { title: c.title, countText })}
                onPress={() => onOpen(c.id)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    borderColor: c.custom ? colors.customBorder : colors.border,
                    backgroundColor: c.custom ? colors.customSurface : colors.surface,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Icon name="star" size={18} solid color={colors.accent} />
                <View style={styles.fill}>
                  <AppText style={styles.title} numberOfLines={2}>
                    {c.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {countText}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: UI_FONTS.semibold, fontSize: 17, lineHeight: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  // Two per row, the same width also when the last row has one.
  tile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  fill: { flex: 1 },
  title: { fontFamily: UI_FONTS.medium, fontSize: 14, lineHeight: 21 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: { flex: 1, fontSize: 14, lineHeight: 22 },
});
