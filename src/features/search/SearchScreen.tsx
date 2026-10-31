import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { DhikrText } from '@/components/DhikrText';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import type { CategorySearchHit, DhikrSearchHit } from '@/data/models';
import { useDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useSearch } from './useSearch';

type Item = { kind: 'category'; hit: CategorySearchHit } | { kind: 'dhikr'; hit: DhikrSearchHit };

export function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();
  const { isRtl } = useDirection();
  const [query, setQuery] = useState('');
  const { results, searchedFor } = useSearch(query);
  // Results run under the system navigation bar: end them above the bar.
  const bottomInset = useSafeAreaInsets().bottom;

  const sections = results
    ? [
        {
          title: t('search.categories'),
          data: results.categories.map((hit): Item => ({ kind: 'category', hit })),
        },
        {
          title: t('search.adhkar'),
          data: results.adhkar.map((hit): Item => ({ kind: 'dhikr', hit })),
        },
      ].filter((s) => s.data.length > 0)
    : [];

  const openCategory = (id: number, dhikr?: number) =>
    router.push({
      pathname: '/category/[id]',
      params: dhikr ? { id: String(id), dhikr: String(dhikr) } : { id: String(id) },
    });

  const empty = !query.trim()
    ? t('search.start')
    : results && sections.length === 0 && searchedFor
      ? t('search.noResults', { query: searchedFor })
      : null;

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { padding: spacing.sm, gap: spacing.xs }]}>
        <IconButton icon="back" label={t('common.back')} onPress={() => router.back()} />
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              gap: spacing.sm,
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('search.title')}
            style={[
              styles.input,
              {
                color: colors.text,
                fontFamily: UI_FONTS.regular,
                textAlign: isRtl ? 'right' : 'left',
              },
            ]}
          />
          {query ? (
            <IconButton
              icon="close"
              label={t('search.clear')}
              onPress={() => setQuery('')}
              size={18}
            />
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) =>
          item.kind === 'category' ? `c${item.hit.categoryId}` : `d${item.hit.dhikrId}`
        }
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg + bottomInset,
          gap: spacing.sm,
        }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AppText variant="heading" style={{ marginTop: spacing.md }} accessibilityRole="header">
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              item.kind === 'category'
                ? openCategory(item.hit.categoryId)
                : openCategory(item.hit.categoryId, item.hit.dhikrId)
            }
            style={({ pressed }) => [
              {
                // The user's own results in the sand color.
                backgroundColor: item.hit.custom ? colors.customSurface : colors.surface,
                borderColor: item.hit.custom ? colors.customBorder : colors.border,
                borderWidth: 1,
                borderRadius: radii.md,
                padding: spacing.md,
                gap: spacing.xs,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {item.kind === 'category' ? (
              <View style={styles.categoryHit}>
                <AppText style={styles.fill}>{item.hit.title}</AppText>
                {item.hit.custom && (
                  <AppText variant="label" style={{ color: colors.customAccent }}>
                    {t('custom.badge')}
                  </AppText>
                )}
              </View>
            ) : (
              <>
                <AppText variant="caption" tone="muted">
                  {t(item.hit.custom ? 'search.inMyCategory' : 'search.inCategory', {
                    title: item.hit.categoryTitle,
                    order: item.hit.order,
                  })}
                </AppText>
                <DhikrText size={18} numberOfLines={3} style={styles.start}>
                  {item.hit.text}
                </DhikrText>
              </>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          empty ? (
            <AppText tone="muted" style={[styles.center, { marginTop: spacing.xxl }]}>
              {empty}
            </AppText>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center' },
  inputWrap: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  center: { textAlign: 'center' },
  categoryHit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  start: { textAlign: 'auto' },
});
