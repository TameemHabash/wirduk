import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

import { type WardOrder, orderWard } from './logic/ward';
import { dhikrLabel } from './setup';
import { ChoiceCard } from './SetupParts';

/** How many adhkar the short preview shows. */
const FIRST = 4;

/**
 * «ترتيب الورد» (owner, 2026-10-29; design): plan order (recommended) or the
 * category's. Only the order changes. A gentle note when the category's is
 * chosen, and the ward in the chosen order (first words, or the owner's names,
 * from the database), all of it or its first four (owner, 2026-10-30: all
 * first in the setup, four first in «أدومها»'s settings).
 */
export function WardOrderPicker({
  order,
  onChange,
  wardIds,
  showAllFirst,
}: {
  order: WardOrder;
  onChange: (order: WardOrder) => void;
  /** The morning ward, in plan order. */
  wardIds: readonly number[];
  showAllFirst: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { content } = useRepositories();
  const [category, setCategory] = useState<{ id: number; text: string }[]>([]);
  const [showAll, setShowAll] = useState(showAllFirst);

  useEffect(() => {
    let cancelled = false;
    content
      .listAdhkar(APP_CONFIG.content.morningCategoryId, i18n.language)
      .then((list) => !cancelled && setCategory(list.map((d) => ({ id: d.id, text: d.text }))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);

  const texts = new Map(category.map((d) => [d.id, d.text]));
  const ward = orderWard(
    wardIds,
    order,
    category.map((d) => d.id),
  ).filter((id) => texts.has(id));
  const shown = showAll ? ward : ward.slice(0, FIRST);

  return (
    <View style={{ gap: spacing.md }}>
      <ChoiceCard
        title={t('adwamuha.settingsScreen.planOrder')}
        badge={t('adwamuha.settingsScreen.recommended')}
        note={t('adwamuha.settingsScreen.planOrderNote')}
        selected={order === 'plan'}
        onPress={() => onChange('plan')}
      />
      <ChoiceCard
        title={t('adwamuha.settingsScreen.categoryOrder')}
        note={t('adwamuha.settingsScreen.categoryOrderNote')}
        selected={order === 'category'}
        onPress={() => onChange('category')}
      />
      {order === 'category' ? (
        <View
          style={[
            styles.nudge,
            {
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: colors.accentSoft,
            },
          ]}
        >
          <Icon name="bulb" color={colors.accent} />
          <View style={[styles.fill, { gap: spacing.xs }]}>
            <AppText variant="caption">{t('adwamuha.settingsScreen.nudge')}</AppText>
            <Pressable accessibilityRole="button" onPress={() => onChange('plan')} hitSlop={8}>
              <AppText variant="label" tone="primary">
                {t('adwamuha.settingsScreen.backToPlan')}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
      {ward.length > 0 ? (
        <View
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.md,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <AppText variant="caption" tone="muted">
            {t('adwamuha.settingsScreen.previewTitle')}
          </AppText>
          {shown.map((id, i) => (
            <View key={id} style={[styles.row, { gap: spacing.sm }]}>
              <View style={[styles.number, { backgroundColor: colors.surface }]}>
                <AppText variant="label" tone="muted">
                  {i + 1}
                </AppText>
              </View>
              <AppText style={styles.fill}>{dhikrLabel(id, texts.get(id) ?? '', 4)}</AppText>
            </View>
          ))}
          {ward.length > FIRST ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll((all) => !all)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.row,
                styles.toggle,
                { gap: spacing.xs },
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppText variant="label" tone="primary">
                {showAll
                  ? t('adwamuha.orderHelp.showFirst')
                  : t('adwamuha.orderHelp.showAll', { count: ward.length })}
              </AppText>
              <Icon name={showAll ? 'up' : 'down'} size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  nudge: { flexDirection: 'row', alignItems: 'flex-start' },
  // A rounded square (design: «.oi span»).
  number: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { justifyContent: 'center', minHeight: 44 },
});
