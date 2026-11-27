import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  type ListRenderItemInfo,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { TIME_OF_DAY_CATEGORY_IDS } from '@/config/categories';
import type { HomeCategory } from '@/data/models';
import { CategoryRow } from '@/features/adhkar/components/CategoryRow';
import { MyAdhkarSection } from '@/features/adhkar/components/MyAdhkarSection';
import { SearchResults } from '@/features/adhkar/components/SearchResults';
import { useSearch } from '@/features/adhkar/hooks/useSearch';
import { useHomeCategories } from '@/features/adhkar/state/CategoriesProvider';
import { useDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

const NONE: readonly HomeCategory[] = [];
const keyOf = (c: HomeCategory) => String(c.id);

/**
 * «الأذكار», the second tab (redesign): a real search box on top (its results take the
 * lists' place while typing), «أذكاري» first, then every chapter of the book. Morning and
 * evening are on Home. `?focus=search` (Home's search button, wirduk://search) puts the
 * keyboard up. The book's chapters are a list that draws only the rows near the screen
 * (RF5: the tab opened slowly with all 131 drawn at once); each row draws its part of the card.
 */
export function AdhkarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const { isRtl } = useDirection();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { categories, customCategories, error, reload, toggleFavorite } = useHomeCategories();
  const input = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { results, searchedFor } = useSearch(query);
  const searching = focused || query.trim() !== '';

  // Own chapters and favorites change on other screens: refresh when shown again.
  useFocusEffect(reload);

  useEffect(() => {
    if (focus !== 'search') return;
    const timer = setTimeout(() => input.current?.focus(), 80);
    router.setParams({ focus: '' });
    return () => clearTimeout(timer);
  }, [focus, router]);

  const stopSearching = useCallback(() => {
    setQuery('');
    input.current?.blur();
    setFocused(false);
  }, []);

  // Android's back button leaves the search first.
  useFocusEffect(
    useCallback(() => {
      if (!searching) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        stopSearching();
        return true;
      });
      return () => sub.remove();
    }, [searching, stopSearching]),
  );

  const list = useMemo(
    () => (categories ?? NONE).filter((c) => !TIME_OF_DAY_CATEGORY_IDS.has(c.id)),
    [categories],
  );
  const categoryById = useMemo(
    () =>
      new Map<number, HomeCategory>(
        [...(categories ?? NONE), ...customCategories].map((c) => [c.id, c]),
      ),
    [categories, customCategories],
  );

  const open = useCallback(
    (id: number, dhikr?: number) =>
      router.push({
        pathname: '/category/[id]',
        params: dhikr ? { id: String(id), dhikr: String(dhikr) } : { id: String(id) },
      }),
    [router],
  );
  const onToggleFavorite = useCallback((id: number) => void toggleFavorite(id), [toggleFavorite]);

  const showList = !error && !searching && categories !== null;
  const lastIndex = list.length - 1;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<HomeCategory>) => (
      <BookRow
        category={item}
        first={index === 0}
        last={index === lastIndex}
        onOpen={open}
        onToggleFavorite={onToggleFavorite}
      />
    ),
    [lastIndex, open, onToggleFavorite],
  );

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: showList ? spacing.sm : 0 }}>
      <AppText accessibilityRole="header" style={styles.largeTitle}>
        {t('search.adhkar')}
      </AppText>
      {/* The box keeps its look while typing; only the caret shows (owner, 2026-11-25). */}
      <View
        style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="search" size={18} color={colors.textFaint} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t('search.title')}
          style={[styles.input, { color: colors.text, textAlign: isRtl ? 'right' : 'left' }]}
        />
        {query ? (
          <IconButton icon="close" label={t('search.clear')} onPress={stopSearching} size={18} />
        ) : null}
      </View>

      {error ? (
        <AppText tone="muted" style={styles.center}>
          {t('home.loadError')}
        </AppText>
      ) : searching ? (
        <SearchResults
          query={query}
          results={results}
          searchedFor={searchedFor}
          categoryById={categoryById}
          onOpen={open}
          onToggleFavorite={onToggleFavorite}
        />
      ) : categories ? (
        <>
          <MyAdhkarSection
            categories={customCategories}
            onOpen={open}
            onToggleFavorite={onToggleFavorite}
          />
          <View style={styles.header}>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>
              {t('home.allAdhkar')}
            </AppText>
            <TextButton title={t('home.editOrder')} onPress={() => router.push('/reorder')} />
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        data={showList ? list : NONE}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        // Android detaches rows off screen by default; with few rows drawn it gains nothing.
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
      />
    </SafeAreaView>
  );
}

/**
 * One chapter of the book in its card (design: border, rounded corners, hairline lines): the
 * sides on every row, the top and its corners on the first, the bottom on the last.
 */
const BookRow = memo(function BookRow({
  category,
  first,
  last,
  onOpen,
  onToggleFavorite,
}: {
  category: HomeCategory;
  first: boolean;
  last: boolean;
  onOpen: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        first && styles.cardTop,
        last && styles.cardBottom,
      ]}
    >
      <View style={!first && [styles.line, { borderTopColor: colors.border }]}>
        <CategoryRow category={category} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
      </View>
    </View>
  );
});

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  largeTitle: { fontFamily: UI_FONTS.semibold, fontSize: 28, lineHeight: 40, paddingTop: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingStart: 14,
    paddingEnd: 4,
  },
  // No inner padding: Android's default padding cut the tall UI font.
  input: {
    flex: 1,
    fontFamily: UI_FONTS.regular,
    fontSize: 16,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    minHeight: 48,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  sectionTitle: { flex: 1, fontFamily: UI_FONTS.semibold, fontSize: 17, lineHeight: 26 },
  card: { borderLeftWidth: 1, borderRightWidth: 1 },
  cardTop: {
    borderTopWidth: 1,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  cardBottom: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  line: { borderTopWidth: StyleSheet.hairlineWidth },
});
