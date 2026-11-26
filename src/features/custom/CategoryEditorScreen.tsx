import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, AppBarAction } from '@/components/AppBar';
import { AppText } from '@/components/AppText';
import { DialogName, NAME_MARK, aroundName, useDialog } from '@/components/Dialog';
import { DhikrText } from '@/components/DhikrText';
import { IconTile } from '@/components/IconTile';
import { SortableList } from '@/components/SortableList';
import { TextButton } from '@/components/TextButton';
import { TextField } from '@/components/TextField';
import { useRepositories } from '@/data/DataProvider';
import type { Category, Dhikr } from '@/data/models';
import { CUSTOM_LIMITS } from '@/data/repositories/custom-repository';
import { counterStore } from '@/features/counter/counter-store';
import { useAppTheme } from '@/theme/ThemeProvider';

import { deleteCustomAudio } from './custom-audio';
import { customErrorMessage } from './errors';
import { useUnsavedGuard } from './useUnsavedGuard';

/** Routes: /custom/new (create) and /custom/[id] (edit). */
export function CategoryEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  return params.id && params.id !== 'new' ? (
    <EditCategory id={Number(params.id)} />
  ) : (
    <NewCategory />
  );
}

function NewCategory() {
  const { t } = useTranslation();
  const router = useRouter();
  const { custom } = useRepositories();
  const { colors, spacing } = useAppTheme();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { allowLeave } = useUnsavedGuard(title.trim().length > 0);

  const create = async () => {
    try {
      const category = await custom.createCategory(title);
      allowLeave();
      router.replace({ pathname: '/custom/[id]', params: { id: String(category.id) } });
    } catch (e) {
      setError(customErrorMessage(t, e));
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <AppBar
        title={t('custom.newCategoryTitle')}
        start="close"
        end={<AppBarAction title={t('custom.create')} onPress={() => void create()} />}
      />
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <TextField
          label={t('custom.categoryName')}
          placeholder={t('custom.categoryNamePlaceholder')}
          value={title}
          onChangeText={(v) => {
            setError(null);
            setTitle(v);
          }}
          maxLength={CUSTOM_LIMITS.titleMax}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void create()}
          error={error}
        />
        <AppText variant="caption" tone="muted">
          {t('custom.noAdhkar')}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

function EditCategory({ id }: { id: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { custom, favorites } = useRepositories();
  const dialog = useDialog();
  const { colors, radii, spacing } = useAppTheme();
  const [category, setCategory] = useState<Category | null>(null);
  const [adhkar, setAdhkar] = useState<Dhikr[]>([]);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([custom.getCategory(id), custom.listAdhkar(id)]).then(([c, list]) => {
      if (cancelled) return;
      if (!c) {
        setMissing(true);
        return;
      }
      setCategory(c);
      setTitle((current) => (current === '' ? c.title : current));
      setAdhkar(list);
    });
    return () => {
      cancelled = true;
    };
  }, [custom, id]);

  // Reload when coming back from the dhikr editor.
  useFocusEffect(load);

  const titleChanged = !!category && title.trim() !== category.title;
  const { allowLeave } = useUnsavedGuard(titleChanged);

  const saveTitle = async () => {
    try {
      await custom.renameCategory(id, title);
      setCategory((c) => (c ? { ...c, title: title.trim() } : c));
      setTitle(title.trim());
      setError(null);
    } catch (e) {
      setError(customErrorMessage(t, e));
    }
  };

  const openDhikr = (dhikrId: number | 'new') =>
    router.push({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(id), dhikrId: String(dhikrId) },
    });

  const confirmDelete = () => {
    if (!category) return;
    // The chapter's name in bold teal, no «» (owner, 2026-11-26).
    const [before, after] = aroundName(
      t('custom.deleteCategoryConfirmTitle', { title: NAME_MARK }),
    );
    dialog.show({
      icon: 'trash',
      tone: 'danger',
      title: (
        <>
          {before}
          <DialogName>{category.title}</DialogName>
          {after}
        </>
      ),
      body: t('custom.deleteCategoryConfirmBody'),
      actions: [
        {
          label: t('custom.delete'),
          kind: 'danger',
          onPress: () => {
            void (async () => {
              const { audioFiles } = await custom.deleteCategory(id);
              deleteCustomAudio(...audioFiles);
              await favorites.remove(id);
              counterStore.resetMany(adhkar.map((d) => d.id));
              allowLeave();
              // Back to the adhkar tab, where «أذكاري» is.
              router.dismissTo('/adhkar');
            })();
          },
        },
        { label: t('common.cancel'), cancel: true },
      ],
    });
  };

  if (missing) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="muted">{t('custom.errors.notFound')}</AppText>
      </SafeAreaView>
    );
  }
  if (!category) return <View style={[styles.fill, { backgroundColor: colors.background }]} />;

  if (sorting) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.fill, { backgroundColor: colors.background }]}
      >
        <AppBar title={t('custom.editCategoryTitle')} />
        <SortableList
          items={adhkar}
          keyOf={(d) => String(d.id)}
          title={t('custom.adhkarList')}
          hint={t('custom.manageHint')}
          rowColor={colors.customSurface}
          dragLabel={(d) => t('custom.dragDhikr', { order: d.order })}
          renderItem={(d) => (
            <DhikrText size={16} numberOfLines={2} style={styles.start}>
              {d.text}
            </DhikrText>
          )}
          onReorder={(next) => {
            setAdhkar(next);
            void custom.reorderAdhkar(
              id,
              next.map((d) => d.id),
            );
          }}
          onDone={() => {
            setSorting(false);
            load();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <AppBar
        title={t('custom.editCategoryTitle')}
        end={
          <AppBarAction
            title={t('custom.save')}
            onPress={() => void saveTitle()}
            disabled={!titleChanged}
          />
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <TextField
            label={t('custom.categoryName')}
            value={title}
            onChangeText={(v) => {
              setError(null);
              setTitle(v);
            }}
            maxLength={CUSTOM_LIMITS.titleMax}
            error={error}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.header}>
            <AppText variant="heading" accessibilityRole="header" style={styles.fill}>
              {t('custom.adhkarList')}
            </AppText>
            {adhkar.length > 1 && (
              <TextButton title={t('home.editOrder')} onPress={() => setSorting(true)} />
            )}
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.customBorder,
              borderRadius: 20,
              backgroundColor: colors.customSurface,
              overflow: 'hidden',
            }}
          >
            {adhkar.length === 0 && (
              <AppText tone="muted" style={{ padding: spacing.lg }}>
                {t('custom.noAdhkar')}
              </AppText>
            )}
            {adhkar.map((d) => (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                onPress={() => openDhikr(d.id)}
                style={({ pressed }) => [
                  styles.dhikrRow,
                  {
                    padding: spacing.md,
                    gap: spacing.md,
                    borderBottomColor: colors.customBorder,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={[
                    styles.num,
                    { borderRadius: radii.sm, backgroundColor: colors.customBorder },
                  ]}
                >
                  <AppText variant="label" style={{ color: colors.customAccent }}>
                    {String(d.order)}
                  </AppText>
                </View>
                <View style={styles.fill}>
                  <DhikrText size={16} numberOfLines={2} style={styles.start}>
                    {d.text}
                  </DhikrText>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.surface, borderColor: colors.customBorder },
                  ]}
                >
                  <AppText variant="label" style={{ color: colors.customAccent }}>
                    {t('custom.times', { n: d.count })}
                  </AppText>
                </View>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => openDhikr('new')}
              style={({ pressed }) => [
                styles.addRow,
                { paddingHorizontal: spacing.md, gap: spacing.sm },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconTile icon="plus" tone="sand" />
              <AppText variant="bodyStrong" style={{ color: colors.customAccent }}>
                {t('custom.addDhikr')}
              </AppText>
            </Pressable>
          </View>
        </View>

        <TextButton
          title={t('custom.deleteCategory')}
          icon="trash"
          tone="danger"
          onPress={confirmDelete}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  dhikrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  start: { textAlign: 'auto' },
});
