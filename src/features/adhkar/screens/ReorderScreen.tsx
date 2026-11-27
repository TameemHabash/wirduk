import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ReorderableList, {
  reorderItems,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, AppBarAction } from '@/components/layout/AppBar';
import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { TextButton } from '@/components/ui/TextButton';
import { TIME_OF_DAY_CATEGORY_IDS } from '@/config/categories';
import type { HomeCategory } from '@/data/models';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { ReorderRow } from '@/features/adhkar/components/ReorderRow';
import { useHomeCategories } from '@/features/adhkar/hooks/useHomeCategories';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * «تعديل الترتيب» of the book's chapters (route /reorder, redesign): the order is saved only
 * with «حفظ» (owner: OK; before, every drag saved); leaving with changes asks first.
 * Morning and evening stay first (they are on Home).
 */
export function ReorderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dialog = useDialog();
  const { colors, spacing } = useAppTheme();
  const { categories, saveOrder, resetOrder } = useHomeCategories();
  const initial = useMemo(
    () => (categories ?? []).filter((c) => !TIME_OF_DAY_CATEGORY_IDS.has(c.id)),
    [categories],
  );
  // The user's order once they moved a row; until then, the saved one (it may still load).
  const [moved, setMoved] = useState<HomeCategory[] | null>(null);
  const draft = moved ?? (categories ? initial : null);

  const dirty = moved !== null && moved.some((c, i) => c.id !== initial[i]?.id);
  const { allowLeave } = useUnsavedGuard(dirty);

  const save = async () => {
    if (draft) await saveOrder(draft.map((c) => c.id));
    allowLeave();
    router.back();
  };

  const confirmRestore = () =>
    dialog.show({
      icon: 'reset',
      title: t('home.restoreConfirmTitle'),
      body: t('home.restoreConfirmBody'),
      actions: [
        {
          label: t('home.restore'),
          onPress: () => {
            void resetOrder().then(() => {
              allowLeave();
              router.back();
            });
          },
        },
        { label: t('common.cancel'), cancel: true },
      ],
    });

  const onReorder = ({ from, to }: ReorderableListReorderEvent) =>
    setMoved(draft ? reorderItems(draft, from, to) : null);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <AppBar
        title={t('home.editOrder')}
        start="close"
        end={
          <AppBarAction title={t('custom.save')} onPress={() => void save()} disabled={!dirty} />
        }
      />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
        <AppText variant="caption" tone="muted">
          {t('home.editHint')}
        </AppText>
        <TextButton
          title={t('home.restoreDefault')}
          icon="reset"
          onPress={confirmRestore}
          style={styles.start}
        />
      </View>
      {draft && (
        <ReorderableList
          data={draft}
          onReorder={onReorder}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ReorderRow category={item} />}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          style={styles.fill}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  start: { alignSelf: 'flex-start' },
});
