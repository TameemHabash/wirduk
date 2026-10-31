import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  /** Completion of each dhikr, in order. */
  complete: readonly boolean[];
  current: number;
}

/** Up to this many items get one segment each; above it, one continuous bar. */
const MAX_SEGMENTS = 40;

/**
 * Category progress: one segment per dhikr (teal = done, gold = current).
 * Follows the layout direction, so in Arabic the first dhikr is on the right.
 */
export function ProgressSegments({ complete, current }: Props) {
  const { colors } = useAppTheme();
  const done = complete.filter(Boolean).length;

  if (complete.length > MAX_SEGMENTS) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${(done / complete.length) * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants">
      {complete.map((isDone, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {
              backgroundColor:
                i === current ? colors.accent : isDone ? colors.primary : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  bar: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3 },
});
