import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { DhikrText } from '@/components/ui/DhikrText';
import { Icon } from '@/components/ui/Icon';
import type { DhikrSearchHit, HomeCategory, SearchResults as Results } from '@/data/models/index';
import { CategoryRow } from './CategoryRow';
import { NAME_MARK, aroundName } from '@/i18n/around-name';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  query: string;
  results: Results | null;
  searchedFor: string;
  /** Every chapter (shipped and own), to show a found chapter as in the list. */
  categoryById: ReadonlyMap<number, HomeCategory>;
  onOpen: (categoryId: number, dhikrId?: number) => void;
  onToggleFavorite: (id: number) => void;
}

/**
 * Search inside the adhkar tab (redesign): the chapters found, then the adhkar (their first
 * words, and "chapter · الذكر N"). They take the lists' place while there is a query.
 */
export function SearchResults({
  query,
  results,
  searchedFor,
  categoryById,
  onOpen,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();

  if (!query.trim()) {
    return <Note>{t('search.start')}</Note>;
  }
  if (!results) return null;
  const categories = results.categories
    .map((hit) => categoryById.get(hit.categoryId))
    .filter((c): c is HomeCategory => c !== undefined);
  if (categories.length === 0 && results.adhkar.length === 0) {
    if (!searchedFor) return null;
    // The query in teal, no «» (owner, 2026-11-26).
    const [before, after] = aroundName(t('search.noResults', { query: NAME_MARK }));
    return (
      <Note>
        {before}
        <AppText style={[styles.query, { color: colors.primaryInk }]}>{searchedFor}</AppText>
        {after}
      </Note>
    );
  }

  const group = [styles.group, { backgroundColor: colors.surface, borderColor: colors.border }];
  return (
    <View style={{ gap: spacing.lg }}>
      {categories.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <GroupTitle>{t('search.categories')}</GroupTitle>
          <View style={group}>
            {categories.map((c, i) => (
              <View key={c.id} style={i > 0 && [styles.line, { borderTopColor: colors.border }]}>
                <CategoryRow category={c} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
              </View>
            ))}
          </View>
        </View>
      )}
      {results.adhkar.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <GroupTitle>{t('search.adhkar')}</GroupTitle>
          <View style={group}>
            {results.adhkar.map((hit, i) => (
              <DhikrRow key={hit.dhikrId} hit={hit} first={i === 0} onOpen={onOpen} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function DhikrRow({
  hit,
  first,
  onOpen,
}: {
  hit: DhikrSearchHit;
  first: boolean;
  onOpen: Props['onOpen'];
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(hit.categoryId, hit.dhikrId)}
      style={({ pressed }) => [
        styles.dhikr,
        !first && [styles.line, { borderTopColor: colors.border }],
        hit.custom && { backgroundColor: colors.customSurface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.fill}>
        <DhikrText size={16} numberOfLines={1} style={styles.start}>
          {hit.text}
        </DhikrText>
        <AppText variant="caption" tone="muted">
          {t(hit.custom ? 'search.inMyCategory' : 'search.inCategory', {
            title: hit.categoryTitle,
            order: hit.order,
          })}
        </AppText>
      </View>
      <Icon name="forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

function GroupTitle({ children }: { children: string }) {
  return (
    <AppText tone="muted" accessibilityRole="header" style={styles.groupTitle}>
      {children}
    </AppText>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <AppText tone="muted" style={styles.note}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  group: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  line: { borderTopWidth: StyleSheet.hairlineWidth },
  groupTitle: { fontFamily: UI_FONTS.semibold, fontSize: 13, lineHeight: 20, paddingHorizontal: 6 },
  dhikr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 60,
  },
  start: { textAlign: 'auto' },
  note: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  query: { fontFamily: UI_FONTS.semibold, fontSize: 14 },
});
