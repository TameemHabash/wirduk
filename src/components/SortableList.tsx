import { memo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';

import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface Props<T> {
  items: readonly T[];
  keyOf: (item: T) => string;
  title: string;
  hint: string;
  renderItem: (item: T) => ReactNode;
  dragLabel: (item: T) => string;
  /** Called after every drop with the new order. */
  onReorder: (items: T[]) => void;
  onDone: () => void;
  /** Row background (e.g. the sand color for the user's own items). */
  rowColor?: string;
  /** Rows that stay in place have no handle (default: every row can move). */
  canDrag?: (item: T) => boolean;
  /** A drop that breaks a rule is undone (positions in the list, from 0). */
  canDrop?: (from: number, to: number) => boolean;
}

const Row = memo(function Row({
  children,
  label,
  color,
  draggable,
}: {
  children: ReactNode;
  label: string;
  color: string;
  draggable: boolean;
}) {
  const drag = useReorderableDrag();
  const { colors, spacing } = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: color, borderBottomColor: colors.border, paddingStart: spacing.md },
      ]}
    >
      <View style={styles.fill}>{children}</View>
      {draggable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPressIn={drag}
          hitSlop={8}
          style={styles.handle}
        >
          <Icon name="grip" color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={styles.handle} />
      )}
    </View>
  );
});

/**
 * Drag-to-reorder mode: a fixed bar ("تم") above the list, and a handle on each
 * row. Only the handle drags, so scrolling never moves an item by mistake.
 */
export function SortableList<T>({
  items,
  keyOf,
  title,
  hint,
  renderItem,
  dragLabel,
  onReorder,
  onDone,
  rowColor,
  canDrag,
  canDrop,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<T[]>(() => [...items]);

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    if (canDrop && !canDrop(from, to)) {
      // Back where it was: a new array makes the list show the kept order again.
      setData([...data]);
      return;
    }
    const next = reorderItems(data, from, to);
    setData(next);
    onReorder(next);
  };

  return (
    <View style={styles.fill}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={styles.bar}>
          <AppText variant="heading" accessibilityRole="header" style={styles.fill}>
            {title}
          </AppText>
          <Pressable accessibilityRole="button" onPress={onDone} style={styles.textButton}>
            <AppText variant="label" tone="primary">
              {t('common.done')}
            </AppText>
          </Pressable>
        </View>
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      </View>
      <ReorderableList
        data={data}
        onReorder={handleReorder}
        keyExtractor={keyOf}
        renderItem={({ item }) => (
          <Row
            label={dragLabel(item)}
            color={rowColor ?? colors.surface}
            draggable={canDrag ? canDrag(item) : true}
          >
            {renderItem(item)}
          </Row>
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        style={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textButton: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
