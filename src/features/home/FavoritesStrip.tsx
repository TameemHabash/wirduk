import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import type { Category } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  favorites: readonly Category[];
  onOpen: (categoryId: number) => void;
}

/** Favorite categories as chips. Hidden when there are none. */
export function FavoritesStrip({ favorites, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  if (favorites.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        {t('home.favorites')}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {favorites.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => onOpen(c.id)}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: c.custom ? colors.customBorder : colors.border,
              backgroundColor: c.custom
                ? colors.customSurface
                : pressed
                  ? colors.surfaceMuted
                  : colors.surface,
              opacity: pressed && c.custom ? 0.8 : 1,
            })}
          >
            <AppText variant="caption">{c.title}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
