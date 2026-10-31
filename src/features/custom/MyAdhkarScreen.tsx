import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { SortableList } from '@/components/SortableList';
import { useRepositories } from '@/data/DataProvider';
import type { Category } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

/** "أذكاري": manage the user's own categories (route: /custom). */
export function MyAdhkarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { custom } = useRepositories();
  const { colors, radii, spacing } = useAppTheme();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [sorting, setSorting] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    custom.listCategories().then((list) => !cancelled && setCategories(list));
    return () => {
      cancelled = true;
    };
  }, [custom]);
  useFocusEffect(load);

  const countText = (n: number) => t('home.adhkarCount', { count: n });

  if (!categories) return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  if (sorting) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        <SortableList
          items={categories}
          keyOf={(c) => String(c.id)}
          title={t('custom.manageTitle')}
          hint={t('custom.manageHint')}
          rowColor={colors.customSurface}
          dragLabel={(c) => t('custom.dragCategory', { title: c.title })}
          renderItem={(c) => <AppText>{c.title}</AppText>}
          onReorder={(next) => void custom.reorderCategories(next.map((c) => c.id))}
          onDone={() => {
            setSorting(false);
            load();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xxxl,
        }}
      >
        {categories.length > 1 && (
          <View style={styles.header}>
            <View style={styles.fill} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setSorting(true)}
              style={styles.textButton}
            >
              <AppText variant="label" tone="primary">
                {t('home.editOrder')}
              </AppText>
            </Pressable>
          </View>
        )}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.customBorder,
            borderRadius: radii.lg,
            backgroundColor: colors.customSurface,
            overflow: 'hidden',
          }}
        >
          {categories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={t('home.categoryLabel', {
                title: c.title,
                countText: countText(c.adhkarCount),
              })}
              onPress={() =>
                router.push({ pathname: '/custom/[id]', params: { id: String(c.id) } })
              }
              style={({ pressed }) => [
                styles.row,
                { padding: spacing.md, gap: spacing.md, borderBottomColor: colors.customBorder },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.fill}>
                <AppText>{c.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {countText(c.adhkarCount)}
                </AppText>
              </View>
              <Icon name="edit" size={18} color={colors.customAccent} />
            </Pressable>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  textButton: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  addRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
});
