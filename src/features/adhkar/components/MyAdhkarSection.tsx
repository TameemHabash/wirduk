import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { TextButton } from '@/components/ui/TextButton';
import type { HomeCategory } from '@/data/models';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { CategoryRow } from './CategoryRow';

interface Props {
  categories: readonly HomeCategory[];
  onOpen: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

/**
 * «أذكاري», first in the adhkar tab and bigger (owner, 2026-11-25): every own chapter in
 * full, then «إضافة باب», in the sand color. With none: a card that invites to add one.
 */
export function MyAdhkarSection({ categories, onOpen, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const group = [
    styles.group,
    { borderColor: colors.customBorder, backgroundColor: colors.customSurface },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" style={styles.title}>
          {t('custom.section')}
        </AppText>
        {categories.length > 0 && (
          <TextButton title={t('custom.manage')} onPress={() => router.push('/custom')} />
        )}
      </View>

      {categories.length === 0 ? (
        <View style={[group, styles.empty, { gap: spacing.md }]}>
          <IconTile icon="beads" tone="sand" size={44} />
          <AppText style={styles.emptyTitle}>{t('custom.emptyTitle')}</AppText>
          <AppText variant="caption" tone="muted" style={styles.center}>
            {t('custom.emptyBody')}
          </AppText>
          <Button
            title={t('custom.addCategory')}
            size="small"
            style={styles.selfCenter}
            onPress={() => router.push('/custom/new')}
          />
        </View>
      ) : (
        <View style={group}>
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
            style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
          >
            <IconTile icon="plus" tone="sand" />
            <AppText style={[styles.addText, { color: colors.customAccent }]}>
              {t('custom.addCategory')}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  title: { flex: 1, fontFamily: UI_FONTS.semibold, fontSize: 17, lineHeight: 26 },
  group: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  empty: { alignItems: 'center', padding: 16 },
  emptyTitle: { fontFamily: UI_FONTS.semibold, fontSize: 16, lineHeight: 24 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  selfCenter: { alignSelf: 'center' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  addText: { fontFamily: UI_FONTS.medium, fontSize: 15, lineHeight: 22 },
});
