import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { HomeCategory } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { CategoryRow } from './CategoryRow';

interface Props {
  categories: readonly HomeCategory[];
  onOpen: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

/** "أذكاري": the user's own categories, below the favorites, in the sand color. */
export function MyAdhkarSection({ categories, onOpen, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();

  const card = {
    borderWidth: 1,
    borderColor: colors.customBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.customSurface,
    overflow: 'hidden' as const,
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header" style={styles.title}>
          {t('custom.section')}
        </AppText>
        {categories.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/custom')}
            style={styles.textButton}
          >
            <AppText variant="label" tone="primary">
              {t('custom.manage')}
            </AppText>
          </Pressable>
        )}
      </View>

      {categories.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('custom.emptyTitle')}
          onPress={() => router.push('/custom/new')}
          style={({ pressed }) => [
            card,
            styles.empty,
            { borderStyle: 'dashed', padding: spacing.lg, gap: spacing.xs },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="plus" color={colors.customAccent} />
          <AppText variant="bodyStrong">{t('custom.emptyTitle')}</AppText>
          <AppText variant="caption" tone="muted" style={styles.center}>
            {t('custom.emptyBody')}
          </AppText>
        </Pressable>
      ) : (
        <View style={card}>
          {categories.map((c) => (
            <View
              key={c.id}
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.customBorder,
              }}
            >
              <CategoryRow category={c} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/custom/new')}
            style={({ pressed }) => [
              styles.addRow,
              { paddingHorizontal: spacing.md, gap: spacing.sm },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="plus" size={18} color={colors.customAccent} />
            <AppText variant="bodyStrong" style={{ color: colors.customAccent }}>
              {t('custom.addCategory')}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  textButton: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 8 },
  empty: { alignItems: 'center' },
  center: { textAlign: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
});
