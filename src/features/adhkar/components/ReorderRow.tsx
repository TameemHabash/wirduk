import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsActive, useReorderableDrag } from 'react-native-reorderable-list';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { HomeCategory } from '@/data/models';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

/**
 * A row in «تعديل الترتيب». Dragging starts only from the handle, so scrolling the list
 * never moves an item by mistake. The row being moved lifts with a teal tint (design).
 */
export const ReorderRow = memo(function ReorderRow({ category }: { category: HomeCategory }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const drag = useReorderableDrag();
  const active = useIsActive();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: active ? colors.primarySoft : colors.surface,
          borderBottomColor: colors.border,
        },
        active && styles.lifted,
      ]}
    >
      <AppText tone="faint" style={styles.num}>
        {String(category.defaultOrder)}
      </AppText>
      <AppText style={styles.title} numberOfLines={2}>
        {category.title}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.dragHandle', { title: category.title })}
        onPressIn={drag}
        hitSlop={8}
        style={styles.handle}
      >
        <Icon name="grip" color={active ? colors.primaryInk : colors.textFaint} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingStart: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lifted: {
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  num: { width: 24, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  title: { flex: 1, fontFamily: UI_FONTS.medium, fontSize: 16, lineHeight: 24 },
  handle: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
