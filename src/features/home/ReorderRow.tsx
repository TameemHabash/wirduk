import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useReorderableDrag } from 'react-native-reorderable-list';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { HomeCategory } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

/**
 * A row in "تعديل الترتيب" mode. Dragging starts only from the handle,
 * so scrolling the list never moves an item by mistake.
 */
export const ReorderRow = memo(function ReorderRow({ category }: { category: HomeCategory }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const drag = useReorderableDrag();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingStart: spacing.md,
        },
      ]}
    >
      <View style={[styles.num, { borderRadius: radii.sm, backgroundColor: colors.surfaceMuted }]}>
        <AppText variant="label" tone="muted">
          {String(category.defaultOrder)}
        </AppText>
      </View>
      <AppText style={[styles.title, { marginHorizontal: spacing.md }]} numberOfLines={2}>
        {category.title}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.dragHandle', { title: category.title })}
        onPressIn={drag}
        hitSlop={8}
        style={styles.handle}
      >
        <Icon name="grip" color={colors.textMuted} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  handle: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
